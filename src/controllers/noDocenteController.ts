/**
 * @archivo src/controllers/noDocenteController.ts
 * @descripción Controlador REST para el rol No Docente (Preceptoría y Administración) del Instituto José Peña.
 * @reglaDeNegocio Gestiona el control de asistencias diarias, consulta unificada de personas y ficha integral del docente.
 */

import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Asistencia } from '../models/Asistencia.js';
import { User } from '../models/User.js';
import { Materia } from '../models/Materia.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { RegistroDocente } from '../models/RegistroDocente.js';

/**
 * @función registrarAsistenciaDiaria
 * @descripción Registra la asistencia (Presente/Ausente) con comentarios de un alumno o docente para una fecha determinada.
 * @param {AuthRequest} req - Solicitud Express con persona_id, tipo_persona, fecha, estado y comentario.
 * @param {Response} res - Respuesta Express confirmando la creación.
 * @reglaDeNegocio Las asistencias Presente se visualizan en verde y Ausente en rojo.
 */
export async function registrarAsistenciaDiaria(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { persona_id, tipo_persona, fecha, estado, comentario, materia_id, seccion_id } = req.body;

    if (!persona_id || !tipo_persona || !estado) {
      res.status(400).json({ error: 'Campos obligatorios faltantes (persona_id, tipo_persona, estado).' });
      return;
    }

    const asistencia = await Asistencia.create({
      persona_id,
      tipo_persona,
      fecha: fecha ? new Date(fecha) : new Date(),
      estado,
      comentario: comentario || '',
      materia_id: materia_id || undefined,
      seccion_id: seccion_id || undefined,
    });

    const poblada = await Asistencia.findById(asistencia._id)
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion');

    res.status(201).json(poblada);
  } catch (error: any) {
    console.error('❌ Error al registrar asistencia:', error);
    res.status(500).json({ error: 'Error al registrar la asistencia.', detalle: error.message });
  }
}

/**
 * @función listarAsistencias
 * @descripción Obtiene el listado de asistencias filtrado por fecha, tipo de persona (Alumno/Docente) o persona específica.
 * @param {AuthRequest} req - Solicitud HTTP con query params (?fecha= &tipo_persona= &persona_id=).
 * @param {Response} res - Respuesta HTTP con el arreglo de asistencias pobladas.
 */
export async function listarAsistencias(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fecha, tipo_persona, persona_id } = req.query;
    const filtro: any = {};

    if (tipo_persona && tipo_persona !== 'todos') {
      filtro.tipo_persona = tipo_persona;
    }

    if (persona_id) {
      filtro.persona_id = persona_id;
    }

    if (fecha) {
      const inicio = new Date(fecha as string);
      inicio.setUTCHours(0, 0, 0, 0);
      const fin = new Date(fecha as string);
      fin.setUTCHours(23, 59, 59, 999);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const lista = await Asistencia.find(filtro)
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion')
      .sort({ fecha: -1, createdAt: -1 });

    res.json(lista);
  } catch (error: any) {
    console.error('❌ Error al listar asistencias:', error);
    res.status(500).json({ error: 'Error al obtener listado de asistencias.', detalle: error.message });
  }
}

/**
 * @función actualizarAsistencia
 * @descripción Modifica el estado o comentario de una asistencia previamente registrada.
 * @param {AuthRequest} req - Solicitud Express con ID en params y estado, comentario o fecha en body.
 * @param {Response} res - Respuesta Express con el registro actualizado.
 */
export async function actualizarAsistencia(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { estado, comentario, fecha } = req.body;

    const actualizacion: any = {};
    if (estado) actualizacion.estado = estado;
    if (comentario !== undefined) actualizacion.comentario = comentario;
    if (fecha) actualizacion.fecha = new Date(fecha);

    const editada = await Asistencia.findByIdAndUpdate(id, actualizacion, { new: true })
      .populate('persona_id', 'nombre apellido dni rol')
      .populate('materia_id', 'nombre_materia')
      .populate('seccion_id', 'nombre_seccion');

    if (!editada) {
      res.status(404).json({ error: 'Registro de asistencia no encontrado.' });
      return;
    }

    res.json(editada);
  } catch (error: any) {
    console.error('❌ Error al actualizar asistencia:', error);
    res.status(500).json({ error: 'Error al actualizar asistencia.', detalle: error.message });
  }
}

