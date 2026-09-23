/**
 * @archivo src/controllers/authController.ts
 * @descripción Controlador de Autenticación para el ingreso de usuarios al Instituto José Peña.
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'instituto_jose_pena_secret_key_2026';

/**
 * @función iniciarSesion
 * @descripción Inicia sesión mediante DNI y contraseña, retornando un Token JWT y datos del perfil.
 * @param {Request} req - Objeto de solicitud HTTP con payload { dni, password }.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @reglaDeNegocio El DNI debe existir y el usuario debe estar en estado 'Activo'.
 */
export async function iniciarSesion(req: Request, res: Response): Promise<void> {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      res.status(400).json({ error: 'Debe ingresar el DNI y la contraseña.' });
      return;
    }

    const usuario = await User.findOne({ dni: dni.trim() }).select('+passwordHash');

    if (!usuario) {
      res.status(404).json({ error: 'No se encontró ningún usuario registrado con el DNI especificado.' });
      return;
    }

    if (usuario.estado !== 'Activo') {
      res.status(403).json({ error: 'La cuenta se encuentra inactiva. Contacte al administrador.' });
      return;
    }

    const esValida = await usuario.comparePassword(password);
    if (!esValida) {
      res.status(401).json({ error: 'Contraseña incorrecta.' });
      return;
    }

    const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, JWT_SECRET, {
      expiresIn: '24h',
    });

    const usuarioJSON = usuario.toObject();
    delete usuarioJSON.passwordHash;

    res.json({
      token,
      usuario: usuarioJSON,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno en el servidor al autenticar.', detalle: error.message });
  }
}

/**
 * @función obtenerUsuarioActual
 * @descripción Retorna la información del usuario autenticado actualmente.
 * @param {AuthRequest} req - Solicitud Express con usuario adjunto.
 * @param {Response} res - Respuesta HTTP.
 * @reglaDeNegocio Requiere token JWT válido.
 */
export async function obtenerUsuarioActual(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }
    res.json(req.usuario);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el perfil actual.', detalle: error.message });
  }
}
