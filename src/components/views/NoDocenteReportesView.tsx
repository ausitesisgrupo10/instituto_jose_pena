/**
 * @archivo src/components/views/NoDocenteReportesView.tsx
 * @descripción Módulo exclusivo de Reportes y Estadísticas para el rol No Docente.
 * Permite filtrar indistintamente por Rol, Cargo (dependiente del Rol), Legajo, DNI y Turno,
 * y descargar los registros actualizados en formato Excel (.xls) mediante SheetJS (xlsx BIFF8).
 */

import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  SlidersHorizontal,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  FileText,
} from 'lucide-react';

interface RegistroReporteItem {
  _id: string;
  legajo: string;
  dni: string;
  apellido: string;
  nombre: string;
  rol: string;
  rol_display: string;
  cargo: string;
  asignatura: string;
  turno: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  // Campos específicos Estudiante
  fecha_nacimiento: string;
  curso: string;
  division: string;
  barrio: string;
  localidad: string;
  provincia: string;
  contacto: string;
  promedio_general: number | string;
  sanciones: number;
}

const HEADERS_DOCENTE_NO_DOCENTE = [
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
  'Fecha de inicio',
  'Fecha fin',
];

const HEADERS_ESTUDIANTE = [
  'Nombre',
  'Apellido',
  'DNI',
  'Rol',
  'Estado',
  'Fecha de Nacimiento',
  'Curso',
  'Division',
  'Turno',
  'Direccion',
  'Barrio',
  'Localidad',
  'Provincia',
  'Contacto',
  'Promedio General',
  'Sanciones',
];

const CARGOS_GENERALES = [
  'Directivo',
  'Secretaría',
  'Preceptoría',
  'Docente',
  'Estudiantes',
  'Padres/Tutores',
];

const CARGOS_POR_ROL: Record<string, string[]> = {
  '': CARGOS_GENERALES,
  Docente: ['Docente'],
  'No Docente': ['Directivo', 'Secretaría', 'Preceptoría'],
  Alumno: ['Estudiantes'],
  Padre: ['Padre/Tutor'],
};

interface NoDocenteReportesViewProps {
  sinContenedor?: boolean;
}

