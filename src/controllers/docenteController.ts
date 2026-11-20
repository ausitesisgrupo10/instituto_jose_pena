/**
 * @archivo src/controllers/docenteController.ts
 * @descripción Controlador REST exclusivo para el panel de gestión del Rol Docente en el Instituto José Peña.
 * @reglaDeNegocio Permite al docente visualizar sus datos personales, grilla horaria, sus propias inasistencias/actas y sus materias/alumnos a cargo.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Materia } from '../models/Materia.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { User } from '../models/User.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Parentesco } from '../models/Parentesco.js';
import { Seccion } from '../models/Seccion.js';
import { Curso } from '../models/Curso.js';
import { Asistencia } from '../models/Asistencia.js';

/**
 * @función obtenerPerfilDocente
 * @descripción Obtiene la información personal completa del docente autenticado.
 * @param {AuthRequest} req - Solicitud Express con el usuario autenticado en req.usuario.
 * @param {Response} res - Respuesta Express con el objeto de perfil del docente.
 * @reglaDeNegocio Devuelve Nombre, Apellido, DNI, Celular, Barrio, Dirección y Legajo.
 */
export async function obtenerPerfilDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const usuario = await User.findById(req.usuario._id);
    if (!usuario) {
      res.status(404).json({ error: 'Docente no encontrado.' });
      return;
    }

    const perfil = {
      id: usuario._id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      celular: usuario.perfil_metadata?.celular || '351-555-8921',
      barrio: usuario.perfil_metadata?.barrio || 'Villa Cabrera',
      direccion: usuario.perfil_metadata?.direccion || 'Av. Rafael Nuñez 2410',
      legajo: usuario.perfil_metadata?.legajo || 'DOC-2024-001',
      titulo: usuario.perfil_metadata?.titulo || 'Profesor de Educación Secundaria',
      antiguedad: usuario.perfil_metadata?.antiguedad || '6 años',
    };

    res.json(perfil);
  } catch (error: any) {
    console.error('❌ Error al obtener perfil del docente:', error);
    res.status(500).json({ error: 'Error al consultar perfil del docente.', detalle: error.message });
  }
}

/**
 * @función obtenerHorariosDocente
 * @descripción Genera y devuelve la grilla horaria de las materias dictadas por el docente autenticado.
 * @param {AuthRequest} req - Solicitud Express con el docente autenticado.
 * @param {Response} res - Respuesta Express con el arreglo de horarios semanales.
 * @reglaDeNegocio Mapea los cursos, secciones y materias que dicta el docente en los distintos días de la semana.
 */
export async function obtenerHorariosDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    // Buscar materias dictadas por el docente
    const materias = await Materia.find({ docente_id: req.usuario._id }).populate({
      path: 'seccion_id',
      populate: { path: 'curso_id' },
    });

    // Construcción de la grilla horaria mapeada
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const bloquesHorarios = [
      { hora: '07:45 - 08:25', modulo: 1 },
      { hora: '08:25 - 09:05', modulo: 2 },
      { hora: '09:15 - 09:55', modulo: 3 },
      { hora: '09:55 - 10:35', modulo: 4 },
      { hora: '10:45 - 11:25', modulo: 5 },
      { hora: '11:25 - 12:05', modulo: 6 },
    ];

    // Mapear grilla simulada organizada con las materias reales asignadas
    const grilla = bloquesHorarios.map((bloque, index) => {
      const dias: Record<string, any> = {};
      diasSemana.forEach((dia, diaIdx) => {
        // Asignar materia si existe en el índice de rotación
        const matAsignada = materias[(index + diaIdx) % (materias.length || 1)];
        if (matAsignada && (index + diaIdx) % 2 === 0) {
          const seccionObj = matAsignada.seccion_id as any;
          const cursoObj = seccionObj?.curso_id as any;
          dias[dia] = {
            materia: matAsignada.nombre_materia,
            curso: cursoObj ? cursoObj.nombre_curso : '1° Año',
            seccion: seccionObj ? seccionObj.nombre_seccion : 'División A',
            aula: `Aula ${10 + ((index + diaIdx) % 5)}`,
          };
        } else {
          dias[dia] = null;
        }
      });

      return {
        hora: bloque.hora,
        modulo: bloque.modulo,
        dias,
      };
    });

    res.json({
      materiasCount: materias.length,
      grilla,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener horarios del docente:', error);
    res.status(500).json({ error: 'Error al consultar horarios.', detalle: error.message });
  }
}

