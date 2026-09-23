/**
 * @archivo src/routes/parentescoRoutes.ts
 * @descripción Rutas de Express para el ABM de Parentescos entre Padres/Tutores y Alumnos.
 */

import { Router } from 'express';
import {
  listarParentescos,
  crearParentesco,
  actualizarParentesco,
  eliminarParentesco,
} from '../controllers/parentescoController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', autorizarRoles('Admin', 'No Docente', 'Docente'), listarParentescos);
router.post('/', autorizarRoles('Admin'), crearParentesco);
router.put('/:id', autorizarRoles('Admin'), actualizarParentesco);
router.delete('/:id', autorizarRoles('Admin'), eliminarParentesco);

export default router;