/**
 * @función eliminarAsistencia
 * @descripción Elimina un registro de asistencia por su ID.
 * @param {AuthRequest} req - Solicitud Express con id en req.params.
 * @param {Response} res - Respuesta confirmando eliminación.
 */
export async function eliminarAsistencia(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Asistencia.findByIdAndDelete(id);
    res.json({ mensaje: 'Asistencia eliminada exitosamente.' });
  } catch (error: any) {
    console.error('❌ Error al eliminar asistencia:', error);
    res.status(500).json({ error: 'Error al eliminar asistencia.', detalle: error.message });
  }
}

/**
 * @función consultarPersonasUnificado
 * @descripción Consulta unificada de Docentes, Alumnos y Padres con filtro por categoría y búsqueda multicriterio (DNI, Nombre, Apellido).
 * @param {AuthRequest} req - Solicitud Express con query params (?query= &categoria=).
 * @param {Response} res - Lista de personas filtradas.
 */
export async function consultarPersonasUnificado(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { query, categoria } = req.query;
    const filtro: any = {};

    if (categoria && categoria !== 'todos') {
      filtro.rol = categoria;
    } else {
      filtro.rol = { $in: ['Docente', 'No Docente', 'Alumno', 'Padre'] };
    }

    if (query && String(query).trim() !== '') {
      const q = String(query).trim();
      const regex = new RegExp(q, 'i');
      filtro.$or = [{ nombre: regex }, { apellido: regex }, { dni: regex }];
    }

    const usuarios = await User.find(filtro)
      .select('-passwordHash')
      .sort({ apellido: 1, nombre: 1 });

    res.json(usuarios);
  } catch (error: any) {
    console.error('❌ Error en consulta unificada de personas:', error);
    res.status(500).json({ error: 'Error al consultar catálogo de personas.', detalle: error.message });
  }
}

/**
 * @función obtenerFichaDocente
 * @descripción Devuelve la ficha completa de un docente incluyendo datos personales, materias asignadas, grilla horaria e historial de asistencias/faltas.
 * @param {AuthRequest} req - Solicitud con docente_id en params.
 * @param {Response} res - Ficha detallada del docente.
 */
export async function obtenerFichaDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const docente = await User.findById(id).select('-passwordHash');
    if (!docente || docente.rol !== 'Docente') {
      res.status(404).json({ error: 'Docente no encontrado.' });
      return;
    }

    // Materias asignadas con sus Secciones y Cursos
    const materias = await Materia.find({ docente_id: id }).populate({
      path: 'seccion_id',
      populate: { path: 'curso_id' },
    });

    // Historial de asistencias
    const asistencias = await Asistencia.find({ persona_id: id }).sort({ fecha: -1 });

    // Historial de actas/inasistencias docentes
    const registrosDocentes = await RegistroDocente.find({ docente_id: id }).sort({ fecha: -1 });

    res.json({
      docente,
      materias,
      asistencias,
      registrosDocentes,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener ficha docente:', error);
    res.status(500).json({ error: 'Error al recuperar la ficha del docente.', detalle: error.message });
  }
}

/**
 * Resuelve curso_id y seccion_id reales a partir de los valores de formulario ("1".."6" / "1° Año" y "A"/"B").
 */
