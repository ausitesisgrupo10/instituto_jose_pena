/**
 * @archivo src/routes/directorRoutes.ts
 * @descripción Rutas de Express para el Tablero Directivo y Reportes Consolidados del Rol Director.
 */

import { Router } from 'express';
import {
  obtenerResumenDirectivo,
  obtenerReportesDirectivo,
  obtenerNotificacionesInasistencias,
  resolverSolicitudInasistencia,
} from '../controllers/directorController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/resumen', autorizarRoles('Director', 'Admin'), obtenerResumenDirectivo);
router.get('/reportes', autorizarRoles('Director', 'Admin'), obtenerReportesDirectivo);
router.get(
  '/notificaciones-inasistencias',
  autorizarRoles('Director', 'Admin'),
  obtenerNotificacionesInasistencias
);
router.patch(
  '/solicitudes-inasistencia/:id/resolver',
  autorizarRoles('Director', 'Admin'),
  resolverSolicitudInasistencia
);

export default router;
