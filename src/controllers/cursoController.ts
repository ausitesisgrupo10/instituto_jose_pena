/**
 * @archivo src/controllers/cursoController.ts
 * @descripción Controlador para la administración de Cursos (Primario, Secundario, Inicial).
 */

import { Request, Response } from 'express';
import { Curso } from '../models/Curso.js';

/**
 * @función listarCursos
 * @descripción Obtiene el listado completo de cursos registrados.
 * @param {Request} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con arreglo de Cursos.
 * @reglaDeNegocio Ordena por nivel y nombre.
 */
export async function listarCursos(req: Request, res: Response): Promise<void> {
  try {
    const cursos = await Curso.find().sort({ nivel: 1, nombre_curso: 1 });
    res.json(cursos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cursos.', detalle: error.message });
  }
}

/**
 * @función crearCurso
 * @descripción Registra un nuevo curso en el sistema.
 * @param {Request} req - Solicitud HTTP con payload { nombre_curso, nivel }.
 * @param {Response} res - Respuesta HTTP con el curso registrado.
 * @reglaDeNegocio Los niveles deben ser 'Primario', 'Secundario' o 'Inicial'.
 */
export async function crearCurso(req: Request, res: Response): Promise<void> {
  try {
    const { nombre_curso, nivel } = req.body;
    if (!nombre_curso || !nivel) {
      res.status(400).json({ error: 'El nombre del curso y el nivel son obligatorios.' });
      return;
    }

    const nuevoCurso = await Curso.create({ nombre_curso, nivel });
    res.status(201).json(nuevoCurso);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear el curso.', detalle: error.message });
  }
}

/**
 * @función actualizarCurso
 * @descripción Actualiza los datos de un curso por su ID.
 * @param {Request} req - Solicitud HTTP con parámetro :id y cambios en req.body.
 * @param {Response} res - Respuesta HTTP con el curso modificado.
 */
export async function actualizarCurso(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre_curso, nivel } = req.body;

    const curso = await Curso.findByIdAndUpdate(id, { nombre_curso, nivel }, { new: true });
    if (!curso) {
      res.status(404).json({ error: 'Curso no encontrado.' });
      return;
    }

    res.json(curso);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar el curso.', detalle: error.message });
  }
}

/**
 * @función eliminarCurso
 * @descripción Elimina un curso de la base de datos por su ID.
 * @param {Request} req - Solicitud HTTP con parámetro :id.
 * @param {Response} res - Respuesta HTTP con mensaje de confirmación.
 */
export async function eliminarCurso(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminado = await Curso.findByIdAndDelete(id);
    if (!eliminado) {
      res.status(404).json({ error: 'Curso no encontrado.' });
      return;
    }
    res.json({ mensaje: 'Curso eliminado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar el curso.', detalle: error.message });
  }
}
