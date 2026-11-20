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
import { RegistroAcademico } from '../models/RegistroAcademico.js';

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

/**
 * Formatea un documento User (Docente) con las columnas del módulo ABM Docente y sus materias vinculadas.
 */
function formatearDocenteAbm(u: any, materiasAsignadas: string[] = []) {
  const meta = u.perfil_metadata || {};
  const emailDefault = `${u.nombre || ''}.${u.apellido || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');

  const areaMateria =
    meta.asignatura ||
    (materiasAsignadas.length > 0 ? materiasAsignadas.join(', ') : '');

  return {
    _id: String(u._id),
    legajo: meta.legajo || `DOC-${String(u.dni || '').slice(-4)}`,
    dni: u.dni || '',
    apellido: u.apellido || '',
    nombre: u.nombre || '',
    area_materia: areaMateria,
    categoria: (meta.categoria === 'Suplente' ? 'Suplente' : 'Titular') as 'Titular' | 'Suplente',
    fecha_inicio: meta.fecha_inicio || '',
    fecha_fin: meta.fecha_fin || '',
    telefono: meta.telefono || meta.celular || meta.contacto || '',
    direccion: meta.direccion || '',
    ciudad: meta.ciudad || meta.localidad || 'Córdoba',
    turno: u.turno || meta.turno || 'Mañana',
    email: meta.email || (emailDefault ? `${emailDefault}@josepena.edu.ar` : ''),
    cargo: meta.cargo || 'Docente',
    estado: (u.estado || 'Activo') as 'Activo' | 'Inactivo',
    materias_asignadas: materiasAsignadas,
  };
}

/**
 * @función listarDocentesAbm
 * @descripción Lista todos los docentes registrados junto con sus materias vinculadas para ABM Docente.
 */
export async function listarDocentesAbm(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [docentes, materias] = await Promise.all([
      User.find({ rol: 'Docente' }).select('-passwordHash').sort({ 'perfil_metadata.legajo': 1, apellido: 1, nombre: 1 }),
      Materia.find({}).populate({
        path: 'seccion_id',
        select: 'nombre_seccion turno',
        populate: { path: 'curso_id', select: 'nombre_curso' },
      }),
    ]);

    const mapaMaterias = new Map<string, string[]>();
    for (const mat of materias as any[]) {
      const docId = String(mat.docente_id || '');
      if (!docId) continue;
      if (!mapaMaterias.has(docId)) mapaMaterias.set(docId, []);
      const cursoDesc = mat.seccion_id?.curso_id?.nombre_curso
        ? ` (${mat.seccion_id.curso_id.nombre_curso} ${mat.seccion_id.nombre_seccion || ''})`
        : '';
      mapaMaterias.get(docId)!.push(`${mat.nombre_materia}${cursoDesc}`);
    }

    res.json(
      docentes.map((d: any) => formatearDocenteAbm(d, mapaMaterias.get(String(d._id)) || []))
    );
  } catch (error: any) {
    console.error('❌ Error al listar docentes ABM:', error);
    res.status(500).json({ error: 'Error al listar docentes.', detalle: error.message });
  }
}

/**
 * @función crearDocenteAbm
 * @descripción Da de alta un nuevo docente (roles autorizados: No Docente, Director y Admin).
 * @reglaDeNegocio Solo el rol Director puede crear o establecer estado Inactivo; para No Docente siempre inicia Activo.
 */
export async function crearDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      legajo,
      dni,
      apellido,
      nombre,
      area_materia,
      categoria,
      fecha_inicio,
      fecha_fin,
      telefono,
      direccion,
      turno,
      email,
      estado,
    } = req.body;

    if (
      typeof nombre !== 'string' ||
      typeof apellido !== 'string' ||
      (typeof dni !== 'string' && typeof dni !== 'number') ||
      !nombre.trim() ||
      !apellido.trim() ||
      !String(dni).trim()
    ) {
      res.status(400).json({ error: 'Apellido, Nombre y DNI son campos obligatorios.' });
      return;
    }

    const dniLimpio = String(dni).replace(/\D/g, '').trim();
    if (!dniLimpio || dniLimpio.length < 7) {
      res.status(400).json({ error: 'Ingrese un DNI numérico válido (mínimo 7 dígitos).' });
      return;
    }

    const existente = await User.findOne({ dni: dniLimpio });
    if (existente) {
      res.status(409).json({ error: `Ya existe un usuario registrado con el DNI ${dniLimpio}.` });
      return;
    }

    const esDirector = req.usuario?.rol === 'Director';
    if (estado === 'Inactivo' && !esDirector) {
      res.status(403).json({
        error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un docente.',
      });
      return;
    }

    const legajoFinal =
      typeof legajo === 'string' && legajo.trim()
        ? legajo.trim().toUpperCase()
        : `DOC-${dniLimpio.slice(-4)}`;

    const categoriaFinal = categoria === 'Suplente' ? 'Suplente' : 'Titular';
    const turnoFinal =
      turno === 'Tarde' || turno === 'Noche' || turno === 'Mañana' ? turno : 'Mañana';
    const areaFinal = typeof area_materia === 'string' ? area_materia.trim() : '';
    const fechaInicioFinal =
      typeof fecha_inicio === 'string' && fecha_inicio.trim()
        ? fecha_inicio.trim()
        : new Date().toISOString().split('T')[0];
    const fechaFinFinal = typeof fecha_fin === 'string' ? fecha_fin.trim() : '';
    const telFinal = typeof telefono === 'string' ? telefono.trim() : '';
    const dirFinal = typeof direccion === 'string' ? direccion.trim() : '';

    const emailBase = `${nombre}.${apellido}.${dniLimpio.slice(-3)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    const emailFinal =
      typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : `${emailBase}@josepena.edu.ar`;

    const passwordHash = await bcrypt.hash('Docente123!', 10);

    const nuevoDocente = await User.create({
      dni: dniLimpio,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rol: 'Docente',
      estado: esDirector && estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      permisos: ['REGISTRAR_NOTAS', 'VER_ALUMNOS'],
      curso_id: null,
      seccion_id: null,
      turno: turnoFinal,
      passwordHash,
      perfil_metadata: {
        dni: dniLimpio,
        legajo: legajoFinal,
        cargo: 'Docente',
        categoria: categoriaFinal,
        asignatura: areaFinal,
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        telefono: telFinal,
        celular: telFinal,
        direccion: dirFinal,
        ciudad: 'Córdoba',
        localidad: 'Córdoba',
        turno: turnoFinal,
        email: emailFinal,
        titulo: 'Profesor de Nivel Secundario',
      },
    });

    res.status(201).json(formatearDocenteAbm(nuevoDocente, []));
  } catch (error: any) {
    console.error('❌ Error al crear docente ABM:', error);
    res.status(500).json({ error: 'Error al registrar el docente.', detalle: error.message });
  }
}

