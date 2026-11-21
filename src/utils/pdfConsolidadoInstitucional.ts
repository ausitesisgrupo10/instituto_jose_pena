/**
 * @archivo src/utils/pdfConsolidadoInstitucional.ts
 * @descripción Generadores PDF institucionales (jsPDF + autoTable) para reportes de Nóminas,
 * Estudiantes Multifiltro, Registros Académicos y Boletines con sello de Fecha y Hora.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  construirNombreArchivoPdf,
  obtenerTextoFechaHora,
} from './fechaHoraPdf.js';

const COLOR_NAVY: [number, number, number] = [27, 42, 74];
const COLOR_GOLD: [number, number, number] = [197, 160, 89];
const COLOR_TEXT: [number, number, number] = [30, 41, 59];
const COLOR_MUTED: [number, number, number] = [100, 116, 139];

export interface RegistroConsolidadoPdfItem {
  legajo?: string;
  dni?: string;
  apellido?: string;
  nombre?: string;
  rol?: string;
  rol_display?: string;
  cargo?: string;
  asignatura?: string;
  turno?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_nacimiento?: string;
  curso?: string;
  division?: string;
  barrio?: string;
  localidad?: string;
  provincia?: string;
  contacto?: string;
  promedio_general?: number | string | null;
  sanciones?: number;
}

export interface FilaPdfRegistroAcademico {
  dni: string;
  apellido: string;
  nombre: string;
  curso: string;
  division: string;
  materia: string;
  nota: string;
  trimestre: string;
  promedioGeneralMateria: string;
  cantidadSanciones: number;
}

function dibujarCabeceraLandscape(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  fechaHoraTexto: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(titulo, 12, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitulo, 12, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Fecha y Hora: ${fechaHoraTexto}`, pageWidth - 12, 18, { align: 'right' });
}

function agregarNumeracionPaginas(doc: jsPDF, fechaHoraTexto: string): void {
  const totalPaginas = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      `Instituto José Peña — Emitido: ${fechaHoraTexto}`,
      12,
      pageHeight - 5
    );
    doc.text(
      `Página ${i} de ${totalPaginas}`,
      pageWidth - 12,
      pageHeight - 5,
      { align: 'right' }
    );
  }
}

/**
 * 1. Reportes Consolidados (No Docente / Director):
 * Descarga nómina de Docentes, No Docentes, Estudiantes y/o Otros Roles en PDF con fecha y hora.
 */
