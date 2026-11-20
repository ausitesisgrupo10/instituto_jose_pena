/**
 * @archivo src/routes/noDocenteRoutes.ts
 * @descripción Rutas de la API REST para las funcionalidades exclusivas del rol No Docente (Preceptoría / Administración).
 * @reglaDeNegocio Requiere token JWT válido para acceder a las operaciones de asistencias y fichas unificadas.
 */

import { Router } from 'express';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';
import {
  registrarAsistenciaDiaria,
  listarAsistencias,
  actualizarAsistencia,
  eliminarAsistencia,
  consultarPersonasUnificado,
  obtenerFichaDocente,
  listarAlumnosAbm,
  crearAlumnoAbm,
  actualizarAlumnoAbm,
  eliminarAlumnoAbm,
  listarDocentesAbm,
  crearDocenteAbm,
  actualizarDocenteAbm,
  eliminarDocenteAbm,
  listarNoDocentesAbm,
  crearNoDocenteAbm,
  actualizarNoDocenteAbm,
  eliminarNoDocenteAbm,
  obtenerReportesMultifiltroNoDocente,
} from '../controllers/noDocenteController.js';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(autenticarJWT);

// Control de Asistencias Diarias (Alumnos, Docentes y No Docentes)
router.get('/asistencias', listarAsistencias);
router.post('/asistencias', registrarAsistenciaDiaria);
router.put('/asistencias/:id', actualizarAsistencia);
router.delete('/asistencias/:id', eliminarAsistencia);

// ABM de Alumnos (Alta, Modificación y Baja — Rol No Docente / Admin)
router.get('/alumnos', autorizarRoles('No Docente', 'Admin', 'Director'), listarAlumnosAbm);
router.post('/alumnos', autorizarRoles('No Docente', 'Admin'), crearAlumnoAbm);
router.put('/alumnos/:id', autorizarRoles('No Docente', 'Admin'), actualizarAlumnoAbm);
router.delete('/alumnos/:id', autorizarRoles('No Docente', 'Admin'), eliminarAlumnoAbm);

// ABM de Docentes (Alta y Modificación: No Docente / Director / Admin; Baja / Inactivación: EXCLUSIVO Director)
router.get('/docentes', autorizarRoles('No Docente', 'Director', 'Admin'), listarDocentesAbm);
router.post('/docentes', autorizarRoles('No Docente', 'Director', 'Admin'), crearDocenteAbm);
router.put('/docentes/:id', autorizarRoles('No Docente', 'Director', 'Admin'), actualizarDocenteAbm);
router.delete('/docentes/:id', autorizarRoles('Director'), eliminarDocenteAbm);

// ABM de No Docentes (Alta y Modificación: No Docente / Director / Admin; Baja / Inactivación: EXCLUSIVO Director)
router.get('/no-docentes', autorizarRoles('No Docente', 'Director', 'Admin'), listarNoDocentesAbm);
router.post('/no-docentes', autorizarRoles('No Docente', 'Director', 'Admin'), crearNoDocenteAbm);
router.put('/no-docentes/:id', autorizarRoles('No Docente', 'Director', 'Admin'), actualizarNoDocenteAbm);
router.delete('/no-docentes/:id', autorizarRoles('Director'), eliminarNoDocenteAbm);

// Reportes Multifiltro y Exportación Consolidada (.xls) para No Docente
router.get(
  '/reportes-consolidados',
  autorizarRoles('No Docente', 'Admin', 'Director'),
  obtenerReportesMultifiltroNoDocente
);

// Consulta Unificada de Personas
router.get('/personas', consultarPersonasUnificado);

// Ficha Completa del Docente (Horarios, Materias y Asistencias)
router.get('/docente/:id/ficha', obtenerFichaDocente);

export default router;
