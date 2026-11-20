/**
 * @archivo src/components/views/AbmAlumnosView.tsx
 * @descripción Módulo ABM de Alumnos (Alta, Modificación y Baja) para el rol No Docente.
 * Incluye los 16 campos de la nómina oficial del Instituto José Peña (Estudiantes_Instituto_Jose_Pena_2026.pdf).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AlumnoAbmItem {
  _id: string;
  nombre: string;
  apellido: string;
  dni: string;
  rol: 'Alumno';
  estado: 'Activo' | 'Inactivo';
  fecha_nacimiento: string;
  curso: string;
  curso_label: string;
  division: string;
  turno: string;
  direccion: string;
  barrio: string;
  localidad: string;
  provincia: string;
  contacto: string;
  promedio_general: number;
  sanciones: number;
  legajo?: string;
}

interface AlumnoFormState {
  nombre: string;
  apellido: string;
  dni: string;
  rol: 'Alumno';
  estado: 'Activo' | 'Inactivo';
  fecha_nacimiento: string;
  curso: string;
  division: string;
  turno: string;
  direccion: string;
  barrio: string;
  localidad: string;
  provincia: string;
  contacto: string;
  promedio_general: string;
  sanciones: string;
}

const FORM_INICIAL: AlumnoFormState = {
  nombre: '',
  apellido: '',
  dni: '',
  rol: 'Alumno',
  estado: 'Activo',
  fecha_nacimiento: '',
  curso: '1',
  division: 'A',
  turno: 'Mañana',
  direccion: '',
  barrio: '',
  localidad: 'Córdoba',
  provincia: 'Córdoba',
  contacto: '',
  promedio_general: '0',
  sanciones: '0',
};

const REGISTROS_POR_PAGINA = 12;

export const AbmAlumnosView: React.FC = () => {
  const [alumnos, setAlumnos] = useState<AlumnoAbmItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('Todos');
  const [filtroDivision, setFiltroDivision] = useState('Todas');
  const [filtroTurno, setFiltroTurno] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [pagina, setPagina] = useState(1);

  // Modal Alta / Modificación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [alumnoEditandoId, setAlumnoEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<AlumnoFormState>(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal Confirmación Baja / Eliminación
  const [confirmarBaja, setConfirmarBaja] = useState<{
    alumno: AlumnoAbmItem;
    modo: 'logica' | 'reactivar' | 'permanente';
  } | null>(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  const cargarAlumnos = useCallback(async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/no-docente/alumnos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlumnos(data);
      } else {
        setMensaje({ tipo: 'error', texto: 'No se pudo obtener la nómina de alumnos.' });
      }
    } catch (err) {
      console.error('Error al cargar alumnos ABM:', err);
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarAlumnos();
  }, [cargarAlumnos]);

  // Filtrado en memoria
  const alumnosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (q) {
        const texto = `${a.nombre} ${a.apellido} ${a.dni} ${a.barrio} ${a.direccion}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      if (filtroCurso !== 'Todos' && String(a.curso) !== filtroCurso) return false;
      if (filtroDivision !== 'Todas' && String(a.division).toUpperCase() !== filtroDivision) return false;
      if (filtroTurno !== 'Todos' && a.turno !== filtroTurno) return false;
      if (filtroEstado !== 'Todos' && a.estado !== filtroEstado) return false;
      return true;
    });
  }, [alumnos, busqueda, filtroCurso, filtroDivision, filtroTurno, filtroEstado]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCurso, filtroDivision, filtroTurno, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / REGISTROS_POR_PAGINA));
  const inicioIdx = (pagina - 1) * REGISTROS_POR_PAGINA;
  const paginaItems = alumnosFiltrados.slice(inicioIdx, inicioIdx + REGISTROS_POR_PAGINA);

  // KPIs
  const totalActivos = alumnos.filter((a) => a.estado === 'Activo').length;
  const totalInactivos = alumnos.filter((a) => a.estado === 'Inactivo').length;
  const promedioInstitucional = useMemo(() => {
    const conNota = alumnos.filter((a) => a.promedio_general > 0);
    if (conNota.length === 0) return '0.00';
    const suma = conNota.reduce((acc, a) => acc + a.promedio_general, 0);
    return (suma / conNota.length).toFixed(2);
  }, [alumnos]);

  // Abrir Modal Alta
  const handleAbrirAlta = () => {
    setModoEdicion(false);
    setAlumnoEditandoId(null);
    setForm(FORM_INICIAL);
    setErrorForm('');
    setModalAbierto(true);
  };

  // Abrir Modal Modificación
  const handleAbrirModificar = (a: AlumnoAbmItem) => {
    setModoEdicion(true);
    setAlumnoEditandoId(a._id);
    setForm({
      nombre: a.nombre || '',
      apellido: a.apellido || '',
      dni: a.dni || '',
      rol: 'Alumno',
      estado: a.estado || 'Activo',
      fecha_nacimiento: a.fecha_nacimiento || '',
      curso: String(a.curso || '1').replace(/[^\d]/g, '') || '1',
      division: String(a.division || 'A').replace(/divisi[oó]n/i, '').trim().toUpperCase() || 'A',
      turno: a.turno || 'Mañana',
      direccion: a.direccion || '',
      barrio: a.barrio || '',
      localidad: a.localidad || 'Córdoba',
      provincia: a.provincia || 'Córdoba',
      contacto: a.contacto || '',
      promedio_general: String(a.promedio_general ?? 0),
      sanciones: String(a.sanciones ?? 0),
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  // Guardar Alta / Modificación
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim()) {
      setErrorForm('Nombre, Apellido y DNI son campos obligatorios.');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const url = modoEdicion && alumnoEditandoId
        ? `/api/no-docente/alumnos/${alumnoEditandoId}`
        : '/api/no-docente/alumnos';
      const method = modoEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          promedio_general: parseFloat(form.promedio_general) || 0,
          sanciones: parseInt(form.sanciones, 10) || 0,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setModalAbierto(false);
        setMensaje({
          tipo: 'exito',
          texto: modoEdicion
            ? `Datos de ${form.apellido}, ${form.nombre} actualizados correctamente.`
            : `Alumno ${form.apellido}, ${form.nombre} (DNI ${form.dni}) dado de alta correctamente.`,
        });
        await cargarAlumnos();
      } else {
        setErrorForm(data.error || 'No se pudo guardar el registro del alumno.');
      }
    } catch {
      setErrorForm('Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  // Ejecutar Baja / Reactivación / Eliminación
  const handleConfirmarAccionBaja = async () => {
    if (!confirmarBaja) return;
    setProcesandoBaja(true);
    try {
      const token = localStorage.getItem('token');
      const { alumno, modo } = confirmarBaja;

      let res: Response;
      if (modo === 'reactivar') {
        res = await fetch(`/api/no-docente/alumnos/${alumno._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: 'Activo' }),
        });
      } else if (modo === 'permanente') {
        res = await fetch(`/api/no-docente/alumnos/${alumno._id}?modo=permanente`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(`/api/no-docente/alumnos/${alumno._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.ok) {
        setMensaje({
          tipo: 'exito',
          texto:
            modo === 'reactivar'
              ? `El alumno ${alumno.apellido}, ${alumno.nombre} fue reactivado.`
              : modo === 'permanente'
              ? `El alumno ${alumno.apellido}, ${alumno.nombre} fue eliminado definitivamente.`
              : `El alumno ${alumno.apellido}, ${alumno.nombre} fue dado de baja (estado Inactivo).`,
        });
        setConfirmarBaja(null);
        await cargarAlumnos();
      } else {
        const err = await res.json().catch(() => ({}));
        setMensaje({ tipo: 'error', texto: err.error || 'No se pudo procesar la operación.' });
        setConfirmarBaja(null);
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
      setConfirmarBaja(null);
    } finally {
      setProcesandoBaja(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6 font-sans">
      {/* Encabezado */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1b2a4a]">ABM de Alumnos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión integral de altas, modificaciones y bajas de la nómina oficial de estudiantes — Instituto José Peña.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAbrirAlta}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Alumno</span>
        </button>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'exito' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensaje(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Alumnos</span>
          <p className="text-2xl font-extrabold text-[#1b2a4a] mt-1">{alumnos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Activos</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalActivos}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-rose-600">Dados de Baja</span>
          <p className="text-2xl font-extrabold text-rose-700 mt-1">{totalInactivos}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-blue-600">Promedio General</span>
          <p className="text-2xl font-extrabold text-blue-800 mt-1">{promedioInstitucional}</p>
        </div>
      </div>

      {/* Filtros y Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50/60">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por DNI, Apellido, Nombre o Barrio..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            />
          </div>

          <select
            value={filtroCurso}
            onChange={(e) => setFiltroCurso(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
          >
            <option value="Todos">Todos los Cursos</option>
            {['1', '2', '3', '4', '5', '6'].map((c) => (
              <option key={c} value={c}>
                {c}° Año
              </option>
            ))}
          </select>

          <select
            value={filtroDivision}
            onChange={(e) => setFiltroDivision(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
          >
            <option value="Todas">Todas las Divisiones</option>
            <option value="A">División A</option>
            <option value="B">División B</option>
          </select>

          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
          >
            <option value="Todos">Todos los Turnos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo (Baja)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-xs">Cargando nómina de alumnos...</div>
          ) : paginaItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se encontraron alumnos con los filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">DNI</th>
                  <th className="py-3 px-3">Apellido y Nombre</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Fecha Nac.</th>
                  <th className="py-3 px-3">Curso / Div.</th>
                  <th className="py-3 px-3">Turno</th>
                  <th className="py-3 px-3">Dirección y Barrio</th>
                  <th className="py-3 px-3">Localidad / Prov.</th>
                  <th className="py-3 px-3">Contacto</th>
                  <th className="py-3 px-3 text-center">Prom. Gral.</th>
                  <th className="py-3 px-3 text-center">Sanciones</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginaItems.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {a.dni}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {a.apellido}, {a.nombre}
                      <span className="block text-[10px] font-normal text-slate-400">{a.rol}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.estado === 'Activo'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {a.estado}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {a.fecha_nacimiento || '-'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {a.curso_label} {a.division ? `(${a.division})` : ''}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {a.turno || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <div className="font-medium text-slate-800 truncate" title={a.direccion}>
                        {a.direccion || '-'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={a.barrio}>
                        {a.barrio || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-600">
                      {a.localidad || '-'}
                      {a.provincia ? `, ${a.provincia}` : ''}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {a.contacto || '-'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                          a.promedio_general >= 7
                            ? 'bg-blue-50 text-blue-800'
                            : a.promedio_general > 0
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {Number(a.promedio_general || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                          a.sanciones > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {a.sanciones || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirModificar(a)}
                          title="Modificar alumno"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] border border-slate-300 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Modificar</span>
                        </button>

                        {a.estado === 'Activo' ? (
                          <button
                            type="button"
                            onClick={() => setConfirmarBaja({ alumno: a, modo: 'logica' })}
                            title="Dar de baja"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] border border-amber-200 cursor-pointer"
                          >
                            <UserX className="w-3 h-3" />
                            <span>Baja</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmarBaja({ alumno: a, modo: 'reactivar' })}
                            title="Reactivar alumno"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] border border-emerald-200 cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Activar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmarBaja({ alumno: a, modo: 'permanente' })}
                          title="Eliminar definitivamente"
                          className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {alumnosFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/40">
            <span>
              Mostrando <strong>{inicioIdx + 1}</strong>–
              <strong>{Math.min(inicioIdx + REGISTROS_POR_PAGINA, alumnosFiltrados.length)}</strong> de{' '}
              <strong>{alumnosFiltrados.length}</strong> alumnos
            </span>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ALTA / MODIFICACIÓN DE ALUMNO (16 CAMPOS DEL ARCHIVO) */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#1b2a4a] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">
                  {modoEdicion ? 'Modificar Datos del Alumno' : 'Alta de Nuevo Alumno'}
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  Complete los campos según el registro institucional de estudiantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 overflow-y-auto space-y-5">
              {errorForm && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Sección 1: Identificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Nombre <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Juan"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Apellido <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    placeholder="Ej: Pérez"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    DNI <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.dni}
                    onChange={(e) => setForm({ ...form, dni: e.target.value })}
                    placeholder="Ej: 48100101"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
              </div>

              {/* Sección 2: Rol, Estado, Fecha de Nacimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Rol
                  </label>
                  <input
                    type="text"
                    value={form.rol}
                    readOnly
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Estado
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({ ...form, estado: e.target.value as 'Activo' | 'Inactivo' })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
              </div>

              {/* Sección 3: Curso, División, Turno */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Curso
                  </label>
                  <select
                    value={form.curso}
                    onChange={(e) => setForm({ ...form, curso: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  >
                    {['1', '2', '3', '4', '5', '6'].map((c) => (
                      <option key={c} value={c}>
                        {c}° Año
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    División
                  </label>
                  <select
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Turno
                  </label>
                  <select
                    value={form.turno}
                    onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                  </select>
                </div>
              </div>

              {/* Sección 4: Domicilio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Ej: Av. Caraffa 2145"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={form.barrio}
                    onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                    placeholder="Ej: Villa Cabrera"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Localidad
                  </label>
                  <input
                    type="text"
                    value={form.localidad}
                    onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                    placeholder="Ej: Córdoba"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={form.provincia}
                    onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                    placeholder="Ej: Córdoba"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
              </div>

              {/* Sección 5: Contacto, Promedio General y Sanciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    placeholder="Ej: 3514112233"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Promedio General
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.promedio_general}
                    onChange={(e) => setForm({ ...form, promedio_general: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Sanciones
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.sanciones}
                    onChange={(e) => setForm({ ...form, sanciones: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-lg bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                    ? 'Guardar Cambios'
                    : 'Registrar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN BAJA / ELIMINACIÓN */}
      {confirmarBaja && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setConfirmarBaja(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-3">
              <h4 className="text-base font-bold text-slate-900">
                {confirmarBaja.modo === 'reactivar'
                  ? 'Reactivar Alumno'
                  : confirmarBaja.modo === 'permanente'
                  ? 'Eliminar Alumno Definitivamente'
                  : 'Confirmar Baja de Alumno'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmarBaja.modo === 'reactivar'
                  ? `¿Desea reactivar al estudiante ${confirmarBaja.alumno.apellido}, ${confirmarBaja.alumno.nombre} (DNI ${confirmarBaja.alumno.dni}) a estado Activo?`
                  : confirmarBaja.modo === 'permanente'
                  ? `¿Confirma eliminar definitivamente del sistema a ${confirmarBaja.alumno.apellido}, ${confirmarBaja.alumno.nombre} (DNI ${confirmarBaja.alumno.dni})? Esta acción no se puede deshacer.`
                  : `¿Confirma dar de baja al estudiante ${confirmarBaja.alumno.apellido}, ${confirmarBaja.alumno.nombre} (DNI ${confirmarBaja.alumno.dni})? Su estado pasará a Inactivo.`}
              </p>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmarBaja(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={procesandoBaja}
                  onClick={handleConfirmarAccionBaja}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-bold cursor-pointer disabled:opacity-60 ${
                    confirmarBaja.modo === 'reactivar'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmarBaja.modo === 'permanente'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {procesandoBaja
                    ? 'Procesando...'
                    : confirmarBaja.modo === 'reactivar'
                    ? 'Confirmar Activación'
                    : confirmarBaja.modo === 'permanente'
                    ? 'Eliminar Definitivamente'
                    : 'Confirmar Baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