async function resolverCursoYSeccion(cursoRaw?: string, divisionRaw?: string, turnoRaw?: string) {
  const cursoNum = String(cursoRaw || '').replace(/[^\d]/g, '').trim();
  const cursoNombre = cursoNum ? `${cursoNum}° Año` : String(cursoRaw || '').trim();
  const divLetra = String(divisionRaw || '')
    .replace(/divisi[oó]n/i, '')
    .trim()
    .toUpperCase();
  const seccionNombre = divLetra ? `División ${divLetra}` : String(divisionRaw || '').trim();

  let cursoDoc = null;
  if (cursoNombre) {
    cursoDoc = await Curso.findOne({ nombre_curso: new RegExp(`^${cursoNombre}$`, 'i') });
  }

  let seccionDoc = null;
  if (cursoDoc && seccionNombre) {
    seccionDoc = await Seccion.findOne({
      curso_id: cursoDoc._id,
      nombre_seccion: new RegExp(`^${seccionNombre}$`, 'i'),
    });
  }

  return {
    cursoDoc,
    seccionDoc,
    cursoNombre: cursoDoc?.nombre_curso || cursoNombre || '',
    cursoNum: cursoNum || cursoNombre.replace(/[^\d]/g, '') || '',
    divLetra: divLetra || (seccionDoc?.nombre_seccion || '').replace(/divisi[oó]n/i, '').trim(),
    seccionNombre: seccionDoc?.nombre_seccion || seccionNombre || '',
    turnoFinal: turnoRaw || seccionDoc?.turno || 'Mañana',
  };
}

/**
 * Formatea un documento User (Alumno) en la estructura plana de columnas del ABM Alumno.
 */
function formatearAlumnoAbm(u: any) {
  const meta = u.perfil_metadata || {};
  const cursoNombre =
    u.curso_id?.nombre_curso ||
    u.seccion_id?.curso_id?.nombre_curso ||
    meta.curso ||
    '';
  const cursoNum =
    meta.curso_numero ||
    (cursoNombre ? String(cursoNombre).replace(/[^\d]/g, '') : '');
  const seccionNombre = u.seccion_id?.nombre_seccion || meta.seccion || '';
  const divisionLetra =
    meta.division ||
    (seccionNombre ? String(seccionNombre).replace(/divisi[oó]n/i, '').trim() : '');
  const turnoValor = u.turno || u.seccion_id?.turno || meta.turno || 'Mañana';

  return {
    _id: String(u._id),
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    dni: u.dni || '',
    rol: 'Alumno' as const,
    estado: (u.estado || 'Activo') as 'Activo' | 'Inactivo',
    fecha_nacimiento: meta.fecha_nacimiento || '',
    curso: cursoNum || cursoNombre,
    curso_label: cursoNombre || (cursoNum ? `${cursoNum}° Año` : 'Sin curso'),
    division: divisionLetra || seccionNombre || '',
    turno: turnoValor,
    direccion: meta.direccion || '',
    barrio: meta.barrio || '',
    localidad: meta.localidad || '',
    provincia: meta.provincia || '',
    contacto: meta.contacto || meta.telefono || '',
    promedio_general:
      meta.promedio_general !== undefined && meta.promedio_general !== null && meta.promedio_general !== ''
        ? Number(meta.promedio_general)
        : 0,
    sanciones:
      meta.sanciones !== undefined && meta.sanciones !== null && meta.sanciones !== ''
        ? Number(meta.sanciones)
        : 0,
    legajo: meta.legajo || `ALU-${String(u.dni || '').slice(-4)}`,
  };
}

/**
 * @función listarAlumnosAbm
 * @descripción Lista todos los alumnos registrados para el módulo ABM Alumno del rol No Docente.
 */
export async function listarAlumnosAbm(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const alumnos = await User.find({ rol: 'Alumno' })
      .select('-passwordHash')
      .populate('curso_id', 'nombre_curso nivel')
      .populate({
        path: 'seccion_id',
        select: 'nombre_seccion turno curso_id',
        populate: { path: 'curso_id', select: 'nombre_curso nivel' },
      })
      .sort({ apellido: 1, nombre: 1 });

    res.json(alumnos.map(formatearAlumnoAbm));
  } catch (error: any) {
    console.error('❌ Error al listar alumnos ABM:', error);
    res.status(500).json({ error: 'Error al listar alumnos.', detalle: error.message });
  }
}

/**
 * @función crearAlumnoAbm
 * @descripción Da de alta un nuevo alumno con todos los campos del formulario institucional.
 */
