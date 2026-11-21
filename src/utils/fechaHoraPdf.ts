/**
 * @archivo src/utils/fechaHoraPdf.ts
 * @descripción Utilidades compartidas para estandarizar Fecha y Hora en los reportes PDF
 * descargados desde todos los roles del Instituto José Peña.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Devuelve fecha y hora local formateada para nombres de archivo seguros: YYYY-MM-DD_HH-mm-ss
 */
export function obtenerSelloFechaHoraArchivo(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = pad2(fecha.getMonth() + 1);
  const dia = pad2(fecha.getDate());
  const horas = pad2(fecha.getHours());
  const minutos = pad2(fecha.getMinutes());
  const segundos = pad2(fecha.getSeconds());
  return `${anio}-${mes}-${dia}_${horas}-${minutos}-${segundos}`;
}

/**
 * Devuelve fecha local legible: DD/MM/YYYY
 */
export function obtenerTextoFecha(fecha: Date = new Date()): string {
  return `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/**
 * Devuelve hora local legible: HH:mm:ss
 */
export function obtenerTextoHora(fecha: Date = new Date()): string {
  return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}:${pad2(fecha.getSeconds())}`;
}

/**
 * Devuelve fecha y hora local legible para encabezados y pies de página PDF: DD/MM/YYYY HH:mm:ss
 */
export function obtenerTextoFechaHora(fecha: Date = new Date()): string {
  return `${obtenerTextoFecha(fecha)} ${obtenerTextoHora(fecha)}`;
}

/**
 * Construye el nombre de archivo PDF final combinando el nombre del reporte + fecha + hora.
 */
export function construirNombreArchivoPdf(nombreBase: string, fecha: Date = new Date()): string {
  const limpio = nombreBase.replace(/\.pdf$/i, '').replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]+/g, '_');
  return `${limpio}_${obtenerSelloFechaHoraArchivo(fecha)}.pdf`;
}
