/**
 * @archivo src/controllers/directorController.ts
 * @descripción Controlador REST para el Rol Director (Tablero Directivo y Reportes Consolidados)
 * cruzando en tiempo real la información de todos los roles cargados (Admin, Docente, No Docente, Alumno y Padre).
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Asistencia } from '../models/Asistencia.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * @función obtenerResumenDirectivo
 * @descripción Calcula indicadores institucionales consolidados en tiempo real:
 * Matrícula Total, Plantel Docente Activo, Asistencia General (%) y Promedio Académico Global.
 */
export async function obtenerResumenDirectivo(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      matriculaTotal,
      plantelDocente,
      notasDocs,
      asistenciasDiarias,
      asistenciasDocentes,
      inasistenciasRegistros,
    ] = await Promise.all([
      User.countDocuments({ rol: 'Alumno', estado: 'Activo' }),
      User.countDocuments({ rol: 'Docente', estado: 'Activo' }),
      RegistroAcademico.find({ tipo: 'nota' }).select('valor'),
      Asistencia.find({}).select('estado'),
      AsistenciaDocente.find({}).select('estado'),
      RegistroAcademico.countDocuments({ tipo: 'inasistencia' }),
    ]);

    // 1. Promedio Académico Global
    let sumaNotas = 0;
    let cantidadNotas = 0;
    for (const n of notasDocs) {
      const val = parseFloat(n.valor);
      if (!isNaN(val)) {
        sumaNotas += val;
        cantidadNotas++;
      }
    }
    const promedioAcademico = cantidadNotas > 0 ? Number((sumaNotas / cantidadNotas).toFixed(2)) : 0;

    // 2. Asistencia General (%) consolidada a partir de asistencias diarias + docentes + inasistencias académicas
    const presentesDiarias = asistenciasDiarias.filter((a) => a.estado === 'Presente').length;
    const totalDiarias = asistenciasDiarias.length;

    const presentesDoc = asistenciasDocentes.filter((a) => a.estado === 'Presente').length;
    const totalDoc = asistenciasDocentes.filter((a) => a.estado !== 'Pendiente').length;

    const totalEventosAsistencia = totalDiarias + totalDoc + inasistenciasRegistros;
    const totalPresentes = presentesDiarias + presentesDoc;

    let asistenciaGeneral = 100;
    if (totalEventosAsistencia > 0) {
      if (totalPresentes === 0 && inasistenciasRegistros > 0 && matriculaTotal > 0) {
        // Si solo existen faltas cargadas sin partes de presente, estimar sobre matrícula activa * 20 días hábiles
        const baseDias = matriculaTotal * 20;
        asistenciaGeneral = Number(
          Math.max(0, ((baseDias - inasistenciasRegistros) / baseDias) * 100).toFixed(1)
        );
      } else {
        asistenciaGeneral = Number(((totalPresentes / totalEventosAsistencia) * 100).toFixed(1));
      }
    }

    const mesActual = MESES_ES[new Date().getMonth()];

    res.json({
      matriculaTotal,
      plantelDocente,
      asistenciaGeneral,
      promedioAcademico,
      mesActual,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener resumen directivo:', error);
    res.status(500).json({ error: 'Error al calcular indicadores del tablero directivo.', detalle: error.message });
  }
}

/**
 * @función obtenerReportesDirectivo
 * @descripción Consolida registros filtrables por Curso/División, rango de fechas (Desde/Hasta) y Tipo de Registro
 * (Todos, Asistencias, Calificaciones, Sanciones), combinando RegistroAcademico y Asistencia de todos los roles.
 */
