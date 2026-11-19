/**
 * @archivo src/utils/exportExcel.ts
 * @descripción Utilidad para exportar registros académicos y calificaciones a formato Excel (.xlsx)
 * incluyendo: DNI, Apellido, Nombre, Curso, División, Materia, Nota, Trimestre,
 * Promedio General de la Materia y Cantidad de Sanciones.
 */

import * as XLSX from 'xlsx';

export interface FilaExcelRegistro {
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

/**
 * Genera y descarga un archivo Excel (.xlsx) con las columnas institucionales solicitadas.
 */
export function exportarRegistrosAExcel(
  filas: FilaExcelRegistro[],
  nombreArchivo = 'Registros_Academicos_Instituto_Jose_Pena'
): void {
  const datosHoja = filas.map((f) => ({
    DNI: f.dni,
    Apellido: f.apellido,
    Nombre: f.nombre,
    Curso: f.curso,
    División: f.division,
    Materia: f.materia,
    Nota: f.nota,
    Trimestre: f.trimestre,
    'Promedio General de la Materia': f.promedioGeneralMateria,
    'Cantidad de Sanciones': f.cantidadSanciones,
  }));

  const hoja = XLSX.utils.json_to_sheet(datosHoja);

  // Configurar anchos de columnas legibles en Excel
  hoja['!cols'] = [
    { wch: 14 }, // DNI
    { wch: 18 }, // Apellido
    { wch: 18 }, // Nombre
    { wch: 14 }, // Curso
    { wch: 16 }, // División
    { wch: 24 }, // Materia
    { wch: 12 }, // Nota
    { wch: 14 }, // Trimestre
    { wch: 28 }, // Promedio General de la Materia
    { wch: 22 }, // Cantidad de Sanciones
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Registros Académicos');

  const fechaHoy = new Date().toISOString().split('T')[0];
  XLSX.writeFile(libro, `${nombreArchivo}_${fechaHoy}.xlsx`);
}
