/**
 * @archivo src/controllers/eventoAcademicoController.ts
 * @descripción Controlador para gestión y consulta de eventos del Calendario Académico Institucional.
 * @funcionalidades_clave
 * - Listado filtrable por mes, año, tipo y nivel
 * - Sembrado automático de eventos académicos 2026 si la colección está vacía
 * - Creación, edición y eliminación de eventos para administradores y docentes
 * - Endpoint de próximos eventos destacados
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { EventoAcademico, IEventoAcademicoDocument } from '../models/EventoAcademico.js';

/**
 * Semilla de eventos oficiales para el ciclo lectivo 2026 del Instituto José Peña.
 */
const EVENTOS_SEMILLA_2026 = [
  // --- MARZO 2026 ---
  {
    titulo: 'Inicio del Ciclo Lectivo 2026 y Acto de Apertura',
    descripcion: 'Acto formal de bienvenida para los tres niveles educativos: Inicial, Primario y Secundario.',
    tipo: 'Acto',
    fecha: '2026-03-02',
    hora: '08:00 hs',
    lugar: 'Patio Central del Instituto',
    nivel: 'Todos',
    curso_nombre: 'Todos',
    seccion_nombre: 'Todas',
    responsable: 'Equipo Directivo',
    importancia: 'Alta',
  },
  {
    titulo: 'Reunión Informativa de Padres - Nivel Secundario (1° y 2° Año)',
    descripcion: 'Presentación de pautas de convivencia, régimen académico, uso del aula virtual y cuerpo docente.',
    tipo: 'Reunion_Padres',
    fecha: '2026-03-12',
    hora: '18:30 - 20:00 hs',
    lugar: 'Aula Magna',
    nivel: 'Secundario',
    curso_nombre: '1° y 2° Año',
    seccion_nombre: 'División A y B',
    responsable: 'Coordinación Pedagógica Secundaria',
    importancia: 'Alta',
  },
  {
    titulo: 'Día Nacional de la Memoria por la Verdad y la Justicia',
    descripcion: 'Feriado Nacional inamovible. Sin actividad escolar presencial ni administrativa.',
    tipo: 'Feriado',
    fecha: '2026-03-24',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    curso_nombre: 'Todos',
    responsable: 'Calendario Oficial Ministerio',
    importancia: 'Informativa',
  },

  // --- ABRIL 2026 ---
  {
    titulo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
    descripcion: 'Feriado Nacional. Acto conmemorativo escolar realizado el día hábil previo.',
    tipo: 'Feriado',
    fecha: '2026-04-02',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Jornada Institucional Docente (PNFP)',
    descripcion: 'Encuentro pedagógico de perfeccionamiento docente. Suspensión de clases presenciales en todos los turnos.',
    tipo: 'Jornada_Docente',
    fecha: '2026-04-15',
    hora: '08:30 - 13:00 hs',
    lugar: 'Salón de Usos Múltiples (SUM)',
    nivel: 'Todos',
    responsable: 'Dirección General',
    importancia: 'Media',
  },
  {
    titulo: 'Reunión de Padres y Familias - Nivel Primario e Inicial',
    descripcion: 'Taller de integración familiar y seguimiento de los primeros proyectos de aprendizaje.',
    tipo: 'Reunion_Padres',
    fecha: '2026-04-23',
    hora: '17:30 - 19:00 hs',
    lugar: 'Salón Verde y Aulas Primaria',
    nivel: 'Primario',
    curso_nombre: '4° Grado / Sala 5',
    responsable: 'Dirección de Nivel Primario',
    importancia: 'Alta',
  },

  // --- MAYO 2026 ---
  {
    titulo: 'Día Internacional del Trabajador',
    descripcion: 'Feriado Nacional. No se dictan clases.',
    tipo: 'Feriado',
    fecha: '2026-05-01',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Primer Examen Parcial de Matemática I (1° Año Secundario)',
    descripcion: 'Evaluación escrita sobre Números Enteros, Operaciones y Geometría Básica.',
    tipo: 'Examen',
    fecha: '2026-05-14',
    hora: '08:00 - 10:00 hs',
    lugar: 'Aula 101 - División A',
    nivel: 'Secundario',
    curso_nombre: '1° Año',
    seccion_nombre: 'División A',
    materia_nombre: 'Matemática I',
    responsable: 'Prof. Ana Rodríguez',
    importancia: 'Alta',
  },
  {
    titulo: 'Examen Parcial de Lengua y Literatura (1° Año)',
    descripcion: 'Análisis de textos narrativos, tipologías discursivas y reglas ortográficas generales.',
    tipo: 'Examen',
    fecha: '2026-05-19',
    hora: '10:15 - 12:15 hs',
    lugar: 'Aula 101',
    nivel: 'Secundario',
    curso_nombre: '1° Año',
    seccion_nombre: 'División A',
    materia_nombre: 'Lengua y Literatura',
    responsable: 'Prof. Jorge Pérez',
    importancia: 'Alta',
  },
  {
    titulo: 'Acto Oficial: 216° Aniversario de la Revolución de Mayo',
    descripcion: 'Celebración comunitaria con danzas folclóricas, representación histórica de los estudiantes y chocolate patrio.',
    tipo: 'Acto',
    fecha: '2026-05-25',
    hora: '10:00 hs',
    lugar: 'Gimnasio Polideportivo José Peña',
    nivel: 'Todos',
    responsable: 'Dpto. de Ciencias Sociales',
    importancia: 'Alta',
  },
  {
    titulo: 'Cierre del 1° Trimestre - Carga de Calificaciones',
    descripcion: 'Fecha límite institucional para que los docentes registren calificaciones del 1° Trimestre en el sistema.',
    tipo: 'Cierre_Notas',
    fecha: '2026-05-29',
    hora: 'Hasta las 23:59 hs',
    lugar: 'Sistema SIGE / Plataforma',
    nivel: 'Todos',
    responsable: 'Secretaría Académica',
    importancia: 'Alta',
  },

  // --- JUNIO 2026 ---
  {
    titulo: 'Entrega de Boletines del 1° Trimestre a Padres y Tutores',
    descripcion: 'Firma de libretas de calificaciones y entrevista individual con tutores académicos.',
    tipo: 'Reunion_Padres',
    fecha: '2026-06-05',
    hora: '14:00 - 18:00 hs',
    lugar: 'Aulas de cada Sección',
    nivel: 'Todos',
    responsable: 'Preceptores y Docentes Tutores',
    importancia: 'Alta',
  },
  {
    titulo: 'Examen Trimestral de Física II (2° Año Secundario)',
    descripcion: 'Evaluación teórica-práctica de Cinemática, Dinámica y Principios de Newton.',
    tipo: 'Examen',
    fecha: '2026-06-16',
    hora: '14:30 - 16:30 hs',
    lugar: 'Laboratorio de Ciencias',
    nivel: 'Secundario',
    curso_nombre: '2° Año',
    seccion_nombre: 'División B',
    materia_nombre: 'Física II',
    responsable: 'Prof. Lucía Díaz',
    importancia: 'Alta',
  },
  {
    titulo: 'Paso a la Inmortalidad del General Manuel Belgrano (Día de la Bandera)',
    descripcion: 'Feriado Nacional y Solemne Promesa de Lealtad a la Bandera por parte de alumnos de 4° Grado.',
    tipo: 'Acto',
    fecha: '2026-06-20',
    hora: '09:30 hs',
    lugar: 'Patio de Armas del Instituto',
    nivel: 'Primario',
    curso_nombre: '4° Grado',
    responsable: 'Equipo Directivo Primaria',
    importancia: 'Alta',
  },

  // --- JULIO 2026 ---
  {
    titulo: 'Día de la Independencia Argentina',
    descripcion: 'Feriado Nacional. Sin actividad áulica.',
    tipo: 'Feriado',
    fecha: '2026-07-09',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Receso Escolar de Invierno 2026 (Vacaciones de Julio)',
    descripcion: 'Período de receso académico e invernal obligatorio fijado por el Ministerio de Educación de Córdoba.',
    tipo: 'Feriado',
    fecha: '2026-07-13',
    fechaFin: '2026-07-24',
    hora: 'Dos Semanas',
    lugar: 'Todos los niveles',
    nivel: 'Todos',
    responsable: 'Ministerio de Educación',
    importancia: 'Alta',
  },
  {
    titulo: 'Reinicio de Clases del 2° Cuatrimestre',
    descripcion: 'Retorno a las aulas de todos los estudiantes y docentes en sus turnos regulares.',
    tipo: 'Acto',
    fecha: '2026-07-27',
    hora: '07:30 hs',
    lugar: 'Sede Institucional',
    nivel: 'Todos',
    responsable: 'Dirección General',
    importancia: 'Media',
  },

  // --- AGOSTO 2026 ---
  {
    titulo: 'Mesas Especiales de Exámenes Previos y Libres de Agosto',
    descripcion: 'Turno especial de exámenes para regularización de materias previas de Nivel Secundario.',
    tipo: 'Examen',
    fecha: '2026-08-06',
    hora: '08:00 - 13:00 hs',
    lugar: 'Aulas de Examen - Ala Norte',
    nivel: 'Secundario',
    curso_nombre: 'Todos',
    responsable: 'Secretaría y Comisiones Evaluadoras',
    importancia: 'Alta',
  },
  {
    titulo: 'Paso a la Inmortalidad del General José de San Martín',
    descripcion: 'Feriado Nacional conmemorativo del Padre de la Patria.',
    tipo: 'Feriado',
    fecha: '2026-08-17',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Examen Parcial de Historia III (3° Año Secundario)',
    descripcion: 'Organización del Estado Argentino y conformación de la Generación del 80.',
    tipo: 'Examen',
    fecha: '2026-08-25',
    hora: '09:00 - 11:00 hs',
    lugar: 'Aula 204',
    nivel: 'Secundario',
    curso_nombre: '3° Año',
    seccion_nombre: 'División A',
    materia_nombre: 'Historia III',
    responsable: 'Prof. Martín Álvarez',
    importancia: 'Alta',
  },

  // --- SEPTIEMBRE 2026 ---
  {
    titulo: 'Cierre del 2° Trimestre - Carga de Calificaciones',
    descripcion: 'Fin del período evaluativo correspondiente al Segundo Trimestre lectivo.',
    tipo: 'Cierre_Notas',
    fecha: '2026-09-04',
    hora: '23:59 hs',
    lugar: 'Sistema SIGE',
    nivel: 'Todos',
    responsable: 'Secretaría Académica',
    importancia: 'Alta',
  },
  {
    titulo: 'Día del Maestro (Homenaje a Domingo F. Sarmiento)',
    descripcion: 'Asueto escolar conmemorativo en honor a todos los docentes de la institución.',
    tipo: 'Feriado',
    fecha: '2026-09-11',
    hora: 'Todo el día',
    lugar: 'Asueto Escolar',
    nivel: 'Todos',
    responsable: 'Calendario Escolar Provincial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Reunión General de Padres y Entrega de Informes del 2° Trimestre',
    descripcion: 'Informe de trayectoria educativa, asistencia y acompañamiento antes del tramo final del año.',
    tipo: 'Reunion_Padres',
    fecha: '2026-09-16',
    hora: '18:00 - 19:30 hs',
    lugar: 'Aula Magna y Aulas por Curso',
    nivel: 'Todos',
    curso_nombre: 'Todos los cursos',
    responsable: 'Equipo Directivo y Docentes',
    importancia: 'Alta',
  },
  {
    titulo: 'Día del Estudiante y de la Juventud (Festejo Primaveral)',
    descripcion: 'Jornada recreativa y deportiva con los centros de estudiantes. Sin dictado de clases teóricas.',
    tipo: 'Acto',
    fecha: '2026-09-21',
    hora: '09:00 - 14:00 hs',
    lugar: 'Campo de Deportes José Peña',
    nivel: 'Secundario',
    responsable: 'Centro de Estudiantes y Profesores de Ed. Física',
    importancia: 'Media',
  },

  // --- OCTUBRE 2026 ---
  {
    titulo: 'Evaluación Trimestral Integradora de Ciencias Naturales (4° Grado)',
    descripcion: 'Presentación de proyectos científicos, maquetas de ecosistemas y evaluación escrita.',
    tipo: 'Examen',
    fecha: '2026-10-08',
    hora: '08:30 - 10:30 hs',
    lugar: 'Aula de Ciencias Primaria',
    nivel: 'Primario',
    curso_nombre: '4° Grado',
    seccion_nombre: 'Sección Única',
    materia_nombre: 'Ciencias Naturales',
    responsable: 'Prof. Elena Romero',
    importancia: 'Alta',
  },
  {
    titulo: 'Día del Respeto a la Diversidad Cultural',
    descripcion: 'Feriado Nacional. Promoción de la reflexión histórica y el diálogo intercultural.',
    tipo: 'Feriado',
    fecha: '2026-10-12',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Reunión Especial de Orientación Vocacional para Padres y Alumnos de 3° Año',
    descripcion: 'Charla explicativa sobre las orientaciones del Ciclo Orientado de Nivel Secundario para 2027.',
    tipo: 'Reunion_Padres',
    fecha: '2026-10-22',
    hora: '19:00 - 20:30 hs',
    lugar: 'Aula Magna',
    nivel: 'Secundario',
    curso_nombre: '3° Año',
    seccion_nombre: 'División A',
    responsable: 'Gabinete Psicopedagógico y Dirección',
    importancia: 'Alta',
  },

  // --- NOVIEMBRE 2026 ---
  {
    titulo: 'Evaluaciones Integradoras Finales del 3° Trimestre',
    descripcion: 'Inicio de la semana de evaluaciones integradoras para todas las materias de nivel secundario.',
    tipo: 'Examen',
    fecha: '2026-11-16',
    fechaFin: '2026-11-20',
    hora: 'Según grilla de horarios',
    lugar: 'Aulas del Instituto',
    nivel: 'Secundario',
    curso_nombre: 'Todos',
    responsable: 'Coordinación Pedagógica',
    importancia: 'Alta',
  },
  {
    titulo: 'Día de la Soberanía Nacional',
    descripcion: 'Feriado Nacional conmemorativo de la Batalla de la Vuelta de Obligado.',
    tipo: 'Feriado',
    fecha: '2026-11-20',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Cierre del 3° Trimestre y Cierre Definitivo de Promociones',
    descripcion: 'Fecha de cierre de notas anuales. Emisión de actas de aprobación directa y alumnos a período de intensificación.',
    tipo: 'Cierre_Notas',
    fecha: '2026-11-27',
    hora: '18:00 hs',
    lugar: 'Secretaría Académica',
    nivel: 'Todos',
    responsable: 'Dirección y Secretaría',
    importancia: 'Alta',
  },

  // --- DICIEMBRE 2026 ---
  {
    titulo: 'Período de Acompañamiento e Intensificación de Aprendizajes (Diciembre)',
    descripcion: 'Clases de apoyo y evaluación para estudiantes con aprendizajes pendientes o materias en proceso.',
    tipo: 'Examen',
    fecha: '2026-12-01',
    fechaFin: '2026-12-11',
    hora: 'Turnos Mañana y Tarde',
    lugar: 'Aulas del Instituto',
    nivel: 'Secundario',
    curso_nombre: '1°, 2° y 3° Año',
    responsable: 'Cuerpo Docente',
    importancia: 'Alta',
  },
  {
    titulo: 'Inmaculada Concepción de María',
    descripcion: 'Feriado Nacional inamovible.',
    tipo: 'Feriado',
    fecha: '2026-12-08',
    hora: 'Todo el día',
    lugar: 'Feriado Nacional',
    nivel: 'Todos',
    responsable: 'Calendario Oficial',
    importancia: 'Informativa',
  },
  {
    titulo: 'Acto de Colación y Clausura del Ciclo Lectivo 2026',
    descripcion: 'Ceremonia de egresados, entrega de diplomas, reconocimientos al mérito académico y despedida comunitaria.',
    tipo: 'Acto',
    fecha: '2026-12-16',
    hora: '19:30 hs',
    lugar: 'Salón de Actos Principal',
    nivel: 'Todos',
    responsable: 'Comunidad Educativa José Peña',
    importancia: 'Alta',
  },
  {
    titulo: 'Reunión de Cierre de Ciclo y Entrega Final de Boletines 2026',
    descripcion: 'Firma de libretas anuales definitivas y entrega de certificados de promoción.',
    tipo: 'Reunion_Padres',
    fecha: '2026-12-18',
    hora: '09:00 - 12:00 hs',
    lugar: 'Aulas de cada Sección',
    nivel: 'Todos',
    responsable: 'Equipo Directivo y Preceptoría',
    importancia: 'Alta',
  },
];