/**
 * @función actualizarDocenteAbm
 * @descripción Modifica los datos de un docente (roles: No Docente, Director, Admin).
 * @reglaDeNegocio Solo el rol Director puede modificar el campo estado (inactivar o reactivar).
 */
export async function actualizarDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const docente: any = await User.findOne({ _id: id, rol: 'Docente' });
    if (!docente) {
      res.status(404).json({ error: 'Docente no encontrado.' });
      return;
    }

    const {
      legajo,
      dni,
      apellido,
      nombre,
      area_materia,
      categoria,
      fecha_inicio,
      fecha_fin,
      telefono,
      direccion,
      turno,
      email,
      estado,
    } = req.body;

    const esDirector = req.usuario?.rol === 'Director';

    // Control estricto en servidor: solo el Director puede inactivar/reactivar a un docente
    if ((estado === 'Activo' || estado === 'Inactivo') && estado !== docente.estado) {
      if (!esDirector) {
        res.status(403).json({
          error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un docente.',
        });
        return;
      }
      docente.estado = estado;
    }

    if (dni !== undefined && String(dni).replace(/\D/g, '').trim() !== docente.dni) {
      const dniNuevo = String(dni).replace(/\D/g, '').trim();
      if (!dniNuevo || dniNuevo.length < 7) {
        res.status(400).json({ error: 'Ingrese un DNI numérico válido (mínimo 7 dígitos).' });
        return;
      }
      const duplicado = await User.findOne({ dni: dniNuevo, _id: { $ne: docente._id } });
      if (duplicado) {
        res.status(409).json({ error: `El DNI ${dniNuevo} ya pertenece a otro usuario.` });
        return;
      }
      docente.dni = dniNuevo;
    }

    if (typeof nombre === 'string' && nombre.trim()) docente.nombre = nombre.trim();
    if (typeof apellido === 'string' && apellido.trim()) docente.apellido = apellido.trim();
    if (turno === 'Mañana' || turno === 'Tarde' || turno === 'Noche') {
      docente.turno = turno;
    }

    const metaActual = { ...(docente.perfil_metadata || {}) };
    metaActual.dni = docente.dni;
    metaActual.cargo = 'Docente';
    metaActual.ciudad = metaActual.ciudad || 'Córdoba';
    metaActual.localidad = metaActual.localidad || 'Córdoba';
    metaActual.turno = docente.turno || metaActual.turno || 'Mañana';

    if (typeof legajo === 'string' && legajo.trim()) {
      metaActual.legajo = legajo.trim().toUpperCase();
    }
    if (typeof area_materia === 'string') {
      metaActual.asignatura = area_materia.trim();
    }
    if (categoria === 'Titular' || categoria === 'Suplente') {
      metaActual.categoria = categoria;
    }
    if (typeof fecha_inicio === 'string') {
      metaActual.fecha_inicio = fecha_inicio.trim();
    }
    if (typeof fecha_fin === 'string') {
      metaActual.fecha_fin = fecha_fin.trim();
    }
    if (typeof telefono === 'string') {
      metaActual.telefono = telefono.trim();
      metaActual.celular = telefono.trim();
    }
    if (typeof direccion === 'string') {
      metaActual.direccion = direccion.trim();
    }
    if (typeof email === 'string' && email.trim()) {
      metaActual.email = email.trim().toLowerCase();
    }

    docente.perfil_metadata = metaActual;
    docente.markModified('perfil_metadata');
    await docente.save();

    const materias = await Materia.find({ docente_id: docente._id }).populate({
      path: 'seccion_id',
      select: 'nombre_seccion',
      populate: { path: 'curso_id', select: 'nombre_curso' },
    });
    const nombresMaterias = materias.map((m: any) =>
      m.seccion_id?.curso_id?.nombre_curso
        ? `${m.nombre_materia} (${m.seccion_id.curso_id.nombre_curso} ${m.seccion_id.nombre_seccion || ''})`
        : m.nombre_materia
    );

    res.json(formatearDocenteAbm(docente, nombresMaterias));
  } catch (error: any) {
    console.error('❌ Error al modificar docente ABM:', error);
    res.status(500).json({ error: 'Error al modificar los datos del docente.', detalle: error.message });
  }
}