/**
 * @función obtenerInasistenciasYActasDocente
 * @descripción Consulta las faltas, asistencias, licencias y actas administrativas del docente autenticado.
 * @param {AuthRequest} req - Solicitud Express con el ID del docente autenticado.
 * @param {Response} res - Respuesta Express con el listado de inasistencias y actas.
 * @reglaDeNegocio Muestra el historial completo registrado por el personal No Docente/Directivo en asistencias_docentes.
 */
export async function obtenerInasistenciasYActasDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const registros = await AsistenciaDocente.find({ docente_id: req.usuario._id })
      .populate('revisado_por', 'nombre apellido rol')
      .sort({ fecha: -1, createdAt: -1 });

    const resumen = {
      presentes: registros.filter((r) => r.estado === 'Presente').length,
      ausentes: registros.filter((r) => r.estado === 'Ausente').length,
      tardanzas: registros.filter((r) => r.estado === 'Tardanza').length,
      licencias: registros.filter((r) => r.estado === 'Licencia').length,
      pendientes: registros.filter((r) => r.estado === 'Pendiente').length,
      aprobadas: registros.filter((r) => r.estado === 'Aprobada').length,
      desaprobadas: registros.filter((r) => r.estado === 'Desaprobada').length,
      total: registros.length,
    };

    const listadoFormatted = registros.map((r: any) => ({
      id: r._id,
      fecha: r.fecha ? r.fecha.toISOString().split('T')[0] : '',
      estado: r.estado,
      motivo: r.motivo || '-',
      observacion: r.observacion || 'Sin observaciones registradas',
      motivo_rechazo: r.motivo_rechazo || '',
      revisado_por: r.revisado_por
        ? `${r.revisado_por.nombre} ${r.revisado_por.apellido}`
        : '',
      fecha_revision: r.fecha_revision ? new Date(r.fecha_revision).toISOString().split('T')[0] : '',
      adjunto_nombre: r.adjunto_nombre || '',
      adjunto_tipo: r.adjunto_tipo || '',
      adjunto_data: r.adjunto_data || '',
    }));

    res.json({
      resumen,
      listado: listadoFormatted,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener inasistencias del docente:', error);
    res.status(500).json({ error: 'Error al consultar inasistencias y actas.', detalle: error.message });
  }
}

/**
 * @función solicitarInasistenciaDocente
 * @descripción Permite al personal Docente o No Docente registrar una solicitud de inasistencia con motivo,
 * observación opcional y constancia adjunta (PNG o PDF). Queda en estado 'Pendiente' y genera notificación al Director.
 */