export function exportarReporteConsolidadoAPdf(opciones: {
  datos: RegistroConsolidadoPdfItem[];
  esDescargaTotal: boolean;
  nombreBaseArchivo: string;
  criteriosTexto?: string[];
}): string {
  const { datos, esDescargaTotal, nombreBaseArchivo, criteriosTexto = [] } = opciones;
  const ahora = new Date();
  const fechaHoraTexto = obtenerTextoFechaHora(ahora);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const subtitulo = esDescargaTotal
    ? `Reporte Institucional Completo — Total de registros: ${datos.length}`
    : `Reporte Filtrado (${criteriosTexto.join(' | ') || 'Criterios aplicados'}) — Registros: ${datos.length}`;

  dibujarCabeceraLandscape(
    doc,
    'Instituto José Peña — Reporte Institucional y Estadísticas',
    subtitulo,
    fechaHoraTexto
  );

  const docentesYNoDocentes = datos.filter(
    (r) => r.rol === 'Docente' || r.rol === 'No Docente'
  );
  const estudiantes = datos.filter((r) => r.rol === 'Alumno');
  const otrosRoles = datos.filter(
    (r) => r.rol !== 'Docente' && r.rol !== 'No Docente' && r.rol !== 'Alumno'
  );

  let startY = 30;

  if (docentesYNoDocentes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`Nómina de Personal Docente y No Docente (${docentesYNoDocentes.length})`, 12, startY);

    autoTable(doc, {
      startY: startY + 2.5,
      margin: { left: 8, right: 8, bottom: 12 },
      head: [
        [
          'Legajo',
          'DNI',
          'Apellido',
          'Nombre',
          'Rol',
          'Asignatura',
          'Turno',
          'Teléfono',
          'Email',
          'Dirección',
          'Ciudad',
          'Estado',
          'F. Inicio',
          'F. Fin',
        ],
      ],
      body: docentesYNoDocentes.map((r) => [
        r.legajo || '-',
        r.dni || '-',
        r.apellido || '-',
        r.nombre || '-',
        r.rol || '-',
        r.asignatura || '-',
        r.turno || '-',
        r.telefono || '-',
        r.email || '-',
        r.direccion || '-',
        r.ciudad || '-',
        r.estado || 'Activo',
        r.fecha_inicio || '-',
        r.fecha_fin || '-',
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 6.3,
        cellPadding: 1.5,
        textColor: COLOR_TEXT,
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.3,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    startY = ((doc as any).lastAutoTable?.finalY || startY) + 8;
  }

  if (estudiantes.length > 0) {
    if (startY > 170) {
      doc.addPage();
      dibujarCabeceraLandscape(
        doc,
        'Instituto José Peña — Reporte Institucional y Estadísticas',
        subtitulo,
        fechaHoraTexto
      );
      startY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`Nómina de Estudiantes (${estudiantes.length})`, 12, startY);

    autoTable(doc, {
      startY: startY + 2.5,
      margin: { left: 8, right: 8, bottom: 12 },
      head: [
        [
          'Nombre',
          'Apellido',
          'DNI',
          'Rol',
          'Estado',
          'F. Nac.',
          'Curso',
          'Div.',
          'Turno',
          'Dirección',
          'Barrio',
          'Localidad',
          'Provincia',
          'Contacto',
          'Prom.',
          'Sanc.',
        ],
      ],
      body: estudiantes.map((r) => [
        r.nombre || '-',
        r.apellido || '-',
        r.dni || '-',
        r.rol || 'Alumno',
        r.estado || 'Activo',
        r.fecha_nacimiento || '-',
        r.curso || '-',
        r.division || '-',
        r.turno || '-',
        r.direccion || '-',
        r.barrio || '-',
        r.localidad || '-',
        r.provincia || '-',
        r.contacto || '-',
        r.promedio_general !== '' && r.promedio_general !== undefined && r.promedio_general !== null
          ? Number(r.promedio_general).toFixed(2)
          : '-',
        String(r.sanciones ?? 0),
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 6.0,
        cellPadding: 1.4,
        textColor: COLOR_TEXT,
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.0,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    startY = ((doc as any).lastAutoTable?.finalY || startY) + 8;
  }

  if (otrosRoles.length > 0) {
    if (startY > 170) {
      doc.addPage();
      dibujarCabeceraLandscape(
        doc,
        'Instituto José Peña — Reporte Institucional y Estadísticas',
        subtitulo,
        fechaHoraTexto
      );
      startY = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`Otros Roles (${otrosRoles.length})`, 12, startY);

    autoTable(doc, {
      startY: startY + 2.5,
      margin: { left: 8, right: 8, bottom: 12 },
      head: [
        [
          'Legajo',
          'DNI',
          'Apellido',
          'Nombre',
          'Rol',
          'Cargo',
          'Turno',
          'Teléfono',
          'Email',
          'Dirección',
          'Ciudad',
          'Estado',
        ],
      ],
      body: otrosRoles.map((r) => [
        r.legajo || '-',
        r.dni || '-',
        r.apellido || '-',
        r.nombre || '-',
        r.rol_display || r.rol || '-',
        r.cargo || '-',
        r.turno || '-',
        r.telefono || '-',
        r.email || '-',
        r.direccion || '-',
        r.ciudad || '-',
        r.estado || 'Activo',
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        cellPadding: 1.6,
        textColor: COLOR_TEXT,
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  agregarNumeracionPaginas(doc, fechaHoraTexto);
  const nombreArchivo = construirNombreArchivoPdf(nombreBaseArchivo, ahora);
  doc.save(nombreArchivo);
  return nombreArchivo;
}

/**
 * 2. Exportación PDF para Buscador Multifiltro de Estudiantes (No Docente InicioView):
 */
export function exportarEstudiantesMultifiltroAPdf(
  registros: RegistroConsolidadoPdfItem[],
  nombreBaseArchivo: string
): string {
  return exportarReporteConsolidadoAPdf({
    datos: registros.map((r) => ({ ...r, rol: 'Alumno' })),
    esDescargaTotal: nombreBaseArchivo.includes('Todos'),
    nombreBaseArchivo,
  });
}

/**
 * 3. Exportación PDF para Registros Académicos / Calificaciones (reemplaza exportación Excel):
 */
export function exportarRegistrosAcademicosAPdf(
  filas: FilaPdfRegistroAcademico[],
  nombreBaseArchivo: string = 'Registros_y_Sanciones',
  tituloReporte: string = 'Instituto José Peña — Reporte de Registros Académicos'
): string {
  const ahora = new Date();
  const fechaHoraTexto = obtenerTextoFechaHora(ahora);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  dibujarCabeceraLandscape(
    doc,
    tituloReporte,
    `Total de registros exportados: ${filas.length}`,
    fechaHoraTexto
  );

  autoTable(doc, {
    startY: 29,
    margin: { left: 10, right: 10, bottom: 12 },
    head: [
      [
        '#',
        'DNI',
        'Apellido',
        'Nombre',
        'Curso',
        'División',
        'Materia',
        'Nota / Valor',
        'Trimestre',
        'Prom. Gral. Materia',
        'Sanciones',
      ],
    ],
    body: filas.map((f, idx) => [
      String(idx + 1),
      f.dni || '-',
      f.apellido || '-',
      f.nombre || '-',
      f.curso || '-',
      f.division || '-',
      f.materia || '-',
      f.nota || '-',
      f.trimestre || '-',
      f.promedioGeneralMateria || '-',
      String(f.cantidadSanciones ?? 0),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: COLOR_TEXT,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  agregarNumeracionPaginas(doc, fechaHoraTexto);
  const nombreArchivo = construirNombreArchivoPdf(nombreBaseArchivo, ahora);
  doc.save(nombreArchivo);
  return nombreArchivo;
}