/**
 * Asegura que existan eventos en la base de datos sembrando los datos iniciales si no hay registros.
 */
async function asegurarEventosSemilla(): Promise<void> {
  const conteo = await EventoAcademico.countDocuments();
  if (conteo === 0) {
    await EventoAcademico.insertMany(EVENTOS_SEMILLA_2026);
    console.log(`✅ [Calendario Académico] Se sembraron ${EVENTOS_SEMILLA_2026.length} eventos institucionales para 2026.`);
  }
}

/**
 * @función listarEventosAcademicos
 * @descripción Obtiene la lista de eventos filtrables por tipo, nivel, mes y año.
 */
export async function listarEventosAcademicos(req: AuthRequest, res: Response): Promise<void> {
  try {
    await asegurarEventosSemilla();

    const { tipo, nivel, mes, anio, buscar } = req.query;

    const filtro: any = { activo: true };

    if (tipo && tipo !== 'Todos') {
      filtro.tipo = tipo;
    }

    if (nivel && nivel !== 'Todos') {
      filtro.$or = [{ nivel: nivel }, { nivel: 'Todos' }];
    }

    if (buscar && typeof buscar === 'string' && buscar.trim() !== '') {
      const regex = new RegExp(buscar.trim(), 'i');
      filtro.$or = [
        { titulo: regex },
        { descripcion: regex },
        { lugar: regex },
        { materia_nombre: regex },
        { curso_nombre: regex },
      ];
    }

    let eventos = await EventoAcademico.find(filtro).sort({ fecha: 1 }).lean();

    // Filtro adicional por año o mes si se especifican
    if (anio) {
      eventos = eventos.filter((e) => e.fecha.startsWith(String(anio)));
    }

    if (mes && anio) {
      const mesStr = String(mes).padStart(2, '0');
      const prefijo = `${anio}-${mesStr}`;
      eventos = eventos.filter((e) => e.fecha.startsWith(prefijo));
    }

    res.json({
      total: eventos.length,
      eventos,
    });
  } catch (error) {
    console.error('Error al listar eventos académicos:', error);
    res.status(500).json({ error: 'Error al obtener los eventos del calendario académico.' });
  }
}

