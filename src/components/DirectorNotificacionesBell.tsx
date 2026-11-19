/**
 * @archivo src/components/DirectorNotificacionesBell.tsx
 * @descripción Botón de notificaciones con aviso en tiempo real y panel de resolución
 * (Aprobar / Desaprobar con motivo obligatorio) para solicitudes de inasistencia de Docentes y No Docentes.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  FileText,
  Image as ImageIcon,
  Download,
  AlertCircle,
} from 'lucide-react';

export interface SolicitudInasistenciaItem {
  id: string;
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    rol: string;
  };
  fecha: string;
  estado: 'Pendiente' | 'Aprobada' | 'Desaprobada';
  motivo: string;
  observacion: string;
  motivo_rechazo: string;
  revisado_por: string;
  fecha_revision: string;
  adjunto_nombre: string;
  adjunto_tipo: string;
  adjunto_data: string;
  createdAt: string;
}

export const DIRECTOR_NOTIF_EVENT = 'director-notificaciones-updated';

export const DirectorNotificacionesBell: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const [pestana, setPestana] = useState<'pendientes' | 'historial'>('pendientes');
  const [pendientes, setPendientes] = useState<SolicitudInasistenciaItem[]>([]);
  const [historial, setHistorial] = useState<SolicitudInasistenciaItem[]>([]);
  const [cargando, setCargando] = useState(false);

  // Estado para desaprobación con motivo obligatorio
  const [desaprobandoId, setDesaprobandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarNotificaciones = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/director/notificaciones-inasistencias', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendientes(data.pendientes || []);
        setHistorial(data.historial || []);
      }
    } catch (err) {
      console.error('Error al cargar notificaciones directivas:', err);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    cargarNotificaciones().finally(() => setCargando(false));

    const intervalId = window.setInterval(cargarNotificaciones, 12000);
    const onFocus = () => cargarNotificaciones();
    const onUpdated = () => cargarNotificaciones();

    window.addEventListener('focus', onFocus);
    window.addEventListener(DIRECTOR_NOTIF_EVENT, onUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(DIRECTOR_NOTIF_EVENT, onUpdated);
    };
  }, [cargarNotificaciones]);

  const handleResolver = async (
    id: string,
    accion: 'aprobar' | 'desaprobar',
    motivo?: string
  ) => {
    setErrorAccion('');
    if (accion === 'desaprobar' && (!motivo || motivo.trim() === '')) {
      setErrorAccion('Debe indicar el motivo de desaprobación.');
      return;
    }

    setProcesandoId(id);
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
        await cargarNotificaciones();
        window.dispatchEvent(new Event(DIRECTOR_NOTIF_EVENT));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorAccion(err.error || 'No se pudo procesar la solicitud.');
      }
    } catch {
      setErrorAccion('Error de conexión con el servidor.');
    } finally {
      setProcesandoId(null);
    }
  };

  const descargarConstancia = (item: SolicitudInasistenciaItem) => {
    if (!item.adjunto_data) return;
    const link = document.createElement('a');
    link.href = item.adjunto_data;
    link.download = item.adjunto_nombre || `constancia_${item.fecha}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cantidadPendientes = pendientes.length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          cargarNotificaciones();
        }}
        className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
        title="Notificaciones de solicitudes de inasistencia"
      >
        <Bell className={`w-4 h-4 ${cantidadPendientes > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
        <span className="hidden md:inline">Notificaciones</span>
        {cantidadPendientes > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-xs">
            {cantidadPendientes}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="px-6 py-4 bg-[#1b2a4a] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Notificaciones de Solicitudes de Inasistencia
                  </h3>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    Solicitudes enviadas por Docentes y Personal No Docente para aprobación directiva
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Cerrar notificaciones"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas */}
            <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setPestana('pendientes')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  pestana === 'pendientes'
                    ? 'border-[#1b2a4a] text-[#1b2a4a]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Pendientes de Revisión</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-extrabold">
                  {cantidadPendientes}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestana('historial')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  pestana === 'historial'
                    ? 'border-[#1b2a4a] text-[#1b2a4a]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Historial Resuelto</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {historial.length}
                </span>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {errorAccion && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorAccion}</span>
                </div>
              )}

              {cargando ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Cargando notificaciones...
                </div>
              ) : pestana === 'pendientes' ? (
                pendientes.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      No hay solicitudes pendientes
                    </p>
                    <p className="text-xs text-slate-500">
                      Cuando un Docente o Personal No Docente cargue una solicitud de inasistencia,
                      aparecerá aquí para su aprobación o desaprobación.
                    </p>
                  </div>
                ) : (
                  pendientes.map((item) => {
                    const estaDesaprobando = desaprobandoId === item.id;
                    const procesando = procesandoId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {item.solicitante.apellido}, {item.solicitante.nombre}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.solicitante.rol === 'No Docente'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}
                              >
                                {item.solicitante.rol}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              DNI: <strong className="text-slate-700">{item.solicitante.dni}</strong> · Fecha de inasistencia:{' '}
                              <strong className="text-slate-800">{item.fecha}</strong>
                            </p>
                          </div>

                          {item.adjunto_data && (
                            <button
                              type="button"
                              onClick={() => descargarConstancia(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer"
                            >
                              {item.adjunto_tipo === 'application/pdf' ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5" />
                              )}
                              <span className="max-w-[140px] truncate">
                                {item.adjunto_nombre || 'Constancia'}
                              </span>
                              <Download className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200/80 p-3 text-xs space-y-1">
                          <p className="text-slate-700">
                            <span className="font-bold text-slate-900">Motivo:</span> {item.motivo}
                          </p>
                          {item.observacion && (
                            <p className="text-slate-600">
                              <span className="font-bold text-slate-800">Observación:</span>{' '}
                              {item.observacion}
                            </p>
                          )}
                        </div>

                        {estaDesaprobando ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2.5">
                            <label className="block text-xs font-bold text-rose-900">
                              Indique el motivo de desaprobación <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                              rows={2}
                              value={motivoRechazo}
                              onChange={(e) => setMotivoRechazo(e.target.value)}
                              placeholder="Ej: Falta presentar certificado médico oficial, superposición con mesa de examen..."
                              className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setDesaprobandoId(null);
                                  setMotivoRechazo('');
                                  setErrorAccion('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={procesando}
                                onClick={() => handleResolver(item.id, 'desaprobar', motivoRechazo)}
                                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                              >
                                {procesando ? 'Guardando...' : 'Confirmar Desaprobación'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => {
                                setDesaprobandoId(item.id);
                                setMotivoRechazo('');
                                setErrorAccion('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Desaprobar
                            </button>
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => handleResolver(item.id, 'aprobar')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {procesando ? 'Procesando...' : 'Aprobar'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : historial.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aún no hay solicitudes aprobadas o desaprobadas en el historial.
                </div>
              ) : (
                historial.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {item.solicitante.apellido}, {item.solicitante.nombre}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.solicitante.rol}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.estado === 'Aprobada'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {item.estado === 'Aprobada' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {item.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Fecha:</strong> {item.fecha} ·{' '}
                      <strong className="text-slate-800">Motivo:</strong> {item.motivo}
                    </p>
                    {item.estado === 'Desaprobada' && item.motivo_rechazo && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <span className="font-bold">Motivo de desaprobación:</span>{' '}
                        {item.motivo_rechazo}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
