/**
 * @archivo src/routes/userRoutes.ts
 * @descripción Rutas de Express para ABM / CRUD de Usuarios (Restringidas por JWT y Rol Admin).
 */

import { Router } from 'express';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from '../controllers/userController.js';
import { autenticarJWT, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(autenticarJWT);

/**
 * @ruta GET /api/usuarios
 * @descripción Obtiene la lista de usuarios. Accesible por Admin, Docente y No Docente.
 */
router.get('/', autorizarRoles('Admin', 'Docente', 'No Docente'), listarUsuarios);

/**
 * @ruta POST /api/usuarios
 * @descripción Crea un nuevo usuario. Restringido a Admin.
 */
router.post('/', autorizarRoles('Admin'), crearUsuario);

router.put('/:id', autorizarRoles('Admin'), actualizarUsuario);

/**
 * @ruta DELETE /api/usuarios/:id
 * @descripción Elimina un usuario por ID. Restringido a Admin.
 */
router.delete('/:id', autorizarRoles('Admin'), eliminarUsuario);

/**
 * @ruta POST /api/usuarios/seed
 * @descripción Restablece la base de datos con el dataset inicial oficial.
 */
router.post('/seed', autorizarRoles('Admin'), async (_req, res) => {
  try {
    const { sembrarDatasetCompleto } = await import('../db/seedDataset.js');
    await sembrarDatasetCompleto();
    res.json({ mensaje: 'Dataset institucional sembrado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al ejecutar seeding', detalle: error.message });
  }
});

export default router;
