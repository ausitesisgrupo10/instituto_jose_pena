/**
 * @archivo src/routes/docenteRoutes.ts
 * @descripción Rutas de Express para los endpoints restringidos del Panel Docente en el Instituto José Peña.
 */

import { Router } from 'express';
import {
  obtenerPerfilDocente,
  obtenerHorariosDocente,
  obtenerInasistenciasYActasDocente,
  obtenerMisMateriasYAlumnos,
} from '../controllers/docenteController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

/**
 * @ruta GET /api/docentes/perfil
 * @descripción Devuelve los datos personales del docente (Nombre, DNI, Celular, Barrio, Dirección).
 */
router.get('/perfil', autorizarRoles('Docente', 'Admin'), obtenerPerfilDocente);

/**
 * @ruta GET /api/docentes/horarios
 * @descripción Devuelve la grilla horaria de las materias asignadas al docente.
 */
router.get('/horarios', autorizarRoles('Docente', 'Admin'), obtenerHorariosDocente);

/**
 * @ruta GET /api/docentes/mis-inasistencias
 * @descripción Consulta las asistencias, faltas y actas del propio docente.
 */
router.get('/mis-inasistencias', autorizarRoles('Docente', 'Admin'), obtenerInasistenciasYActasDocente);

/**
 * @ruta GET /api/docentes/mis-materias
 * @descripción Devuelve las materias asignadas al docente con sus correspondientes estudiantes.
 */
router.get('/mis-materias', autorizarRoles('Docente', 'Admin'), obtenerMisMateriasYAlumnos);

export default router;
