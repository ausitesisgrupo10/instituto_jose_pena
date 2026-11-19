/**
 * @archivo src/components/DocenteMultifiltroRegistros.tsx
 * @descripción Multifiltro de búsqueda de registros de alumnos para el Panel Principal del Docente.
 * - La tabla de resultados muestra únicamente: DNI, Apellido, Nombre, Curso y Turno.
 * - Al hacer clic sobre un registro, abre su ficha completa con Datos Personales, Materias y notas por trimestre,
 *   Cantidad y observaciones de sanciones, y Observación general.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  FileText,
  Loader2,
  X,
  User,
  Users,
  MapPin,
  Phone,
  PhoneCall,
  BookOpen,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

interface CursoOption {
  _id: string;
  nombre_curso: string;
  nivel?: string;
}

interface SeccionOption {
  _id: string;
  nombre_seccion: string;
  turno: string;
  curso_id?:
    | {
        _id: string;
        nombre_curso: string;
      }
    | string;
}

interface RegistroResumen {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  curso: string;
  division: string;
  turno: string;
}

interface DetalleRegistroAlumno {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  curso: string;
  division: string;
  turno: string;
  datos_personales: {
    padres_tutores: Array<{
      apellido: string;
      nombre: string;
      vinculo: string;
    }>;
    direccion: string;
    barrio: string;
    localidad: string;
    provincia: string;
    contacto_emergencia: string;
    contacto: string;
  };
  materias: Array<{
    materia_id: string;
    nombre_materia: string;
    trimestre1: string[];
    trimestre2: string[];
    trimestre3: string[];
  }>;
  cantidad_sanciones: number;
  sanciones: Array<{
    id: string;
    fecha: string;
    valor: string;
    observacion: string;
    materia: string;
  }>;
  observacion_general: string;
}

interface DocenteMultifiltroRegistrosProps {
  refreshTrigger?: number;
}

export const DocenteMultifiltroRegistros: React.FC<DocenteMultifiltroRegistrosProps> = ({
  refreshTrigger = 0,
}) => {
  // Opciones de catálogos institucionales
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [secciones, setSecciones] = useState<SeccionOption[]>([]);

  // Estados de los 6 campos del multifiltro
  const [curso, setCurso] = useState('');
  const [division, setDivision] = useState('');
  const [turno, setTurno] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');

  // Estados de resultados y carga
  const [resultados, setResultados] = useState<RegistroResumen[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // Estados del detalle del registro seleccionado
  const [registroSeleccionadoId, setRegistroSeleccionadoId] = useState<string | null>(null);
  const [detalleAlumno, setDetalleAlumno] = useState<DetalleRegistroAlumno | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Cargar catálogos de Cursos y Secciones (Divisiones)
  useEffect(() => {
    const cargarCatalogos = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [resCursos, resSecciones] = await Promise.all([
          fetch('/api/cursos', { headers }),
          fetch('/api/secciones', { headers }),
        ]);

        if (resCursos.ok) {
          const dataCursos = await resCursos.json();
          setCursos(Array.isArray(dataCursos) ? dataCursos : []);
        }
        if (resSecciones.ok) {
          const dataSecciones = await resSecciones.json();
          setSecciones(Array.isArray(dataSecciones) ? dataSecciones : []);
        }
      } catch (err) {
        console.error('Error al cargar catálogos para multifiltro:', err);
      }
    };

    cargarCatalogos();
  }, []);

  // Divisiones únicas filtradas dinámicamente según el curso seleccionado
  const divisionesDisponibles = useMemo(() => {
    const filtradas = curso
      ? secciones.filter((s) => {
          const cursoObj = typeof s.curso_id === 'object' ? s.curso_id : null;
          return cursoObj?.nombre_curso === curso;
        })
      : secciones;

    const nombresUnicos = Array.from(new Set<string>(filtradas.map((s) => s.nombre_seccion)));
    return nombresUnicos.sort((a, b) => a.localeCompare(b));
  }, [secciones, curso]);

  // Ejecutar búsqueda contra el backend con los criterios actuales
  const ejecutarBusqueda = useCallback(
    async (criterios: {
      curso: string;
      division: string;
      turno: string;
      apellido: string;
      nombre: string;
      dni: string;
    }) => {
      setBuscando(true);
      setErrorBusqueda(null);
      const token = localStorage.getItem('token');

      try {
        const params = new URLSearchParams();
        if (criterios.curso.trim()) params.append('curso', criterios.curso.trim());
        if (criterios.division.trim()) params.append('division', criterios.division.trim());
        if (criterios.turno.trim()) params.append('turno', criterios.turno.trim());
        if (criterios.apellido.trim()) params.append('apellido', criterios.apellido.trim());
        if (criterios.nombre.trim()) params.append('nombre', criterios.nombre.trim());
        if (criterios.dni.trim()) params.append('dni', criterios.dni.trim());

        const queryStr = params.toString();
        const url = `/api/docentes/buscar-registros${queryStr ? `?${queryStr}` : ''}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'No se pudieron consultar los registros.');
        }

        const data = await res.json();
        setResultados(Array.isArray(data.resultados) ? data.resultados : []);
        setBusquedaRealizada(true);
      } catch (err: any) {
        setErrorBusqueda(err.message || 'Error de conexión al buscar registros.');
      } finally {
        setBuscando(false);
      }
    },
    []
  );

  // Cargar detalle completo de un alumno seleccionado
  const cargarDetalleAlumno = useCallback(async (alumnoId: string) => {
    setRegistroSeleccionadoId(alumnoId);
    setCargandoDetalle(true);
    setErrorDetalle(null);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/docentes/registro-alumno/${alumnoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo cargar el detalle del registro.');
      }

      const data: DetalleRegistroAlumno = await res.json();
      setDetalleAlumno(data);
    } catch (err: any) {
      setErrorDetalle(err.message || 'Error de conexión al consultar los datos del alumno.');
      setDetalleAlumno(null);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  // Refrescar resultados solo si ya se realizó una búsqueda activa o hay una ficha abierta
  useEffect(() => {
    if (refreshTrigger === 0) return;
    if (busquedaRealizada) {
      ejecutarBusqueda({ curso, division, turno, apellido, nombre, dni });
    }
    if (registroSeleccionadoId) {
      cargarDetalleAlumno(registroSeleccionadoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda({ curso, division, turno, apellido, nombre, dni });
  };

  const handleLimpiar = () => {
    setCurso('');
    setDivision('');
    setTurno('');
    setApellido('');
    setNombre('');
    setDni('');
    setResultados([]);
    setBusquedaRealizada(false);
    setErrorBusqueda(null);
  };

  const cerrarModalDetalle = () => {
    setRegistroSeleccionadoId(null);
    setDetalleAlumno(null);
    setErrorDetalle(null);
  };

  const filtrosActivosCount = [curso, division, turno, apellido, nombre, dni].filter(
    (v) => v.trim() !== ''
  ).length;

  return (
    <>
      <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Encabezado del Multifiltro */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1d3557] text-white flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base text-[#1b2a4a]">
                Buscador Multifiltro de Registros
              </h3>
              <p className="text-xs text-slate-500">
                Busca por curso, división, turno, apellido, nombre o DNI. Haz clic sobre un registro para ver su ficha completa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filtrosActivosCount > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                {filtrosActivosCount} {filtrosActivosCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            )}
            {busquedaRealizada && (
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </div>
        </div>

        {/* Formulario de Multifiltro */}
        <form
          onSubmit={handleSubmit}
          className={`p-6 space-y-4 ${busquedaRealizada || buscando ? 'border-b border-slate-200' : ''}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Curso */}
            <div>
              <label htmlFor="mf-curso" className="block text-xs font-bold text-slate-600 mb-1.5">
                Curso
              </label>
              <select
                id="mf-curso"
                value={curso}
                onChange={(e) => {
                  setCurso(e.target.value);
                  setDivision('');
                }}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los cursos</option>
                {cursos.map((c) => (
                  <option key={c._id} value={c.nombre_curso}>
                    {c.nombre_curso} {c.nivel ? `(${c.nivel})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* División */}
            <div>
              <label htmlFor="mf-division" className="block text-xs font-bold text-slate-600 mb-1.5">
                División
              </label>
              <select
                id="mf-division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las divisiones</option>
                {divisionesDisponibles.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div>
              <label htmlFor="mf-turno" className="block text-xs font-bold text-slate-600 mb-1.5">
                Turno
              </label>
              <select
                id="mf-turno"
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

            {/* Apellido */}
            <div>
              <label htmlFor="mf-apellido" className="block text-xs font-bold text-slate-600 mb-1.5">
                Apellido
              </label>
              <input
                id="mf-apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej: Herrera, Estudiante..."
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="mf-nombre" className="block text-xs font-bold text-slate-600 mb-1.5">
                Nombre
              </label>
              <input
                id="mf-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Tomas, Sofía..."
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Número DNI */}
            <div>
              <label htmlFor="mf-dni" className="block text-xs font-bold text-slate-600 mb-1.5">
                Número DNI
              </label>
              <input
                id="mf-dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej: 48123456"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleLimpiar}
              disabled={buscando}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>

            <button
              type="submit"
              disabled={buscando}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {buscando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{buscando ? 'Buscando...' : 'Buscar registros'}</span>
            </button>
          </div>
        </form>

        {/* Mensaje de Error */}
        {errorBusqueda && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {errorBusqueda}
          </div>
        )}

        {/* Tabla de Resultados: SOLO visible tras hacer clic en "Buscar registros" */}
        {(buscando || busquedaRealizada) && (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-5">DNI</th>
                  <th className="py-3 px-5">Apellido</th>
                  <th className="py-3 px-5">Nombre</th>
                  <th className="py-3 px-5">Curso</th>
                  <th className="py-3 px-5 text-center">Turno</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {buscando ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Buscando registros coincidentes...</span>
                      </div>
                    </td>
                  </tr>
                ) : resultados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-1.5">
                        <FileText className="w-6 h-6 text-slate-300" />
                        <span className="font-semibold text-slate-500">
                          No se encontraron registros coincidentes con los criterios seleccionados.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  resultados.map((reg) => (
                    <tr
                      key={reg.id}
                      onClick={() => cargarDetalleAlumno(reg.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          cargarDetalleAlumno(reg.id);
                        }
                      }}
                      title="Haz clic para ver los datos completos del registro"
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {reg.dni}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-[#1b2a4a] whitespace-nowrap">
                        {reg.apellido}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-800 whitespace-nowrap">
                        {reg.nombre}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-700 whitespace-nowrap">
                        {reg.curso}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                          {reg.turno}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-4 h-4 inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL DE DETALLE DEL REGISTRO SELECCIONADO */}
      {registroSeleccionadoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={cerrarModalDetalle}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div className="px-6 py-4 bg-[#1d3557] text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-extrabold text-sm">
                  {detalleAlumno ? (
                    `${detalleAlumno.nombre?.[0] || ''}${detalleAlumno.apellido?.[0] || ''}`
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base leading-tight">
                    {detalleAlumno
                      ? `${detalleAlumno.apellido}, ${detalleAlumno.nombre}`
                      : 'Detalle del Registro'}
                  </h4>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Ficha integral del estudiante — Datos personales y trayectoria académica
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cerrarModalDetalle}
                aria-label="Cerrar detalle del registro"
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-6">
              {cargandoDetalle ? (
                <div className="py-16 text-center text-slate-500 text-sm font-medium flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span>Cargando datos del registro...</span>
                </div>
              ) : errorDetalle ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {errorDetalle}
                </div>
              ) : detalleAlumno ? (
                <>
                  {/* 1. Datos Principales del Registro */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        DNI
                      </span>
                      <span className="text-sm font-mono font-bold text-[#1b2a4a]">
                        {detalleAlumno.dni}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Apellido
                      </span>
                      <span className="text-sm font-bold text-[#1b2a4a]">
                        {detalleAlumno.apellido}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nombre
                      </span>
                      <span className="text-sm font-bold text-[#1b2a4a]">
                        {detalleAlumno.nombre}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Curso
                      </span>
                      <span className="text-sm font-bold text-[#1b2a4a]">
                        {detalleAlumno.curso}
                        {detalleAlumno.division && detalleAlumno.division !== 'Sin división'
                          ? ` (${detalleAlumno.division})`
                          : ''}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Turno
                      </span>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                        {detalleAlumno.turno}
                      </span>
                    </div>
                  </div>

                  {/* 2. Datos Personales */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1d3557]" />
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#1b2a4a]">
                        Datos Personales
                      </h5>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      {/* Padres / Tutores */}
                      <div className="sm:col-span-2 lg:col-span-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1">
                          Padres / Tutores Registrados
                        </span>
                        {detalleAlumno.datos_personales.padres_tutores.length === 0 ? (
                          <span className="text-slate-500 italic">
                            Sin padres o tutores vinculados registrados.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {detalleAlumno.datos_personales.padres_tutores.map((pt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-blue-200 text-slate-800 font-semibold"
                              >
                                <span>
                                  {pt.apellido}, {pt.nombre}
                                </span>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {pt.vinculo}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Dirección
                          </span>
                          <span className="font-semibold text-slate-800">
                            {detalleAlumno.datos_personales.direccion}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Barrio
                        </span>
                        <span className="font-semibold text-slate-800">
                          {detalleAlumno.datos_personales.barrio}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Localidad
                        </span>
                        <span className="font-semibold text-slate-800">
                          {detalleAlumno.datos_personales.localidad}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Provincia
                        </span>
                        <span className="font-semibold text-slate-800">
                          {detalleAlumno.datos_personales.provincia}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <PhoneCall className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Número de Contacto de Emergencia
                          </span>
                          <span className="font-bold text-rose-700">
                            {detalleAlumno.datos_personales.contacto_emergencia}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Número de Contacto
                          </span>
                          <span className="font-semibold text-slate-800">
                            {detalleAlumno.datos_personales.contacto}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Materias y Notas por Trimestre */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#1d3557]" />
                        <h5 className="font-bold text-xs uppercase tracking-wider text-[#1b2a4a]">
                          Materias y Calificaciones por Trimestre
                        </h5>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {detalleAlumno.materias.length}{' '}
                        {detalleAlumno.materias.length === 1 ? 'materia' : 'materias'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-4">Materia</th>
                            <th className="py-2.5 px-3 text-center">1° Trimestre</th>
                            <th className="py-2.5 px-3 text-center">2° Trimestre</th>
                            <th className="py-2.5 px-3 text-center">3° Trimestre</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {detalleAlumno.materias.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400">
                                No hay materias ni calificaciones registradas para este estudiante.
                              </td>
                            </tr>
                          ) : (
                            detalleAlumno.materias.map((mat) => (
                              <tr key={mat.materia_id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {mat.nombre_materia}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {mat.trimestre1.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {mat.trimestre1.map((nota, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-extrabold"
                                        >
                                          {nota}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {mat.trimestre2.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {mat.trimestre2.map((nota, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-extrabold"
                                        >
                                          {nota}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {mat.trimestre3.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {mat.trimestre3.map((nota, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-extrabold"
                                        >
                                          {nota}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Sanciones y Observaciones de Sanciones */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <h5 className="font-bold text-xs uppercase tracking-wider text-[#1b2a4a]">
                          Sanciones y Observaciones
                        </h5>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          detalleAlumno.cantidad_sanciones > 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        Cantidad de sanciones: {detalleAlumno.cantidad_sanciones}
                      </span>
                    </div>

                    <div className="p-4">
                      {detalleAlumno.sanciones.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          El estudiante no registra sanciones disciplinarias.
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {detalleAlumno.sanciones.map((s) => (
                            <li
                              key={s.id}
                              className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/80 text-xs space-y-1"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-rose-800">
                                  {s.valor} — <span className="text-slate-700">{s.materia}</span>
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Fecha: {s.fecha || '-'}
                                </span>
                              </div>
                              <p className="text-slate-700">
                                <span className="font-bold text-slate-800">Observación: </span>
                                {s.observacion}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 5. Observación General */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#1d3557]" />
                      <h5 className="font-bold text-xs uppercase tracking-wider text-[#1b2a4a]">
                        Observación General
                      </h5>
                    </div>
                    <div className="p-4 text-xs text-slate-700 leading-relaxed">
                      {detalleAlumno.observacion_general}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={cerrarModalDetalle}
                className="px-4 py-2 rounded-lg bg-[#1d3557] hover:bg-[#162844] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
