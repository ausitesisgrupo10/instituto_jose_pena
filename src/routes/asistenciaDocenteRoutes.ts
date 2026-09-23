/**
 * @archivo src/routes/asistenciaDocenteRoutes.ts
 * @descripción Rutas de Express para la carga y reporte de Asistencia Docente.
 */

import { Router } from 'express';
import {
  registrarAsistenciaDocente,
  listarAsistenciasDocentes,
} from '../controllers/asistenciaDocenteController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/', autorizarRoles('Admin', 'No Docente'), listarAsistenciasDocentes);
router.post('/', autorizarRoles('Admin', 'No Docente'), registrarAsistenciaDocente);

export default router;
