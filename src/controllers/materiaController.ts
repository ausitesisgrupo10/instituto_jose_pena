/**
 * @archivo src/controllers/materiaController.ts
 * @descripción Controlador para la administración de Materias curriculares del Instituto José Peña.
 */

import { Request, Response } from 'express';
import { Materia } from '../models/Materia.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

/**
 * @función listarMaterias
 * @descripción Lista todas las materias curriculares poblando los datos de la Sección y del Docente asignado.
 * @param {Request} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con arreglo de materias.
 * @reglaDeNegocio Si el usuario es Docente, opcionalmente filtra solo las materias asignadas a él.
 */
export async function listarMaterias(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filtro: any = {};
    if (req.usuario && req.usuario.rol === 'Docente') {
      // Los docentes pueden consultar sus materias asignadas
      filtro.docente_id = req.usuario._id;
    }

    const materias = await Materia.find(filtro)
      .populate({
        path: 'seccion_id',
        populate: { path: 'curso_id' },
      })
      .populate('docente_id')
      .sort({ nombre_materia: 1 });

    res.json(materias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener materias.', detalle: error.message });
  }
}

/**
 * @función crearMateria
 * @descripción Registra una nueva asignatura asignándole una sección, docente y opcionalmente un programa académico.
 * @param {Request} req - Solicitud HTTP con { nombre_materia, seccion_id, docente_id, programa_url }.
 * @param {Response} res - Respuesta HTTP con la materia creada.
 */
export async function crearMateria(req: Request, res: Response): Promise<void> {
  try {
    const { nombre_materia, seccion_id, docente_id, programa_url } = req.body;
    if (!nombre_materia || !seccion_id || !docente_id) {
      res.status(400).json({ error: 'Los campos nombre_materia, seccion_id y docente_id son obligatorios.' });
      return;
    }

    const nuevaMateria = await Materia.create({
      nombre_materia,
      seccion_id,
      docente_id,
      programa_url: programa_url || '',
    });

    const poblada = await Materia.findById(nuevaMateria._id)
      .populate({
        path: 'seccion_id',
        populate: { path: 'curso_id' },
      })
      .populate('docente_id');

    res.status(201).json(poblada);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear la materia.', detalle: error.message });
  }
}

/**
 * @función actualizarMateria
 * @descripción Modifica los datos de una materia o actualiza su programa de estudio.
 * @param {Request} req - Solicitud HTTP con :id y datos en el cuerpo.
 * @param {Response} res - Respuesta HTTP con la materia actualizada.
 */
export async function actualizarMateria(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre_materia, seccion_id, docente_id, programa_url } = req.body;

    const materia = await Materia.findByIdAndUpdate(
      id,
      { nombre_materia, seccion_id, docente_id, programa_url },
      { new: true }
    )
      .populate({
        path: 'seccion_id',
        populate: { path: 'curso_id' },
      })
      .populate('docente_id');

    if (!materia) {
      res.status(404).json({ error: 'Materia no encontrada.' });
      return;
    }

    res.json(materia);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar la materia.', detalle: error.message });
  }
}

/**
 * @función eliminarMateria
 * @descripción Elimina una materia de la base de datos por su ID.
 * @param {Request} req - Solicitud HTTP con :id.
 * @param {Response} res - Respuesta HTTP con mensaje de confirmación.
 */
export async function eliminarMateria(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminada = await Materia.findByIdAndDelete(id);

    if (!eliminada) {
      res.status(404).json({ error: 'Materia no encontrada.' });
      return;
    }

    res.json({ mensaje: 'Materia eliminada exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar la materia.', detalle: error.message });
  }
}