/**
 * @función obtenerProximosEventos
 * @descripción Retorna los eventos más cercanos en el tiempo a partir de una fecha de referencia.
 */
export async function obtenerProximosEventos(req: AuthRequest, res: Response): Promise<void> {
  try {
    await asegurarEventosSemilla();

    const limite = parseInt(req.query.limite as string) || 8;
    const fechaRef = (req.query.fecha as string) || new Date().toISOString().slice(0, 10);

    // Eventos futuros o del día de hoy
    let proximos = await EventoAcademico.find({
      activo: true,
      fecha: { $gte: fechaRef },
    })
      .sort({ fecha: 1 })
      .limit(limite)
      .lean();

    // Si no hay suficientes futuros (por ejemplo si la fecha supera 2026), traemos los últimos o los más relevantes
    if (proximos.length < 3) {
      proximos = await EventoAcademico.find({ activo: true })
        .sort({ fecha: -1 })
        .limit(limite)
        .lean();
      proximos.reverse();
    }

    res.json(proximos);
  } catch (error) {
    console.error('Error al obtener próximos eventos:', error);
    res.status(500).json({ error: 'Error al obtener próximos eventos.' });
  }
}

/**
 * @función crearEventoAcademico
 * @descripción Crea un nuevo hito o evento en el calendario (Permitido para Admin y Docente).
 */