export async function obtenerReportesDirectivo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { cursoDivision, fechaDesde, fechaHasta, tipo } = req.query as Record<string, string | undefined>;

    const [secciones, cursos, registrosAcademicos, asistenciasDiarias] = await Promise.all([
      Seccion.find({}).populate('curso_id', 'nombre_curso nivel'),
      Curso.find({}),
      RegistroAcademico.find({})
        .populate({
          path: 'alumno_id',
          select: '_id nombre apellido dni curso_id seccion_id perfil_metadata',
          populate: [
            { path: 'curso_id', select: 'nombre_curso' },
            { path: 'seccion_id', select: 'nombre_seccion curso_id', populate: { path: 'curso_id', select: 'nombre_curso' } },
          ],
        })
        .populate({
          path: 'materia_id',
          select: '_id nombre_materia seccion_id',
          populate: {
            path: 'seccion_id',
            select: 'nombre_seccion curso_id',
            populate: { path: 'curso_id', select: 'nombre_curso' },
          },
        })
        .sort({ fecha: -1 }),
      Asistencia.find({ tipo_persona: 'Alumno' })
        .populate({
          path: 'persona_id',
          select: '_id nombre apellido dni curso_id seccion_id perfil_metadata',
          populate: [
            { path: 'curso_id', select: 'nombre_curso' },
            { path: 'seccion_id', select: 'nombre_seccion curso_id', populate: { path: 'curso_id', select: 'nombre_curso' } },
          ],
        })
        .populate({
          path: 'seccion_id',
          select: 'nombre_seccion curso_id',
          populate: { path: 'curso_id', select: 'nombre_curso' },
        })
        .populate('materia_id', 'nombre_materia')
        .sort({ fecha: -1 }),
    ]);

    const mapaSecciones = new Map<string, any>();
    for (const s of secciones) mapaSecciones.set(String(s._id), s);
    const mapaCursos = new Map<string, any>();
    for (const c of cursos) mapaCursos.set(String(c._id), c);

    const formatearCursoDivision = (cursoNombre?: string, divisionNombre?: string): string => {
      if (cursoNombre && divisionNombre) return `${cursoNombre} - ${divisionNombre}`;
      if (cursoNombre) return cursoNombre;
      if (divisionNombre) return divisionNombre;
      return 'Sin asignar';
    };

    const cursosDivisionesDisponibles = Array.from(
      new Set(
        secciones.map((s: any) => formatearCursoDivision(s.curso_id?.nombre_curso, s.nombre_seccion))
      )
    ).sort((a, b) => a.localeCompare(b));

    interface RegistroConsolidado {
      id: string;
      alumno: string;
      dni: string;
      cursoDivision: string;
      fechaISO: string;
      fechaDisplay: string;
      tipo: 'Asistencia' | 'Calificación' | 'Sanción';
      estadoCalificacion: string;
      observaciones: string;
    }

    const consolidados: RegistroConsolidado[] = [];

    // 1. Mapear RegistroAcademico (Calificaciones, Inasistencias, Sanciones)
    for (const r of registrosAcademicos as any[]) {
      const alu = r.alumno_id;
      const mat = r.materia_id;
      const secMat = mat?.seccion_id;
      const secAlu =
        alu?.seccion_id ||
        (alu?.perfil_metadata?.seccion_id ? mapaSecciones.get(String(alu.perfil_metadata.seccion_id)) : null);
      const curAlu =
        alu?.curso_id ||
        (alu?.perfil_metadata?.curso_id ? mapaCursos.get(String(alu.perfil_metadata.curso_id)) : null);

      const cursoNombre =
        secMat?.curso_id?.nombre_curso || curAlu?.nombre_curso || secAlu?.curso_id?.nombre_curso || '';
      const divisionNombre = secMat?.nombre_seccion || secAlu?.nombre_seccion || '';

      const fechaObj = r.fecha ? new Date(r.fecha) : new Date();
      const fechaISO = fechaObj.toISOString().split('T')[0];
      const fechaDisplay = fechaObj.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const tipoLabel: 'Asistencia' | 'Calificación' | 'Sanción' =
        r.tipo === 'nota' ? 'Calificación' : r.tipo === 'sancion' ? 'Sanción' : 'Asistencia';

      const obsTexto = r.observacion
        ? mat?.nombre_materia
          ? `${mat.nombre_materia} — ${r.observacion}`
          : r.observacion
        : mat?.nombre_materia || '-';

      consolidados.push({
        id: `reg_${r._id}`,
        alumno: alu ? `${alu.apellido}, ${alu.nombre}` : 'Estudiante',
        dni: alu?.dni || '-',
        cursoDivision: formatearCursoDivision(cursoNombre, divisionNombre),
        fechaISO,
        fechaDisplay,
        tipo: tipoLabel,
        estadoCalificacion:
          r.tipo === 'nota' && !isNaN(parseFloat(r.valor)) ? parseFloat(r.valor).toFixed(2) : r.valor || '-',
        observaciones: obsTexto,
      });
    }

    // 2. Mapear Asistencias Diarias (cargadas por No Docente / Preceptoría)
    for (const a of asistenciasDiarias as any[]) {
      const alu = a.persona_id;
      const secAsis = a.seccion_id;
      const secAlu =
        alu?.seccion_id ||
        (alu?.perfil_metadata?.seccion_id ? mapaSecciones.get(String(alu.perfil_metadata.seccion_id)) : null);
      const curAlu =
        alu?.curso_id ||
        (alu?.perfil_metadata?.curso_id ? mapaCursos.get(String(alu.perfil_metadata.curso_id)) : null);

      const cursoNombre =
        secAsis?.curso_id?.nombre_curso || curAlu?.nombre_curso || secAlu?.curso_id?.nombre_curso || '';
      const divisionNombre = secAsis?.nombre_seccion || secAlu?.nombre_seccion || '';

      const fechaObj = a.fecha ? new Date(a.fecha) : new Date();
      const fechaISO = fechaObj.toISOString().split('T')[0];
      const fechaDisplay = fechaObj.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      consolidados.push({
        id: `asis_${a._id}`,
        alumno: alu ? `${alu.apellido}, ${alu.nombre}` : 'Estudiante',
        dni: alu?.dni || '-',
        cursoDivision: formatearCursoDivision(cursoNombre, divisionNombre),
        fechaISO,
        fechaDisplay,
        tipo: 'Asistencia',
        estadoCalificacion: a.estado || 'Presente',
        observaciones: a.comentario || '-',
      });
    }

    // Ordenar por fecha descendente
    consolidados.sort((x, y) => y.fechaISO.localeCompare(x.fechaISO));

    // Aplicar filtros solicitados
    const filtrados = consolidados.filter((item) => {
      if (cursoDivision && cursoDivision !== 'Todos' && item.cursoDivision !== cursoDivision) {
        return false;
      }
      if (fechaDesde && item.fechaISO < fechaDesde) {
        return false;
      }
      if (fechaHasta && item.fechaISO > fechaHasta) {
        return false;
      }
      if (tipo && tipo !== 'Todos') {
        if (tipo === 'Asistencias' && item.tipo !== 'Asistencia') return false;
        if (tipo === 'Calificaciones' && item.tipo !== 'Calificación') return false;
        if (tipo === 'Sanciones' && item.tipo !== 'Sanción') return false;
      }
      return true;
    });

    res.json({
      total: filtrados.length,
      cursosDivisionesDisponibles,
      registros: filtrados,
    });
  } catch (error: any) {
    console.error('❌ Error al generar reportes directivos:', error);
    res.status(500).json({ error: 'Error al consultar reportes directivos.', detalle: error.message });
  }
}