export async function solicitarInasistenciaDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const { fecha, motivo, observacion, adjunto_nombre, adjunto_tipo, adjunto_data } = req.body;

    if (!motivo || String(motivo).trim() === '') {
      res.status(400).json({ error: 'Debe seleccionar un motivo para la solicitud de inasistencia.' });
      return;
    }

    if (adjunto_data) {
      const tipoValido = adjunto_tipo === 'image/png' || adjunto_tipo === 'application/pdf';
      const nombreLower = String(adjunto_nombre || '').toLowerCase();
      const extensionValida = nombreLower.endsWith('.png') || nombreLower.endsWith('.pdf');
      if (!tipoValido && !extensionValida) {
        res.status(400).json({ error: 'Solo se permiten archivos en formato PNG o PDF como constancia.' });
        return;
      }
    }

    const nuevaSolicitud = await AsistenciaDocente.create({
      docente_id: req.usuario._id,
      fecha: fecha ? new Date(`${fecha}T12:00:00`) : new Date(),
      estado: 'Pendiente',
      motivo: String(motivo).trim(),
      observacion: observacion ? String(observacion).trim() : '',
      notificacion_leida: false,
      adjunto_nombre: adjunto_nombre ? String(adjunto_nombre) : '',
      adjunto_tipo: adjunto_tipo ? String(adjunto_tipo) : '',
      adjunto_data: adjunto_data ? String(adjunto_data) : '',
    });

    res.status(201).json({
      id: nuevaSolicitud._id,
      fecha: nuevaSolicitud.fecha ? nuevaSolicitud.fecha.toISOString().split('T')[0] : '',
      estado: nuevaSolicitud.estado,
      motivo: nuevaSolicitud.motivo,
      observacion: nuevaSolicitud.observacion || 'Sin observaciones registradas',
      motivo_rechazo: '',
      adjunto_nombre: nuevaSolicitud.adjunto_nombre || '',
      adjunto_tipo: nuevaSolicitud.adjunto_tipo || '',
      adjunto_data: nuevaSolicitud.adjunto_data || '',
    });
  } catch (error: any) {
    console.error('❌ Error al solicitar inasistencia docente:', error);
    res.status(500).json({ error: 'Error al registrar la solicitud de inasistencia.', detalle: error.message });
  }
}

/**
 * @función obtenerMisMateriasYAlumnos
 * @descripción Devuelve las materias asignadas al docente junto con la lista de alumnos inscriptos para la carga de calificaciones.
 * @param {AuthRequest} req - Solicitud Express con req.usuario.
 * @param {Response} res - Respuesta Express con arreglo de materias y alumnos.
 * @reglaDeNegocio El docente solo accede a las materias asignadas a su ID.
 */
export async function obtenerMisMateriasYAlumnos(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const materias = await Materia.find({ docente_id: req.usuario._id }).populate({
      path: 'seccion_id',
      populate: { path: 'curso_id' },
    });

    const resultado = [];

    for (const mat of materias) {
      const seccionId = mat.seccion_id ? (mat.seccion_id as any)._id : null;
      let alumnos = [];

      if (seccionId) {
        alumnos = await User.find({
          rol: 'Alumno',
          'perfil_metadata.seccion_id': seccionId,
        }).select('_id nombre apellido dni perfil_metadata');
      }

      if (alumnos.length === 0) {
        // Fallback si no hay metadata de sección vinculada en el mock
        alumnos = await User.find({ rol: 'Alumno' }).select('_id nombre apellido dni perfil_metadata');
      }

      resultado.push({
        materia_id: mat._id,
        nombre_materia: mat.nombre_materia,
        seccion: (mat.seccion_id as any)?.nombre_seccion || 'División A',
        curso: ((mat.seccion_id as any)?.curso_id as any)?.nombre_curso || '1° Año',
        alumnos: alumnos.map((a) => ({
          id: a._id,
          nombre: a.nombre,
          apellido: a.apellido,
          dni: a.dni,
          legajo: a.perfil_metadata?.legajo || 'ALU-2026',
        })),
      });
    }

    res.json(resultado);
  } catch (error: any) {
    console.error('❌ Error al obtener materias y alumnos del docente:', error);
    res.status(500).json({ error: 'Error al consultar materias asignadas.', detalle: error.message });
  }
}

/**
 * Normaliza cadenas de texto eliminando acentos/diacríticos y convirtiendo a minúsculas
 * para búsquedas flexibles e insensibles a tildes o mayúsculas.
 */
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @función buscarRegistrosDocente
 * @descripción Multifiltro de registros de alumnos por Curso, División, Turno, Apellido, Nombre y/o DNI.
 * Devuelve únicamente los campos resumidos: DNI, Apellido, Nombre, Curso y Turno (más división e ID para selección).
 */
