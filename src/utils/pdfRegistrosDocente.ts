/**
 * @archivo src/utils/pdfRegistrosDocente.ts
 * @descripción Generador de reportes PDF (jsPDF + autoTable) para el Buscador Multifiltro de Registros del Rol Docente.
 * Soporta exportación completa ("Descargar Todo") y exportación por criterios ingresados ("Descargar").
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  construirNombreArchivoPdf,
  obtenerTextoFechaHora,
} from './fechaHoraPdf.js';

export interface RegistroDocentePdfRow {
  dni: string;
  apellido: string;
  nombre: string;
  curso: string;
  division: string;
  turno: string;
  asignaturas?: string[];
  cantidad_notas?: number;
  promedio_general?: number | string | null;
}

export interface OpcionesPdfRegistrosDocente {
  registros: RegistroDocentePdfRow[];
  esDescargaTotal: boolean;
  docenteNombre?: string;
  docenteDni?: string;
  asignaturasDocente?: string[];
  criteriosTexto?: string[];
  ordenAsc?: boolean;
}

export function exportarRegistrosDocenteAPdf({
  registros,
  esDescargaTotal,
  docenteNombre = '',
  docenteDni = '',
  asignaturasDocente = [],
  criteriosTexto = [],
  ordenAsc = true,
}: OpcionesPdfRegistrosDocente): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const COLOR_NAVY: [number, number, number] = [27, 42, 74];
  const COLOR_GOLD: [number, number, number] = [197, 160, 89];
  const COLOR_TEXT: [number, number, number] = [30, 41, 59];
  const COLOR_MUTED: [number, number, number] = [100, 116, 139];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ahora = new Date();
  const fechaHoraTexto = obtenerTextoFechaHora(ahora);

  // Banda superior institucional
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Instituto José Peña — Reporte de Registros por Asignatura', 14, 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const subtituloDocente = docenteNombre
    ? `Docente: Prof. ${docenteNombre}${docenteDni ? ` (DNI: ${docenteDni})` : ''}`
    : 'Panel Docente — Seguimiento Académico';
  const asigStr =
    asignaturasDocente.length > 0
      ? `Asignatura(s): ${asignaturasDocente.join(' | ')}`
      : 'Asignaturas vinculadas al DNI del docente';
  doc.text(`${subtituloDocente}   •   ${asigStr}`, 14, 19.5);

  doc.setFontSize(8.5);
  doc.text(`Fecha y Hora: ${fechaHoraTexto}`, pageWidth - 14, 19.5, { align: 'right' });

  // Bloque informativo de criterios y ordenamiento
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const tipoReporte = esDescargaTotal
    ? 'Tipo de exportación: Descargar Todo (todos los registros asociados a la/s asignatura/s)'
    : 'Tipo de exportación: Descargar por criterios ingresados';
  doc.text(tipoReporte, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  const criteriosLine = esDescargaTotal
    ? `Total de registros exportados: ${registros.length}`
    : `Criterios aplicados: ${criteriosTexto.join(' | ')}   •   Coincidencias: ${registros.length}`;
  doc.text(criteriosLine, 14, 39.5);

  doc.text(
    `Ordenamiento: Promedio general calculado según calificaciones ingresadas (${
      ordenAsc ? 'ASC' : 'DESC'
    })`,
    14,
    44.5
  );

  // Cuerpo de la tabla
  const bodyRows = registros.map((r, idx) => {
    const promNum =
      r.promedio_general !== null &&
      r.promedio_general !== undefined &&
      r.promedio_general !== '' &&
      !isNaN(Number(r.promedio_general))
        ? Number(r.promedio_general).toFixed(2).replace('.', ',')
        : 'Sin notas';

    return [
      String(idx + 1),
      r.dni || '-',
      r.apellido || '-',
      r.nombre || '-',
      r.asignaturas && r.asignaturas.length > 0 ? r.asignaturas.join(', ') : asignaturasDocente.join(', ') || '-',
      r.curso || '-',
      r.division || '-',
      r.turno || '-',
      String(r.cantidad_notas ?? 0),
      promNum,
    ];
  });

  autoTable(doc, {
    startY: 49,
    head: [
      [
        '#',
        'DNI',
        'Apellido',
        'Nombre',
        'Asignatura',
        'Curso',
        'División',
        'Turno',
        'Notas',
        'Promedio General',
      ],
    ],
    body: bodyRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: COLOR_TEXT,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { fontStyle: 'bold', cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 48 },
      5: { cellWidth: 24 },
      6: { cellWidth: 26 },
      7: { halign: 'center', cellWidth: 22 },
      8: { halign: 'center', cellWidth: 16 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_MUTED);
      doc.text(
        `Instituto José Peña — Página ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    },
  });

  const prefijo = esDescargaTotal ? 'Registros_Docente_Todo' : 'Registros_Docente_Filtrado';
  doc.save(construirNombreArchivoPdf(prefijo, ahora));
}
