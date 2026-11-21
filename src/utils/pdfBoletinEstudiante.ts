/**
 * @archivo src/utils/pdfBoletinEstudiante.ts
 * @descripción Generador oficial PDF (jsPDF + autoTable) del Boletín de Calificaciones
 * para los roles Alumno y Padre/Tutor, con sello de Fecha y Hora en documento y archivo.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  construirNombreArchivoPdf,
  obtenerTextoFechaHora,
} from './fechaHoraPdf.js';

export interface DatosBoletinPdf {
  ciclo_lectivo?: string;
  perfil: {
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
    curso: string;
    seccion: string;
    turno: string;
  };
  inasistencias: {
    total: number;
    listado: Array<{
      fecha: string;
      materia: string;
      concepto: string;
      observacion: string;
    }>;
  };
  sanciones: {
    total: number;
    listado: Array<{
      fecha: string;
      materia: string;
      sancion: string;
      observacion: string;
    }>;
  };
  tablaAcademica: Array<{
    materia: string;
    t1: string;
    t2: string;
    t3: string;
    promedioFinal: string;
  }>;
}

export function exportarBoletinEstudianteAPdf(boletin: DatosBoletinPdf): string {
  const ahora = new Date();
  const fechaHoraTexto = obtenerTextoFechaHora(ahora);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const azulMarino: [number, number, number] = [27, 42, 74];
  const bordoInstitucional: [number, number, number] = [164, 22, 26];
  const grisFondo: [number, number, number] = [244, 246, 249];

  // Encabezado con Membrete Oficial
  doc.setFillColor(...azulMarino);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INSTITUTO JOSÉ PEÑA', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('BOLETÍN DE CALIFICACIONES E INFORME ACADÉMICO OFICIAL', 14, 19);
  doc.text(`CICLO LECTIVO ${boletin.ciclo_lectivo || '2026'}`, 196, 12, { align: 'right' });
  doc.text(`Fecha y Hora: ${fechaHoraTexto}`, 196, 19, { align: 'right' });

  // Ficha del Estudiante
  doc.setFillColor(...grisFondo);
  doc.roundedRect(14, 34, 182, 26, 2, 2, 'F');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${boletin.perfil.apellido}, ${boletin.perfil.nombre}`, 18, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`DNI: ${boletin.perfil.dni}  |  Legajo: ${boletin.perfil.legajo}`, 18, 48);
  doc.text(
    `Curso / Sección: ${boletin.perfil.curso} - ${boletin.perfil.seccion} (${boletin.perfil.turno})`,
    18,
    54
  );

  // Resumen de Inasistencias y Sanciones
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(140, 40, 52, 16, 2, 2, 'FD');

  doc.setTextColor(...bordoInstitucional);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Faltas: ${boletin.inasistencias.total}`, 144, 46);
  doc.text(`Sanciones: ${boletin.sanciones.total}`, 144, 52);

  // Tabla de Calificaciones por Materia
  autoTable(doc, {
    startY: 66,
    head: [['MATERIA', '1° TRIMESTRE', '2° TRIMESTRE', '3° TRIMESTRE', 'PROMEDIO FINAL']],
    body: boletin.tablaAcademica.map((m) => [
      m.materia,
      m.t1,
      m.t2,
      m.t3,
      m.promedioFinal,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: azulMarino,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY || 120) + 10;

  if (boletin.inasistencias.listado.length > 0 || boletin.sanciones.listado.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...azulMarino);
    doc.text('DETALLE DE ASISTENCIAS, INASISTENCIAS Y SANCIONES', 14, finalY);

    const rowsObs = [
      ...boletin.inasistencias.listado.map((i) => [
        'Asistencia / Falta',
        i.fecha,
        `${i.materia}: ${i.concepto}${i.observacion ? ` - ${i.observacion}` : ''}`,
      ]),
      ...boletin.sanciones.listado.map((s) => [
        'Sanción',
        s.fecha,
        `${s.materia}: ${s.sancion}${s.observacion ? ` - ${s.observacion}` : ''}`,
      ]),
    ];

    autoTable(doc, {
      startY: finalY + 4,
      head: [['TIPO', 'FECHA', 'CONCEPTO / OBSERVACIÓN']],
      body: rowsObs,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    });
  }

  const pageHeight = doc.internal.pageSize.height;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);

  doc.line(14, pageHeight - 25, 74, pageHeight - 25);
  doc.text('Firma Preceptoría / Dirección', 14, pageHeight - 20);

  doc.text(`Documento emitido el ${fechaHoraTexto}`, 196, pageHeight - 20, {
    align: 'right',
  });

  const nombreArchivo = construirNombreArchivoPdf(
    `Boletin_${boletin.perfil.apellido}_${boletin.perfil.nombre}`,
    ahora
  );
  doc.save(nombreArchivo);
  return nombreArchivo;
}
