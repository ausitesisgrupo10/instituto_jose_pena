/**
 * @archivo src/utils/pdfFaltasSancionesDocente.ts
 * @descripción Generador de reportes PDF (jsPDF + autoTable) para Registros de Asistencias/Faltas y Sanciones del Rol Docente.
 * Soporta exportación completa ("Descargar Todo") y exportación según criterio de búsqueda ("Descargar").
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  construirNombreArchivoPdf,
  obtenerTextoFechaHora,
} from './fechaHoraPdf.js';

export interface FaltaSancionPdfRow {
  fecha: string;
  dni: string;
  apellidoNombre: string;
  cursoDivision: string;
  asignatura: string;
  tipo: string;
  valor: string;
  observacion: string;
}

export interface OpcionesPdfFaltasSanciones {
  registros: FaltaSancionPdfRow[];
  esDescargaTotal: boolean;
  docenteNombre?: string;
  docenteDni?: string;
  criteriosTexto?: string[];
}

export function exportarFaltasSancionesDocenteAPdf({
  registros,
  esDescargaTotal,
  docenteNombre = '',
  docenteDni = '',
  criteriosTexto = [],
}: OpcionesPdfFaltasSanciones): void {
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
  doc.text('Instituto José Peña — Registros de Asistencias, Faltas y Sanciones', 14, 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const subtituloDocente = docenteNombre
    ? `Docente: Prof. ${docenteNombre}${docenteDni ? ` (DNI: ${docenteDni})` : ''}`
    : 'Panel Docente — Registros y Sanciones';
  doc.text(subtituloDocente, 14, 19.5);

  doc.setFontSize(8.5);
  doc.text(`Fecha y Hora: ${fechaHoraTexto}`, pageWidth - 14, 19.5, { align: 'right' });

  // Encabezado del criterio
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const tipoReporte = esDescargaTotal
    ? 'Tipo de exportación: Descargar Todo (asistencias, faltas y sanciones de tus asignaturas)'
    : 'Tipo de exportación: Descargar por criterio de búsqueda';
  doc.text(tipoReporte, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_MUTED);
  const detalleLinea = esDescargaTotal
    ? `Total de registros exportados: ${registros.length}   •   Orden: Ascendente (ASC por Fecha / DNI)`
    : `Criterios aplicados: ${criteriosTexto.join(' | ')}   •   Coincidencias: ${registros.length}   •   Orden: ASC`;
  doc.text(detalleLinea, 14, 39.5);

  const bodyRows = registros.map((r, idx) => [
    String(idx + 1),
    r.fecha || '-',
    r.dni || '-',
    r.apellidoNombre || '-',
    r.cursoDivision || '-',
    r.asignatura || '-',
    r.tipo || '-',
    r.valor || '-',
    r.observacion || '-',
  ]);

  autoTable(doc, {
    startY: 44,
    head: [
      [
        '#',
        'Fecha',
        'DNI',
        'Apellido y Nombre',
        'Curso y División',
        'Asignatura',
        'Tipo',
        'Concepto / Valor',
        'Observación',
      ],
    ],
    body: bodyRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      cellPadding: 2.5,
      textColor: COLOR_TEXT,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { halign: 'center', cellWidth: 23 },
      2: { cellWidth: 22 },
      3: { fontStyle: 'bold', cellWidth: 42 },
      4: { cellWidth: 34 },
      5: { cellWidth: 36 },
      6: { halign: 'center', cellWidth: 26 },
      7: { fontStyle: 'bold', cellWidth: 32 },
      8: { cellWidth: 'auto' },
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

  const prefijo = esDescargaTotal ? 'Faltas_y_Sanciones_Todo' : 'Faltas_y_Sanciones_Filtrado';
  doc.save(construirNombreArchivoPdf(prefijo, ahora));
}
