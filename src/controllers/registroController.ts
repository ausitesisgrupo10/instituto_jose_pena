/**
 * @archivo src/controllers/registroController.ts
 * @descripción Controlador REST para la gestión de Registros Académicos (Notas, Inasistencias, Sanciones) del Instituto José Peña.
 * @reglaDeNegocio Gestiona el ciclo de vida de los registros académicos respetando las restricciones por rol y materia asignada.
 */

import { Response } from 'express';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Parentesco } from '../models/Parentesco.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

/**
 * @función registrarCalificacion
 * @descripción Registra un nuevo registro académico (nota, inasistencia o sanción) para un estudiante.
 * @param {AuthRequest} req - Solicitud de Express con alumno_id, materia_id, tipo, valor, trimestre, fecha, observacion.
 * @param {Response} res - Respuesta de Express con el objeto de registro creado.
 * @reglaDeNegocio Requiere validación previa de titularidad si el usuario posee rol de Docente.
 */
export async function registrarCalificacion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { alumno_id, materia_id, tipo, valor, fecha, observacion, trimestre } = req.body;

    if (!alumno_id || !materia_id || !tipo || valor === undefined) {
      res.status(400).json({ error: 'Faltan campos obligatorios (alumno_id, materia_id, tipo, valor).' });
      return;
    }

    const registro = await RegistroAcademico.create({
      alumno_id,
      materia_id,
      tipo,
      trimestre: tipo === 'nota' ? trimestre || 1 : undefined,
      valor: String(valor),
      fecha: fecha ? new Date(fecha) : new Date(),
      observacion: observacion || '',
    });

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
 * @descripción Lista los registros académicos aplicando filtros opcionales de tipo, alumno o materia, poblando la sección y el curso.
 * @param {AuthRequest} req - Solicitud de Express con query params (?tipo= &alumno_id= &materia_id=).
 * @param {Response} res - Respuesta de Express con el arreglo de registros.
 * @reglaDeNegocio Alumnos solo ven sus registros. Padres ven solo los de sus hijos vinculados.
 */
export async function listarRegistros(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { tipo, alumno_id, materia_id } = req.query;
    const filtro: any = {};

    if (tipo && tipo !== 'todos') filtro.tipo = tipo;
    if (materia_id) filtro.materia_id = materia_id;

    // Lógica por Rol
    if (req.usuario.rol === 'Alumno') {
      filtro.alumno_id = req.usuario._id;
    } else if (req.usuario.rol === 'Padre') {
      // Buscar hijos del padre
      const parentescos = await Parentesco.find({ padre_id: req.usuario._id } as any);
      const listaHijosIds = parentescos.map((p) => p.alumno_id);

      if (alumno_id && listaHijosIds.some((h) => String(h) === String(alumno_id))) {
        filtro.alumno_id = alumno_id;
      } else {
        filtro.alumno_id = { $in: listaHijosIds };
      }
    } else if (alumno_id) {
      filtro.alumno_id = alumno_id;
    }

    const registros = await RegistroAcademico.find(filtro)
      .populate('alumno_id')
      .populate({
        path: 'materia_id',
        populate: {
          path: 'seccion_id',
          populate: { path: 'curso_id' },
        },
      })
      .sort({ fecha: -1 });

    res.json(registros);
  } catch (error: any) {
    console.error('❌ Error en listarRegistros:', error);
    res.status(500).json({ error: 'Error al obtener registros académicos.', detalle: error.message });
  }
}

/**
 * @función actualizarRegistro
 * @descripción Modifica un registro académico existente comprobando previamente que la materia pertenezca al docente logueado.
 * @param {AuthRequest} req - Objeto de solicitud Express con datos a actualizar en req.body y el ID en req.params.id.
 * @param {Response} res - Respuesta JSON confirmando la edición o error 403.
 * @reglaDeNegocio Solo el docente a cargo de la materia (o un Admin/No Docente) puede editar sus registros académicos.
 */
export async function actualizarRegistro(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { valor, fecha, observacion, tipo, trimestre } = req.body;

    const updateData: any = {};
    if (valor !== undefined) updateData.valor = String(valor);
    if (fecha) updateData.fecha = new Date(fecha);
    if (observacion !== undefined) updateData.observacion = observacion;
    if (tipo) updateData.tipo = tipo;
    if (trimestre) updateData.trimestre = trimestre;

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

    res.json(actualizado);
  } catch (error: any) {
    console.error('❌ Error en actualizarRegistro:', error);
    res.status(500).json({ error: 'Error al actualizar el registro académico.', detalle: error.message });
  }
}

/**
 * @función eliminarRegistro
 * @descripción Elimina un registro académico únicamente si pertenece a una materia asignada al docente autenticado.
 * @param {AuthRequest} req - Objeto Express con req.user y el ID del registro en req.params.id.
 * @param {Response} res - Objeto Express para devolver la confirmación o error 403 de permisos.
 * @reglaDeNegocio Un docente no puede modificar ni eliminar registros académicos de asignaturas de otros docentes.
 */
export async function eliminarRegistro(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminado = await RegistroAcademico.findByIdAndDelete(id);

    if (!eliminado) {
      res.status(404).json({ error: 'Registro académico no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Registro académico eliminado exitosamente.' });
  } catch (error: any) {
    console.error('❌ Error en eliminarRegistro:', error);
    res.status(500).json({ error: 'Error al eliminar el registro académico.', detalle: error.message });
  }
}
