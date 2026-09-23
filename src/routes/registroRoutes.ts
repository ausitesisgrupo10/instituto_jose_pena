/**
 * @archivo src/routes/registroRoutes.ts
 * @descripción Rutas de Express para Registros Académicos (Calificaciones, Asistencias, Sanciones).
 */

import { Router } from 'express';
import {
  registrarCalificacion,
  listarRegistros,
  actualizarRegistro,
  eliminarRegistro,
} from '../controllers/registroController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';
import { validarTitularidadMateria } from '../middleware/docenteAuthMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', listarRegistros);
router.post('/', autorizarRoles('Admin', 'Docente', 'No Docente'), validarTitularidadMateria, registrarCalificacion);
router.put('/:id', autorizarRoles('Admin', 'Docente', 'No Docente'), validarTitularidadMateria, actualizarRegistro);
router.delete('/:id', autorizarRoles('Admin', 'Docente'), validarTitularidadMateria, eliminarRegistro);

export default router;