/**
 * @función eliminarDocenteAbm
 * @descripción Da de baja lógica (Inactivo) o elimina definitivamente (?modo=permanente) a un docente.
 * @reglaDeNegocio Operación permitida EXCLUSIVAMENTE para el rol Directivo (Director).
 */
export async function eliminarDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.usuario?.rol !== 'Director') {
      res.status(403).json({
        error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un docente.',
      });
      return;
    }

    const { id } = req.params;
    const { modo } = req.query;

    const docente = await User.findOne({ _id: id, rol: 'Docente' });
    if (!docente) {
      res.status(404).json({ error: 'Docente no encontrado.' });
      return;
    }

    if (modo === 'permanente') {
      await User.findByIdAndDelete(id);
      res.json({ mensaje: 'Docente eliminado definitivamente del sistema.' });
      return;
    }

    docente.estado = 'Inactivo';
    await docente.save();
    res.json({ mensaje: 'Docente dado de baja (estado Inactivo).', estado: 'Inactivo' });
  } catch (error: any) {
    console.error('❌ Error al dar de baja docente:', error);
    res.status(500).json({ error: 'Error al dar de baja el docente.', detalle: error.message });
  }
}

/**
 * Formatea un documento User (No Docente) con las columnas del archivo Base_NoDocente_30_usuarios.pdf.
 */
