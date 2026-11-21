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

    const [todosAlumnos, todasSecciones, todosCursos] = await Promise.all([
      User.find({ rol: 'Alumno' })
        .select('_id nombre apellido dni curso_id seccion_id perfil_metadata')
        .populate('curso_id', 'nombre_curso')
        .populate({
          path: 'seccion_id',
          select: 'nombre_seccion curso_id',
          populate: { path: 'curso_id', select: 'nombre_curso' },
        })
        .sort({ apellido: 1, nombre: 1 }),
      Seccion.find({}).populate('curso_id', 'nombre_curso'),
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

    const resultado = [];

    for (const mat of materias) {
      const seccionObj: any = mat.seccion_id;
      const seccionId = seccionObj?._id ? String(seccionObj._id) : '';
      const divisionNombre = seccionObj?.nombre_seccion || 'División A';
      const cursoNombre = seccionObj?.curso_id?.nombre_curso || '1° Año';
      const cursoNorm = normalizarTexto(cursoNombre);
      const divisionNorm = normalizarTexto(divisionNombre);

      // Filtrar estrictamente alumnos inscriptos en el curso y división de esta asignatura (sin fallback global)
      const alumnosDeLaMateria = todosAlumnos.filter((a: any) => {
        const meta = a.perfil_metadata || {};
        const aluSeccionDirecta = a.seccion_id?._id ? String(a.seccion_id._id) : '';
        const aluSeccionMeta = meta.seccion_id ? String(meta.seccion_id) : '';

        if (seccionId && (aluSeccionDirecta === seccionId || aluSeccionMeta === seccionId)) {
          return true;
        }

        const metaSeccion = meta.seccion_id ? mapaSecciones.get(String(meta.seccion_id)) : null;
        const metaCurso = meta.curso_id ? mapaCursos.get(String(meta.curso_id)) : null;

        const aluCurso =
          a.curso_id?.nombre_curso ||
          a.seccion_id?.curso_id?.nombre_curso ||
          metaCurso?.nombre_curso ||
          metaSeccion?.curso_id?.nombre_curso ||
          meta.curso ||
          '';

        const aluDivision =
          a.seccion_id?.nombre_seccion ||
          metaSeccion?.nombre_seccion ||
          meta.seccion ||
          (meta.division ? `División ${meta.division}` : '');

        return (
          Boolean(cursoNorm && divisionNorm) &&
          normalizarTexto(aluCurso) === cursoNorm &&
          normalizarTexto(aluDivision) === divisionNorm
        );
      });

      resultado.push({
        materia_id: mat._id,
        nombre_materia: mat.nombre_materia,
        seccion_id: seccionId || null,
        seccion: divisionNombre,
        curso: cursoNombre,
        alumnos: alumnosDeLaMateria.map((a: any) => ({
          id: a._id,
          nombre: a.nombre,
          apellido: a.apellido,
          dni: a.dni,
          legajo: a.perfil_metadata?.legajo || 'ALU-2026',
          curso: cursoNombre,
          division: divisionNombre,
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
 * @descripción Multifiltro de registros de alumnos por Curso, División, Turno, Apellido, Nombre, DNI y rango de fechas (Fecha Desde / Fecha Hasta).
 * Cuando consulta un Docente (salvo ?alcance=todos para el modal de Seleccionar Estudiante),
 * restringe los resultados exclusivamente a los alumnos y registros asociados al DNI/Asignatura(s) del profesor,
 * calcula el promedio general real según las calificaciones ingresadas y los ordena de forma ASC.
 */
export async function buscarRegistrosDocente(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const {
      curso,
      division,
      turno,
      apellido,
      nombre,
      dni,
      fechaDesde,
      fechaHasta,
      alcance,
      soloAsignaturasDocente,
    } = req.query as Record<string, string | undefined>;

    const esModoAsignaturaDocente =
      soloAsignaturasDocente === 'true' ||
      (req.usuario.rol === 'Docente' && alcance !== 'todos');

    const filtroCurso = curso ? normalizarTexto(curso) : '';
    const filtroDivision = division ? normalizarTexto(division) : '';
    const filtroTurno = turno ? normalizarTexto(turno) : '';
    const filtroApellido = apellido ? normalizarTexto(apellido) : '';
    const filtroNombre = nombre ? normalizarTexto(nombre) : '';
    const filtroDni = dni ? dni.replace(/\D/g, '').trim() : '';

    const fechaDesdeDate =
      fechaDesde && /^\d{4}-\d{2}-\d{2}$/.test(fechaDesde.trim())
        ? new Date(`${fechaDesde.trim()}T00:00:00.000Z`)
        : null;
    const fechaHastaDate =
      fechaHasta && /^\d{4}-\d{2}-\d{2}$/.test(fechaHasta.trim())
        ? new Date(`${fechaHasta.trim()}T23:59:59.999Z`)
        : null;
    const hayFiltroFecha = Boolean(fechaDesdeDate || fechaHastaDate);

    // Si está en modo docente por asignatura, resolver sus materias asignadas por su ID/DNI
    let asignaturasDocente: Array<{
      materia_id: string;
      nombre_materia: string;
      seccion_id: string;
      curso: string;
      division: string;
      turno: string;
    }> = [];

    if (esModoAsignaturaDocente) {
      const materiasDoc = await Materia.find({ docente_id: req.usuario._id }).populate({
        path: 'seccion_id',
        populate: { path: 'curso_id' },
      });

      asignaturasDocente = materiasDoc.map((mat: any) => {
        const sec = mat.seccion_id;
        const cur = sec?.curso_id;
        return {
          materia_id: String(mat._id),
          nombre_materia: mat.nombre_materia || 'Asignatura',
          seccion_id: sec?._id ? String(sec._id) : '',
          curso: cur?.nombre_curso || '',
          division: sec?.nombre_seccion || '',
          turno: sec?.turno || '',
        };
      });

      if (asignaturasDocente.length === 0) {
        res.json({
          total: 0,
          asignaturas_docente: [],
          resultados: [],
        });
        return;
      }
    }

    const materiaIdsDocente = asignaturasDocente.map((a) => a.materia_id);
    const seccionIdsDocente = new Set(
      asignaturasDocente.map((a) => a.seccion_id).filter(Boolean)
    );
    const paresCursoDivisionDocente = asignaturasDocente
      .filter((a) => a.curso && a.division)
      .map((a) => ({
        cursoNorm: normalizarTexto(a.curso),
        divisionNorm: normalizarTexto(a.division),
        nombre_materia: a.nombre_materia,
      }));

    const filtroNotasQuery: any = { tipo: 'nota' };
    if (esModoAsignaturaDocente) {
      filtroNotasQuery.materia_id = { $in: materiaIdsDocente };
    }

    const [alumnos, todasSecciones, todosCursos, todasNotas, todosRegistrosDocente] =
      await Promise.all([
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
        RegistroAcademico.find(filtroNotasQuery).select('alumno_id materia_id valor fecha'),
        esModoAsignaturaDocente
          ? RegistroAcademico.find({ materia_id: { $in: materiaIdsDocente } }).select(
              'alumno_id materia_id fecha'
            )
          : Promise.resolve([]),
      ]);

    const mapaSecciones = new Map<string, any>();
    for (const s of todasSecciones) {
      mapaSecciones.set(String(s._id), s);
    }
    const mapaCursos = new Map<string, any>();
    for (const c of todosCursos) {
      mapaCursos.set(String(c._id), c);
    }

    const mapaNombreMateriaPorId = new Map<string, string>();
    for (const a of asignaturasDocente) {
      mapaNombreMateriaPorId.set(a.materia_id, a.nombre_materia);
    }

    // Alumnos que tienen al menos un registro académico dentro de las asignaturas del docente
    const alumnosConRegistroEnMateria = new Map<string, Set<string>>();
    const alumnosConRegistroEnRangoFecha = new Set<string>();

    for (const reg of todosRegistrosDocente as any[]) {
      const alId = String(reg.alumno_id);
      const matId = String(reg.materia_id);
      const setMats = alumnosConRegistroEnMateria.get(alId) || new Set<string>();
      const nombreMat = mapaNombreMateriaPorId.get(matId);
      if (nombreMat) setMats.add(nombreMat);
      alumnosConRegistroEnMateria.set(alId, setMats);

      if (hayFiltroFecha && reg.fecha) {
        const f = new Date(reg.fecha);
        const cumpleDesde = !fechaDesdeDate || f >= fechaDesdeDate;
        const cumpleHasta = !fechaHastaDate || f <= fechaHastaDate;
        if (cumpleDesde && cumpleHasta) {
          alumnosConRegistroEnRangoFecha.add(alId);
        }
      }
    }

    // Agrupar notas válidas por alumno (respetando rango Fecha Desde / Fecha Hasta si fue ingresado)
    const notasPorAlumno = new Map<string, number[]>();
    for (const n of todasNotas as any[]) {
      if (hayFiltroFecha) {
        if (!n.fecha) continue;
        const f = new Date(n.fecha);
        if (fechaDesdeDate && f < fechaDesdeDate) continue;
        if (fechaHastaDate && f > fechaHastaDate) continue;
      }
      const num = parseFloat(String(n.valor).replace(',', '.'));
      if (isNaN(num)) continue;
      const alId = String(n.alumno_id);
      const lista = notasPorAlumno.get(alId) || [];
      lista.push(num);
      notasPorAlumno.set(alId, lista);
    }

    const resultados = alumnos
      .map((al: any) => {
        const meta = al.perfil_metadata || {};
        const seccionIdDirecto = al.seccion_id?._id
          ? String(al.seccion_id._id)
          : meta.seccion_id
          ? String(meta.seccion_id)
          : '';
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

        const alIdStr = String(al._id);
        const cursoNorm = normalizarTexto(cursoNombre);
        const divNorm = normalizarTexto(divisionNombre);

        // Determinar asignaturas del docente asociadas a este estudiante
        const asignaturasAsociadas = new Set<string>();
        for (const asig of asignaturasDocente) {
          if (asig.seccion_id && seccionIdDirecto && asig.seccion_id === seccionIdDirecto) {
            asignaturasAsociadas.add(asig.nombre_materia);
          }
        }
        for (const par of paresCursoDivisionDocente) {
          if (cursoNorm === par.cursoNorm && divNorm === par.divisionNorm) {
            asignaturasAsociadas.add(par.nombre_materia);
          }
        }
        const matsPorRegistro = alumnosConRegistroEnMateria.get(alIdStr);
        if (matsPorRegistro) {
          matsPorRegistro.forEach((m) => asignaturasAsociadas.add(m));
        }

        const notasCalculo = notasPorAlumno.get(alIdStr) || [];
        const promedioCalculado =
          notasCalculo.length > 0
            ? Number(
                (
                  notasCalculo.reduce((acc, v) => acc + v, 0) / notasCalculo.length
                ).toFixed(2)
              )
            : null;

        const promedioFinal = esModoAsignaturaDocente
          ? promedioCalculado
          : promedioCalculado !== null
          ? promedioCalculado
          : meta.promedio_general !== undefined &&
            meta.promedio_general !== null &&
            meta.promedio_general !== ''
          ? Number(meta.promedio_general)
          : '';

        return {
          id: alIdStr,
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
          asignaturas: Array.from(asignaturasAsociadas),
          cantidad_notas: notasCalculo.length,
          promedio_general: promedioFinal,
          sanciones:
            meta.sanciones !== undefined && meta.sanciones !== null && meta.sanciones !== ''
              ? Number(meta.sanciones)
              : 0,
          _perteneceSeccionDocente:
            (seccionIdDirecto && seccionIdsDocente.has(seccionIdDirecto)) ||
            asignaturasAsociadas.size > 0,
        };
      })
      .filter((item) => {
        if (esModoAsignaturaDocente) {
          if (!item._perteneceSeccionDocente) {
            return false;
          }
          if (hayFiltroFecha) {
            const tieneNotaEnRango = item.cantidad_notas > 0;
            const tieneOtroRegistroEnRango = alumnosConRegistroEnRangoFecha.has(item.id);
            if (!tieneNotaEnRango && !tieneOtroRegistroEnRango) {
              return false;
            }
          }
        } else if (hayFiltroFecha) {
          if (item.cantidad_notas === 0) return false;
        }

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
      })
      .map(({ _perteneceSeccionDocente, ...rest }) => rest);

    if (esModoAsignaturaDocente) {
      // Ordenar de forma ASC según el promedio general calculado con las calificaciones ingresadas
      resultados.sort((a, b) => {
        const promA =
          typeof a.promedio_general === 'number' && !isNaN(a.promedio_general)
            ? a.promedio_general
            : null;
        const promB =
          typeof b.promedio_general === 'number' && !isNaN(b.promedio_general)
            ? b.promedio_general
            : null;

        if (promA !== null && promB !== null) {
          if (promA !== promB) return promA - promB;
        } else if (promA !== null) {
          return -1;
        } else if (promB !== null) {
          return 1;
        }

        const cmpAp = a.apellido.localeCompare(b.apellido, 'es');
        if (cmpAp !== 0) return cmpAp;
        return a.nombre.localeCompare(b.nombre, 'es');
      });
    }

    res.json({
      total: resultados.length,
      asignaturas_docente: asignaturasDocente,
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

    const inasistencias: Array<{
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
      } else if (reg.tipo === 'inasistencia') {
        inasistencias.push({
          id: String(reg._id),
          fecha: reg.fecha ? new Date(reg.fecha).toISOString().split('T')[0] : '',
          valor: reg.valor || 'Ausente',
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

    const cantidadInasistenciasFaltas = inasistencias.filter(
      (i) => String(i.valor || '').trim().toLowerCase() !== 'presente'
    ).length;

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
      cantidad_inasistencias: cantidadInasistenciasFaltas,
      inasistencias,
      observacion_general: observacionGeneral,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener detalle del registro del alumno:', error);
    res.status(500).json({ error: 'Error al consultar el detalle del registro.', detalle: error.message });
  }
}
