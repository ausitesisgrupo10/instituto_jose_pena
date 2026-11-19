/**
 * @archivo src/routes/docenteRoutes.ts
 * @descripción Rutas de Express para los endpoints restringidos del Panel Docente en el Instituto José Peña.
 */

import { Router } from 'express';
import {
  obtenerPerfilDocente,
  obtenerHorariosDocente,
  obtenerInasistenciasYActasDocente,
  solicitarInasistenciaDocente,
  obtenerMisMateriasYAlumnos,
  buscarRegistrosDocente,
  obtenerDetalleRegistroAlumno,
} from '../controllers/docenteController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

/**
 * @ruta GET /api/docentes/perfil
 * @descripción Devuelve los datos personales del docente (Nombre, DNI, Celular, Barrio, Dirección).
 */
router.get('/perfil', autorizarRoles('Docente', 'No Docente', 'Admin'), obtenerPerfilDocente);

/**
 * @ruta GET /api/docentes/horarios
 * @descripción Devuelve la grilla horaria de las materias asignadas al docente.
 */
router.get('/horarios', autorizarRoles('Docente', 'Admin'), obtenerHorariosDocente);

/**
 * @ruta GET /api/docentes/mis-inasistencias
 * @descripción Consulta las asistencias, faltas, solicitudes pendientes y actas del propio docente o no docente.
 */
router.get('/mis-inasistencias', autorizarRoles('Docente', 'No Docente', 'Admin'), obtenerInasistenciasYActasDocente);

/**
 * @ruta POST /api/docentes/solicitar-inasistencia
 * @descripción Registra una solicitud de inasistencia (Docente o No Docente) en estado Pendiente con motivo, observación y adjunto PNG/PDF.
 */
router.post('/solicitar-inasistencia', autorizarRoles('Docente', 'No Docente', 'Admin'), solicitarInasistenciaDocente);

/**
 * @ruta GET /api/docentes/mis-materias
 * @descripción Devuelve las materias asignadas al docente con sus correspondientes estudiantes.
 */
router.get('/mis-materias', autorizarRoles('Docente', 'Admin'), obtenerMisMateriasYAlumnos);

/**
 * @ruta GET /api/docentes/buscar-registros
 * @descripción Multifiltro de registros por curso, división, turno, apellido, nombre o DNI.
 */
router.get('/buscar-registros', autorizarRoles('Docente', 'Admin'), buscarRegistrosDocente);

/**
 * @ruta GET /api/docentes/registro-alumno/:alumnoId
 * @descripción Devuelve la ficha detallada de un alumno (datos personales, materias/notas trimestrales, sanciones y observación general).
 */
router.get('/registro-alumno/:alumnoId', autorizarRoles('Docente', 'Admin'), obtenerDetalleRegistroAlumno);

export default router;
