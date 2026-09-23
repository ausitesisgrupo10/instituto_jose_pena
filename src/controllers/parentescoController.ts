/**
 * @archivo src/controllers/parentescoController.ts
 * @descripción Controlador para la gestión de relaciones de Parentesco (ABM Padre/Tutor - Alumno) en el Instituto José Peña.
 */

import { Request, Response } from 'express';
import { Parentesco } from '../models/Parentesco.js';

/**
 * @función listarParentescos
 * @descripción Lista todos los vínculos de parentesco registrados, poblando datos de Padre y Alumno.
 * @param {Request} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con arreglo de parentescos.
 * @reglaDeNegocio Retorna únicamente parentescos ordenados por apellido del padre.
 */
export async function listarParentescos(req: Request, res: Response): Promise<void> {
  try {
    const parentescos = await Parentesco.find()
      .populate('padre_id')
      .populate('alumno_id')
      .sort({ createdAt: -1 });

    res.json(parentescos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar relaciones de parentesco.', detalle: error.message });
  }
}

/**
 * @función crearParentesco
 * @descripción Registra un nuevo vínculo de tutoría entre un Padre/Tutor y un Alumno.
 * @param {Request} req - Solicitud HTTP con { padre_id, alumno_id, tipo_vinculo }.
 * @param {Response} res - Respuesta HTTP con el parentesco creado.
 * @reglaDeNegocio Requiere que el ID del padre pertenezca a un usuario con rol 'Padre' o 'Admin' y el alumno a 'Alumno'.
 */
export async function crearParentesco(req: Request, res: Response): Promise<void> {
  try {
    const { padre_id, alumno_id, tipo_vinculo } = req.body;

    if (!padre_id || !alumno_id || !tipo_vinculo) {
      res.status(400).json({ error: 'Todos los campos son requeridos (padre_id, alumno_id, tipo_vinculo).' });
      return;
    }

    const nuevo = await Parentesco.create({ padre_id, alumno_id, tipo_vinculo });
    const poblado = await Parentesco.findById(nuevo._id).populate('padre_id').populate('alumno_id');

    res.status(201).json(poblado);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear la relación de parentesco.', detalle: error.message });
  }
}

/**
 * @función actualizarParentesco
 * @descripción Actualiza un vínculo de parentesco existente por su ID.
 * @param {Request} req - Solicitud HTTP con :id y payload.
 * @param {Response} res - Respuesta HTTP con el registro actualizado.
 */
export async function actualizarParentesco(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { padre_id, alumno_id, tipo_vinculo } = req.body;

    const actualizado = await Parentesco.findByIdAndUpdate(
      id,
      { padre_id, alumno_id, tipo_vinculo },
      { new: true }
    )
      .populate('padre_id')
      .populate('alumno_id');

    if (!actualizado) {
      res.status(404).json({ error: 'Parentesco no encontrado.' });
      return;
    }

    res.json(actualizado);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar la relación de parentesco.', detalle: error.message });
  }
}

/**
 * @función eliminarParentesco
 * @descripción Elimina una relación de parentesco por su ID.
 * @param {Request} req - Solicitud HTTP con :id.
 * @param {Response} res - Respuesta HTTP con mensaje de confirmación.
 */
export async function eliminarParentesco(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminado = await Parentesco.findByIdAndDelete(id);

    if (!eliminado) {
      res.status(404).json({ error: 'Parentesco no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Parentesco eliminado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar el parentesco.', detalle: error.message });
  }
}