function formatearNoDocenteAbm(u: any, fallbackNumero = 0) {
  const meta = u.perfil_metadata || {};
  const emailDefault = `${u.nombre || ''}.${u.apellido || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');

  return {
    _id: String(u._id),
    numero:
      meta.numero_orden !== undefined && meta.numero_orden !== null && meta.numero_orden !== ''
        ? Number(meta.numero_orden)
        : fallbackNumero,
    area_usuario: meta.area_usuario || meta.cargo || 'Secretaría',
    cargo_sector: meta.cargo_sector || meta.asignatura || 'Administración General',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    dni: u.dni || '',
    telefono: meta.telefono || meta.celular || meta.contacto || '',
    email: meta.email || (emailDefault ? `${emailDefault}@josepena.edu.ar` : ''),
    estado: (u.estado || 'Activo') as 'Activo' | 'Inactivo',
    turno: u.turno || meta.turno || 'Mañana',
    legajo: meta.legajo || `NOD-${String(u.dni || '').slice(-4)}`,
  };
}

/**
 * @función listarNoDocentesAbm
 * @descripción Lista todos los usuarios No Docentes ordenados por número de registro y apellido/nombre.
 */
export async function listarNoDocentesAbm(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const noDocentes = await User.find({ rol: 'No Docente' })
      .select('-passwordHash')
      .sort({ 'perfil_metadata.numero_orden': 1, apellido: 1, nombre: 1 });

    // Numerar secuencialmente si algún usuario base previo no tenía numero_orden
    let maxNum = noDocentes.reduce((max, u: any) => {
      const n = Number(u.perfil_metadata?.numero_orden || 0);
      return n > max ? n : max;
    }, 0);

    const formateados = noDocentes.map((u: any) => {
      const tieneNumero =
        u.perfil_metadata?.numero_orden !== undefined &&
        u.perfil_metadata?.numero_orden !== null &&
        u.perfil_metadata?.numero_orden !== '';
      const num = tieneNumero ? Number(u.perfil_metadata.numero_orden) : ++maxNum;
      return formatearNoDocenteAbm(u, num);
    });

    formateados.sort((a, b) => a.numero - b.numero);
    res.json(formateados);
  } catch (error: any) {
    console.error('❌ Error al listar no docentes ABM:', error);
    res.status(500).json({ error: 'Error al listar personal No Docente.', detalle: error.message });
  }
}

/**
 * @función crearNoDocenteAbm
 * @descripción Da de alta un nuevo usuario No Docente (roles autorizados: No Docente, Director, Admin).
 * @reglaDeNegocio Solo el rol Director puede establecer estado Inactivo; para No Docente siempre inicia Activo.
 */
export async function crearNoDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      numero,
      area_usuario,
      cargo_sector,
      nombre,
      apellido,
      dni,
      telefono,
      email,
      estado,
      turno,
    } = req.body;

    if (
      typeof nombre !== 'string' ||
      typeof apellido !== 'string' ||
      (typeof dni !== 'string' && typeof dni !== 'number') ||
      !nombre.trim() ||
      !apellido.trim() ||
      !String(dni).trim()
    ) {
      res.status(400).json({ error: 'Nombre, Apellido y DNI son campos obligatorios.' });
      return;
    }

    const dniLimpio = String(dni).replace(/\D/g, '').trim();
    if (!dniLimpio || dniLimpio.length < 7) {
      res.status(400).json({ error: 'Ingrese un DNI numérico válido (mínimo 7 dígitos).' });
      return;
    }

    const existente = await User.findOne({ dni: dniLimpio });
    if (existente) {
      res.status(409).json({ error: `Ya existe un usuario registrado con el DNI ${dniLimpio}.` });
      return;
    }

    const esDirector = req.usuario?.rol === 'Director';
    if (estado === 'Inactivo' && !esDirector) {
      res.status(403).json({
        error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un usuario No Docente.',
      });
      return;
    }

    const existentesCount = await User.countDocuments({ rol: 'No Docente' });
    const numeroFinal =
      numero !== undefined && numero !== '' && !isNaN(Number(numero))
        ? Math.max(1, parseInt(String(numero), 10))
        : existentesCount + 1;

    const areaFinal =
      typeof area_usuario === 'string' && area_usuario.trim() ? area_usuario.trim() : 'Secretaría';
    const sectorFinal =
      typeof cargo_sector === 'string' && cargo_sector.trim()
        ? cargo_sector.trim()
        : 'Administración General';
    const turnoFinal =
      turno === 'Tarde' || turno === 'Noche' || turno === 'Mañana' ? turno : 'Mañana';
    const telFinal = typeof telefono === 'string' ? telefono.trim() : '';

    const emailBase = `${nombre}.${apellido}.${dniLimpio.slice(-2)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    const emailFinal =
      typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : `${emailBase}@example.com`;

    const passwordHash = await bcrypt.hash('NoDoc123!', 10);

    const nuevoNoDocente = await User.create({
      dni: dniLimpio,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rol: 'No Docente',
      estado: esDirector && estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      permisos: ['ASISTENCIA', 'SANCIONES', 'PROGRAMAS'],
      curso_id: null,
      seccion_id: null,
      turno: turnoFinal,
      passwordHash,
      perfil_metadata: {
        numero_orden: numeroFinal,
        dni: dniLimpio,
        legajo: `NOD-${String(numeroFinal).padStart(4, '0')}`,
        cargo: areaFinal,
        area_usuario: areaFinal,
        cargo_sector: sectorFinal,
        asignatura: sectorFinal,
        telefono: telFinal,
        celular: telFinal,
        email: emailFinal,
        turno: turnoFinal,
        direccion: 'Av. Colón 500',
        ciudad: 'Córdoba',
        localidad: 'Córdoba',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
      },
    });

    res.status(201).json(formatearNoDocenteAbm(nuevoNoDocente, numeroFinal));
  } catch (error: any) {
    console.error('❌ Error al crear No Docente ABM:', error);
    res.status(500).json({ error: 'Error al registrar el agente No Docente.', detalle: error.message });
  }
}