export async function crearEventoAcademico(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      titulo,
      descripcion,
      tipo,
      fecha,
      fechaFin,
      hora,
      lugar,
      nivel,
      curso_nombre,
      seccion_nombre,
      materia_nombre,
      responsable,
      importancia,
    } = req.body;

    if (!titulo || !fecha || !tipo) {
      res.status(400).json({ error: 'Título, tipo y fecha son obligatorios.' });
      return;
    }

    const nuevoEvento = new EventoAcademico({
      titulo,
      descripcion: descripcion || '',
      tipo,
      fecha,
      fechaFin: fechaFin || null,
      hora: hora || 'Horario Escolar',
      lugar: lugar || 'Sede Institucional',
      nivel: nivel || 'Todos',
      curso_nombre: curso_nombre || 'Todos',
      seccion_nombre: seccion_nombre || 'Todas',
      materia_nombre: materia_nombre || '',
      responsable: responsable || (req.usuario ? `${req.usuario.nombre} ${req.usuario.apellido}` : 'Equipo Docente'),
      importancia: importancia || 'Media',
      creador_id: req.usuario?._id,
      activo: true,
    });

    await nuevoEvento.save();
    res.status(201).json({ mensaje: 'Evento académico creado con éxito.', evento: nuevoEvento });
  } catch (error) {
    console.error('Error al crear evento académico:', error);
    res.status(500).json({ error: 'Error interno al registrar el evento.' });
  }
}

