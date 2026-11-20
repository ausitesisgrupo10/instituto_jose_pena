/**
 * @archivo src/components/views/AbmNoDocentesView.tsx
 * @descripción Módulo ABM No Docente (Alta, Modificación y Baja) para roles No Docente y Directivo.
 * @reglaDeNegocio
 * - No Docente y Directivo pueden Crear ("Crear No Docente") y Modificar agentes No Docentes.
 * - ÚNICAMENTE el rol Directivo (Director) puede inactivar o dar de baja/eliminar un No Docente.
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

interface NoDocenteAbmItem {
  _id: string;
  numero: number;
  area_usuario: string;
  cargo_sector: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  estado: 'Activo' | 'Inactivo';
  turno: string;
  legajo?: string;
}

interface NoDocenteFormState {
  numero: string;
  area_usuario: string;
  cargo_sector: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  estado: 'Activo' | 'Inactivo';
  turno: string;
}

const FORM_INICIAL: NoDocenteFormState = {
  numero: '',
  area_usuario: 'Preceptoría',
  cargo_sector: 'Preceptor/a',
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
  estado: 'Activo',
  turno: 'Mañana',
};

const CARGOS_SECTOR_SUGERIDOS = [
  'Jefe/a de preceptores',
  'Preceptor/a',
  'Secretaria - Inicial',
  'Secretaria - Primaria',
  'Secretaria - Secundaria',
  'Prosecretaria',
  'Administración General',
  'Coordinación Directiva',
];

const REGISTROS_POR_PAGINA = 12;

interface AbmNoDocentesViewProps {
  usuario: IUser | null;
}

export const AbmNoDocentesView: React.FC<AbmNoDocentesViewProps> = ({ usuario }) => {
  const esDirector = usuario?.rol === 'Director';

  const [noDocentes, setNoDocentes] = useState<NoDocenteAbmItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('Todas');
  const [filtroTurno, setFiltroTurno] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [pagina, setPagina] = useState(1);

  // Modal Alta / Modificación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<NoDocenteFormState>(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal Confirmación Baja / Reactivación / Eliminación (Exclusivo Director)
  const [confirmarBaja, setConfirmarBaja] = useState<{
    agente: NoDocenteAbmItem;
    modo: 'logica' | 'reactivar' | 'permanente';
  } | null>(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  const cargarNoDocentes = useCallback(async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/no-docente/no-docentes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNoDocentes(data);
      } else {
        setMensaje({ tipo: 'error', texto: 'No se pudo obtener la nómina de personal No Docente.' });
      }
    } catch (err) {
      console.error('Error al cargar No Docentes ABM:', err);
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarNoDocentes();
  }, [cargarNoDocentes]);

  const areasDisponibles = useMemo(() => {
    const base = new Set(['Preceptoría', 'Secretaría', 'Directivo']);
    noDocentes.forEach((nd) => {
      if (nd.area_usuario) base.add(nd.area_usuario);
    });
    return Array.from(base);
  }, [noDocentes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return noDocentes.filter((nd) => {
      if (q) {
        const texto = `${nd.numero} ${nd.area_usuario} ${nd.cargo_sector} ${nd.nombre} ${nd.apellido} ${nd.dni} ${nd.telefono} ${nd.email}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      if (filtroArea !== 'Todas' && nd.area_usuario !== filtroArea) return false;
      if (filtroTurno !== 'Todos' && nd.turno !== filtroTurno) return false;
      if (filtroEstado !== 'Todos' && nd.estado !== filtroEstado) return false;
      return true;
    });
  }, [noDocentes, busqueda, filtroArea, filtroTurno, filtroEstado]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroArea, filtroTurno, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / REGISTROS_POR_PAGINA));
  const inicioIdx = (pagina - 1) * REGISTROS_POR_PAGINA;
  const paginaItems = filtrados.slice(inicioIdx, inicioIdx + REGISTROS_POR_PAGINA);

  // KPIs
  const totalActivos = noDocentes.filter((nd) => nd.estado === 'Activo').length;
  const totalInactivos = noDocentes.filter((nd) => nd.estado === 'Inactivo').length;
  const totalPreceptoria = noDocentes.filter((nd) => nd.area_usuario === 'Preceptoría').length;
  const totalSecretaria = noDocentes.filter((nd) => nd.area_usuario === 'Secretaría').length;

  const sugerirProximoNumero = () => {
    const maxNum = noDocentes.reduce((acc, nd) => (nd.numero > acc ? nd.numero : acc), 0);
    return String(maxNum + 1);
  };

  // Abrir Modal Alta
  const handleAbrirAlta = () => {
    setModoEdicion(false);
    setEditandoId(null);
    setForm({
      ...FORM_INICIAL,
      numero: sugerirProximoNumero(),
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  // Abrir Modal Modificación
  const handleAbrirModificar = (nd: NoDocenteAbmItem) => {
    setModoEdicion(true);
    setEditandoId(nd._id);
    setForm({
      numero: String(nd.numero || ''),
      area_usuario: nd.area_usuario || 'Secretaría',
      cargo_sector: nd.cargo_sector || '',
      nombre: nd.nombre || '',
      apellido: nd.apellido || '',
      dni: nd.dni || '',
      telefono: nd.telefono || '',
      email: nd.email || '',
      estado: nd.estado || 'Activo',
      turno: nd.turno || 'Mañana',
    });
    setErrorForm('');
    setModalAbierto(true);
  };

  // Guardar Alta / Modificación
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    const dniLimpio = form.dni.replace(/\D/g, '').trim();
    if (!form.nombre.trim() || !form.apellido.trim() || !dniLimpio) {
      setErrorForm('Nombre, Apellido y DNI son obligatorios.');
      return;
    }
    if (dniLimpio.length < 7) {
      setErrorForm('Ingrese un DNI numérico válido (mínimo 7 dígitos).');
      return;
    }
    if (!form.area_usuario.trim() || !form.cargo_sector.trim()) {
      setErrorForm('Área / Usuario y Cargo / Sector son obligatorios.');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const url =
        modoEdicion && editandoId
          ? `/api/no-docente/no-docentes/${editandoId}`
          : '/api/no-docente/no-docentes';
      const method = modoEdicion ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        numero: form.numero.trim(),
        area_usuario: form.area_usuario.trim(),
        cargo_sector: form.cargo_sector.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: dniLimpio,
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        turno: form.turno,
      };

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
        setErrorForm(data.error || 'No se pudo guardar el registro.');
        return;
      }

      setModalAbierto(false);
      setMensaje({
        tipo: 'exito',
        texto: modoEdicion
          ? `Datos de ${data.nombre} ${data.apellido} actualizados correctamente.`
          : `Agente No Docente ${data.nombre} ${data.apellido} (N° ${data.numero}) creado y guardado en la base de datos.`,
      });
      await cargarNoDocentes();
    } catch (err) {
      console.error('Error guardando No Docente:', err);
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
      const { agente, modo } = confirmarBaja;
      let res: Response;

      if (modo === 'reactivar') {
        res = await fetch(`/api/no-docente/no-docentes/${agente._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: 'Activo' }),
        });
      } else {
        const query = modo === 'permanente' ? '?modo=permanente' : '';
        res = await fetch(`/api/no-docente/no-docentes/${agente._id}${query}`, {
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
              ? `El agente ${agente.nombre} ${agente.apellido} fue reactivado.`
              : modo === 'permanente'
              ? `El agente ${agente.nombre} ${agente.apellido} fue eliminado definitivamente.`
              : `El agente ${agente.nombre} ${agente.apellido} fue dado de baja (Inactivo).`,
        });
        setConfirmarBaja(null);
        await cargarNoDocentes();
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo procesar la acción.' });
        setConfirmarBaja(null);
      }
    } catch (err) {
      console.error('Error procesando baja No Docente:', err);
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
          <h2 className="text-xl font-bold text-[#1b2a4a]">ABM No Docente</h2>
          <p className="text-xs text-slate-500 mt-1">
            Base de datos del personal No Docente (Preceptoría y Secretaría) del Instituto José Peña.{' '}
            {esDirector
              ? 'Como Directivo puede crear, modificar e inactivar o dar de baja agentes.'
              : 'Puede crear y modificar registros. La inactivación o baja corresponde exclusivamente al Directivo.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirAlta}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b2a4a] hover:bg-[#243761] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Crear No Docente
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
            Total Personal No Docente
          </div>
          <div className="text-2xl font-bold text-[#1b2a4a] mt-1">{noDocentes.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Activos
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalActivos}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Preceptoría / Secretaría
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totalPreceptoria} <span className="text-sm font-medium text-slate-400">/ {totalSecretaria}</span>
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
              placeholder="Buscar por N°, área, cargo/sector, nombre, apellido, DNI o correo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
            />
          </div>

          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="Todas">Área / Usuario: Todas</option>
            {areasDisponibles.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
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

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Mostrando {filtrados.length} de {noDocentes.length} agentes No Docentes registrados
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
                <th className="py-3 px-3 whitespace-nowrap">N°</th>
                <th className="py-3 px-3 whitespace-nowrap">Área / Usuario</th>
                <th className="py-3 px-3 whitespace-nowrap">Cargo / Sector</th>
                <th className="py-3 px-3 whitespace-nowrap">Nombre</th>
                <th className="py-3 px-3 whitespace-nowrap">Apellido</th>
                <th className="py-3 px-3 whitespace-nowrap">DNI</th>
                <th className="py-3 px-3 whitespace-nowrap">Teléfono</th>
                <th className="py-3 px-3 whitespace-nowrap">Correo electrónico</th>
                <th className="py-3 px-3 whitespace-nowrap">Estado</th>
                <th className="py-3 px-3 whitespace-nowrap">Turno</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {cargando ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Cargando nómina de personal No Docente...
                  </td>
                </tr>
              ) : paginaItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No se encontraron registros con los criterios ingresados.
                  </td>
                </tr>
              ) : (
                paginaItems.map((nd) => (
                  <tr
                    key={nd._id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      nd.estado === 'Inactivo' ? 'bg-slate-50/70 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-[#1b2a4a] whitespace-nowrap">
                      {nd.numero}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          nd.area_usuario === 'Preceptoría'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : nd.area_usuario === 'Secretaría'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {nd.area_usuario}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                      {nd.cargo_sector}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-900">
                      {nd.nombre}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-900">
                      {nd.apellido}
                    </td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">{nd.dni}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{nd.telefono || '—'}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">{nd.email || '—'}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          nd.estado === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {nd.estado}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {nd.turno}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirModificar(nd)}
                          title="Modificar No Docente"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {esDirector && (
                          <>
                            {nd.estado === 'Activo' ? (
                              <button
                                type="button"
                                onClick={() => setConfirmarBaja({ agente: nd, modo: 'logica' })}
                                title="Inactivar / Dar de baja No Docente"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarBaja({ agente: nd, modo: 'reactivar' })}
                                  title="Reactivar No Docente"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarBaja({ agente: nd, modo: 'permanente' })}
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
                  {modoEdicion ? 'Modificar No Docente' : 'Crear No Docente'}
                </h3>
                <p className="text-[11px] text-white/75 mt-0.5">
                  Campos oficiales de la nómina de personal No Docente del Instituto José Peña.
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
                    N°
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    placeholder="Ej: 31"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Área / Usuario <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.area_usuario}
                    onChange={(e) => setForm({ ...form, area_usuario: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Preceptoría">Preceptoría</option>
                    <option value="Secretaría">Secretaría</option>
                    <option value="Directivo">Directivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo / Sector <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="cargos-sector-list"
                    value={form.cargo_sector}
                    onChange={(e) => setForm({ ...form, cargo_sector: e.target.value })}
                    placeholder="Ej: Preceptor/a, Prosecretaria..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <datalist id="cargos-sector-list">
                    {CARGOS_SECTOR_SUGERIDOS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
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
                    placeholder="Ej: Lucía"
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
                    placeholder="Ej: Gómez"
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
                    placeholder="Ej: 90000031"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej: 351-555-1030"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ej: nombre.apellido@example.com (se genera si se omite)"
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
              </div>

              {!modoEdicion && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
                  El usuario No Docente quedará habilitado con su <strong>DNI</strong> y contraseña inicial{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">NoDoc123!</code>, y se vinculará automáticamente con Reportes, Control de Asistencias y Legajos.
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
                    : 'Crear No Docente'}
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
                ? 'Reactivar Agente No Docente'
                : confirmarBaja.modo === 'permanente'
                ? 'Eliminar No Docente Definitivamente'
                : 'Dar de Baja / Inactivar No Docente'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirmarBaja.modo === 'reactivar' ? (
                <>
                  ¿Confirma reactivar a{' '}
                  <strong>
                    {confirmarBaja.agente.nombre} {confirmarBaja.agente.apellido}
                  </strong>{' '}
                  (N° {confirmarBaja.agente.numero})?
                </>
              ) : confirmarBaja.modo === 'permanente' ? (
                <>
                  ¿Está seguro de eliminar permanentemente del sistema a{' '}
                  <strong>
                    {confirmarBaja.agente.nombre} {confirmarBaja.agente.apellido}
                  </strong>{' '}
                  (DNI {confirmarBaja.agente.dni})? Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  ¿Confirma dar de baja (cambiar estado a <strong>Inactivo</strong>) a{' '}
                  <strong>
                    {confirmarBaja.agente.nombre} {confirmarBaja.agente.apellido}
                  </strong>{' '}
                  (N° {confirmarBaja.agente.numero})?
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
