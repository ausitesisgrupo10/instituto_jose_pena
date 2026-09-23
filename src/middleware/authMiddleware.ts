/**
 * @archivo src/middleware/authMiddleware.ts
 * @descripción Middleware de Autenticación JWT y Autorización basada en Roles para el Instituto José Peña.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'instituto_jose_pena_secret_key_2026';

/**
 * Interfaz para extender la solicitud HTTP de Express con el usuario autenticado.
 */
export interface AuthRequest extends Request {
  usuario?: any;
}

/**
 * @función autenticarJWT
 * @descripción Valida el token JWT en la cabecera Authorization 'Bearer <token>'.
 * @param {AuthRequest} req - Solicitud Express extendida.
 * @param {Response} res - Respuesta HTTP.
 * @param {NextFunction} next - Siguiente middleware.
 * @reglaDeNegocio Rechaza solicitudes no autenticadas con código 401 Unauthorized.
 */
export async function autenticarJWT(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso no autorizado. Se requiere un token de autenticación.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; rol: string };
    const usuario = await User.findById(decoded.id);

    if (!usuario || usuario.estado !== 'Activo') {
      res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * @función autorizarRoles
 * @descripción Restringe el acceso a un endpoint según una lista de roles permitidos.
 * @param {Array<string>} rolesPermitidos - Lista de roles (ej: ['Admin', 'Docente']).
 * @returns {Function} Express Middleware.
 * @reglaDeNegocio Si el rol del usuario no está en la lista permitida, devuelve 403 Forbidden.
 */
export function autorizarRoles(...rolesPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol) && req.usuario.rol !== 'Admin') {
      res.status(403).json({
        error: `Acceso denegado. Su rol (${req.usuario.rol}) no posee permisos para realizar esta acción.`,
      });
      return;
    }

    next();
  };
}
