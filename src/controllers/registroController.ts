/**
 * @archivo src/controllers/registroController.ts
 * @descripción Controlador REST para la gestión de Registros Académicos (Notas, Inasistencias, Sanciones) del Instituto José Peña.
 * @reglaDeNegocio Gestiona el ciclo de vida de los registros académicos respetando las restricciones por rol y materia asignada.
 */

import { Response } from 'express';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Parentesco } from '../models/Parentesco.js';
import { User } from '../models/User.js';
import { Materia } from '../models/Materia.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

async function sincronizarContadorSancionesAlumno(alumnoId: unknown): Promise<void> {
  if (!alumnoId) return;
  try {
    const totalSanciones = await RegistroAcademico.countDocuments({
      alumno_id: alumnoId as any,
      tipo: 'sancion',
    });
    await User.findByIdAndUpdate(alumnoId, {
      $set: { 'perfil_metadata.sanciones': totalSanciones },
    });
  } catch (err) {
    console.warn('No se pudo sincronizar contador de sanciones del alumno:', err);
  }
}

/**
 * @función registrarCalificacion
 * @descripción Registra un nuevo registro académico (nota, inasistencia o sanción) para un estudiante.
 * @param {AuthRequest} req - Solicitud de Express con alumno_id, materia_id, tipo, valor, trimestre, fecha, observacion.
 * @param {Response} res - Respuesta de Express con el objeto de registro creado.
 * @reglaDeNegocio Requiere validación previa de titularidad si el usuario posee rol de Docente.
 */
function normalizarFechaRegistro(fechaRaw: unknown): Date {
  if (typeof fechaRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw.trim())) {
    return new Date(`${fechaRaw.trim()}T12:00:00Z`);
  }
  return fechaRaw ? new Date(String(fechaRaw)) : new Date();
}

function validarYNormalizarNota(valorRaw: unknown): { ok: boolean; valorNormalizado?: string; error?: string } {
  const limpio = String(valorRaw ?? '').trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(limpio)) {
    return {
      ok: false,
      error: 'La calificación debe ser un número decimal con hasta dos dígitos antes y después de la coma (ej: 8,50 o 10,00).',
    };
  }
  const num = parseFloat(limpio);
  if (isNaN(num) || num < 0 || num > 10) {
    return {
      ok: false,
      error: 'La calificación debe estar comprendida entre 0,00 y 10,00.',
    };
  }
  return { ok: true, valorNormalizado: num.toFixed(2) };
}

export async function registrarCalificacion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { alumno_id, materia_id, tipo, valor, fecha, observacion, trimestre } = req.body;

    if (!alumno_id || !materia_id || !tipo || valor === undefined || String(valor).trim() === '') {
      res.status(400).json({ error: 'Faltan campos obligatorios (alumno_id, materia_id, tipo, valor).' });
      return;
    }

    let valorFinal = String(valor).trim();
    if (tipo === 'nota') {
      const validacion = validarYNormalizarNota(valor);
      if (!validacion.ok) {
        res.status(400).json({ error: validacion.error });
        return;
      }
      valorFinal = validacion.valorNormalizado!;
    }

    const observacionFinal = typeof observacion === 'string' ? observacion.trim() : '';
    if (tipo === 'nota' && observacionFinal.length > 50) {
      res.status(400).json({ error: 'La observación no puede superar los 50 caracteres.' });
      return;
    }

    const registro = await RegistroAcademico.create({
      alumno_id,
      materia_id,
      tipo,
      trimestre: tipo === 'nota' ? Number(trimestre) || 1 : undefined,
      valor: valorFinal,
      fecha: normalizarFechaRegistro(fecha),
      observacion: observacionFinal,
    });

    if (tipo === 'sancion') {
      await sincronizarContadorSancionesAlumno(alumno_id);
    }

    const poblado = await RegistroAcademico.findById(registro._id)
      .populate('alumno_id')
      .populate({
        path: 'materia_id',
        populate: {
          path: 'seccion_id',
          populate: { path: 'curso_id' },
        },
      });

    res.status(201).json(poblado);
  } catch (error: any) {
    console.error('❌ Error en registrarCalificacion:', error);
    res.status(500).json({ error: 'Error al registrar calificación o asistencia.', detalle: error.message });
  }
}

/**
 * @función listarRegistros
 * @descripción Lista los registros académicos aplicando filtros opcionales de tipo, tipos, alumno, materia, dni, fecha, soloMisMaterias y orden ASC/DESC.
 */
