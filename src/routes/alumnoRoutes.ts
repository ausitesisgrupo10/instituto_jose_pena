/**
 * @archivo src/routes/alumnoRoutes.ts
 * @descripción Rutas de Express para los endpoints restringidos de Alumnos en el Instituto José Peña.
 */

import { Router } from 'express';
import { obtenerMiBoletin } from '../controllers/alumnoController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

/**
 * @ruta GET /api/alumnos/mi-boletin
 * @descripción Obtiene el boletín académico individual, inasistencias y sanciones del alumno logueado.
 * @seguridad Requiere Token JWT. Filtra estrictamente por el ID del usuario en la sesión.
 */
router.get('/mi-boletin', autorizarRoles('Alumno', 'Admin', 'Padre'), obtenerMiBoletin);

export default router;