/**
 * @función actualizarEventoAcademico
 * @descripción Actualiza un evento existente en el calendario.
 */
export async function actualizarEventoAcademico(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const eventoActualizado = await EventoAcademico.findByIdAndUpdate(id, req.body, { new: true });

    if (!eventoActualizado) {
      res.status(404).json({ error: 'Evento no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Evento actualizado correctamente.', evento: eventoActualizado });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error interno al actualizar el evento.' });
  }
}

/**
 * @función eliminarEventoAcademico
 * @descripción Elimina o desactiva un evento del calendario.
 */
export async function eliminarEventoAcademico(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const evento = await EventoAcademico.findByIdAndDelete(id);

    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Evento eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error interno al eliminar el evento.' });
  }
}

/**
 * @función restablecerEventosDefault
 * @descripción Restablece los eventos oficiales del calendario para 2026.
 */
export async function restablecerEventosDefault(req: AuthRequest, res: Response): Promise<void> {
  try {
    await EventoAcademico.deleteMany({});
    await EventoAcademico.insertMany(EVENTOS_SEMILLA_2026);
    res.json({
      mensaje: 'Calendario académico restablecido a los valores oficiales 2026.',
      total: EVENTOS_SEMILLA_2026.length,
    });
  } catch (error) {
    console.error('Error al restablecer eventos:', error);
    res.status(500).json({ error: 'Error al restablecer eventos oficiales.' });
  }
}
