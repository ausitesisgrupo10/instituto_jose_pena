/**
 * @archivo src/utils/pdfReportes.ts
 * @descripción Generador oficial de documentos PDF para archivo institucional y legajos administrativos
 * del Instituto José Peña. Implementa plantillas para:
 * 1. Informe Estadístico y Rendimiento Académico Institucional.
 * 2. Planilla Oficial de Control de Asistencia Docente.
 * 3. Acta Oficial de Auditoría y Validación de Planillas de Notas.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IUser } from '../types.js';

// Colores Institucionales Oficiales del Instituto José Peña
const COLOR_NAVY: [number, number, number] = [24, 36, 59]; // #18243b
const COLOR_BURGUNDY: [number, number, number] = [164, 22, 26]; // #a4161a
const COLOR_GOLD: [number, number, number] = [197, 160, 89]; // #c5a059
const COLOR_TEXT_DARK: [number, number, number] = [30, 41, 59]; // #1e293b
const COLOR_TEXT_MUTED: [number, number, number] = [100, 116, 139]; // #64748b
const COLOR_BG_LIGHT: [number, number, number] = [248, 250, 252]; // #f8fafc
const COLOR_BORDER: [number, number, number] = [226, 232, 240]; // #e2e8f0

export interface IEstadisticasResumen {
  resumenNotas?: {
    promocionados: number;
    aprobados: number;
    desaprobados: number;
    total: number;
  };
  resumenAsistenciaAlumnos?: {
    totalInasistencias: number;
    totalSanciones: number;
  };
  resumenAsistenciaDocente?: {
    presentes: number;
    ausentes: number;
    licencias: number;
  };
}

export interface IKPISResumen {
  totalUsuarios?: number;
  totalAlumnos?: number;
  totalDocentes?: number;
  totalPadres?: number;
  totalNoDocentes?: number;
  totalMaterias?: number;
  totalCursos?: number;
  totalSecciones?: number;
}

export interface IAsistenciaDocenteItem {
  _id: string;
  docente_id: any;
  fecha: string | Date;
  estado: 'Presente' | 'Ausente' | 'Licencia' | 'Tardanza';
  observacion?: string;
}

export interface IPlanillaMateriaItem {
  nombre: string;
  curso: string;
  division: string;
  validada: boolean;
  fechaValidacion?: string;
}

interface CommonReportOptions {
  usuario: IUser | null;
  observaciones?: string;
  periodo?: string;
  cicloLectivo?: string;
}

/**
 * Agrega el encabezado institucional oficial a cualquier página del documento.
 */
function dibujarEncabezadoInstitucional(
  doc: jsPDF,
  tituloDocumento: string,
  subtitulo: string,
  codigoDocumento: string,
  cicloLectivo: string = '2026'
) {
  // Franja Superior Azul Marino Institucional
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, 210, 26, 'F');

  // Franja delgada de acento Bordó
  doc.setFillColor(...COLOR_BURGUNDY);
  doc.rect(0, 26, 210, 2, 'F');

  // Título de la Institución
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INSTITUTO JOSÉ PEÑA', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 228, 240);
  doc.text('SISTEMA INTEGRAL DE GESTIÓN INSTITUCIONAL & CONTROL ACADÉMICO', 14, 17);
  doc.text(`CICLO LECTIVO ${cicloLectivo}`, 14, 22);

  // Metadatos a la derecha
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DOCUMENTO OFICIAL', 196, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 228, 240);
  doc.text(`CÓD: ${codigoDocumento}`, 196, 16, { align: 'right' });
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 196, 21, { align: 'right' });

  // Título del reporte en cuerpo
  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(tituloDocumento.toUpperCase(), 14, 36);

  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitulo, 14, 41);
}

/**
 * Agrega el bloque de metadatos de emisión y responsable.
 */