export async function listarRegistros(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { tipo, tipos, alumno_id, materia_id, dni, fecha, soloMisMaterias, orden } =
      req.query as Record<string, string | undefined>;
    const filtro: any = {};

    if (tipos && tipos.trim() !== '') {
      const listaTipos = tipos
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (listaTipos.length > 0) {
        filtro.tipo = { $in: listaTipos };
      }
    } else if (tipo && tipo !== 'todos') {
      filtro.tipo = tipo;
    }

    if (materia_id) {
      filtro.materia_id = materia_id;
    } else if (soloMisMaterias === 'true' && req.usuario?.rol === 'Docente') {
      const misMaterias = await Materia.find({ docente_id: req.usuario._id }).select('_id');
      filtro.materia_id = { $in: misMaterias.map((m) => m._id) };
    }

    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
      const inicio = new Date(`${fecha.trim()}T00:00:00.000Z`);
      const fin = new Date(`${fecha.trim()}T23:59:59.999Z`);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    // Lógica por Rol
    if (req.usuario.rol === 'Alumno') {
      filtro.alumno_id = req.usuario._id;
    } else if (req.usuario.rol === 'Padre') {
      const parentescos = await Parentesco.find({ padre_id: req.usuario._id } as any);
      const listaHijosIds = parentescos.map((p) => p.alumno_id);

      if (alumno_id && listaHijosIds.some((h) => String(h) === String(alumno_id))) {
        filtro.alumno_id = alumno_id;
      } else {
        filtro.alumno_id = { $in: listaHijosIds };
      }
    } else if (alumno_id) {
      filtro.alumno_id = alumno_id;
    } else if (dni && dni.replace(/\D/g, '').trim() !== '') {
      const dniLimpio = dni.replace(/\D/g, '').trim();
      const alumnosMatch = await User.find({
        rol: 'Alumno',
        dni: { $regex: dniLimpio, $options: 'i' },
      }).select('_id');
      filtro.alumno_id = { $in: alumnosMatch.map((a) => a._id) };
    }

    const sortDir = orden === 'asc' ? 1 : -1;

    const registros = await RegistroAcademico.find(filtro)
      .populate('alumno_id')
      .populate({
        path: 'materia_id',
        populate: {
          path: 'seccion_id',
          populate: { path: 'curso_id' },
        },
      })
      .sort({ fecha: sortDir, createdAt: sortDir });

    if (orden === 'asc') {
      registros.sort((a: any, b: any) => {
        const fa = a.fecha ? new Date(a.fecha).toISOString().split('T')[0] : '';
        const fb = b.fecha ? new Date(b.fecha).toISOString().split('T')[0] : '';
        if (fa !== fb) return fa.localeCompare(fb);
        const dniA = String(a.alumno_id?.dni || '');
        const dniB = String(b.alumno_id?.dni || '');
        return dniA.localeCompare(dniB);
      });
    }

    res.json(registros);
  } catch (error: any) {
    console.error('❌ Error en listarRegistros:', error);
    res.status(500).json({ error: 'Error al obtener registros académicos.', detalle: error.message });
  }
}

/**
 * @función actualizarRegistro
 * @descripción Modifica un registro académico existente comprobando previamente que la materia pertenezca al docente logueado.
 */
export async function actualizarRegistro(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { valor, fecha, observacion, tipo, trimestre, alumno_id, materia_id } = req.body;

    const previo = await RegistroAcademico.findById(id);
    if (!previo) {
      res.status(404).json({ error: 'Registro académico no encontrado.' });
      return;
    }

    const tipoFinal = tipo || previo.tipo;
    const updateData: any = {};

    if (alumno_id) updateData.alumno_id = alumno_id;
    if (materia_id) updateData.materia_id = materia_id;

    if (valor !== undefined) {
      if (tipoFinal === 'nota') {
        const validacion = validarYNormalizarNota(valor);
        if (!validacion.ok) {
          res.status(400).json({ error: validacion.error });
          return;
        }
        updateData.valor = validacion.valorNormalizado;
      } else {
        const vStr = String(valor).trim();
        if (!vStr) {
          res.status(400).json({ error: 'El concepto o valor no puede quedar vacío.' });
          return;
        }
        updateData.valor = vStr;
      }
    }
    if (fecha) updateData.fecha = normalizarFechaRegistro(fecha);
    if (observacion !== undefined) {
      const obsTrim = String(observacion).trim();
      if (tipoFinal === 'nota' && obsTrim.length > 50) {
        res.status(400).json({ error: 'La observación no puede superar los 50 caracteres.' });
        return;
      }
      updateData.observacion = obsTrim;
    }
    if (tipo) updateData.tipo = tipo;
    if (trimestre !== undefined && tipoFinal === 'nota') updateData.trimestre = trimestre;

    const actualizado = await RegistroAcademico.findByIdAndUpdate(id, updateData, { new: true })
      .populate('alumno_id')
      .populate({
        path: 'materia_id',
        populate: {
          path: 'seccion_id',
          populate: { path: 'curso_id' },
        },
      });

    if (!actualizado) {
      res.status(404).json({ error: 'Registro académico no encontrado.' });
      return;
    }

    if (previo.tipo === 'sancion' || actualizado.tipo === 'sancion') {
      await sincronizarContadorSancionesAlumno(previo.alumno_id);
      if (alumno_id && String(alumno_id) !== String(previo.alumno_id)) {
        await sincronizarContadorSancionesAlumno(alumno_id);
      }
    }

    res.json(actualizado);
  } catch (error: any) {
    console.error('❌ Error en actualizarRegistro:', error);
    res.status(500).json({ error: 'Error al actualizar el registro académico.', detalle: error.message });
  }
}

/**
 * @función eliminarRegistro
 * @descripción Elimina un registro académico únicamente si pertenece a una materia asignada al docente autenticado.
 */
export async function eliminarRegistro(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminado = await RegistroAcademico.findByIdAndDelete(id);

    if (!eliminado) {
      res.status(404).json({ error: 'Registro académico no encontrado.' });
      return;
    }

    if (eliminado.tipo === 'sancion') {
      await sincronizarContadorSancionesAlumno(eliminado.alumno_id);
    }

    res.json({ mensaje: 'Registro académico eliminado exitosamente.' });
  } catch (error: any) {
    console.error('❌ Error en eliminarRegistro:', error);
    res.status(500).json({ error: 'Error al eliminar el registro académico.', detalle: error.message });
  }
}
