/**
 * @archivo src/controllers/noDocenteController.ts
 * @descripción Controlador REST para el rol No Docente (Preceptoría y Administración) del Instituto José Peña.
 * @reglaDeNegocio Gestiona el control de asistencias diarias, consulta unificada de personas y ficha integral del docente.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Asistencia } from '../models/Asistencia.js';
import { User } from '../models/User.js';
import { Materia } from '../models/Materia.js';
import { RegistroDocente } from '../models/RegistroDocente.js';

/**
 * @función registrarAsistenciaDiaria
 * @descripción Registra la asistencia (Presente/Ausente) con comentarios de un alumno o docente para una fecha determinada.
 * @param {AuthRequest} req - Solicitud Express con persona_id, tipo_persona, fecha, estado y comentario.
 * @param {Response} res - Respuesta Express confirmando la creación.
 * @reglaDeNegocio Las asistencias Presente se visualizan en verde y Ausente en rojo.
 */
export async function registrarAsistenciaDiaria(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { persona_id, tipo_persona, fecha, estado, comentario, materia_id, seccion_id } = req.body;

    if (!persona_id || !tipo_persona || !estado) {
      res.status(400).json({ error: 'Campos obligatorios faltantes (persona_id, tipo_persona, estado).' });
      return;
    }

    const asistencia = await Asistencia.create({
      persona_id,
      tipo_persona,
      fecha: fecha ? new Date(fecha) : new Date(),
      estado,
      comentario: comentario || '',
      materia_id: materia_id || undefined,
      seccion_id: seccion_id || undefined,
    });

    const poblada = await Asistencia.findById(asistencia._id)
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion');

    res.status(201).json(poblada);
  } catch (error: any) {
    console.error('❌ Error al registrar asistencia:', error);
    res.status(500).json({ error: 'Error al registrar la asistencia.', detalle: error.message });
  }
}

/**
 * @función listarAsistencias
 * @descripción Obtiene el listado de asistencias filtrado por fecha, tipo de persona (Alumno/Docente) o persona específica.
 * @param {AuthRequest} req - Solicitud HTTP con query params (?fecha= &tipo_persona= &persona_id=).
 * @param {Response} res - Respuesta HTTP con el arreglo de asistencias pobladas.
 */
export async function listarAsistencias(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fecha, tipo_persona, persona_id } = req.query;
    const filtro: any = {};

    if (tipo_persona && tipo_persona !== 'todos') {
      filtro.tipo_persona = tipo_persona;
    }

    if (persona_id) {
      filtro.persona_id = persona_id;
    }

    if (fecha) {
      const inicio = new Date(fecha as string);
      inicio.setUTCHours(0, 0, 0, 0);
      const fin = new Date(fecha as string);
      fin.setUTCHours(23, 59, 59, 999);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const lista = await Asistencia.find(filtro)
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion')
      .sort({ fecha: -1, createdAt: -1 });

    res.json(lista);
  } catch (error: any) {
    console.error('❌ Error al listar asistencias:', error);
    res.status(500).json({ error: 'Error al obtener listado de asistencias.', detalle: error.message });
  }
}

/**
 * @función actualizarAsistencia
 * @descripción Modifica el estado o comentario de una asistencia previamente registrada.
 * @param {AuthRequest} req - Solicitud Express con ID en params y estado, comentario o fecha en body.
 * @param {Response} res - Respuesta Express con el registro actualizado.
 */
export async function actualizarAsistencia(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { estado, comentario, fecha } = req.body;

    const actualizacion: any = {};
    if (estado) actualizacion.estado = estado;
    if (comentario !== undefined) actualizacion.comentario = comentario;
    if (fecha) actualizacion.fecha = new Date(fecha);

    const editada = await Asistencia.findByIdAndUpdate(id, actualizacion, { new: true })
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion');

    if (!editada) {
      res.status(404).json({ error: 'Registro de asistencia no encontrado.' });
      return;
    }

    res.json(editada);
  } catch (error: any) {
    console.error('❌ Error al actualizar asistencia:', error);
    res.status(500).json({ error: 'Error al actualizar asistencia.', detalle: error.message });
  }
}

/**
 * @función eliminarAsistencia
 * @descripción Elimina un registro de asistencia por su ID.
 * @param {AuthRequest} req - Solicitud Express con id en req.params.
 * @param {Response} res - Respuesta confirmando eliminación.
 */
export async function eliminarAsistencia(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Asistencia.findByIdAndDelete(id);
    res.json({ mensaje: 'Asistencia eliminada exitosamente.' });
  } catch (error: any) {
    console.error('❌ Error al eliminar asistencia:', error);
    res.status(500).json({ error: 'Error al eliminar asistencia.', detalle: error.message });
  }
}

/**
 * @función consultarPersonasUnificado
 * @descripción Consulta unificada de Docentes, Alumnos y Padres con filtro por categoría y búsqueda multicriterio (DNI, Nombre, Apellido).
 * @param {AuthRequest} req - Solicitud Express con query params (?query= &categoria=).
 * @param {Response} res - Lista de personas filtradas.
 */
export async function consultarPersonasUnificado(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { query, categoria } = req.query;
    const filtro: any = {};

    if (categoria && categoria !== 'todos') {
      filtro.rol = categoria;
    } else {
      filtro.rol = { $in: ['Docente', 'Alumno', 'Padre'] };
    }

    if (query && String(query).trim() !== '') {
      const q = String(query).trim();
      const regex = new RegExp(q, 'i');
      filtro.$or = [{ nombre: regex }, { apellido: regex }, { dni: regex }];
    }

    const usuarios = await User.find(filtro)
      .select('-passwordHash')
      .sort({ apellido: 1, nombre: 1 });

    res.json(usuarios);
  } catch (error: any) {
    console.error('❌ Error en consulta unificada de personas:', error);
    res.status(500).json({ error: 'Error al consultar catálogo de personas.', detalle: error.message });
  }
}

/**
 * @función obtenerFichaDocente
 * @descripción Devuelve la ficha completa de un docente incluyendo datos personales, materias asignadas, grilla horaria e historial de asistencias/faltas.
 * @param {AuthRequest} req - Solicitud con docente_id en params.
 * @param {Response} res - Ficha detallada del docente.
 */
export async function obtenerFichaDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const docente = await User.findById(id).select('-passwordHash');
    if (!docente || docente.rol !== 'Docente') {
      res.status(404).json({ error: 'Docente no encontrado.' });
      return;
    }

    // Materias asignadas con sus Secciones y Cursos
    const materias = await Materia.find({ docente_id: id }).populate({
      path: 'seccion_id',
      populate: { path: 'curso_id' },
    });

    // Historial de asistencias
    const asistencias = await Asistencia.find({ persona_id: id }).sort({ fecha: -1 });

    // Historial de actas/inasistencias docentes
    const registrosDocentes = await RegistroDocente.find({ docente_id: id }).sort({ fecha: -1 });

    res.json({
      docente,
      materias,
      asistencias,
      registrosDocentes,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener ficha docente:', error);
    res.status(500).json({ error: 'Error al recuperar la ficha del docente.', detalle: error.message });
  }
}
