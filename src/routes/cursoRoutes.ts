/**
 * @archivo src/routes/cursoRoutes.ts
 * @descripción Rutas de Express para la administración de Cursos.
 */

import { Router } from 'express';
import {
  listarCursos,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
} from '../controllers/cursoController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', autorizarRoles('Admin', 'Docente', 'No Docente'), listarCursos);
router.post('/', autorizarRoles('Admin'), crearCurso);
router.put('/:id', autorizarRoles('Admin'), actualizarCurso);
router.delete('/:id', autorizarRoles('Admin'), eliminarCurso);

export default router;