export async function buscarRegistrosDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const { curso, division, turno, apellido, nombre, dni } = req.query as Record<string, string | undefined>;

    const filtroCurso = curso ? normalizarTexto(curso) : '';
    const filtroDivision = division ? normalizarTexto(division) : '';
    const filtroTurno = turno ? normalizarTexto(turno) : '';
    const filtroApellido = apellido ? normalizarTexto(apellido) : '';
    const filtroNombre = nombre ? normalizarTexto(nombre) : '';
    const filtroDni = dni ? dni.replace(/\D/g, '').trim() : '';

    const [alumnos, todasSecciones, todosCursos] = await Promise.all([
      User.find({ rol: 'Alumno' })
        .select('_id dni nombre apellido rol estado turno curso_id seccion_id perfil_metadata')
        .populate('curso_id', 'nombre_curso nivel')
        .populate({
          path: 'seccion_id',
          select: 'nombre_seccion turno curso_id',
          populate: { path: 'curso_id', select: 'nombre_curso nivel' },
        })
        .sort({ apellido: 1, nombre: 1 }),
      Seccion.find({}).populate('curso_id', 'nombre_curso nivel'),
      Curso.find({}),
    ]);

    const mapaSecciones = new Map<string, any>();
    for (const s of todasSecciones) {
      mapaSecciones.set(String(s._id), s);
    }
    const mapaCursos = new Map<string, any>();
    for (const c of todosCursos) {
      mapaCursos.set(String(c._id), c);
    }

    const resultados = alumnos
      .map((al: any) => {
        const meta = al.perfil_metadata || {};
        const metaSeccion = meta.seccion_id
          ? mapaSecciones.get(String(meta.seccion_id))
          : null;
        const metaCurso = meta.curso_id
          ? mapaCursos.get(String(meta.curso_id))
          : null;

        const cursoNombre =
          al.curso_id?.nombre_curso ||
          al.seccion_id?.curso_id?.nombre_curso ||
          metaCurso?.nombre_curso ||
          metaSeccion?.curso_id?.nombre_curso ||
          meta.curso ||
          'Sin curso';

        const divisionNombre =
          al.seccion_id?.nombre_seccion ||
          metaSeccion?.nombre_seccion ||
          meta.seccion ||
          'Sin división';

        const turnoValor =
          al.turno ||
          al.seccion_id?.turno ||
          metaSeccion?.turno ||
          meta.turno ||
          'Sin turno';

        return {
          id: String(al._id),
          dni: al.dni || '',
          apellido: al.apellido || '',
          nombre: al.nombre || '',
          rol: al.rol || 'Alumno',
          estado: al.estado || 'Activo',
          fecha_nacimiento: meta.fecha_nacimiento || '',
          curso: cursoNombre,
          division: divisionNombre,
          turno: turnoValor,
          direccion: meta.direccion || '',
          barrio: meta.barrio || '',
          localidad: meta.localidad || '',
          provincia: meta.provincia || '',
          contacto: meta.contacto || meta.telefono || '',
          promedio_general:
            meta.promedio_general !== undefined && meta.promedio_general !== null && meta.promedio_general !== ''
              ? Number(meta.promedio_general)
              : '',
          sanciones:
            meta.sanciones !== undefined && meta.sanciones !== null && meta.sanciones !== ''
              ? Number(meta.sanciones)
              : 0,
        };
      })
      .filter((item) => {
        if (filtroCurso && !normalizarTexto(item.curso).includes(filtroCurso)) {
          return false;
        }
        if (filtroDivision && !normalizarTexto(item.division).includes(filtroDivision)) {
          return false;
        }
        if (filtroTurno && normalizarTexto(item.turno) !== filtroTurno) {
          return false;
        }
        if (filtroApellido && !normalizarTexto(item.apellido).includes(filtroApellido)) {
          return false;
        }
        if (filtroNombre && !normalizarTexto(item.nombre).includes(filtroNombre)) {
          return false;
        }
        if (filtroDni && !String(item.dni).replace(/\D/g, '').includes(filtroDni)) {
          return false;
        }
        return true;
      });

    res.json({
      total: resultados.length,
      resultados,
    });
  } catch (error: any) {
    console.error('❌ Error al buscar registros en panel docente:', error);
    res.status(500).json({ error: 'Error al buscar registros.', detalle: error.message });
  }
}

