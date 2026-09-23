/**
 * @archivo src/routes/reporteRoutes.ts
 * @descripción Rutas de Express para obtención de métricas, reportes estadísticos e indicadores del Instituto José Peña.
 */

import { Router } from 'express';
import {
  obtenerEstadisticasKPI,
  generarReporteEstadistico,
} from '../controllers/reporteController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

router.get('/kpi', autorizarRoles('Admin', 'Docente', 'No Docente'), obtenerEstadisticasKPI);
router.get('/estadisticas', autorizarRoles('Admin', 'Docente', 'No Docente'), generarReporteEstadistico);

export default router;