/**
 * @función actualizarNoDocenteAbm
 * @descripción Modifica los datos de un usuario No Docente (roles: No Docente, Director, Admin).
 * @reglaDeNegocio Solo el rol Director puede modificar el estado (inactivar / reactivar).
 */
export async function actualizarNoDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const agente: any = await User.findOne({ _id: id, rol: 'No Docente' });
    if (!agente) {
      res.status(404).json({ error: 'Agente No Docente no encontrado.' });
      return;
    }

    const {
      numero,
      area_usuario,
      cargo_sector,
      nombre,
      apellido,
      dni,
      telefono,
      email,
      estado,
      turno,
    } = req.body;

    const esDirector = req.usuario?.rol === 'Director';

    if ((estado === 'Activo' || estado === 'Inactivo') && estado !== agente.estado) {
      if (!esDirector) {
        res.status(403).json({
          error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un usuario No Docente.',
        });
        return;
      }
      agente.estado = estado;
    }

    if (dni !== undefined && String(dni).replace(/\D/g, '').trim() !== agente.dni) {
      const dniNuevo = String(dni).replace(/\D/g, '').trim();
      if (!dniNuevo || dniNuevo.length < 7) {
        res.status(400).json({ error: 'Ingrese un DNI numérico válido (mínimo 7 dígitos).' });
        return;
      }
      const duplicado = await User.findOne({ dni: dniNuevo, _id: { $ne: agente._id } });
      if (duplicado) {
        res.status(409).json({ error: `El DNI ${dniNuevo} ya pertenece a otro usuario.` });
        return;
      }
      agente.dni = dniNuevo;
    }

    if (typeof nombre === 'string' && nombre.trim()) agente.nombre = nombre.trim();
    if (typeof apellido === 'string' && apellido.trim()) agente.apellido = apellido.trim();
    if (turno === 'Mañana' || turno === 'Tarde' || turno === 'Noche') {
      agente.turno = turno;
    }

    const metaActual = { ...(agente.perfil_metadata || {}) };
    metaActual.dni = agente.dni;
    metaActual.turno = agente.turno || metaActual.turno || 'Mañana';
    metaActual.ciudad = metaActual.ciudad || 'Córdoba';
    metaActual.localidad = metaActual.localidad || 'Córdoba';

    if (numero !== undefined && numero !== '' && !isNaN(Number(numero))) {
      metaActual.numero_orden = Math.max(1, parseInt(String(numero), 10));
    }
    if (typeof area_usuario === 'string' && area_usuario.trim()) {
      metaActual.area_usuario = area_usuario.trim();
      metaActual.cargo = area_usuario.trim();
    }
    if (typeof cargo_sector === 'string' && cargo_sector.trim()) {
      metaActual.cargo_sector = cargo_sector.trim();
      metaActual.asignatura = cargo_sector.trim();
    }
    if (typeof telefono === 'string') {
      metaActual.telefono = telefono.trim();
      metaActual.celular = telefono.trim();
    }
    if (typeof email === 'string' && email.trim()) {
      metaActual.email = email.trim().toLowerCase();
    }

    agente.perfil_metadata = metaActual;
    agente.markModified('perfil_metadata');
    await agente.save();

    res.json(formatearNoDocenteAbm(agente, Number(metaActual.numero_orden || 0)));
  } catch (error: any) {
    console.error('❌ Error al modificar No Docente ABM:', error);
    res.status(500).json({ error: 'Error al modificar el agente No Docente.', detalle: error.message });
  }
}