export async function crearAlumnoAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      nombre,
      apellido,
      dni,
      estado,
      fecha_nacimiento,
      curso,
      division,
      turno,
      direccion,
      barrio,
      localidad,
      provincia,
      contacto,
      promedio_general,
      sanciones,
    } = req.body;

    if (!nombre || !apellido || !dni) {
      res.status(400).json({ error: 'Nombre, Apellido y DNI son obligatorios.' });
      return;
    }

    const dniLimpio = String(dni).trim();
    const existente = await User.findOne({ dni: dniLimpio });
    if (existente) {
      res.status(409).json({ error: `Ya existe un usuario registrado con el DNI ${dniLimpio}.` });
      return;
    }

    const resolved = await resolverCursoYSeccion(curso, division, turno);
    const passwordHash = await bcrypt.hash('Alumno123!', 10);

    const promNum =
      promedio_general !== undefined && promedio_general !== '' && !isNaN(Number(promedio_general))
        ? Number(promedio_general)
        : 0;
    const sancNum =
      sanciones !== undefined && sanciones !== '' && !isNaN(Number(sanciones))
        ? Math.max(0, parseInt(String(sanciones), 10))
        : 0;

    const nuevoAlumno = await User.create({
      dni: dniLimpio,
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      rol: 'Alumno',
      estado: estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      permisos: ['CONSULTA_PROPIA'],
      curso_id: resolved.cursoDoc?._id || null,
      seccion_id: resolved.seccionDoc?._id || null,
      turno: resolved.turnoFinal,
      passwordHash,
      perfil_metadata: {
        dni: dniLimpio,
        legajo: `ALU-${dniLimpio.slice(-4)}`,
        fecha_nacimiento: fecha_nacimiento ? String(fecha_nacimiento).trim() : '',
        curso: resolved.cursoNombre,
        curso_numero: resolved.cursoNum,
        division: resolved.divLetra,
        seccion: resolved.seccionNombre,
        turno: resolved.turnoFinal,
        curso_id: resolved.cursoDoc?._id || null,
        seccion_id: resolved.seccionDoc?._id || null,
        direccion: direccion ? String(direccion).trim() : '',
        barrio: barrio ? String(barrio).trim() : '',
        localidad: localidad ? String(localidad).trim() : '',
        provincia: provincia ? String(provincia).trim() : '',
        contacto: contacto ? String(contacto).trim() : '',
        telefono: contacto ? String(contacto).trim() : '',
        contacto_emergencia: contacto ? String(contacto).trim() : '',
        promedio_general: promNum,
        sanciones: sancNum,
      },
    });

    const poblado = await User.findById(nuevoAlumno._id)
      .select('-passwordHash')
      .populate('curso_id', 'nombre_curso nivel')
      .populate({
        path: 'seccion_id',
        select: 'nombre_seccion turno curso_id',
        populate: { path: 'curso_id', select: 'nombre_curso nivel' },
      });

    res.status(201).json(formatearAlumnoAbm(poblado));
  } catch (error: any) {
    console.error('❌ Error al dar de alta alumno:', error);
    res.status(500).json({ error: 'Error al registrar el alumno.', detalle: error.message });
  }
}

/**
 * @función actualizarAlumnoAbm
 * @descripción Modifica los datos completos de un alumno (incluyendo estado Activo/Inactivo para baja lógica).
 */
