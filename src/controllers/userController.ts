/**
 * @archivo src/controllers/userController.ts
 * @descripción Controlador para la gestión de usuarios (ABM/CRUD) del Instituto José Peña.
 */

import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';

/**
 * @función listarUsuarios
 * @descripción Lista todos los usuarios registrados con opción de filtrado por rol y búsqueda por DNI o Nombre.
 * @param {Request} req - Solicitud HTTP con Query Params ?rol= &search=.
 * @param {Response} res - Respuesta HTTP con arreglo JSON de usuarios.
 * @reglaDeNegocio Retorna usuarios ordenados alfabéticamente con curso y sección poblados para alumnos.
 */
export async function listarUsuarios(req: Request, res: Response): Promise<void> {
  try {
    const { rol, search } = req.query;
    const filtro: any = {};

    if (rol && rol !== 'Todos') {
      filtro.rol = rol;
    }

    if (search) {
      const regex = new RegExp(String(search), 'i');
      filtro.$or = [{ nombre: regex }, { apellido: regex }, { dni: regex }];
    }

    const usuarios = await User.find(filtro)
      .populate('curso_id')
      .populate('seccion_id')
      .sort({ apellido: 1, nombre: 1 });

    res.json(usuarios);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar usuarios.', detalle: error.message });
  }
}

/**
 * @función crearUsuario
 * @descripción Crea un nuevo usuario en la base de datos de MongoDB.
 * @param {Request} req - Solicitud HTTP con payload { dni, nombre, apellido, rol, permisos, perfil_metadata, password, curso_id, seccion_id, turno }.
 * @param {Response} res - Respuesta HTTP con el usuario creado.
 * @reglaDeNegocio El DNI no debe estar registrado previamente. Para alumnos se asocian curso, sección y turno.
 */
export async function crearUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { dni, nombre, apellido, rol, permisos, perfil_metadata, password, curso_id, seccion_id, turno } = req.body;

    if (!dni || !nombre || !apellido || !rol) {
      res.status(400).json({ error: 'Campos requeridos faltantes (dni, nombre, apellido, rol).' });
      return;
    }

    const existe = await User.findOne({ dni: dni.trim() } as any);
    if (existe) {
      res.status(400).json({ error: `Ya existe un usuario con el DNI ${dni}.` });
      return;
    }

    const metadata: Record<string, any> = { ...(perfil_metadata || {}) };

    if (rol === 'Alumno') {
      if (curso_id) metadata.curso_id = curso_id;
      if (seccion_id) metadata.seccion_id = seccion_id;
      if (turno) metadata.turno = turno;

      // Resolver nombres legibles de curso y sección
      if (curso_id) {
        const cDoc = await Curso.findById(curso_id);
        if (cDoc) metadata.curso = cDoc.nombre_curso;
      }
      if (seccion_id) {
        const sDoc = await Seccion.findById(seccion_id);
        if (sDoc) {
          metadata.seccion = sDoc.nombre_seccion;
          if (!turno && sDoc.turno) {
            metadata.turno = sDoc.turno;
          }
        }
      }
    }

    const nuevoUsuario = await User.create({
      dni: dni.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rol,
      permisos: permisos || [],
      perfil_metadata: metadata,
      curso_id: rol === 'Alumno' ? (curso_id || null) : null,
      seccion_id: rol === 'Alumno' ? (seccion_id || null) : null,
      turno: rol === 'Alumno' ? (turno || metadata.turno || null) : null,
      passwordHash: password || '123456',
      estado: 'Activo',
    });

    const usuarioPoblado = await User.findById(nuevoUsuario._id)
      .populate('curso_id')
      .populate('seccion_id');

    res.status(201).json(usuarioPoblado || nuevoUsuario);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear usuario.', detalle: error.message });
  }
}

/**
 * @función actualizarUsuario
 * @descripción Actualiza los datos de un usuario existente según su ID.
 * @param {Request} req - Solicitud HTTP con parametro :id y payload de cambios.
 * @param {Response} res - Respuesta HTTP con el usuario actualizado.
 * @reglaDeNegocio El Administrador puede modificar datos personales, rol, estado, curso, sección y turno.
 */
export async function actualizarUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { nombre, apellido, rol, estado, permisos, perfil_metadata, password, curso_id, seccion_id, turno } = req.body;

    const actualizacion: any = {};
    if (nombre) actualizacion.nombre = nombre.trim();
    if (apellido) actualizacion.apellido = apellido.trim();
    if (rol) actualizacion.rol = rol;
    if (estado) actualizacion.estado = estado;
    if (permisos) actualizacion.permisos = permisos;
    if (password) actualizacion.passwordHash = password;

    const usuarioPrevio = await User.findById(id);
    if (!usuarioPrevio) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const metadata: Record<string, any> = {
      ...(usuarioPrevio.perfil_metadata || {}),
      ...(perfil_metadata || {}),
    };

    const targetRol = rol || usuarioPrevio.rol;

    if (targetRol === 'Alumno') {
      actualizacion.curso_id = curso_id !== undefined ? (curso_id || null) : usuarioPrevio.curso_id;
      actualizacion.seccion_id = seccion_id !== undefined ? (seccion_id || null) : usuarioPrevio.seccion_id;
      actualizacion.turno = turno !== undefined ? (turno || null) : usuarioPrevio.turno;

      if (actualizacion.curso_id) {
        metadata.curso_id = actualizacion.curso_id;
        const cDoc = await Curso.findById(actualizacion.curso_id);
        if (cDoc) metadata.curso = cDoc.nombre_curso;
      }
      if (actualizacion.seccion_id) {
        metadata.seccion_id = actualizacion.seccion_id;
        const sDoc = await Seccion.findById(actualizacion.seccion_id);
        if (sDoc) {
          metadata.seccion = sDoc.nombre_seccion;
          if (!actualizacion.turno && sDoc.turno) {
            actualizacion.turno = sDoc.turno;
          }
        }
      }
      if (actualizacion.turno) {
        metadata.turno = actualizacion.turno;
      }

      actualizacion.perfil_metadata = metadata;
    } else if (rol && rol !== 'Alumno') {
      actualizacion.curso_id = null;
      actualizacion.seccion_id = null;
      actualizacion.turno = null;
      delete metadata.curso_id;
      delete metadata.seccion_id;
      delete metadata.curso;
      delete metadata.seccion;
      delete metadata.turno;
      actualizacion.perfil_metadata = metadata;
    } else if (perfil_metadata) {
      actualizacion.perfil_metadata = metadata;
    }

    const usuario = await User.findByIdAndUpdate(id, actualizacion, { new: true })
      .populate('curso_id')
      .populate('seccion_id');

    res.json(usuario);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar usuario.', detalle: error.message });
  }
}

/**
 * @función eliminarUsuario
 * @descripción Elimina permanentemente un usuario de la base de datos por su ID.
 * @param {Request} req - Solicitud HTTP con parámetro :id.
 * @param {Response} res - Respuesta HTTP con mensaje de confirmación.
 * @reglaDeNegocio Acción restringida exclusivamente al Administrador.
 */
export async function eliminarUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eliminado = await User.findByIdAndDelete(id);

    if (!eliminado) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Usuario eliminado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar usuario.', detalle: error.message });
  }
}