/**
 * @función eliminarNoDocenteAbm
 * @descripción Da de baja lógica (Inactivo) o elimina definitivamente (?modo=permanente) a un No Docente.
 * @reglaDeNegocio Operación permitida EXCLUSIVAMENTE para el rol Directivo (Director).
 */
export async function eliminarNoDocenteAbm(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.usuario?.rol !== 'Director') {
      res.status(403).json({
        error: 'Solo el rol Directivo está autorizado para inactivar o dar de baja a un usuario No Docente.',
      });
      return;
    }

    const { id } = req.params;
    const { modo } = req.query;

    const agente = await User.findOne({ _id: id, rol: 'No Docente' });
    if (!agente) {
      res.status(404).json({ error: 'Agente No Docente no encontrado.' });
      return;
    }

    if (modo === 'permanente') {
      await User.findByIdAndDelete(id);
      res.json({ mensaje: 'Agente No Docente eliminado definitivamente del sistema.' });
      return;
    }

    agente.estado = 'Inactivo';
    await agente.save();
    res.json({ mensaje: 'Agente No Docente dado de baja (estado Inactivo).', estado: 'Inactivo' });
  } catch (error: any) {
    console.error('❌ Error al dar de baja No Docente:', error);
    res.status(500).json({ error: 'Error al dar de baja el agente No Docente.', detalle: error.message });
  }
}

function normalizarFiltroTexto(valor: unknown): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @función obtenerReportesMultifiltroNoDocente
 * @descripción Devuelve todos los registros consolidados (Estudiantes, Docentes, No Docentes y personal institucional)
 * filtrados por Rol, Cargo, Legajo, DNI y Turno para el módulo Reportes y Estadísticas del rol No Docente.
 */
