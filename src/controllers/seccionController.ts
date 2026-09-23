/**
 * @archivo src/controllers/seccionController.ts
 * @descripción Controlador para la administración de Secciones / Divisiones del Instituto José Peña.
 */

import { Request, Response } from 'express';
import { Seccion } from '../models/Seccion.js';

/**
 * @función listarSecciones
 * @descripción Obtiene el listado de secciones con la información poblada del curso al que pertenecen.
 * @param {Request} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con arreglo de Secciones con referencia a Cursos.
 */
export async function listarSecciones(req: Request, res: Response): Promise<void> {
  try {
    const secciones = await Seccion.find().populate('curso_id').sort({ nombre_seccion: 1 });
    res.json(secciones);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener secciones.', detalle: error.message });
  }
}

/**
 * @función crearSeccion
 * @descripción Registra una nueva sección asociada a un curso y turno.
 * @param {Request} req - Solicitud HTTP con { nombre_seccion, curso_id, turno }.
 * @param {Response} res - Respuesta HTTP con la sección creada.
 */
export async function crearSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { nombre_seccion, curso_id, turno } = req.body;
    if (!nombre_seccion || !curso_id || !turno) {
      res.status(400).json({ error: 'Todos los campos son obligatorios (nombre_seccion, curso_id, turno).' });
      return;
    }

    const nuevaSeccion = await Seccion.create({ nombre_seccion, curso_id, turno });
    const poblada = await Seccion.findById(nuevaSeccion._id).populate('curso_id');
    res.status(201).json(poblada);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear la sección.', detalle: error.message });
  }
}

/**
 * @función actualizarSeccion
 * @descripción Actualiza los datos de una sección existente.
 * @param {Request} req - Solicitud HTTP con :id y payload.
 * @param {Response} res - Respuesta HTTP con la sección actualizada.
 */
export async function actualizarSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre_seccion, curso_id, turno } = req.body;

    const seccion = await Seccion.findByIdAndUpdate(
      id,
      { nombre_seccion, curso_id, turno },
      { new: true }
    ).populate('curso_id');

    if (!seccion) {
      res.status(404).json({ error: 'Sección no encontrada.' });
      return;
    }

    res.json(seccion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar la sección.', detalle: error.message });
  }
}

/**
 * @función eliminarSeccion
 * @descripción Elimina una sección por su ID.
 * @param {Request} req - Solicitud HTTP con :id.
 * @param {Response} res - Respuesta HTTP con mensaje de éxito.
 */
export async function eliminarSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminada = await Seccion.findByIdAndDelete(id);
    if (!eliminada) {
      res.status(404).json({ error: 'Sección no encontrada.' });
      return;
    }
    res.json({ mensaje: 'Sección eliminada exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar la sección.', detalle: error.message });
  }
}