/**
 * @función obtenerNotificacionesInasistencias
 * @descripción Devuelve al Director las solicitudes de inasistencia pendientes (y resueltas recientes)
 * enviadas por personal Docente y No Docente para su aprobación o desaprobación.
 */
export async function obtenerNotificacionesInasistencias(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const solicitudes = await AsistenciaDocente.find({
      estado: { $in: ['Pendiente', 'Aprobada', 'Desaprobada'] },
    })
      .populate('docente_id', 'nombre apellido dni rol')
      .populate('revisado_por', 'nombre apellido rol')
      .sort({ createdAt: -1 });

    const mapSolicitud = (s: any) => ({
      id: String(s._id),
      solicitante: s.docente_id
        ? {
            id: String(s.docente_id._id),
            nombre: s.docente_id.nombre || '',
            apellido: s.docente_id.apellido || '',
            dni: s.docente_id.dni || '',
            rol: s.docente_id.rol || 'Docente',
          }
        : {
            id: '',
            nombre: 'Personal',
            apellido: 'Institucional',
            dni: '-',
            rol: 'Docente',
          },
      fecha: s.fecha ? new Date(s.fecha).toISOString().split('T')[0] : '',
      estado: s.estado,
      motivo: s.motivo || 'Sin motivo especificado',
      observacion: s.observacion || '',
      motivo_rechazo: s.motivo_rechazo || '',
      revisado_por: s.revisado_por
        ? `${s.revisado_por.nombre} ${s.revisado_por.apellido}`
        : '',
      fecha_revision: s.fecha_revision ? new Date(s.fecha_revision).toISOString() : '',
      adjunto_nombre: s.adjunto_nombre || '',
      adjunto_tipo: s.adjunto_tipo || '',
      adjunto_data: s.adjunto_data || '',
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : '',
    });

    const todas = solicitudes.map(mapSolicitud);
    const pendientes = todas.filter((s) => s.estado === 'Pendiente');
    const historial = todas.filter((s) => s.estado !== 'Pendiente').slice(0, 20);

    res.json({
      pendientesCount: pendientes.length,
      pendientes,
      historial,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener notificaciones de inasistencias:', error);
    res.status(500).json({
      error: 'Error al consultar las notificaciones de inasistencias.',
      detalle: error.message,
    });
  }
}

/**
 * @función resolverSolicitudInasistencia
 * @descripción Permite al Director aprobar o desaprobar una solicitud de inasistencia de un Docente o No Docente.
 * Si desaprueba, exige obligatoriamente indicar el motivo de desaprobación.
 */
export async function resolverSolicitudInasistencia(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const { id } = req.params;
    const { accion, motivo_rechazo } = req.body as {
      accion?: 'aprobar' | 'desaprobar';
      motivo_rechazo?: string;
    };

    if (accion !== 'aprobar' && accion !== 'desaprobar') {
      res.status(400).json({ error: 'Acción inválida. Debe indicar "aprobar" o "desaprobar".' });
      return;
    }

    if (accion === 'desaprobar' && (!motivo_rechazo || String(motivo_rechazo).trim() === '')) {
      res.status(400).json({ error: 'Debe indicar el motivo de desaprobación.' });
      return;
    }

    const solicitud: any = await AsistenciaDocente.findById(id).populate('docente_id', 'nombre apellido dni rol');
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud de inasistencia no encontrada.' });
      return;
    }

    solicitud.estado = accion === 'aprobar' ? 'Aprobada' : 'Desaprobada';
    solicitud.motivo_rechazo = accion === 'desaprobar' ? String(motivo_rechazo).trim() : '';
    solicitud.revisado_por = req.usuario._id;
    solicitud.fecha_revision = new Date();
    solicitud.notificacion_leida = true;
    await solicitud.save();

    // Si el Director aprueba la inasistencia, reflejarla en Control de Asistencias para el rol correspondiente
    if (accion === 'aprobar' && solicitud.docente_id) {
      const rolSolicitante = solicitud.docente_id.rol;
      if (rolSolicitante === 'Docente' || rolSolicitante === 'No Docente') {
        const fechaBase = solicitud.fecha ? new Date(solicitud.fecha) : new Date();
        const inicioDia = new Date(fechaBase);
        inicioDia.setUTCHours(0, 0, 0, 0);
        const finDia = new Date(fechaBase);
        finDia.setUTCHours(23, 59, 59, 999);

        const existente = await Asistencia.findOne({
          persona_id: solicitud.docente_id._id,
          fecha: { $gte: inicioDia, $lte: finDia },
        });

        const comentarioAprobado = `Inasistencia aprobada por Dirección — Motivo: ${solicitud.motivo || 'Justificado'}${
          solicitud.observacion ? ` (${solicitud.observacion})` : ''
        }`;

        if (!existente) {
          await Asistencia.create({
            persona_id: solicitud.docente_id._id,
            tipo_persona: rolSolicitante,
            fecha: fechaBase,
            estado: 'Ausente',
            comentario: comentarioAprobado,
          });
        } else {
          existente.estado = 'Ausente';
          existente.comentario = comentarioAprobado;
          await existente.save();
        }
      }
    }

    res.json({
      id: String(solicitud._id),
      estado: solicitud.estado,
      motivo_rechazo: solicitud.motivo_rechazo || '',
      fecha_revision: solicitud.fecha_revision,
    });
  } catch (error: any) {
    console.error('❌ Error al resolver solicitud de inasistencia:', error);
    res.status(500).json({
      error: 'Error al procesar la resolución de la solicitud.',
      detalle: error.message,
    });
  }
}

