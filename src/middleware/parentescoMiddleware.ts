/**
 * @archivo src/middleware/parentescoMiddleware.ts
 * @descripción Middleware de Validación Estricta de Parentesco para el rol Tutor / Padre en el Instituto José Peña.
 * @reglaDeNegocio Garantiza que un tutor o padre autenticado únicamente pueda acceder a la información académica, boletines, inasistencias y sanciones de sus hijos vinculados directamente en la colección 'parentescos'.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { Parentesco } from '../models/Parentesco.js';

/**
 * @función validarVinculoParentesco
 * @descripción Middleware que verifica en la base de datos MongoDB la relación activa en 'parentescos' entre el padre autenticado y el estudiante solicitado.
 * @param {AuthRequest} req - Solicitud HTTP Express con req.usuario y req.params.alumnoId / req.query.alumnoId.
 * @param {Response} res - Respuesta HTTP de Express.
 * @param {NextFunction} next - Función para continuar la ejecución de la solicitud.
 * @reglaDeNegocio Los administradores superan la restricción. Para el rol Padre/Tutor, si no existe el vínculo en 'parentescos', se bloquea la solicitud con 403 Forbidden.
 */
export async function validarVinculoParentesco(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Acceso no autorizado. Usuario no autenticado.' });
      return;
    }

    // Permitir acceso total si el usuario es Administrador
    if (req.usuario.rol === 'Admin') {
      next();
      return;
    }

    // Extraer el alumnoId desde params, query o body
    const alumnoId = req.params.alumnoId || req.query.alumnoId || req.body.alumnoId;

    if (!alumnoId) {
      res.status(400).json({ error: 'Identificador del alumno no provisto en la solicitud.' });
      return;
    }

    // Si el usuario logueado es el propio alumno consultando sus datos
    if (req.usuario.rol === 'Alumno' && String(req.usuario._id) === String(alumnoId)) {
      next();
      return;
    }

    // Validar en la colección 'parentescos' la relación exacta entre padre_id y alumno_id
    const relacionExiste = await Parentesco.findOne({
      padre_id: req.usuario._id,
      alumno_id: alumnoId,
    });

    if (!relacionExiste) {
      res.status(403).json({
        error: 'Acceso denegado. El estudiante solicitado no posee un vínculo de tutoría registrado con su cuenta.',
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('❌ Error en middleware de validación de parentesco:', error);
    res.status(500).json({
      error: 'Error interno de validación de parentesco.',
      detalle: error.message,
    });
  }
}