function dibujarFichaEmision(
  doc: jsPDF,
  startY: number,
  usuario: IUser | null,
  periodo: string = 'Período Vigente 2026',
  infoExtra?: string
): number {
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(14, startY, 182, 18, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text('RESPONSABLE DE EMISIÓN:', 18, startY + 6);

  doc.setFont('helvetica', 'normal');
  const nombreEmisor = usuario ? `${usuario.apellido}, ${usuario.nombre} (${usuario.rol})` : 'Personal Autorizado';
  doc.text(nombreEmisor, 62, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('PERÍODO REGISTRADO:', 18, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(periodo, 62, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('VALIDEZ / DESTINO:', 125, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(infoExtra || 'Legajo y Archivo Reglamentario', 158, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('HORA DE EMISIÓN:', 125, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs', 158, startY + 12);

  return startY + 23;
}

/**
 * Dibuja el pie de página formal con numeración y bloque de firmas institucionales.
 */
function dibujarPieYFirmas(doc: jsPDF, finalY: number, observaciones?: string) {
  let y = finalY;

  // Si queda poco espacio para las firmas en la página actual, agrega una nueva
  if (y > 230) {
    doc.addPage();
    y = 30;
  }

  // Observaciones si existen
  if (observaciones && observaciones.trim()) {
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(14, y, 182, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('DICTAMEN / OBSERVACIONES INSTITUCIONALES:', 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_DARK);
    const splitObs = doc.splitTextToSize(observaciones, 172);
    doc.text(splitObs, 18, y + 11);

    y += 22;
  } else {
    y += 6;
  }

  if (y > 235) {
    doc.addPage();
    y = 30;
  }

  // Bloque formal de 3 firmas reglamentarias
  const boxY = Math.max(y + 8, 245);
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.3);

  // Línea 1: Dirección General
  doc.line(20, boxY, 68, boxY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text('Rectoría / Dirección General', 44, boxY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('Firma y Sello Oficial', 44, boxY + 8, { align: 'center' });

  // Línea 2: Secretaría Académica
  doc.line(82, boxY, 130, boxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text('Secretaría Académica', 106, boxY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('Verificación y Control', 106, boxY + 8, { align: 'center' });

  // Línea 3: Responsable de Auditoría
  doc.line(144, boxY, 192, boxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text('Responsable del Informe', 168, boxY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('Confección y Registro', 168, boxY + 8, { align: 'center' });

  // Pie de página en todas las páginas generadas
  const totalPaginas = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.2);
    doc.line(14, 285, 196, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text(
      'Documento oficial generado con validez para legajo y archivo institucional - Instituto José Peña.',
      14,
      289
    );
    doc.text(`Página ${i} de ${totalPaginas}`, 196, 289, { align: 'right' });
  }
}

/**
 * 1. Exporta el Informe Estadístico Institucional y Rendimiento Académico Completo en PDF.
 */
export function exportarPDFInformeEstadistico(
  estadisticas: IEstadisticasResumen,
  kpis: IKPISResumen | null,
  opciones: CommonReportOptions & {
    planillasValidadas?: string[];
  }
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const codigoDoc = `INF-EST-${Date.now().toString().slice(-6)}`;

  dibujarEncabezadoInstitucional(
    doc,
    'Informe Estadístico y Rendimiento Académico',
    'Consolidado de calificaciones, disciplina estudiantil y cumplimiento docente para legajo institucional.',
    codigoDoc,
    opciones.cicloLectivo || '2026'
  );

  let currentY = dibujarFichaEmision(
    doc,
    46,
    opciones.usuario,
    opciones.periodo || 'Ciclo Lectivo Completo 2026',
    'Legajo Técnico Institucional'
  );

  // SECCIÓN 1: KPIs Institucionales (Estructura y Matrícula)
  if (kpis) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('1. MATRÍCULA Y RECURSOS INSTITUCIONALES', 14, currentY + 4);

    const rowsKpi = [
      [
        'Total Alumnos Matriculados',
        `${kpis.totalAlumnos || 0}`,
        'Personal Docente Activo',
        `${kpis.totalDocentes || 0}`,
      ],
      [
        'Personal No Docente / Maestranza',
        `${kpis.totalNoDocentes || 0}`,
        'Tutores y Padres Registrados',
        `${kpis.totalPadres || 0}`,
      ],
      [
        'Cursos Académicos Habilitados',
        `${kpis.totalCursos || 0}`,
        'Divisiones / Secciones en Turnos',
        `${kpis.totalSecciones || 0}`,
      ],
      [
        'Materias y Cátedras en Dictado',
        `${kpis.totalMaterias || 0}`,
        'Total Comunidad de Usuarios',
        `${kpis.totalUsuarios || 0}`,
      ],
    ];

    autoTable(doc, {
      startY: currentY + 6,
      head: [['INDICADOR INSTITUCIONAL', 'CANTIDAD', 'INDICADOR INSTITUCIONAL', 'CANTIDAD']],
      body: rowsKpi,
      theme: 'grid',
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'center', fontStyle: 'bold' },
        2: { fontStyle: 'bold', halign: 'left' },
        3: { halign: 'center', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // SECCIÓN 2: Rendimiento Académico y Distribución de Notas
  const notas = estadisticas.resumenNotas || { promocionados: 0, aprobados: 0, desaprobados: 0, total: 0 };
  const totalNotas = notas.total > 0 ? notas.total : 1;
  const pctProm = Math.round((notas.promocionados / totalNotas) * 100);
  const pctApr = Math.round((notas.aprobados / totalNotas) * 100);
  const pctDes = Math.round((notas.desaprobados / totalNotas) * 100);
  const tasaAprobacionTotal = Math.round(((notas.promocionados + notas.aprobados) / totalNotas) * 100);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('2. DISTRIBUCIÓN ESTADÍSTICA DE CALIFICACIONES', 14, currentY);

  const rowsNotas = [
    ['Promocionados (Calificaciones >= 8 pts)', `${notas.promocionados}`, `${pctProm}%`, 'Excelente / Distinguido'],
    ['Aprobados (Calificaciones 6 a 7 pts)', `${notas.aprobados}`, `${pctApr}%`, 'Cumplimiento Satisfactorio'],
    ['Desaprobados (Calificaciones < 6 pts)', `${notas.desaprobados}`, `${pctDes}%`, 'En Instancia de Recuperatorio'],
    ['TOTAL EVALUACIONES REGISTRADAS', `${notas.total}`, '100%', `Tasa Global de Aprobación: ${tasaAprobacionTotal}%`],
  ];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['CATEGORÍA DE RENDIMIENTO', 'CANTIDAD', 'PORCENTAJE', 'VALORACIÓN TÉCNICA']],
    body: rowsNotas,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // SECCIÓN 3: Conducta y Cumplimiento Docente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('3. INDICADORES DE ASISTENCIA Y DISCIPLINA INSTITUCIONAL', 14, currentY);

  const asisDoc = estadisticas.resumenAsistenciaDocente || { presentes: 0, ausentes: 0, licencias: 0 };
  const asisAlu = estadisticas.resumenAsistenciaAlumnos || { totalInasistencias: 0, totalSanciones: 0 };
  const totalAsisDoc = asisDoc.presentes + asisDoc.ausentes + asisDoc.licencias;
  const tasaPresentismoDoc = totalAsisDoc > 0 ? Math.round((asisDoc.presentes / totalAsisDoc) * 100) : 100;

  const rowsAsistencia = [
    ['Docentes Presentes (Cumplimiento Horario)', `${asisDoc.presentes}`, `${totalAsisDoc > 0 ? Math.round((asisDoc.presentes / totalAsisDoc) * 100) : 0}%`, 'Jornada Cumplida'],
    ['Docentes Ausentes (Sin Justificación Previa)', `${asisDoc.ausentes}`, `${totalAsisDoc > 0 ? Math.round((asisDoc.ausentes / totalAsisDoc) * 100) : 0}%`, 'Afecta Dictado de Cátedra'],
    ['Docentes con Licencia Médica / Oficial', `${asisDoc.licencias}`, `${totalAsisDoc > 0 ? Math.round((asisDoc.licencias / totalAsisDoc) * 100) : 0}%`, 'Con Aviso / Certificado'],
    ['Inasistencias de Estudiantes Registradas', `${asisAlu.totalInasistencias}`, '-', 'Monitoreo de Preceptoría'],
    ['Sanciones Disciplinarias a Estudiantes', `${asisAlu.totalSanciones}`, '-', 'Consejo de Convivencia'],
  ];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['VARIABLE INSTITUCIONAL', 'TOTAL REGISTROS', '% PROPORCIÓN', 'ESTADO ADMINISTRATIVO']],
    body: rowsAsistencia,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'left' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Planillas validadas si existen
  if (opciones.planillasValidadas && opciones.planillasValidadas.length > 0) {
    if (currentY > 215) {
      doc.addPage();
      currentY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('4. ESTADO DE AUDITORÍA DE PLANILLAS DE CALIFICACIONES', 14, currentY);

    const rowsPlanillas = opciones.planillasValidadas.map((p, idx) => [
      `${idx + 1}`,
      p,
      'Validada y Auditada',
      new Date().toLocaleDateString('es-AR'),
      'Apta para emisión de boletines',
    ]);

    autoTable(doc, {
      startY: currentY + 2,
      head: [['Nº', 'ESPACIO CURRICULAR / DIVISIÓN', 'ESTADO FORMAL', 'FECHA AUDITORÍA', 'DICTAMEN']],
      body: rowsPlanillas,
      theme: 'grid',
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'left' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Firmas y cierre
  dibujarPieYFirmas(
    doc,
    currentY,
    opciones.observaciones ||
      `Índice Global de Presentismo Docente: ${tasaPresentismoDoc}%. Rendimiento Académico Positivo: ${tasaAprobacionTotal}%. Planillas de control verificadas de conformidad.`
  );

  doc.save(`IJP_Informe_Estadistico_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 2. Exporta la Planilla Oficial de Control de Asistencia Docente en PDF.
 */
export function exportarPDFPlanillaAsistenciaDocente(
  asistencias: IAsistenciaDocenteItem[],
  opciones: CommonReportOptions & {
    filtroEstado?: string;
    filtroTexto?: string;
    fechaCorte?: string;
  }
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const codigoDoc = `PLAN-ASIS-${Date.now().toString().slice(-6)}`;

  dibujarEncabezadoInstitucional(
    doc,
    'Planilla Oficial de Control de Asistencia Docente',
    'Registro formal del cumplimiento horario, ausentismo y licencias del personal de la institución.',
    codigoDoc,
    opciones.cicloLectivo || '2026'
  );

  let currentY = dibujarFichaEmision(
    doc,
    46,
    opciones.usuario,
    opciones.periodo || 'Planilla Diaria / Período Activo',
    'Legajo de Recursos Humanos y Sueldos'
  );

  // Cuadro de Resumen Estadístico de la Planilla
  const total = asistencias.length;
  let presentes = 0;
  let ausentes = 0;
  let licencias = 0;
  let tardanzas = 0;

  asistencias.forEach((a) => {
    if (a.estado === 'Presente') presentes++;
    else if (a.estado === 'Ausente') ausentes++;
    else if (a.estado === 'Licencia') licencias++;
    else if (a.estado === 'Tardanza') tardanzas++;
  });

  const pctPresentes = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const pctAusentes = total > 0 ? Math.round((ausentes / total) * 100) : 0;
  const pctLicencias = total > 0 ? Math.round((licencias / total) * 100) : 0;
  const pctTardanzas = total > 0 ? Math.round((tardanzas / total) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('RESUMEN DE PRESENTISMO DEL CUERPO DOCENTE:', 14, currentY);

  const rowsResumen = [
    [
      `Total Registros: ${total}`,
      `Presentes: ${presentes} (${pctPresentes}%)`,
      `Ausentes: ${ausentes} (${pctAusentes}%)`,
      `Licencias: ${licencias} (${pctLicencias}%)`,
      `Tardanzas: ${tardanzas} (${pctTardanzas}%)`,
    ],
  ];

  autoTable(doc, {
    startY: currentY + 2,
    body: rowsResumen,
    theme: 'plain',
    styles: {
      fillColor: [241, 245, 249],
      textColor: COLOR_TEXT_DARK,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.2,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Tabla Detallada de Asistencias
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('DETALLE NOMINAL DE REGISTROS DE ASISTENCIA', 14, currentY);

  const tablaFilas = asistencias.map((a, idx) => {
    const docObj = typeof a.docente_id === 'object' && a.docente_id ? a.docente_id : null;
    const nombreCompleto = docObj ? `${docObj.apellido}, ${docObj.nombre}` : 'Docente no asignado';
    const dni = docObj?.dni || docObj?.perfil_metadata?.legajo || 'S/D';
    const fechaStr = new Date(a.fecha).toLocaleDateString('es-AR');

    return [
      `${idx + 1}`,
      nombreCompleto,
      dni,
      fechaStr,
      a.estado,
      a.observacion && a.observacion.trim() ? a.observacion : 'Sin observaciones',
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Nº', 'DOCENTE (APELLIDO Y NOMBRE)', 'DNI / LEGAJO', 'FECHA', 'ESTADO', 'OBSERVACIÓN / JUSTIFICATIVO']],
    body: tablaFilas.length > 0 ? tablaFilas : [['-', 'No se encontraron registros para los filtros seleccionados', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      5: { halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = data.cell.raw;
        if (val === 'Presente') {
          data.cell.styles.textColor = [16, 120, 60];
        } else if (val === 'Ausente') {
          data.cell.styles.textColor = [200, 30, 30];
        } else if (val === 'Licencia') {
          data.cell.styles.textColor = [180, 110, 10];
        } else if (val === 'Tardanza') {
          data.cell.styles.textColor = [120, 50, 150];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  dibujarPieYFirmas(
    doc,
    currentY,
    opciones.observaciones ||
      'Se certifica que la presente planilla refleja el control biométrico y partes diarios de asistencia correspondientes al personal docente en funciones.'
  );

  doc.save(`IJP_Planilla_Asistencia_Docente_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. Exporta el Acta Oficial de Auditoría y Validación de Planillas de Notas.
 */
export function exportarPDFActaValidacionPlanillas(
  planillas: Array<{ materia: string; validada: boolean; docente?: string; curso?: string }>,
  opciones: CommonReportOptions
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const codigoDoc = `ACTA-NOTAS-${Date.now().toString().slice(-6)}`;

  dibujarEncabezadoInstitucional(
    doc,
    'Acta de Auditoría y Validación de Planillas de Calificaciones',
    'Cierre formal, verificación de actas y aprobación para emisión de boletines del Instituto José Peña.',
    codigoDoc,
    opciones.cicloLectivo || '2026'
  );

  let currentY = dibujarFichaEmision(
    doc,
    46,
    opciones.usuario,
    opciones.periodo || 'Cierre de Evaluaciones Parciales / Finales 2026',
    'Secretaría Académica e Inspección General'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('REGISTRO DE PLANILLAS DE CALIFICACIONES AUDITADAS', 14, currentY);

  const tablaFilas = planillas.map((p, idx) => [
    `${idx + 1}`,
    p.materia,
    p.curso || 'Nivel Secundario',
    p.validada ? 'VALIDADA / CONFORME' : 'PENDIENTE DE VALIDACIÓN',
    p.validada ? new Date().toLocaleDateString('es-AR') : '-',
    p.validada ? 'Aprobada para boletín' : 'En revisión por Dirección',
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Nº', 'ESPACIO CURRICULAR / MATERIA', 'NIVEL / CURSO', 'ESTADO DE AUDITORÍA', 'FECHA CIERRE', 'DICTAMEN FORMAL']],
    body: tablaFilas,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
      1: { fontStyle: 'bold', halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'VALIDADA / CONFORME') {
          data.cell.styles.textColor = [16, 120, 60];
        } else {
          data.cell.styles.textColor = [200, 30, 30];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  dibujarPieYFirmas(
    doc,
    currentY,
    opciones.observaciones ||
      'Las planificaciones y calificaciones detalladas precedentemente fueron auditadas con base en las resoluciones ministeriales vigentes y los criterios de evaluación del Instituto José Peña.'
  );

  doc.save(`IJP_Acta_Validacion_Planillas_${new Date().toISOString().slice(0, 10)}.pdf`);
}
