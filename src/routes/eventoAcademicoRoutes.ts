/**
 * @archivo src/routes/eventoAcademicoRoutes.ts
 * @descripción Rutas de Express para el Calendario Académico Institucional del Instituto José Peña.
 */

import { Router } from 'express';
import {
  listarEventosAcademicos,
  obtenerProximosEventos,
  crearEventoAcademico,
  actualizarEventoAcademico,
  eliminarEventoAcademico,
  restablecerEventosDefault,
} from '../controllers/eventoAcademicoController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Todas las rutas del calendario requieren autenticación JWT
router.use(autenticarJWT);

/**
 * @ruta GET /api/eventos-academicos
 * @descripción Listado de eventos académicos con filtros (mes, año, tipo, nivel, búsqueda).
 * Accesible por todos los roles institucionales: Admin, Docente, No Docente, Alumno, Padre.
 */
router.get('/', listarEventosAcademicos);

/**
 * @ruta GET /api/eventos-academicos/proximos
 * @descripción Próximos eventos destacados a partir de hoy.
 */
router.get('/proximos', obtenerProximosEventos);

/**
 * @ruta POST /api/eventos-academicos
 * @descripción Crear un nuevo evento en el calendario (Admin y Docente).
 */
router.post('/', autorizarRoles('Admin', 'Docente'), crearEventoAcademico);

/**
 * @ruta PUT /api/eventos-academicos/:id
 * @descripción Actualizar un evento existente (Admin y Docente).
 */
router.put('/:id', autorizarRoles('Admin', 'Docente'), actualizarEventoAcademico);

/**
 * @ruta DELETE /api/eventos-academicos/:id
 * @descripción Eliminar un evento (Admin y Docente).
 */
router.delete('/:id', autorizarRoles('Admin', 'Docente'), eliminarEventoAcademico);

/**
 * @ruta POST /api/eventos-academicos/restablecer
 * @descripción Restablece los eventos oficiales por defecto para 2026 (Admin).
 */
router.post('/restablecer', autorizarRoles('Admin'), restablecerEventosDefault);

export default router;