export async function obtenerReportesMultifiltroNoDocente(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { rol, cargo, legajo, dni, turno } = req.query;

    const filtroRol = normalizarFiltroTexto(rol);
    const filtroCargo = normalizarFiltroTexto(cargo);
    const filtroLegajo = normalizarFiltroTexto(legajo);
    const filtroDni = String(dni || '').replace(/\D/g, '').trim();
    const filtroTurno = normalizarFiltroTexto(turno);

    const [usuarios, materias, registrosAcad] = await Promise.all([
      User.find({})
        .select('-passwordHash')
        .populate('curso_id', 'nombre_curso nivel')
        .populate({
          path: 'seccion_id',
          select: 'nombre_seccion turno curso_id',
          populate: { path: 'curso_id', select: 'nombre_curso nivel' },
        })
        .sort({ rol: 1, apellido: 1, nombre: 1 }),
      Materia.find({}).populate('seccion_id', 'nombre_seccion turno'),
      RegistroAcademico.find({ tipo: { $in: ['nota', 'sancion'] } }).select('alumno_id tipo valor'),
    ]);

    // Mapear materias por docente_id
    const mapaMateriasDocente = new Map<string, { nombres: string[]; turnos: string[] }>();
    for (const mat of materias as any[]) {
      const docId = String(mat.docente_id || '');
      if (!docId) continue;
      if (!mapaMateriasDocente.has(docId)) {
        mapaMateriasDocente.set(docId, { nombres: [], turnos: [] });
      }
      const entry = mapaMateriasDocente.get(docId)!;
      if (mat.nombre_materia && !entry.nombres.includes(mat.nombre_materia)) {
        entry.nombres.push(mat.nombre_materia);
      }
      const secTurno = mat.seccion_id?.turno;
      if (secTurno && !entry.turnos.includes(secTurno)) {
        entry.turnos.push(secTurno);
      }
    }

    // Mapear notas y sanciones reales de RegistroAcademico por alumno_id
    const mapaNotasAlumno = new Map<string, number[]>();
    const mapaSancionesAlumno = new Map<string, number>();
    for (const reg of registrosAcad as any[]) {
      const alId = String(reg.alumno_id || '');
      if (!alId) continue;
      if (reg.tipo === 'nota') {
        const val = parseFloat(String(reg.valor).replace(',', '.'));
        if (!isNaN(val)) {
          if (!mapaNotasAlumno.has(alId)) mapaNotasAlumno.set(alId, []);
          mapaNotasAlumno.get(alId)!.push(val);
        }
      } else if (reg.tipo === 'sancion') {
        mapaSancionesAlumno.set(alId, (mapaSancionesAlumno.get(alId) || 0) + 1);
      }
    }

    const todosConsolidados = usuarios.map((u: any) => {
      const meta = u.perfil_metadata || {};
      const uid = String(u._id);
      const emailDefault = `${u.nombre || ''}.${u.apellido || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '');

      if (u.rol === 'Alumno') {
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

        const notasReales = mapaNotasAlumno.get(uid) || [];
        const promedioCalculado =
          notasReales.length > 0
            ? Number((notasReales.reduce((a, b) => a + b, 0) / notasReales.length).toFixed(2))
            : null;
        const promedioFinal =
          meta.promedio_general !== undefined &&
          meta.promedio_general !== null &&
          meta.promedio_general !== ''
            ? Number(meta.promedio_general)
            : promedioCalculado ?? 0;

        const sancionesFinal =
          meta.sanciones !== undefined && meta.sanciones !== null && meta.sanciones !== ''
            ? Number(meta.sanciones)
            : mapaSancionesAlumno.get(uid) || 0;

        return {
          _id: uid,
          legajo: meta.legajo || `ALU-${String(u.dni || '').slice(-4)}`,
          dni: u.dni || '',
          apellido: u.apellido || '',
          nombre: u.nombre || '',
          rol: 'Alumno',
          rol_display: 'Estudiante',
          cargo: meta.cargo || 'Estudiantes',
          asignatura: cursoNum ? `${cursoNum}° Año ${divisionLetra}`.trim() : cursoNombre || '-',
          turno: turnoValor,
          telefono: meta.contacto || meta.telefono || '',
          email: meta.email || (emailDefault ? `${emailDefault}@josepena.edu.ar` : ''),
          direccion: meta.direccion || '',
          ciudad: meta.localidad || meta.ciudad || 'Córdoba',
          estado: u.estado || 'Activo',
          fecha_inicio: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
          fecha_fin: u.estado === 'Inactivo' && u.updatedAt ? new Date(u.updatedAt).toISOString().split('T')[0] : '',
          // Campos específicos del esquema Estudiante
          fecha_nacimiento: meta.fecha_nacimiento || '',
          curso: cursoNum || cursoNombre || '',
          division: divisionLetra || seccionNombre || '',
          barrio: meta.barrio || '',
          localidad: meta.localidad || meta.ciudad || '',
          provincia: meta.provincia || '',
          contacto: meta.contacto || meta.telefono || '',
          promedio_general: promedioFinal,
          sanciones: sancionesFinal,
        };
      }

      // Personal: Docente, No Docente, Director, Admin, Padre
      const matInfo = mapaMateriasDocente.get(uid);
      const asignaturaDocente =
        matInfo && matInfo.nombres.length > 0
          ? matInfo.nombres.join(', ')
          : meta.asignatura || (u.rol === 'No Docente' ? 'Gestión Administrativa' : '-');

      const turnoPersonal =
        u.turno ||
        meta.turno ||
        (matInfo && matInfo.turnos.length > 0 ? matInfo.turnos[0] : 'Mañana');

      const prefijo =
        u.rol === 'Docente'
          ? 'DOC'
          : u.rol === 'No Docente'
            ? 'NOD'
            : u.rol === 'Director'
              ? 'DIR'
              : u.rol === 'Admin'
                ? 'ADM'
                : 'TUT';

      const cargoDefault =
        u.rol === 'Docente'
          ? 'Docente'
          : u.rol === 'No Docente'
            ? 'Secretaría'
            : u.rol === 'Padre'
              ? 'Padre/Tutor'
              : 'Directivo';

      return {
        _id: uid,
        legajo: meta.legajo || `${prefijo}-${String(u.dni || '').slice(-4)}`,
        dni: u.dni || '',
        apellido: u.apellido || '',
        nombre: u.nombre || '',
        rol: u.rol,
        rol_display: u.rol,
        cargo: meta.cargo || cargoDefault,
        asignatura: asignaturaDocente,
        turno: turnoPersonal,
        telefono: meta.telefono || meta.celular || meta.contacto || '',
        email: meta.email || (emailDefault ? `${emailDefault}@josepena.edu.ar` : ''),
        direccion: meta.direccion || '',
        ciudad: meta.ciudad || meta.localidad || 'Córdoba',
        estado: u.estado || 'Activo',
        fecha_inicio:
          meta.fecha_inicio ||
          (u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2024-03-01'),
        fecha_fin: meta.fecha_fin || '',
        // Campos alumno vacíos por consistencia de tipo
        fecha_nacimiento: '',
        curso: '',
        division: '',
        barrio: '',
        localidad: meta.ciudad || meta.localidad || '',
        provincia: '',
        contacto: meta.telefono || meta.celular || '',
        promedio_general: '',
        sanciones: 0,
      };
    });

    // Extraer opciones dinámicas disponibles en la base de datos
    const opcionesCargos = Array.from(
      new Set(todosConsolidados.map((r) => r.cargo).filter((c) => Boolean(c && c.trim())))
    ).sort((a, b) => a.localeCompare(b));

    const opcionesTurnos = Array.from(
      new Set(['Mañana', 'Tarde', 'Noche', ...todosConsolidados.map((r) => r.turno).filter(Boolean)])
    );

    const filtrados = todosConsolidados.filter((item) => {
      if (filtroRol && filtroRol !== 'todos') {
        const rolNorm = normalizarFiltroTexto(item.rol);
        const rolBuscado =
          filtroRol === 'estudiante' || filtroRol === 'estudiantes'
            ? 'alumno'
            : filtroRol === 'padre/tutor' || filtroRol === 'padres/tutores'
              ? 'padre'
              : filtroRol;
        if (rolNorm !== rolBuscado) return false;
      }
      if (filtroCargo && filtroCargo !== 'todos') {
        const cargoItemNorm = normalizarFiltroTexto(item.cargo);
        const cargoBuscadoCompacto = filtroCargo.replace(/[^a-z0-9]/g, '');
        const cargoItemCompacto = cargoItemNorm.replace(/[^a-z0-9]/g, '');

        let coincideCargo =
          cargoItemNorm.includes(filtroCargo) || cargoItemCompacto.includes(cargoBuscadoCompacto);

        if (!coincideCargo) {
          if (cargoBuscadoCompacto.includes('estudiante')) {
            coincideCargo =
              cargoItemCompacto.includes('estudiante') ||
              normalizarFiltroTexto(item.rol) === 'alumno';
          } else if (cargoBuscadoCompacto.includes('padre') || cargoBuscadoCompacto.includes('tutor')) {
            coincideCargo =
              cargoItemCompacto.includes('padre') ||
              cargoItemCompacto.includes('tutor') ||
              normalizarFiltroTexto(item.rol) === 'padre';
          } else if (cargoBuscadoCompacto === 'docente') {
            coincideCargo =
              normalizarFiltroTexto(item.rol) === 'docente' ||
              cargoItemNorm.includes('profesor');
          } else if (cargoBuscadoCompacto === 'directivo') {
            coincideCargo =
              cargoItemNorm.includes('directiv') ||
              cargoItemNorm.includes('director') ||
              cargoItemNorm.includes('admin');
          } else if (cargoBuscadoCompacto === 'secretaria') {
            coincideCargo =
              cargoItemNorm.includes('secretar') || cargoItemNorm.includes('auxiliar');
          } else if (cargoBuscadoCompacto === 'preceptoria') {
            coincideCargo = cargoItemNorm.includes('preceptor');
          }
        }

        if (!coincideCargo) return false;
      }
      if (filtroLegajo) {
        if (!normalizarFiltroTexto(item.legajo).includes(filtroLegajo)) return false;
      }
      if (filtroDni) {
        if (!String(item.dni).replace(/\D/g, '').includes(filtroDni)) return false;
      }
      if (filtroTurno && filtroTurno !== 'todos') {
        if (normalizarFiltroTexto(item.turno) !== filtroTurno) return false;
      }
      return true;
    });

    res.json({
      total: filtrados.length,
      totalGeneral: todosConsolidados.length,
      registros: filtrados,
      opcionesCargos,
      opcionesTurnos,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener reportes multifiltro No Docente:', error);
    res.status(500).json({
      error: 'Error al consultar reportes multifiltro.',
      detalle: error.message,
    });
  }
}