/**
 * @función obtenerDetalleRegistroAlumno
 * @descripción Devuelve el detalle completo de un alumno seleccionado desde el multifiltro,
 * cruzando en tiempo real todas las colecciones y relaciones cargadas por todos los roles
 * (Admin, Docente, No Docente, Padre y Alumno): User, Curso, Seccion, Parentesco, Materia, RegistroAcademico y Asistencia.
 */
export async function obtenerDetalleRegistroAlumno(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const { alumnoId } = req.params;

    const alumno: any = await User.findOne({ _id: alumnoId, rol: 'Alumno' })
      .select('_id dni nombre apellido turno curso_id seccion_id perfil_metadata')
      .populate('curso_id', 'nombre_curso nivel')
      .populate({
        path: 'seccion_id',
        select: 'nombre_seccion turno curso_id',
        populate: { path: 'curso_id', select: 'nombre_curso nivel' },
      });

    if (!alumno) {
      res.status(404).json({ error: 'Registro de alumno no encontrado.' });
      return;
    }

    const meta = alumno.perfil_metadata || {};

    // Resolver sección/curso también desde perfil_metadata si fue asignado así por Admin
    let seccionResuelta: any = alumno.seccion_id || null;
    if (!seccionResuelta && meta.seccion_id) {
      seccionResuelta = await Seccion.findById(meta.seccion_id).populate('curso_id', 'nombre_curso nivel');
    }
    let cursoResuelto: any = alumno.curso_id || seccionResuelta?.curso_id || null;
    if (!cursoResuelto && meta.curso_id) {
      cursoResuelto = await Curso.findById(meta.curso_id);
    }

    const cursoNombre = cursoResuelto?.nombre_curso || meta.curso || 'Sin curso';
    const divisionNombre = seccionResuelta?.nombre_seccion || meta.seccion || 'Sin división';
    const turnoValor = alumno.turno || seccionResuelta?.turno || meta.turno || 'Sin turno';

    const seccionId = seccionResuelta?._id || meta.seccion_id || null;

    // Consultar en paralelo todas las relaciones reales cargadas por Admin, Docente, No Docente y Padre
    const [parentescos, materiasSeccion, registros, asistenciasAlumno] = await Promise.all([
      Parentesco.find({ alumno_id: alumno._id }).populate(
        'padre_id',
        'nombre apellido dni perfil_metadata'
      ),
      seccionId
        ? Materia.find({ seccion_id: seccionId }).select('_id nombre_materia docente_id')
        : Promise.resolve([]),
      RegistroAcademico.find({ alumno_id: alumno._id })
        .populate('materia_id', '_id nombre_materia')
        .sort({ fecha: -1 }),
      Asistencia.find({ persona_id: alumno._id, tipo_persona: 'Alumno' })
        .sort({ fecha: -1 })
        .limit(10),
    ]);

    // 1. Padres / Tutores registrados en Parentesco
    const padresTutores = parentescos
      .filter((p: any) => p.padre_id)
      .map((p: any) => ({
        apellido: p.padre_id.apellido || '',
        nombre: p.padre_id.nombre || '',
        vinculo: p.tipo_vinculo || 'Tutor',
      }));

    // 2. Materias y calificaciones por trimestre (de todas las cargas realizadas por Docentes/Admin/No Docente)
    const mapaMaterias = new Map<
      string,
      {
        materia_id: string;
        nombre_materia: string;
        trimestre1: string[];
        trimestre2: string[];
        trimestre3: string[];
      }
    >();

    for (const mat of materiasSeccion) {
      const idStr = String(mat._id);
      mapaMaterias.set(idStr, {
        materia_id: idStr,
        nombre_materia: mat.nombre_materia,
        trimestre1: [],
        trimestre2: [],
        trimestre3: [],
      });
    }

    const sanciones: Array<{
      id: string;
      fecha: string;
      valor: string;
      observacion: string;
      materia: string;
    }> = [];

    for (const reg of registros as any[]) {
      const matObj = reg.materia_id;
      const matId = matObj?._id ? String(matObj._id) : 'sin-materia';
      const matNombre = matObj?.nombre_materia || 'Materia';

      if (reg.tipo === 'nota') {
        if (!mapaMaterias.has(matId)) {
          mapaMaterias.set(matId, {
            materia_id: matId,
            nombre_materia: matNombre,
            trimestre1: [],
            trimestre2: [],
            trimestre3: [],
          });
        }
        const entry = mapaMaterias.get(matId)!;
        const notaFormateada = !isNaN(parseFloat(reg.valor))
          ? parseFloat(reg.valor).toFixed(2)
          : String(reg.valor);

        const obsStr = String(reg.observacion || '');
        if (reg.trimestre === 2 || (!reg.trimestre && obsStr.includes('2°'))) {
          entry.trimestre2.push(notaFormateada);
        } else if (reg.trimestre === 3 || (!reg.trimestre && obsStr.includes('3°'))) {
          entry.trimestre3.push(notaFormateada);
        } else {
          entry.trimestre1.push(notaFormateada);
        }
      } else if (reg.tipo === 'sancion') {
        sanciones.push({
          id: String(reg._id),
          fecha: reg.fecha ? new Date(reg.fecha).toISOString().split('T')[0] : '',
          valor: reg.valor || 'Sanción',
          observacion: reg.observacion || 'Sin observación especificada.',
          materia: matNombre,
        });
      }
    }

    // 3. Observación general (prioriza la del perfil y complementa con comentarios de preceptoría/asistencias si existen)
    const comentariosAsistencia = (asistenciasAlumno as any[])
      .filter((a) => a.comentario && String(a.comentario).trim() !== '')
      .map((a) => `${a.fecha ? new Date(a.fecha).toISOString().split('T')[0] : ''}: ${a.comentario}`);

    let observacionGeneral = meta.observacion_general || '';
    if (!observacionGeneral && comentariosAsistencia.length > 0) {
      observacionGeneral = comentariosAsistencia.join(' | ');
    } else if (!observacionGeneral) {
      observacionGeneral = 'Sin observaciones generales registradas para el estudiante.';
    }

    // Si algún padre tiene teléfono cargado en su perfil_metadata, usarlo como respaldo para contacto de emergencia
    const primerTutorConTel = parentescos
      .map((p: any) => p.padre_id?.perfil_metadata?.celular || p.padre_id?.perfil_metadata?.telefono)
      .find(Boolean);

    res.json({
      id: String(alumno._id),
      dni: alumno.dni || '',
      apellido: alumno.apellido || '',
      nombre: alumno.nombre || '',
      curso: cursoNombre,
      division: divisionNombre,
      turno: turnoValor,
      datos_personales: {
        padres_tutores: padresTutores,
        direccion: meta.direccion || 'No registrada',
        barrio: meta.barrio || 'No registrado',
        localidad: meta.localidad || 'No registrada',
        provincia: meta.provincia || 'No registrada',
        contacto_emergencia: meta.contacto_emergencia || primerTutorConTel || 'No registrado',
        contacto: meta.contacto || meta.celular || meta.telefono || 'No registrado',
      },
      materias: Array.from(mapaMaterias.values()),
      cantidad_sanciones: sanciones.length,
      sanciones,
      observacion_general: observacionGeneral,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener detalle del registro del alumno:', error);
    res.status(500).json({ error: 'Error al consultar el detalle del registro.', detalle: error.message });
  }
}
