/**
 * @archivo src/routes/materiaRoutes.ts
 * @descripción Rutas de Express para la gestión de Materias curriculares.
 */

import { Router } from 'express';
import {
  listarMaterias,
  crearMateria,
  actualizarMateria,
  eliminarMateria,
} from '../controllers/materiaController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', listarMaterias);
router.post('/', autorizarRoles('Admin', 'No Docente'), crearMateria);
router.put('/:id', autorizarRoles('Admin', 'No Docente', 'Docente'), actualizarMateria);
router.delete('/:id', autorizarRoles('Admin'), eliminarMateria);

export default router;
