/**
 * @archivo src/routes/tutorRoutes.ts
 * @descripción Rutas API REST para la consulta de expedientes de alumnos por parte del rol Padre / Tutor.
 * @reglaDeNegocio Requiere autenticación JWT y validación estricta de parentesco en Mongoose para proteger los datos de los estudiantes.
 */

import { Router } from 'express';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';
import { validarVinculoParentesco } from '../middleware/parentescoMiddleware.js';
import { obtenerHijosDelTutor, obtenerBoletinHijo } from '../controllers/tutorController.js';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(autenticarJWT);

/**
 * @ruta GET /api/tutor/hijos
 * @descripción Lista los estudiantes a cargo vinculados al tutor autenticado.
 */
router.get('/hijos', autorizarRoles('Padre', 'Admin'), obtenerHijosDelTutor);

/**
 * @ruta GET /api/tutor/boletin/:alumnoId
 * @descripción Obtiene el boletín completo con calificaciones, asistencias y sanciones del estudiante.
 * @middleware validarVinculoParentesco Verifica en 'parentescos' que el alumno perteneces al padre autenticado.
 */
router.get(
  '/boletin/:alumnoId',
  autorizarRoles('Padre', 'Admin'),
  validarVinculoParentesco,
  obtenerBoletinHijo
);

export default router;