export const NoDocenteReportesView: React.FC<NoDocenteReportesViewProps> = ({
  sinContenedor = false,
}) => {
  // Estados del multifiltro (cualquier campo se puede seleccionar indistintamente)
  const [rol, setRol] = useState('');
  const [cargo, setCargo] = useState('');
  const [legajo, setLegajo] = useState('');
  const [dni, setDni] = useState('');
  const [turno, setTurno] = useState('');

  // Estados de descarga, búsqueda y feedback
  const [resultados, setResultados] = useState<RegistroReporteItem[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [descargando, setDescargando] = useState<'filtrado' | 'todo' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Cargos correspondientes al Rol seleccionado automáticamente
  const cargosDisponibles = useMemo(() => {
    return CARGOS_POR_ROL[rol] || CARGOS_GENERALES;
  }, [rol]);

  const handleRolChange = (nuevoRol: string) => {
    setRol(nuevoRol);
    setErrorMsg(null);
    setExitoMsg(null);

    const opciones = CARGOS_POR_ROL[nuevoRol] || CARGOS_GENERALES;
    if (nuevoRol && opciones.length === 1) {
      setCargo(opciones[0]);
    } else if (cargo && !opciones.includes(cargo)) {
      setCargo('');
    } else if (!nuevoRol) {
      setCargo('');
    }
  };

  const construirParams = (criterios: {
    rol: string;
    cargo: string;
    legajo: string;
    dni: string;
    turno: string;
  }) => {
    const params = new URLSearchParams();
    if (criterios.rol.trim()) params.append('rol', criterios.rol.trim());
    if (criterios.cargo.trim()) params.append('cargo', criterios.cargo.trim());
    if (criterios.legajo.trim()) params.append('legajo', criterios.legajo.trim());
    if (criterios.dni.trim()) params.append('dni', criterios.dni.trim());
    if (criterios.turno.trim()) params.append('turno', criterios.turno.trim());
    return params.toString();
  };

  const filtrosActivosCount = [rol, cargo, legajo, dni, turno].filter(
    (v) => v.trim() !== ''
  ).length;

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBuscando(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const token = localStorage.getItem('token');
      const queryStr = construirParams({ rol, cargo, legajo, dni, turno });
      const url = `/api/no-docente/reportes-consolidados${queryStr ? `?${queryStr}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudieron consultar los registros.');
      }

      const data = await res.json();
      setResultados(Array.isArray(data.registros) ? data.registros : []);
      setBusquedaRealizada(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión al buscar registros.');
    } finally {
      setBuscando(false);
    }
  };

  const handleLimpiar = () => {
    setRol('');
    setCargo('');
    setLegajo('');
    setDni('');
    setTurno('');
    setResultados([]);
    setBusquedaRealizada(false);
    setErrorMsg(null);
    setExitoMsg(null);
  };

  const mapearFilaDocenteNoDocente = (r: RegistroReporteItem): (string | number)[] => [
    r.legajo || '',
    r.dni || '',
    r.apellido || '',
    r.nombre || '',
    r.rol || '',
    r.asignatura || '-',
    r.turno || '',
    r.telefono || '',
    r.email || '',
    r.direccion || '',
    r.ciudad || '',
    r.estado || 'Activo',
    r.fecha_inicio || '',
    r.fecha_fin || '',
  ];

  const mapearFilaEstudiante = (r: RegistroReporteItem): (string | number)[] => [
    r.nombre || '',
    r.apellido || '',
    r.dni || '',
    r.rol || 'Alumno',
    r.estado || 'Activo',
    r.fecha_nacimiento || '',
    r.curso || '',
    r.division || '',
    r.turno || '',
    r.direccion || '',
    r.barrio || '',
    r.localidad || '',
    r.provincia || '',
    r.contacto || '',
    r.promedio_general !== '' && r.promedio_general !== undefined && r.promedio_general !== null
      ? Number(r.promedio_general).toFixed(2)
      : '',
    r.sanciones ?? 0,
  ];

  const exportarArchivoXls = (datos: RegistroReporteItem[], esDescargaTotal: boolean) => {
    const docentesYNoDocentes = datos.filter(
      (r) => r.rol === 'Docente' || r.rol === 'No Docente'
    );
    const estudiantes = datos.filter((r) => r.rol === 'Alumno');
    const otrosRoles = datos.filter(
      (r) => r.rol !== 'Docente' && r.rol !== 'No Docente' && r.rol !== 'Alumno'
    );

    const wb = XLSX.utils.book_new();

    if (docentesYNoDocentes.length > 0) {
      const aoaPersonal = [
        HEADERS_DOCENTE_NO_DOCENTE,
        ...docentesYNoDocentes.map(mapearFilaDocenteNoDocente),
      ];
      const wsPersonal = XLSX.utils.aoa_to_sheet(aoaPersonal);
      XLSX.utils.book_append_sheet(wb, wsPersonal, 'Docentes y No Docentes');
    }

    if (estudiantes.length > 0) {
      const aoaEstudiantes = [
        HEADERS_ESTUDIANTE,
        ...estudiantes.map(mapearFilaEstudiante),
      ];
      const wsEstudiantes = XLSX.utils.aoa_to_sheet(aoaEstudiantes);
      XLSX.utils.book_append_sheet(wb, wsEstudiantes, 'Estudiantes');
    }

    if (otrosRoles.length > 0) {
      const aoaOtros = [
        HEADERS_DOCENTE_NO_DOCENTE,
        ...otrosRoles.map(mapearFilaDocenteNoDocente),
      ];
      const wsOtros = XLSX.utils.aoa_to_sheet(aoaOtros);
      XLSX.utils.book_append_sheet(wb, wsOtros, 'Otros Roles');
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    let nombreArchivo = `Reporte_Institucional_Completo_${fechaHoy}.xls`;

    if (!esDescargaTotal && filtrosActivosCount > 0) {
      if (rol === 'Alumno') {
        nombreArchivo = `Reporte_Estudiantes_${fechaHoy}.xls`;
      } else if (rol === 'Docente' || rol === 'No Docente') {
        nombreArchivo = `Reporte_${rol.replace(/\s+/g, '_')}_${fechaHoy}.xls`;
      } else {
        nombreArchivo = `Reporte_Filtrado_${fechaHoy}.xls`;
      }
    }

    XLSX.writeFile(wb, nombreArchivo, { bookType: 'biff8' });
    return nombreArchivo;
  };

  // Descargar según los filtros seleccionados (si no hay filtros, descarga todo por defecto)
  const handleDescargar = async () => {
    setDescargando('filtrado');
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const token = localStorage.getItem('token');
      const queryStr = construirParams({ rol, cargo, legajo, dni, turno });
      const url = `/api/no-docente/reportes-consolidados${queryStr ? `?${queryStr}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudieron obtener los registros para descargar.');
      }

      const data = await res.json();
      const lista: RegistroReporteItem[] = Array.isArray(data.registros) ? data.registros : [];
      if (lista.length === 0) {
        setErrorMsg('No hay registros cargados que coincidan con los filtros seleccionados.');
        return;
      }

      const archivo = exportarArchivoXls(lista, filtrosActivosCount === 0);
      setExitoMsg(`Se descargó ${archivo} con ${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar la descarga .xls.');
    } finally {
      setDescargando(null);
    }
  };

  // Descargar todo sin aplicar filtros
  const handleDescargarTodo = async () => {
    setDescargando('todo');
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/no-docente/reportes-consolidados', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo obtener la información completa para descargar.');
      }

      const data = await res.json();
      const lista: RegistroReporteItem[] = Array.isArray(data.registros) ? data.registros : [];
      if (lista.length === 0) {
        setErrorMsg('No existen registros cargados en la base de datos para descargar.');
        return;
      }

      const archivo = exportarArchivoXls(lista, true);
      setExitoMsg(`Se descargó ${archivo} con todos los registros (${lista.length}).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el archivo completo .xls.');
    } finally {
      setDescargando(null);
    }
  };

  const contenido = (
    <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1d3557] text-white flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#1b2a4a]">
              Reportes y Exportación Multifiltro (.xls)
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona uno o varios filtros indistintamente y descarga los registros actualizados en formato Excel (.xls).
            </p>
          </div>
        </div>

        {/* Formulario Multifiltro */}
        <form
          onSubmit={handleBuscar}
          className={`p-6 space-y-5 ${buscando || busquedaRealizada ? 'border-b border-slate-200' : ''}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Rol */}
            <div>
              <label htmlFor="rep-rol" className="block text-xs font-bold text-slate-600 mb-1.5">
                Rol
              </label>
              <select
                id="rep-rol"
                value={rol}
                onChange={(e) => handleRolChange(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los roles</option>
                <option value="Alumno">Estudiante</option>
                <option value="Docente">Docente</option>
                <option value="No Docente">No Docente</option>
                <option value="Padre">Padre/Tutor</option>
              </select>
            </div>

            {/* Cargo (se actualiza automáticamente según el Rol) */}
            <div>
              <label htmlFor="rep-cargo" className="block text-xs font-bold text-slate-600 mb-1.5">
                Cargo
              </label>
              <select
                id="rep-cargo"
                value={cargo}
                onChange={(e) => {
                  setCargo(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {cargosDisponibles.length > 1 && (
                  <option value="">Todos los cargos</option>
                )}
                {cargosDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Legajo */}
            <div>
              <label htmlFor="rep-legajo" className="block text-xs font-bold text-slate-600 mb-1.5">
                Legajo
              </label>
              <input
                id="rep-legajo"
                type="text"
                value={legajo}
                onChange={(e) => setLegajo(e.target.value)}
                placeholder="Ej: DOC-6789, NOD-4567"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* DNI */}
            <div>
              <label htmlFor="rep-dni" className="block text-xs font-bold text-slate-600 mb-1.5">
                DNI
              </label>
              <input
                id="rep-dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej: 32456789"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Turno */}
            <div>
              <label htmlFor="rep-turno" className="block text-xs font-bold text-slate-600 mb-1.5">
                Turno
              </label>
              <select
                id="rep-turno"
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los turnos</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>
            </div>
          </div>

          {/* Botonera de Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDescargar}
                disabled={descargando !== null}
                title={
                  filtrosActivosCount > 0
                    ? 'Descargar registros correspondientes a los filtros seleccionados (.xls)'
                    : 'Sin filtros seleccionados: descarga todos los registros por defecto (.xls)'
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {descargando === 'filtrado' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{descargando === 'filtrado' ? 'Descargando...' : 'Descargar'}</span>
              </button>

              <button
                type="button"
                onClick={handleDescargarTodo}
                disabled={descargando !== null}
                title="Descargar toda la información institucional cargada hasta el momento (.xls)"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {descargando === 'todo' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>{descargando === 'todo' ? 'Descargando...' : 'Descargar todo'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleLimpiar}
                disabled={buscando || descargando !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>

              <button
                type="submit"
                disabled={buscando || descargando !== null}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {buscando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{buscando ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {exitoMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exitoMsg}</span>
            </div>
          )}
        </form>

        {/* Tabla de Resultados: visible al hacer clic en Buscar */}
        {(buscando || busquedaRealizada) && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Legajo</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Apellido</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4">Asignatura / Curso</th>
                  <th className="py-3 px-4 text-center">Turno</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {buscando ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500 font-medium">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Buscando registros coincidentes...</span>
                      </div>
                    </td>
                  </tr>
                ) : resultados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-1.5">
                        <FileText className="w-6 h-6 text-slate-300" />
                        <span className="font-semibold text-slate-500">
                          No se encontraron registros que coincidan con los filtros ingresados.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  resultados.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1d3557] whitespace-nowrap">
                        {r.legajo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {r.dni}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1b2a4a] whitespace-nowrap">
                        {r.apellido}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {r.nombre}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-semibold">
                        {r.rol_display}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{r.cargo}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {r.rol === 'Alumno'
                          ? `${r.curso ? `${r.curso}° Año` : ''} ${r.division ? `Div. ${r.division}` : ''}`.trim() || '-'
                          : r.asignatura || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                          {r.turno || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${
                            r.estado === 'Activo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
  );

  if (sinContenedor) return contenido;

  return <div className="p-6 md:p-8 max-w-7xl mx-auto">{contenido}</div>;
};
