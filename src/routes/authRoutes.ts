/**
 * @archivo src/routes/authRoutes.ts
 * @descripción Rutas de autenticación para inicio de sesión y verificación de credenciales.
 */

import { Router } from 'express';
import { iniciarSesion, obtenerUsuarioActual } from '../controllers/authController.js';
import { autenticarJWT } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @ruta POST /api/auth/login
 * @descripción Inicia sesión con DNI y contraseña.
 */
router.post('/login', iniciarSesion);

/**
 * @ruta GET /api/auth/me
 * @descripción Devuelve la información del usuario en sesión actual.
 */
router.get('/me', autenticarJWT, obtenerUsuarioActual);

export default router;
