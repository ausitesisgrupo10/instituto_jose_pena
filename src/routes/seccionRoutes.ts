/**
 * @archivo src/routes/seccionRoutes.ts
 * @descripción Rutas de Express para la gestión de Secciones / Divisiones.
 */

import { Router } from 'express';
import {
  listarSecciones,
  crearSeccion,
  actualizarSeccion,
  eliminarSeccion,
} from '../controllers/seccionController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', autorizarRoles('Admin', 'Docente', 'No Docente'), listarSecciones);
router.post('/', autorizarRoles('Admin'), crearSeccion);
router.put('/:id', autorizarRoles('Admin'), actualizarSeccion);
router.delete('/:id', autorizarRoles('Admin'), eliminarSeccion);

export default router;
