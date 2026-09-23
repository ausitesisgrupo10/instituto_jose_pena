/**
 * @archivo src/middleware/docenteAuthMiddleware.ts
 * @descripción Middleware de autorización para validar la titularidad del docente sobre las materias asignadas.
 * @reglaDeNegocio Un docente solo puede crear, modificar y eliminar calificaciones en asignaturas donde figura como titular (docente_id === req.usuario._id).
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { Materia } from '../models/Materia.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';

/**
 * @función validarTitularidadMateria
 * @descripción Verifica que el docente autenticado sea el titular de la materia antes de permitir crear, actualizar o borrar calificaciones.
 * @param {AuthRequest} req - Solicitud de Express con req.usuario y datos de req.body o req.params.
 * @param {Response} res - Respuesta de Express.
 * @param {NextFunction} next - Función para continuar la ejecución de la ruta.
 * @reglaDeNegocio Admins y No Docentes tienen acceso completo. Los Docentes solo pueden operar sobre sus propias materias.
 */
export async function validarTitularidadMateria(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    // Admins y No Docentes tienen permiso global
    if (req.usuario.rol === 'Admin' || req.usuario.rol === 'No Docente') {
      next();
      return;
    }

    if (req.usuario.rol !== 'Docente') {
      res.status(403).json({ error: 'Acceso denegado: Requiere rol de Docente, No Docente o Admin.' });
      return;
    }

    let materiaIdStr: string | null = null;

    // Caso 1: Creación (materia_id viene en req.body)
    if (req.body && req.body.materia_id) {
      materiaIdStr = req.body.materia_id.toString();
    }
    // Caso 2: Edición/Eliminación por ID de registro (req.params.id)
    else if (req.params && req.params.id) {
      const registro = await RegistroAcademico.findById(req.params.id);
      if (!registro) {
        res.status(404).json({ error: 'Registro académico no encontrado.' });
        return;
      }
      materiaIdStr = registro.materia_id.toString();
    }

    if (!materiaIdStr) {
      res.status(400).json({ error: 'No se pudo identificar la materia asociada a la operación.' });
      return;
    }

    // Verificar si la materia está asignada al docente autenticado
    const materiaAsignada = await Materia.findOne({
      _id: materiaIdStr,
      docente_id: req.usuario._id,
    });

    if (!materiaAsignada) {
      res.status(403).json({
        error: 'Acceso denegado: Un docente no puede modificar ni eliminar notas de materias dictadas por otros docentes.',
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('❌ Error en middleware de validación docente:', error);
    res.status(500).json({ error: 'Error interno de autorización docente.', detalle: error.message });
  }
}
