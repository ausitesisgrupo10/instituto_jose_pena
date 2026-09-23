/**
 * @archivo src/controllers/asistenciaDocenteController.ts
 * @descripción Controlador para el registro de asistencia y control del cuerpo docente (Gestión No Docente y Admin).
 */

import { Response } from 'express';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

/**
 * @función registrarAsistenciaDocente
 * @descripción Registra el estado de asistencia diaria para un docente (Presente, Ausente, Licencia, Tardanza).
 * @param {AuthRequest} req - Solicitud HTTP con { docente_id, estado, fecha, observacion }.
 * @param {Response} res - Respuesta HTTP.
 * @reglaDeNegocio Solo el personal No Docente o Administrador pueden registrar la asistencia docente.
 */
export async function registrarAsistenciaDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { docente_id, estado, fecha, observacion } = req.body;

    if (!docente_id || !estado) {
      res.status(400).json({ error: 'Los campos docente_id y estado son obligatorios.' });
      return;
    }

    const asistencia = await AsistenciaDocente.create({
      docente_id,
      estado,
      fecha: fecha ? new Date(fecha) : new Date(),
      observacion: observacion || '',
    });

    const poblada = await AsistenciaDocente.findById(asistencia._id).populate('docente_id');
    res.status(201).json(poblada);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar la asistencia docente.', detalle: error.message });
  }
}

/**
 * @función listarAsistenciasDocentes
 * @descripción Lista los registros de asistencia docente con filtros opcionales por fecha y docente.
 * @param {AuthRequest} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP.
 */
export async function listarAsistenciasDocentes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { docente_id } = req.query;
    const filtro: any = {};

    if (docente_id) {
      filtro.docente_id = docente_id;
    }

    const lista = await AsistenciaDocente.find(filtro).populate('docente_id').sort({ fecha: -1 });
    res.json(lista);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar asistencias docentes.', detalle: error.message });
  }
}
