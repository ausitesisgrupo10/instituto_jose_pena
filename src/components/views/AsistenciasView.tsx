/**
 * @archivo src/components/views/AsistenciasView.tsx
 * @descripción Vista para el Control de Asistencias Diarias (Alumnos y Docentes) para el rol No Docente.
 * @reglaDeNegocio Incluye selector por calendario, marcación rápida (Presente en verde #d1e7dd / #0f5132, Ausente en rojo #f8d7da / #842029) y edición de comentarios.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Download, AlertCircle } from 'lucide-react';
import { IAsistencia, IUser } from '../../types.js';
import { Modal } from '../Modal.js';
import { DIRECTOR_NOTIF_EVENT, SolicitudInasistenciaItem } from '../DirectorNotificacionesBell.js';

interface AsistenciasViewProps {
  usuario?: IUser | null;
}

export const AsistenciasView: React.FC<AsistenciasViewProps> = ({ usuario }) => {
  const esDirector = usuario?.rol === 'Director';

  const [asistencias, setAsistencias] = useState<IAsistencia[]>([]);
  const [personas, setPersonas] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Solicitudes pendientes de Docentes y No Docentes (visible para Director)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudInasistenciaItem[]>([]);
  const [desaprobandoId, setDesaprobandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorResolucion, setErrorResolucion] = useState('');
  const [procesandoSolicitudId, setProcesandoSolicitudId] = useState<string | null>(null);

  // Filtros
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filtroTipoPersona, setFiltroTipoPersona] = useState<string>('todos');

  // Estado de Modal (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [asistenciaEditandoId, setAsistenciaEditandoId] = useState<string | null>(null);

  // Campos de formulario
  const [personaIdModal, setPersonaIdModal] = useState('');
  const [tipoPersonaModal, setTipoPersonaModal] = useState<'Alumno' | 'Docente' | 'No Docente'>('Alumno');
  const [estadoModal, setEstadoModal] = useState<'Presente' | 'Ausente'>('Presente');
  const [comentarioModal, setComentarioModal] = useState('');
  const [fechaModal, setFechaModal] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);

  const fetchAsistencias = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let url = `/api/no-docente/asistencias?fecha=${fechaSeleccionada}`;
      if (filtroTipoPersona !== 'todos') {
        url += `&tipo_persona=${filtroTipoPersona}`;
      }

      const [resAsist, resUsers] = await Promise.all([
        fetch(url, { headers }),
        fetch('/api/no-docente/personas', { headers }),
      ]);

      if (resAsist.ok) {
        const data = await resAsist.json();
        setAsistencias(data);
      }

      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setPersonas(dataUsers);
      }
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
    } finally {
      setCargando(false);
    }
  };

  const cargarSolicitudesPendientes = useCallback(async () => {
    if (!esDirector) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/director/notificaciones-inasistencias', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSolicitudesPendientes(data.pendientes || []);
      }
    } catch (err) {
      console.error('Error al cargar solicitudes pendientes:', err);
    }
  }, [esDirector]);

  useEffect(() => {
    fetchAsistencias();
  }, [fechaSeleccionada, filtroTipoPersona]);

  useEffect(() => {
    if (!esDirector) return;
    cargarSolicitudesPendientes();
    const onUpdated = () => {
      cargarSolicitudesPendientes();
      fetchAsistencias();
    };
    window.addEventListener(DIRECTOR_NOTIF_EVENT, onUpdated);
    return () => window.removeEventListener(DIRECTOR_NOTIF_EVENT, onUpdated);
  }, [esDirector, cargarSolicitudesPendientes]);

  const handleResolverSolicitud = async (
    id: string,
    accion: 'aprobar' | 'desaprobar',
    motivo?: string
  ) => {
    setErrorResolucion('');
    if (accion === 'desaprobar' && (!motivo || motivo.trim() === '')) {
      setErrorResolucion('Debe indicar el motivo de desaprobación.');
      return;
    }

    setProcesandoSolicitudId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/director/solicitudes-inasistencia/${id}/resolver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion,
          motivo_rechazo: accion === 'desaprobar' ? motivo?.trim() : '',
        }),
      });

      if (res.ok) {
        setDesaprobandoId(null);
        setMotivoRechazo('');
        await cargarSolicitudesPendientes();
        await fetchAsistencias();
        window.dispatchEvent(new Event(DIRECTOR_NOTIF_EVENT));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorResolucion(err.error || 'No se pudo procesar la solicitud.');
      }
    } catch {
      setErrorResolucion('Error de conexión con el servidor.');
    } finally {
      setProcesandoSolicitudId(null);
    }
  };

  const descargarConstanciaSolicitud = (item: SolicitudInasistenciaItem) => {
    if (!item.adjunto_data) return;
    const link = document.createElement('a');
    link.href = item.adjunto_data;
    link.download = item.adjunto_nombre || `constancia_${item.fecha}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cambiar rápido de fecha
  const handleFechaRelativa = (dias: number) => {
    const d = new Date(fechaSeleccionada + 'T12:00:00Z');
    d.setDate(d.getDate() + dias);
    setFechaSeleccionada(d.toISOString().split('T')[0]);
  };

  // Abrir Modal Crear
  const handleOpenCrear = () => {
    setModoEdicion(false);
    setAsistenciaEditandoId(null);

    const primeraPersona = personas.find((p) => p.rol === tipoPersonaModal) || personas[0];
    setPersonaIdModal(primeraPersona?._id || '');
    setEstadoModal('Presente');
    setComentarioModal('');
    setFechaModal(fechaSeleccionada);

    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEditar = (asist: IAsistencia) => {
    const pObj = typeof asist.persona_id === 'object' ? asist.persona_id : null;

    setModoEdicion(true);
    setAsistenciaEditandoId(asist._id);
    setPersonaIdModal(pObj?._id || String(asist.persona_id));
    setTipoPersonaModal(asist.tipo_persona);
    setEstadoModal(asist.estado);
    setComentarioModal(asist.comentario || '');
    setFechaModal(
      asist.fecha
        ? new Date(asist.fecha).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );

    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaIdModal) {
      alert('Seleccione la persona a registrar.');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const payload = {
        persona_id: personaIdModal,
        tipo_persona: tipoPersonaModal,
        fecha: fechaModal,
        estado: estadoModal,
        comentario: comentarioModal,
      };

      let res: Response;
      if (modoEdicion && asistenciaEditandoId) {
        res = await fetch(`/api/no-docente/asistencias/${asistenciaEditandoId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/no-docente/asistencias', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchAsistencias();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al procesar la asistencia.');
      }
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
      alert('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar asistencia
  const handleEliminar = async (id: string) => {
    if (!confirm('¿Confirma eliminar este registro de asistencia?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/no-docente/asistencias/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchAsistencias();
    } catch (err) {
      console.error('Error al eliminar asistencia:', err);
    }
  };

  // Filtrar personas según tipo seleccionado en modal
  const personasModalFiltradas = personas.filter((p) => p.rol === tipoPersonaModal);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Aviso de Solicitudes de Inasistencia Pendientes para el Director */}
      {esDirector && solicitudesPendientes.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Solicitudes de Inasistencia Pendientes ({solicitudesPendientes.length})
                </h3>
                <p className="text-xs text-slate-600">
                  Notificaciones enviadas por Docentes y Personal No Docente pendientes de aprobación directiva.
                </p>
              </div>
            </div>
          </div>

          {errorResolucion && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorResolucion}</span>
            </div>
          )}

          <div className="space-y-3">
            {solicitudesPendientes.map((sol) => {
              const estaDesaprobando = desaprobandoId === sol.id;
              const procesando = procesandoSolicitudId === sol.id;

              return (
                <div
                  key={sol.id}
                  className="bg-white rounded-xl border border-amber-200/80 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {sol.solicitante.apellido}, {sol.solicitante.nombre}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            sol.solicitante.rol === 'No Docente'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {sol.solicitante.rol}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-semibold text-slate-800">Fecha:</span> {sol.fecha} ·{' '}
                        <span className="font-semibold text-slate-800">Motivo:</span> {sol.motivo}
                        {sol.observacion ? ` — ${sol.observacion}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {sol.adjunto_data && (
                        <button
                          type="button"
                          onClick={() => descargarConstanciaSolicitud(sol)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                        >
                          {sol.adjunto_tipo === 'application/pdf' ? (
                            <FileText className="w-3.5 h-3.5" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                          )}
                          <span>Constancia</span>
                          <Download className="w-3 h-3" />
                        </button>
                      )}

                      {!estaDesaprobando && (
                        <>
                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => {
                              setDesaprobandoId(sol.id);
                              setMotivoRechazo('');
                              setErrorResolucion('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer disabled:opacity-60"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Desaprobar
                          </button>
                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => handleResolverSolicitud(sol.id, 'aprobar')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {procesando ? 'Procesando...' : 'Aprobar'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {estaDesaprobando && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
                      <label className="block text-xs font-bold text-rose-900">
                        Indique el motivo de desaprobación <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={motivoRechazo}
                        onChange={(e) => setMotivoRechazo(e.target.value)}
                        placeholder="Indique el motivo por el cual se desaprueba esta solicitud..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDesaprobandoId(null);
                            setMotivoRechazo('');
                            setErrorResolucion('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => handleResolverSolicitud(sol.id, 'desaprobar', motivoRechazo)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                        >
                          {procesando ? 'Guardando...' : 'Confirmar Desaprobación'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabecera con Componente de Calendario y Filtros */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Selector de Calendario */}
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold uppercase text-slate-500 pl-2">Fecha:</span>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 font-semibold"
            />
            <div className="inline-flex space-x-1">
              <button
                onClick={() => handleFechaRelativa(-1)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                &larr; Ayer
              </button>
              <button
                onClick={() => setFechaSeleccionada(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1.5 bg-[#1b2a4a] text-white text-xs font-bold rounded-md transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                onClick={() => handleFechaRelativa(1)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                Mañana &rarr;
              </button>
            </div>
          </div>

          {/* Filtro por Categoría y Botón Nuevo Registro */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={filtroTipoPersona}
              onChange={(e) => setFiltroTipoPersona(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            >
              <option value="todos">Visualizar asistencia</option>
              <option value="Alumno">Estudiantes</option>
              <option value="No Docente">No docentes</option>
              <option value="Docente">Docentes</option>
            </select>

            <button
              onClick={handleOpenCrear}
              className="px-5 py-2.5 bg-[#1d3557] hover:bg-[#152741] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              + Registrar Asistencia
            </button>
          </div>
        </div>

        {/* Tabla de Asistencias con Badges Exactos */}
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando control de asistencias...</div>
          ) : asistencias.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No se registraron asistencias ni ausencias para la fecha seleccionada ({fechaSeleccionada}).
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3.5 px-4">FECHA</th>
                  <th className="py-3.5 px-4">PERSONA</th>
                  <th className="py-3.5 px-4">ROL</th>
                  <th className="py-3.5 px-4">ESTADO</th>
                  <th className="py-3.5 px-4">COMENTARIO / OBSERVACIÓN</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {asistencias.map((a) => {
                  const pObj = typeof a.persona_id === 'object' ? a.persona_id : null;
                  const esPresente = a.estado === 'Presente';

                  return (
                    <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        {a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {pObj ? `${pObj.apellido}, ${pObj.nombre}` : 'Persona N/A'}
                        {pObj?.dni && <span className="block text-xs font-normal text-slate-400">DNI: {pObj.dni}</span>}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-600">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                          {a.tipo_persona || pObj?.rol || 'Alumno'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {/* Badges Fieles a la Guía Visual */}
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                            esPresente
                              ? 'bg-[#d1e7dd] text-[#0f5132] border-[#badbcc]'
                              : 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mr-1.5 ${
                              esPresente ? 'bg-[#0f5132]' : 'bg-[#842029]'
                            }`}
                          />
                          {a.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {a.comentario || <span className="italic text-slate-400">Sin observaciones</span>}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditar(a)}
                            className="px-3 py-1 bg-[#e9ecef] hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md transition-colors cursor-pointer border border-slate-300"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(a._id)}
                            className="px-3 py-1 bg-[#dc3545] hover:bg-red-700 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Registrar / Editar Asistencia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modoEdicion ? 'Modificar Registro de Asistencia' : 'Nuevo Registro de Asistencia'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Categoría de Persona
            </label>
            <select
              value={tipoPersonaModal}
              onChange={(e) => {
                const nuevoTipo = e.target.value as 'Alumno' | 'Docente' | 'No Docente';
                setTipoPersonaModal(nuevoTipo);
                const p = personas.find((x) => x.rol === nuevoTipo);
                setPersonaIdModal(p ? p._id : '');
              }}
              disabled={modoEdicion}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="Alumno">Alumno</option>
              <option value="Docente">Docente</option>
              <option value="No Docente">No Docente</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Seleccionar Persona
            </label>
            <select
              value={personaIdModal}
              onChange={(e) => setPersonaIdModal(e.target.value)}
              disabled={modoEdicion}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Seleccione...</option>
              {personasModalFiltradas.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.apellido}, {p.nombre} (DNI: {p.dni})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Estado de Asistencia
              </label>
              <select
                value={estadoModal}
                onChange={(e) => setEstadoModal(e.target.value as 'Presente' | 'Ausente')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 font-bold"
              >
                <option value="Presente" className="text-emerald-700 font-bold">
                  🟢 Presente
                </option>
                <option value="Ausente" className="text-rose-700 font-bold">
                  🔴 Ausente
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fechaModal}
                onChange={(e) => setFechaModal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Comentario / Justificación / Observación
            </label>
            <textarea
              value={comentarioModal}
              onChange={(e) => setComentarioModal(e.target.value)}
              placeholder="Ej: Presentó certificado médico, aviso de retiro anticipado, etc."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