export async function actualizarAlumnoAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const alumno: any = await User.findOne({ _id: id, rol: 'Alumno' });
    if (!alumno) {
      res.status(404).json({ error: 'Alumno no encontrado.' });
      return;
    }

    const {
      nombre,
      apellido,
      dni,
      estado,
      fecha_nacimiento,
      curso,
      division,
      turno,
      direccion,
      barrio,
      localidad,
      provincia,
      contacto,
      promedio_general,
      sanciones,
    } = req.body;

    if (dni && String(dni).trim() !== alumno.dni) {
      const dniNuevo = String(dni).trim();
      const duplicado = await User.findOne({ dni: dniNuevo, _id: { $ne: alumno._id } });
      if (duplicado) {
        res.status(409).json({ error: `El DNI ${dniNuevo} ya pertenece a otro usuario.` });
        return;
      }
      alumno.dni = dniNuevo;
    }

    if (nombre !== undefined) alumno.nombre = String(nombre).trim();
    if (apellido !== undefined) alumno.apellido = String(apellido).trim();
    if (estado === 'Activo' || estado === 'Inactivo') alumno.estado = estado;

    const metaActual = { ...(alumno.perfil_metadata || {}) };

    if (curso !== undefined || division !== undefined || turno !== undefined) {
      const resolved = await resolverCursoYSeccion(
        curso !== undefined ? curso : metaActual.curso_numero || metaActual.curso,
        division !== undefined ? division : metaActual.division || metaActual.seccion,
        turno !== undefined ? turno : alumno.turno || metaActual.turno
      );
      alumno.curso_id = resolved.cursoDoc?._id || null;
      alumno.seccion_id = resolved.seccionDoc?._id || null;
      alumno.turno = resolved.turnoFinal;
      metaActual.curso = resolved.cursoNombre;
      metaActual.curso_numero = resolved.cursoNum;
      metaActual.division = resolved.divLetra;
      metaActual.seccion = resolved.seccionNombre;
      metaActual.turno = resolved.turnoFinal;
      metaActual.curso_id = resolved.cursoDoc?._id || null;
      metaActual.seccion_id = resolved.seccionDoc?._id || null;
    }

    if (fecha_nacimiento !== undefined) metaActual.fecha_nacimiento = String(fecha_nacimiento).trim();
    if (direccion !== undefined) metaActual.direccion = String(direccion).trim();
    if (barrio !== undefined) metaActual.barrio = String(barrio).trim();
    if (localidad !== undefined) metaActual.localidad = String(localidad).trim();
    if (provincia !== undefined) metaActual.provincia = String(provincia).trim();
    if (contacto !== undefined) {
      metaActual.contacto = String(contacto).trim();
      metaActual.telefono = String(contacto).trim();
    }
    if (promedio_general !== undefined && promedio_general !== '' && !isNaN(Number(promedio_general))) {
      metaActual.promedio_general = Number(promedio_general);
    }
    if (sanciones !== undefined && sanciones !== '' && !isNaN(Number(sanciones))) {
      metaActual.sanciones = Math.max(0, parseInt(String(sanciones), 10));
    }

    metaActual.dni = alumno.dni;
    alumno.perfil_metadata = metaActual;
    alumno.markModified('perfil_metadata');
    await alumno.save();

    const poblado = await User.findById(alumno._id)
      .select('-passwordHash')
      .populate('curso_id', 'nombre_curso nivel')
      .populate({
        path: 'seccion_id',
        select: 'nombre_seccion turno curso_id',
        populate: { path: 'curso_id', select: 'nombre_curso nivel' },
      });

    res.json(formatearAlumnoAbm(poblado));
  } catch (error: any) {
    console.error('❌ Error al modificar alumno:', error);
    res.status(500).json({ error: 'Error al modificar los datos del alumno.', detalle: error.message });
  }
}

/**
 * @función eliminarAlumnoAbm
 * @descripción Da de baja a un alumno (baja lógica cambiando estado a Inactivo o eliminación definitiva si ?modo=permanente).
 */
export async function eliminarAlumnoAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { modo } = req.query;

    const alumno = await User.findOne({ _id: id, rol: 'Alumno' });
    if (!alumno) {
      res.status(404).json({ error: 'Alumno no encontrado.' });
      return;
    }

    if (modo === 'permanente') {
      await User.findByIdAndDelete(id);
      res.json({ mensaje: 'Alumno eliminado definitivamente del sistema.' });
      return;
    }

    alumno.estado = 'Inactivo';
    await alumno.save();
    res.json({ mensaje: 'Alumno dado de baja (estado Inactivo).', estado: 'Inactivo' });
  } catch (error: any) {
    console.error('❌ Error al dar de baja alumno:', error);
    res.status(500).json({ error: 'Error al dar de baja el alumno.', detalle: error.message });
  }
}

