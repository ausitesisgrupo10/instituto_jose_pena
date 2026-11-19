/**
 * @archivo src/components/views/DirectorReportesView.tsx
 * @descripción Vista de Reportes y Estadísticas exclusiva del Rol Director.
 * Permite filtrar registros consolidados de todos los roles por Curso/División, Fecha Desde, Fecha Hasta y Tipo de Registro,
 * paginar resultados y exportar a Excel (.CSV) o PDF oficial.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IUser } from '../../types.js';

interface DirectorReportesViewProps {
  usuario: IUser | null;
}

interface RegistroDirectivo {
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

const ITEMS_POR_PAGINA = 6;

export const DirectorReportesView: React.FC<DirectorReportesViewProps> = ({ usuario }) => {
  const [cursosDivisiones, setCursosDivisiones] = useState<string[]>([]);
  const [registros, setRegistros] = useState<RegistroDirectivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros de Búsqueda
  const [cursoDivision, setCursoDivision] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipo, setTipo] = useState('Todos');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);

  const consultarReportes = useCallback(
    async (filtros: {
      cursoDivision: string;
      fechaDesde: string;
      fechaHasta: string;
      tipo: string;
    }) => {
      setCargando(true);
      setErrorMsg(null);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (filtros.cursoDivision && filtros.cursoDivision !== 'Todos') {
          params.append('cursoDivision', filtros.cursoDivision);
        }
        if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
        if (filtros.tipo && filtros.tipo !== 'Todos') params.append('tipo', filtros.tipo);

        const qs = params.toString();
        const res = await fetch(`/api/director/reportes${qs ? `?${qs}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'No se pudieron consultar los reportes directivos.');
        }

        const data = await res.json();
        setCursosDivisiones(data.cursosDivisionesDisponibles || []);
        setRegistros(data.registros || []);
        setPaginaActual(1);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error de conexión al consultar reportes.');
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    consultarReportes({ cursoDivision: 'Todos', fechaDesde: '', fechaHasta: '', tipo: 'Todos' });
  }, [consultarReportes]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    consultarReportes({ cursoDivision, fechaDesde, fechaHasta, tipo });
  };

  // Exportar Excel (.CSV con BOM UTF-8 para compatibilidad directa con Excel)
  const handleExportarCSV = () => {
    if (registros.length === 0) return;

    const encabezados = [
      'Alumno',
      'DNI',
      'Curso / División',
      'Fecha',
      'Tipo',
      'Estado / Calificación',
      'Observaciones',
    ];

    const escapar = (valor: string) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

    const filas = registros.map((r) => [
      escapar(r.alumno),
      escapar(r.dni),
      escapar(r.cursoDivision),
      escapar(r.fechaDisplay),
      escapar(r.tipo),
      escapar(r.estadoCalificacion),
      escapar(r.observaciones),
    ]);

    const contenido = '\uFEFF' + [encabezados.map(escapar).join(';'), ...filas.map((f) => f.join(';'))].join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Reporte_Directivo_Instituto_Jose_Pena_${fechaHoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar PDF oficial con jsPDF + autoTable
  const handleExportarPDF = () => {
    if (registros.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(16);
    doc.setTextColor(27, 42, 74);
    doc.text('Instituto José Peña — Reporte Directivo Consolidado', 40, 42);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Emitido por: ${usuario?.nombre || ''} ${usuario?.apellido || ''} (Director) | Curso/División: ${cursoDivision} | Tipo: ${tipo} | Total: ${registros.length} registros`,
      40,
      60
    );

    autoTable(doc, {
      startY: 76,
      head: [['Alumno', 'Curso / División', 'Fecha', 'Tipo', 'Estado / Calificación', 'Observaciones']],
      body: registros.map((r) => [
        r.alumno,
        r.cursoDivision,
        r.fechaDisplay,
        r.tipo,
        r.estadoCalificacion,
        r.observaciones,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [27, 42, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const fechaHoy = new Date().toISOString().split('T')[0];
    doc.save(`Reporte_Directivo_Instituto_Jose_Pena_${fechaHoy}.pdf`);
  };

  // Cálculo de paginación
  const totalPaginas = Math.max(1, Math.ceil(registros.length / ITEMS_POR_PAGINA));
  const inicioIdx = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const finIdx = Math.min(inicioIdx + ITEMS_POR_PAGINA, registros.length);
  const registrosPagina = registros.slice(inicioIdx, finIdx);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. Encabezado con Bienvenida y Botones de Exportación */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#1b2a4a] tracking-tight">
            ¡Bienvenido/a, {usuario?.nombre} {usuario?.apellido}!
          </h2>
          <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80">
            Director
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportarCSV}
            disabled={registros.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportarPDF}
            disabled={registros.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d9534f] hover:bg-[#c9302c] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros de Búsqueda */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-[#1b2a4a]">Filtros de Búsqueda</h3>

        <form
          onSubmit={handleBuscar}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
        >
          {/* Curso / División */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Curso / División
            </label>
            <select
              value={cursoDivision}
              onChange={(e) => setCursoDivision(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos</option>
              {cursosDivisiones.map((cd) => (
                <option key={cd} value={cd}>
                  {cd}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo de Registro */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Tipo de Registro
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="Asistencias">Asistencias</option>
              <option value="Calificaciones">Calificaciones</option>
              <option value="Sanciones">Sanciones</option>
            </select>
          </div>

          {/* Botón Buscar / Filtrar */}
          <div>
            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1b2a4a] hover:bg-[#23365c] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar / Filtrar</span>
            </button>
          </div>
        </form>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* 3. Tabla de Registros Filtrados */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-[#1b2a4a]">Registros Filtrados</h3>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[#1b2a4a] font-bold border-b border-slate-200">
                  <th className="py-3.5 px-5">Alumno</th>
                  <th className="py-3.5 px-4">Curso / División</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Estado / Calificación</th>
                  <th className="py-3.5 px-5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-slate-700">
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Cargando registros consolidados...</span>
                      </div>
                    </td>
                  </tr>
                ) : registrosPagina.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No se encontraron registros para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  registrosPagina.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                        {reg.alumno}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {reg.cursoDivision}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {reg.fechaDisplay}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            reg.tipo === 'Calificación'
                              ? 'bg-blue-50 text-blue-700'
                              : reg.tipo === 'Sanción'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {reg.tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {reg.estadoCalificacion}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        {reg.observaciones}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pie de Paginación */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-end gap-4 text-xs text-slate-500">
            <span>
              {registros.length === 0
                ? 'Mostrando 0 de 0 registros'
                : `Mostrando ${inicioIdx + 1}-${finIdx} de ${registros.length} registros`}
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual <= 1}
                aria-label="Página anterior"
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
                aria-label="Página siguiente"
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
