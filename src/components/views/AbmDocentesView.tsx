/**
 * @archivo src/components/views/AbmDocentesView.tsx
 * @descripción Módulo ABM Docente (Alta, Modificación y Baja) para roles No Docente y Directivo.
 * @reglaDeNegocio
 * - No Docente y Directivo pueden Crear ("Crear Docente") y Modificar docentes.
 * - ÚNICAMENTE el rol Directivo (Director) puede inactivar o dar de baja/eliminar un docente.
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
  Lock,
} from 'lucide-react';
import { IUser } from '../../types.js';

interface DocenteAbmItem {
  _id: string;
  legajo: string;
  dni: string;
  apellido: string;
  nombre: string;
  area_materia: string;
  categoria: 'Titular' | 'Suplente';
  fecha_inicio: string;
  fecha_fin: string;
  telefono: string;
  direccion: string;
  ciudad?: string;
  turno: string;
  email: string;
  cargo?: string;
  estado: 'Activo' | 'Inactivo';
  materias_asignadas?: string[];
}

interface DocenteFormState {
  legajo: string;
  dni: string;
  apellido: string;
  nombre: string;
  area_materia: string;
  categoria: 'Titular' | 'Suplente';
  fecha_inicio: string;
  fecha_fin: string;
  telefono: string;
  direccion: string;
  turno: string;
  email: string;
  estado: 'Activo' | 'Inactivo';
}

const hoyIso = () => new Date().toISOString().split('T')[0];

const FORM_INICIAL: DocenteFormState = {
  legajo: '',
  dni: '',
  apellido: '',
  nombre: '',
  area_materia: '',
  categoria: 'Titular',
  fecha_inicio: hoyIso(),
  fecha_fin: '',
  telefono: '',
  direccion: '',
  turno: 'Mañana',
  email: '',
  estado: 'Activo',
};

const REGISTROS_POR_PAGINA = 12;

interface AbmDocentesViewProps {
  usuario: IUser | null;
}

export const AbmDocentesView: React.FC<AbmDocentesViewProps> = ({ usuario }) => {
  const esDirector = usuario?.rol === 'Director';

  const [docentes, setDocentes] = useState<DocenteAbmItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroTurno, setFiltroTurno] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [pagina, setPagina] = useState(1);

  // Modal Alta / Modificación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [docenteEditandoId, setDocenteEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<DocenteFormState>(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal Confirmación Baja / Reactivación / Eliminación (Exclusivo Director)
  const [confirmarBaja, setConfirmarBaja] = useState<{
    docente: DocenteAbmItem;
    modo: 'logica' | 'reactivar' | 'permanente';
  } | null>(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  const cargarDocentes = useCallback(async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/no-docente/docentes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocentes(data);
      } else {
        setMensaje({ tipo: 'error', texto: 'No se pudo obtener la nómina de docentes.' });
      }
    } catch (err) {
      console.error('Error al cargar docentes ABM:', err);
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDocentes();
  }, [cargarDocentes]);

  // Filtrado en memoria
  const docentesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return docentes.filter((d) => {
      if (q) {
        const texto = `${d.legajo} ${d.dni} ${d.apellido} ${d.nombre} ${d.area_materia} ${d.direccion} ${d.telefono}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      if (filtroCategoria !== 'Todas' && d.categoria !== filtroCategoria) return false;
      if (filtroTurno !== 'Todos' && d.turno !== filtroTurno) return false;
      if (filtroEstado !== 'Todos' && d.estado !== filtroEstado) return false;
      return true;
    });
  }, [docentes, busqueda, filtroCategoria, filtroTurno, filtroEstado]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCategoria, filtroTurno, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(docentesFiltrados.length / REGISTROS_POR_PAGINA));
  const inicioIdx = (pagina - 1) * REGISTROS_POR_PAGINA;
  const paginaItems = docentesFiltrados.slice(inicioIdx, inicioIdx + REGISTROS_POR_PAGINA);

  // KPIs
  const totalActivos = docentes.filter((d) => d.estado === 'Activo').length;
  const totalInactivos = docentes.filter((d) => d.estado === 'Inactivo').length;
  const totalTitulares = docentes.filter((d) => d.categoria === 'Titular').length;
  const totalSuplentes = docentes.filter((d) => d.categoria === 'Suplente').length;

  // Sugerir próximo legajo para alta
  const sugerirProximoLegajo = () => {
    const maxNum = docentes.reduce((acc, d) => {
      const m = String(d.legajo || '').match(/DOC-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > acc) return n;
      }
      return acc;
    }, 202630);
    return `DOC-${maxNum + 1}`;
  };

  // Abrir Modal Alta
  const handleAbrirAlta = () => {
    setModoEdicion(false);
    setDocenteEditandoId(null);
    setForm({
      ...FORM_INICIAL,
      legajo: sugerirProximoLegajo(),
      fecha_inicio: hoyIso(),
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  // Abrir Modal Modificación
  const handleAbrirModificar = (d: DocenteAbmItem) => {
    setModoEdicion(true);
    setDocenteEditandoId(d._id);
    setForm({
      legajo: d.legajo || '',
      dni: d.dni || '',
      apellido: d.apellido || '',
      nombre: d.nombre || '',
      area_materia: d.area_materia || '',
      categoria: d.categoria || 'Titular',
      fecha_inicio: d.fecha_inicio || '',
      fecha_fin: d.fecha_fin || '',
      telefono: d.telefono || '',
      direccion: d.direccion || '',
      turno: d.turno || 'Mañana',
      email: d.email || '',
      estado: d.estado || 'Activo',
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  // Guardar Alta / Modificación
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    const dniLimpio = form.dni.replace(/\D/g, '').trim();
    if (!form.apellido.trim() || !form.nombre.trim() || !dniLimpio) {
      setErrorForm('Apellido, Nombre y DNI son obligatorios.');
      return;
    }
    if (dniLimpio.length < 7) {
      setErrorForm('Ingrese un DNI numérico válido (mínimo 7 dígitos).');
      return;
    }
    if (!form.area_materia.trim()) {
      setErrorForm('El campo Área / Materia es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const url = modoEdicion && docenteEditandoId
        ? `/api/no-docente/docentes/${docenteEditandoId}`
        : '/api/no-docente/docentes';
      const method = modoEdicion ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        legajo: form.legajo.trim(),
        dni: dniLimpio,
        apellido: form.apellido.trim(),
        nombre: form.nombre.trim(),
        area_materia: form.area_materia.trim(),
        categoria: form.categoria,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        turno: form.turno,
        email: form.email.trim(),
      };

      // Solo el rol Directivo envía/cambia estado
      if (esDirector) {
        payload.estado = form.estado;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorForm(data.error || 'No se pudo guardar el docente.');
        return;
      }

      setModalAbierto(false);
      setMensaje({
        tipo: 'exito',
        texto: modoEdicion
          ? `Datos del docente ${data.apellido}, ${data.nombre} actualizados correctamente.`
          : `Docente ${data.apellido}, ${data.nombre} (${data.legajo}) creado y guardado en la base de datos.`,
      });
      await cargarDocentes();
    } catch (err) {
      console.error('Error guardando docente:', err);
      setErrorForm('Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  // Ejecutar Baja / Reactivación / Eliminación (Exclusivo Director)
  const handleConfirmarBaja = async () => {
    if (!confirmarBaja || !esDirector) return;
    setProcesandoBaja(true);
    try {
      const token = localStorage.getItem('token');
      const { docente, modo } = confirmarBaja;
      let res: Response;

      if (modo === 'reactivar') {
        res = await fetch(`/api/no-docente/docentes/${docente._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: 'Activo' }),
        });
      } else {
        const query = modo === 'permanente' ? '?modo=permanente' : '';
        res = await fetch(`/api/no-docente/docentes/${docente._id}${query}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = await res.json();
      if (res.ok) {
        setMensaje({
          tipo: 'exito',
          texto:
            modo === 'reactivar'
              ? `El docente ${docente.apellido}, ${docente.nombre} fue reactivado.`
              : modo === 'permanente'
              ? `El docente ${docente.apellido}, ${docente.nombre} fue eliminado definitivamente.`
              : `El docente ${docente.apellido}, ${docente.nombre} fue dado de baja (Inactivo).`,
        });
        setConfirmarBaja(null);
        await cargarDocentes();
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo procesar la acción.' });
        setConfirmarBaja(null);
      }
    } catch (err) {
      console.error('Error procesando baja docente:', err);
      setMensaje({ tipo: 'error', texto: 'Error de conexión al procesar la baja.' });
    } finally {
      setProcesandoBaja(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1b2a4a]">ABM Docente</h2>
          <p className="text-xs text-slate-500 mt-1">
            Nómina oficial de profesores del Instituto José Peña.{' '}
            {esDirector
              ? 'Como Directivo puede crear, modificar e inactivar o dar de baja docentes.'
              : 'Puede crear y modificar registros docentes. La inactivación o baja corresponde exclusivamente al Directivo.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirAlta}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b2a4a] hover:bg-[#243761] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Crear Docente
        </button>
      </div>

      {/* Mensaje de feedback */}
      {mensaje && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
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
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Docentes
          </div>
          <div className="text-2xl font-bold text-[#1b2a4a] mt-1">{docentes.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Activos
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalActivos}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Titulares / Suplentes
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totalTitulares} <span className="text-sm font-medium text-slate-400">/ {totalSuplentes}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Inactivos / Baja
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{totalInactivos}</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por legajo, DNI, apellido, nombre, materia o dirección..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="Todas">Categoría: Todas</option>
            <option value="Titular">Titular</option>
            <option value="Suplente">Suplente</option>
          </select>

          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="Todos">Turno: Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla de Docentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Mostrando {docentesFiltrados.length} de {docentes.length} docentes registrados
          </span>
          {!esDirector && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
              <Lock className="w-3 h-3" />
              Baja / Inactivación reservada al Directivo
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3 whitespace-nowrap">Legajo</th>
                <th className="py-3 px-3 whitespace-nowrap">DNI</th>
                <th className="py-3 px-3 whitespace-nowrap">Apellido y Nombre</th>
                <th className="py-3 px-3 whitespace-nowrap">Área / Materia</th>
                <th className="py-3 px-3 whitespace-nowrap">Categoría</th>
                <th className="py-3 px-3 whitespace-nowrap">Inicio</th>
                <th className="py-3 px-3 whitespace-nowrap">Fin</th>
                <th className="py-3 px-3 whitespace-nowrap">Teléfono</th>
                <th className="py-3 px-3 whitespace-nowrap">Dirección (Córdoba)</th>
                <th className="py-3 px-3 whitespace-nowrap">Turno</th>
                <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {cargando ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Cargando nómina de docentes...
                  </td>
                </tr>
              ) : paginaItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No se encontraron docentes con los criterios ingresados.
                  </td>
                </tr>
              ) : (
                paginaItems.map((d) => (
                  <tr
                    key={d._id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      d.estado === 'Inactivo' ? 'bg-slate-50/70 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-[#1b2a4a] whitespace-nowrap">
                      {d.legajo}
                    </td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">{d.dni}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {d.apellido}, {d.nombre}
                      </div>
                      {d.materias_asignadas && d.materias_asignadas.length > 0 && (
                        <div className="text-[10px] text-blue-600 mt-0.5 truncate max-w-[200px]" title={d.materias_asignadas.join(' • ')}>
                          Cátedras: {d.materias_asignadas.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                      {d.area_materia || '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          d.categoria === 'Titular'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {d.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                      {d.fecha_inicio || '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                      {d.fecha_fin || '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{d.telefono || '—'}</td>
                    <td className="py-3 px-3 min-w-[180px]">{d.direccion || '—'}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {d.turno}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          d.estado === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {d.estado}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirModificar(d)}
                          title="Modificar docente"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {esDirector && (
                          <>
                            {d.estado === 'Activo' ? (
                              <button
                                type="button"
                                onClick={() => setConfirmarBaja({ docente: d, modo: 'logica' })}
                                title="Inactivar / Dar de baja docente"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarBaja({ docente: d, modo: 'reactivar' })}
                                  title="Reactivar docente"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarBaja({ docente: d, modo: 'permanente' })}
                                  title="Eliminar definitivamente"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina === 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <button
                type="button"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Alta / Modificación */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-[#1b2a4a] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {modoEdicion ? 'Modificar Docente' : 'Crear Docente'}
                </h3>
                <p className="text-[11px] text-white/75 mt-0.5">
                  Campos oficiales de la nómina docente del Instituto José Peña.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              {errorForm && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Legajo
                  </label>
                  <input
                    type="text"
                    value={form.legajo}
                    onChange={(e) => setForm({ ...form, legajo: e.target.value })}
                    placeholder="Ej: DOC-202631"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    DNI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.dni}
                    onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })}
                    placeholder="Ej: 28451920"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    placeholder="Ej: Rodríguez"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: María Laura"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Área / Materia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.area_materia}
                    onChange={(e) => setForm({ ...form, area_materia: e.target.value })}
                    placeholder="Ej: Matemática, Lengua y Literatura, Historia..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        categoria: e.target.value as 'Titular' | 'Suplente',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Titular">Titular</option>
                    <option value="Suplente">Suplente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inicio
                  </label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fin
                  </label>
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="text-[10px] text-slate-400">
                    {form.categoria === 'Titular' ? 'Vacío para cargo Titular' : 'Fecha de finalización de suplencia'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej: 351-155-412890"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección (Córdoba)
                  </label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Ej: Av. Colón 1420, Alberdi"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Turno
                  </label>
                  <select
                    value={form.turno}
                    onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email institucional
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Se genera automáticamente si se omite"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado
                  </label>
                  {esDirector ? (
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value as 'Activo' | 'Inactivo' })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        disabled
                        value={form.estado}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-amber-700 block mt-0.5">
                        Solo el Directivo puede inactivar o dar de baja.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!modoEdicion && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
                  El docente quedará habilitado para iniciar sesión con su <strong>DNI</strong> y contraseña inicial{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">Docente123!</code>, y se vinculará automáticamente con Reportes, Control de Asistencias y Materias.
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#1b2a4a] hover:bg-[#243761] rounded-lg shadow-xs disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                    ? 'Guardar Cambios'
                    : 'Crear Docente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Baja / Reactivación / Eliminación (Exclusivo Director) */}
      {confirmarBaja && esDirector && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {confirmarBaja.modo === 'reactivar'
                ? 'Reactivar Docente'
                : confirmarBaja.modo === 'permanente'
                ? 'Eliminar Docente Definitivamente'
                : 'Dar de Baja / Inactivar Docente'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirmarBaja.modo === 'reactivar' ? (
                <>
                  ¿Confirma reactivar al docente{' '}
                  <strong>
                    {confirmarBaja.docente.apellido}, {confirmarBaja.docente.nombre}
                  </strong>{' '}
                  (Legajo {confirmarBaja.docente.legajo})?
                </>
              ) : confirmarBaja.modo === 'permanente' ? (
                <>
                  ¿Está seguro de eliminar permanentemente del sistema a{' '}
                  <strong>
                    {confirmarBaja.docente.apellido}, {confirmarBaja.docente.nombre}
                  </strong>{' '}
                  (DNI {confirmarBaja.docente.dni})? Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  ¿Confirma dar de baja (cambiar estado a <strong>Inactivo</strong>) al docente{' '}
                  <strong>
                    {confirmarBaja.docente.apellido}, {confirmarBaja.docente.nombre}
                  </strong>{' '}
                  (Legajo {confirmarBaja.docente.legajo})?
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarBaja(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoBaja}
                onClick={handleConfirmarBaja}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60 ${
                  confirmarBaja.modo === 'reactivar'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {procesandoBaja
                  ? 'Procesando...'
                  : confirmarBaja.modo === 'reactivar'
                  ? 'Sí, Reactivar'
                  : confirmarBaja.modo === 'permanente'
                  ? 'Eliminar Definitivamente'
                  : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
