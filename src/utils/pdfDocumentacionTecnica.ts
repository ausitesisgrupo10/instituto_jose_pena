/**
 * @archivo src/utils/pdfDocumentacionTecnica.ts
 * @descripción Generador del documento PDF oficial con el historial de Fixtures, Versionado
 * y Arquitectura Tecnológica Didáctica del Sistema de Gestión Académica "Instituto José Peña".
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { construirNombreArchivoPdf } from './fechaHoraPdf.js';

const COLOR_NAVY: [number, number, number] = [27, 42, 74]; // #1b2a4a
const COLOR_BLUE: [number, number, number] = [37, 99, 235]; // #2563eb
const COLOR_GOLD: [number, number, number] = [197, 160, 89]; // #c5a059
const COLOR_TEXT: [number, number, number] = [30, 41, 59];
const COLOR_MUTED: [number, number, number] = [100, 116, 139];
const COLOR_BG_LIGHT: [number, number, number] = [248, 250, 252];

export const NOMBRE_ARCHIVO_PDF_TECNICO =
  'Documentacion_Fixtures_Versionado_Instituto_Jose_Pena.pdf';

interface VersionFixtureRow {
  version: string;
  modulo: string;
  fixtures: string;
  impacto: string;
}

const HISTORIAL_VERSIONADO: VersionFixtureRow[] = [
  {
    version: 'v1.0.0',
    modulo: 'Arquitectura Base & Build Full-Stack',
    fixtures:
      '• Corrección del script de compilación ("build": Vite + esbuild).\n• Autenticación JWT + bcryptjs.\n• Vistas base por rol: Usuarios, Cursos, Secciones, Materias, Parentescos, Registros, Consulta de Personas y Boletines.',
    impacto:
      'Base operativa unificada cliente-servidor en puerto 3000 con control de acceso por 6 roles.',
  },
  {
    version: 'v1.1.0',
    modulo: 'Asistencias Directivo & Notificaciones',
    fixtures:
      '• Selector desplegable en Control de Asistencias (Alumnos, Docentes, No Docentes).\n• Flujo de solicitud de inasistencias de Docentes/No Docentes.\n• Campana de notificaciones del Director para Aprobar o Desaprobar con motivo obligatorio.',
    impacto:
      'Trazabilidad en tiempo real entre personal y Dirección para justificación de faltas.',
  },
  {
    version: 'v1.2.0',
    modulo: 'ABM Alumno & Dataset 50 Estudiantes PDF',
    fixtures:
      '• Módulo ABM Alumno (Alta, Modificación y Baja lógica/definitiva) en No Docente.\n• Fixture/Dataset oficial de 50 estudiantes (Estudiantes_Instituto_Jose_Pena_2026.pdf) con los 16 campos del formulario.\n• Persistencia idempotente en MongoDB.',
    impacto:
      'Matrícula ampliada a 55 estudiantes reales persistidos entre reinicios.',
  },
  {
    version: 'v1.3.0',
    modulo: 'Multifiltro No Docente & Exportación .xls',
    fixtures:
      '• Buscador multifiltro (Curso, División, Turno, Apellido, Nombre, DNI).\n• Botón "Descargar" (registros filtrados) y "Descargar todo" (nómina completa).\n• Generación de planillas Excel reales (.xls BIFF8 vía SheetJS).',
    impacto:
      'Reportes administrativos inmediatos y listos para planilla de cálculo.',
  },
  {
    version: 'v1.4.0',
    modulo: 'Cronograma & Calendario Académico Multirrol',
    fixtures:
      '• Módulo Cronograma & Calendario Académico agregado al menú de todos los perfiles.\n• Limpieza de tarjetas redundantes en vistas de inicio.\n• Estandarización del desplegable "Visualizar asistencia" (Estudiantes, No Docentes, Docentes).',
    impacto:
      'Navegación uniforme y calendario institucional compartido por toda la comunidad.',
  },
  {
    version: 'v1.5.0',
    modulo: 'Reportes y Estadísticas Consolidados & Cargos',
    fixtures:
      '• Nueva vista de Reportes para No Docente y Directivo con multifiltro (Rol, Cargo dinámico según rol, Legajo, DNI, Turno).\n• Botón "Buscar" para previsualizar coincidencias en tabla antes de exportar.\n• Normalización de cargos (Directivo, Secretaría, Preceptoría, Docente, Estudiantes, Padre/Tutor) y esquemas .xls diferenciados.',
    impacto:
      'Consultas cruzadas sobre toda la institución con descarga segmentada.',
  },
  {
    version: 'v1.6.0',
    modulo: 'ABM Docente & Dataset 30 Profesores PDF',
    fixtures:
      '• Módulo ABM Docente para No Docente y Directivo con botón "Crear Docente".\n• Formulario y tabla idénticos al PDF oficial (Legajo, DNI, Apellido/Nombre, Área/Materia, Categoría, Inicio, Fin, Teléfono, Dirección, Turno, Estado).\n• Persistencia idempotente de 30 profesores (DOC-202601 a DOC-202630) vinculados con Materias, Asistencias y Reportes.\n• Regla estricta: solo el Director puede inactivar o dar de baja.',
    impacto:
      'Plantel docente ampliado a 35 profesores conectados a cátedras y reportes.',
  },
  {
    version: 'v1.7.0',
    modulo: 'ABM No Docente & Dataset 30 Agentes PDF',
    fixtures:
      '• Módulo ABM No Docente para No Docente y Directivo con botón "Crear No Docente".\n• Formulario y tabla coincidentes con Base_NoDocente_30_usuarios.pdf (N°, Área/Usuario, Cargo/Sector, Nombre, Apellido, DNI, Teléfono, Correo electrónico, Estado, Turno).\n• Persistencia idempotente de 30 agentes (90000001 a 90000030) respetando estados Activo/Inactivo.\n• Baja/inactivación exclusiva del rol Directivo.',
    impacto:
      'Nómina no docente consolidada (35 agentes) e integrada con asistencias, legajos y reportes.',
  },
  {
    version: 'v1.8.0',
    modulo: 'Documentación PDF de Fixtures & Stack Técnico',
    fixtures:
      '• Generador de documento PDF técnico-institucional con historial de fixtures, versionado completo y explicación didáctica de tecnologías y relaciones.',
    impacto:
      'Documentación viva descargable directamente desde la aplicación y el repositorio.',
  },
];

const STACK_TECNOLOGICO = [
  [
    'Frontend (Interfaz Visual)',
    'React 19 + TypeScript 5.8 + Vite 6',
    'Construye todas las pantallas, formularios ABM, tablas y dashboards por rol con tipado seguro y compilación rápida.',
  ],
  [
    'Estilos e Iconografía',
    'Tailwind CSS v4 + Lucide React + Motion',
    'Aplica el diseño limpio institucional (#1b2a4a), grillas responsivas, íconos vectoriales y transiciones fluidas.',
  ],
  [
    'Backend / API REST',
    'Node.js + Express 4 + tsx + esbuild',
    'Expone las rutas /api/*, ejecuta reglas de negocio (permisos, validaciones) y sirve la aplicación en el puerto 3000.',
  ],
  [
    'Seguridad y Acceso',
    'JWT (jsonwebtoken) + bcryptjs + CORS',
    'Cifra contraseñas con bcrypt y valida en cada petición el token firmado y el rol (ej. baja exclusiva de Director).',
  ],
  [
    'Base de Datos & ODM',
    'MongoDB (wiredTiger) + Mongoose 9',
    'Almacena de forma persistente (.data/mongodb) colecciones relacionadas (Usuarios, Cursos, Secciones, Materias, Asistencias, etc.).',
  ],
  [
    'Fixtures & Seeds',
    'Datasets PDF + Seed Idempotente',
    'Carga automáticamente en MongoDB los 50 Alumnos, 30 Docentes y 30 No Docentes sin duplicar ni borrar cambios manuales.',
  ],
  [
    'Exportación Excel y PDF',
    'SheetJS (xlsx) + jsPDF + AutoTable',
    'Genera planillas .xls reales desde los filtros activos y documentos PDF oficiales (boletines, planillas y esta guía).',
  ],
];

const COLECCIONES_Y_DATOS = [
  ['Usuarios (User)', '136 registros totales', '55 Alumnos, 35 Docentes, 35 No Docentes, 1 Director, 5 Admins, 5 Padres/Tutores.'],
  ['Estructura Académica', 'Cursos, Secciones, Materias', '8 Cursos (Inicial, Primario, Secundario), 14 Divisiones, Materias vinculadas a Docentes.'],
  ['Vínculos y Legajos', 'Parentescos, Registros, Asistencias', 'Relaciones Tutor-Alumno, notas trimestrales, sanciones, asistencias diarias y licencias.'],
  ['Agenda Institucional', 'EventoAcademico', 'Cronograma anual de exámenes, actos y reuniones sincronizado para todos los roles.'],
];

function dibujarEncabezadoPagina(doc: jsPDF, tituloSeccion: string, paginaActual: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INSTITUTO JOSÉ PEÑA — SISTEMA DE GESTIÓN ACADÉMICA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(tituloSeccion, 14, 18);

  doc.setFontSize(8);
  doc.text(`Versión actual: v1.8.0  |  Pág. ${paginaActual}`, pageWidth - 14, 18, { align: 'right' });
}

function dibujarPieDePagina(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `Documento Técnico de Fixtures, Versionado y Arquitectura • Generado el ${fechaStr}`,
      14,
      pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

export function construirPdfDocumentacionTecnica(): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ================= PÁGINA 1: RESUMEN Y TABLA DE VERSIONADO Y FIXTURES =================
  dibujarEncabezadoPagina(doc, 'Documentación de Fixtures, Versionado y Arquitectura Tecnológica', 1);

  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 29, pageWidth - 28, 21, 2, 2, 'FD');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Resumen Evolutivo de Fixtures y Versionado (v1.0.0 -> v1.8.0)', 18, 35.5);

  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const intro = doc.splitTextToSize(
    'Este documento consolida la evolución funcional del sistema del Instituto José Peña: cada versión incorpora nuevos módulos, reglas de negocio por rol, conjuntos de datos oficiales (fixtures persistentes en MongoDB) y herramientas de exportación.',
    pageWidth - 36
  );
  doc.text(intro, 18, 41);

  autoTable(doc, {
    startY: 54,
    head: [['Versión', 'Módulo / Hito', 'Fixtures y Funcionalidades Incorporadas', 'Impacto en el Sistema']],
    body: HISTORIAL_VERSIONADO.map((v) => [v.version, v.modulo, v.fixtures, v.impacto]),
    theme: 'grid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.3,
      cellPadding: 2.1,
      textColor: COLOR_TEXT,
      valign: 'top',
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', halign: 'center', textColor: COLOR_BLUE },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 88 },
      3: { cellWidth: 44 },
    },
    margin: { left: 14, right: 14, top: 30, bottom: 16 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        dibujarEncabezadoPagina(doc, 'Historial de Fixtures y Versionado (Continuación)', data.pageNumber);
      }
    },
  });

  // ================= PÁGINA SIGUIENTE: TECNOLOGÍAS, FLUJO Y DATOS PERSISTENTES =================
  doc.addPage();
  const pageTech = doc.getNumberOfPages();
  dibujarEncabezadoPagina(doc, 'Arquitectura Tecnológica Didáctica e Integración de Capas', pageTech);

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. Tecnologías que Intervienen en la Aplicación', 14, 32);

  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    'La aplicación funciona como un ecosistema Full-Stack en TypeScript donde cada capa cumple un rol específico:',
    14,
    37.5
  );

  autoTable(doc, {
    startY: 40.5,
    head: [['Capa', 'Tecnologías Utilizadas', 'Función Didáctica en el Sistema']],
    body: STACK_TECNOLOGICO,
    theme: 'grid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.6,
      cellPadding: 2.2,
      textColor: COLOR_TEXT,
      valign: 'top',
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', textColor: COLOR_NAVY },
      1: { cellWidth: 53, fontStyle: 'bold', textColor: COLOR_BLUE },
      2: { cellWidth: 94 },
    },
    margin: { left: 14, right: 14, top: 30, bottom: 16 },
  });

  const yAfterStack = (doc as any).lastAutoTable.finalY + 6;

  // Sección 3: Flujo Didáctico de Relación entre Tecnologías
  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. ¿Cómo se Relacionan Entre Sí? (Flujo Paso a Paso)', 14, yAfterStack);

  const pasosRelacion = [
    [
      '1. Interacción (Navegador)',
      'React + Tailwind CSS renderizan las vistas por rol. Al iniciar sesión o editar un ABM, el navegador envía una petición HTTP (fetch) al servidor en el puerto 3000.',
    ],
    [
      '2. Seguridad (Aduana API)',
      'Express recibe la petición y pasa por el middleware JWT (autenticarJWT + autorizarRoles). Verifica la identidad del usuario y bloquea acciones no permitidas (ej. solo el Director inactiva Docentes o No Docentes).',
    ],
    [
      '3. Lógica y Base de Datos',
      'Los Controladores validan los datos y usan Mongoose ODM para leer o escribir documentos en MongoDB persistente (.data/mongodb), conectando usuarios, materias, asistencias y reportes.',
    ],
    [
      '4. Fixtures Idempotentes',
      'Al arrancar el servidor, database.ts verifica que los 50 Alumnos, 30 Docentes y 30 No Docentes de los PDFs oficiales estén persistidos sin sobrescribir modificaciones manuales.',
    ],
    [
      '5. Salida y Documentos',
      'La API responde JSON al frontend, donde React actualiza la tabla en pantalla o transforma los datos con SheetJS (.xls) y jsPDF (.pdf) para descargar informes.',
    ],
  ];

  autoTable(doc, {
    startY: yAfterStack + 3,
    head: [['Etapa del Flujo', 'Integración entre Componentes']],
    body: pasosRelacion,
    theme: 'striped',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.6,
      cellPadding: 2.1,
      textColor: COLOR_TEXT,
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold', textColor: COLOR_NAVY },
      1: { cellWidth: 138 },
    },
    margin: { left: 14, right: 14, top: 30, bottom: 16 },
  });

  const yAfterFlow = (doc as any).lastAutoTable.finalY + 6;

  // Sección 4: Resumen de Fixtures Persistentes en Base de Datos
  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('4. Fixtures y Datos Persistentes Actuales en MongoDB', 14, yAfterFlow);

  autoTable(doc, {
    startY: yAfterFlow + 3,
    head: [['Colección / Entidad', 'Volumen Cargado', 'Detalle de Relación']],
    body: COLECCIONES_Y_DATOS,
    theme: 'grid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.6,
      cellPadding: 2.1,
      textColor: COLOR_TEXT,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold' },
      1: { cellWidth: 44, textColor: COLOR_BLUE, fontStyle: 'bold' },
      2: { cellWidth: 94 },
    },
    margin: { left: 14, right: 14, top: 30, bottom: 16 },
    didDrawPage: (data) => {
      if (data.pageNumber > pageTech) {
        dibujarEncabezadoPagina(doc, 'Fixtures y Datos Persistentes en MongoDB (Continuación)', data.pageNumber);
      }
    },
  });

  dibujarPieDePagina(doc);
  return doc;
}

export function descargarPdfDocumentacionTecnica(): void {
  const doc = construirPdfDocumentacionTecnica();
  doc.save(construirNombreArchivoPdf('Documentacion_Fixtures_Versionado_Instituto_Jose_Pena'));
}
