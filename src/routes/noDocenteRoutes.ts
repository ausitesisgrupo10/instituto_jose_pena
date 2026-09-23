/**
 * @archivo src/routes/noDocenteRoutes.ts
 * @descripción Rutas de la API REST para las funcionalidades exclusivas del rol No Docente (Preceptoría / Administración).
 * @reglaDeNegocio Requiere token JWT válido para acceder a las operaciones de asistencias y fichas unificadas.
 */

import { Router } from 'express';
import { autenticarJWT } from '../middleware/authMiddleware.js';
import {
  registrarAsistenciaDiaria,
  listarAsistencias,
  actualizarAsistencia,
  eliminarAsistencia,
  consultarPersonasUnificado,
  obtenerFichaDocente,
} from '../controllers/noDocenteController.js';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(autenticarJWT);

// Control de Asistencias Diarias (Alumnos y Docentes)
router.get('/asistencias', listarAsistencias);
router.post('/asistencias', registrarAsistenciaDiaria);
router.put('/asistencias/:id', actualizarAsistencia);
router.delete('/asistencias/:id', eliminarAsistencia);

// Consulta Unificada de Personas
router.get('/personas', consultarPersonasUnificado);

// Ficha Completa del Docente (Horarios, Materias y Asistencias)
router.get('/docente/:id/ficha', obtenerFichaDocente);

export default router;
