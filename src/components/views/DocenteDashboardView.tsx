/**
 * @archivo src/components/views/DocenteDashboardView.tsx
 * @descripción Vistas exclusivas para el Rol Docente en el Instituto José Peña:
 * - Panel Docente principal (Datos personales, Buscador Multifiltro y Grilla Horaria).
 * - Módulo dedicado "Mis Inasistencias / Actas" con flujo "Solicitar Inasistencia" (Motivo, Observación opcional, Adjuntar PNG/PDF -> Estado Pendiente).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarPlus,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Clock,
  CheckCircle2,
  Download,
  Trash2,
} from 'lucide-react';
import { IUser } from '../../types.js';
import { DocenteMultifiltroRegistros } from '../DocenteMultifiltroRegistros.js';
import { CargaCalificacionesDocente } from '../CargaCalificacionesDocente.js';

interface DocenteDashboardViewProps {
  usuario: IUser | null;
  tabInicial?: 'horarios' | 'inasistencias';
}

interface PerfilDocente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  barrio: string;
  direccion: string;
  legajo: string;
  titulo: string;
  antiguedad: string;
}

interface ItemInasistenciaDocente {
  id: string;
  fecha: string;
  estado: string;
  motivo?: string;
  observacion: string;
  motivo_rechazo?: string;
  revisado_por?: string;
  fecha_revision?: string;
  adjunto_nombre?: string;
  adjunto_tipo?: string;
  adjunto_data?: string;
}

interface InasistenciasDocente {
  resumen: {
    presentes: number;
    ausentes: number;
    tardanzas: number;
    licencias: number;
    pendientes?: number;
    aprobadas?: number;
    desaprobadas?: number;
    total: number;
  };
  listado: ItemInasistenciaDocente[];
}

const MOTIVOS_INASISTENCIA = [
  'Enfermedad / Razones de Salud',
  'Atención de Familiar Enfermo',
  'Razones Particulares',
  'Trámite Personal / Administrativo',
  'Capacitación / Jornada Institucional',
  'Licencia por Examen / Estudio',
  'Duelo Familiar',
  'Otro Motivo',
];

export const DocenteDashboardView: React.FC<DocenteDashboardViewProps> = ({ tabInicial }) => {
  const esVistaInasistencias = tabInicial === 'inasistencias';

  const [perfil, setPerfil] = useState<PerfilDocente | null>(null);
  const [inasistencias, setInasistencias] = useState<InasistenciasDocente | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estados del Modal "Solicitar Inasistencia"
  const [modalSolicitudAbierto, setModalSolicitudAbierto] = useState(false);
  const [fechaSolicitud, setFechaSolicitud] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivoSolicitud, setMotivoSolicitud] = useState('');
  const [observacionSolicitud, setObservacionSolicitud] = useState('');
  const [adjuntoNombre, setAdjuntoNombre] = useState('');
  const [adjuntoTipo, setAdjuntoTipo] = useState('');
  const [adjuntoData, setAdjuntoData] = useState('');
  const [errorAdjunto, setErrorAdjunto] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshRegistrosTrigger, setRefreshRegistrosTrigger] = useState(0);

  const cargarInasistencias = useCallback(async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const resInas = await fetch('/api/docentes/mis-inasistencias', { headers });
    if (resInas.ok) {
      setInasistencias(await resInas.json());
    }
  }, []);

  // Cargar datos del docente
  useEffect(() => {
    const cargarDatosDocente = async () => {
      setCargando(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [resPerfil, resInas] = await Promise.all([
          fetch('/api/docentes/perfil', { headers }),
          fetch('/api/docentes/mis-inasistencias', { headers }),
        ]);

        if (resPerfil.ok) {
          setPerfil(await resPerfil.json());
        }
        if (resInas.ok) {
          setInasistencias(await resInas.json());
        }
      } catch (err) {
        console.error('Error al cargar panel docente:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosDocente();
  }, []);

  // Manejador de adjunto PNG / PDF
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorAdjunto('');
    const file = e.target.files?.[0];
    if (!file) return;

    const esPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!esPng && !esPdf) {
      setErrorAdjunto('Formato no válido. Solo se permiten imágenes PNG (.png) o documentos PDF (.pdf).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorAdjunto('El archivo supera el tamaño máximo permitido de 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAdjuntoNombre(file.name);
      setAdjuntoTipo(esPdf ? 'application/pdf' : 'image/png');
      setAdjuntoData(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      setErrorAdjunto('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const limpiarAdjunto = () => {
    setAdjuntoNombre('');
    setAdjuntoTipo('');
    setAdjuntoData('');
    setErrorAdjunto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const abrirModalSolicitud = () => {
    setFechaSolicitud(new Date().toISOString().split('T')[0]);
    setMotivoSolicitud('');
    setObservacionSolicitud('');
    limpiarAdjunto();
    setMensajeEstado(null);
    setModalSolicitudAbierto(true);
  };

  // Enviar solicitud de inasistencia -> pasa a estado Pendiente
  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAdjunto('');

    if (!motivoSolicitud) {
      setErrorAdjunto('Por favor seleccione un motivo de inasistencia.');
      return;
    }

    setEnviandoSolicitud(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/docentes/solicitar-inasistencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha: fechaSolicitud,
          motivo: motivoSolicitud,
          observacion: observacionSolicitud,
          adjunto_nombre: adjuntoNombre,
          adjunto_tipo: adjuntoTipo,
          adjunto_data: adjuntoData,
        }),
      });

      if (res.ok) {
        await cargarInasistencias();
        setModalSolicitudAbierto(false);
        setMensajeEstado({
          tipo: 'exito',
          texto:
            'Solicitud de inasistencia registrada correctamente. Estado: Pendiente — Se envió una notificación al Director para su aprobación o desaprobación.',
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorAdjunto(errData.error || 'No se pudo registrar la solicitud de inasistencia.');
      }
    } catch {
      setErrorAdjunto('Error de conexión al enviar la solicitud.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // Descargar constancia adjunta
  const handleDescargarConstancia = (item: ItemInasistenciaDocente) => {
    if (!item.adjunto_data) return;
    const link = document.createElement('a');
    link.href = item.adjunto_data;
    link.download = item.adjunto_nombre || `constancia_${item.fecha}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (cargando) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium text-sm">
        Cargando Panel Docente...
      </div>
    );
  }

  // ==================== MÓDULO DEDICADO: MIS INASISTENCIAS / ACTAS ====================
  if (esVistaInasistencias) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
        {/* Encabezado del Módulo con Botón Solicitar Inasistencia */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1b2a4a]">Mis Inasistencias / Actas</h2>
            <p className="text-xs text-slate-500 mt-1">
              Consulta tu historial administrativo y gestiona nuevas solicitudes de inasistencia con constancia adjunta.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalSolicitud}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d3557] hover:bg-[#162844] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Solicitar Inasistencia</span>
          </button>
        </div>

        {/* Mensaje de confirmación / error */}
        {mensajeEstado && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
              mensajeEstado.tipo === 'exito'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mensajeEstado.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setMensajeEstado(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
            <span className="text-xs font-bold text-orange-800 uppercase">Pendientes</span>
            <p className="text-2xl font-extrabold text-orange-900 mt-1">
              {inasistencias?.resumen.pendientes || 0}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="text-xs font-bold text-emerald-800 uppercase">Presentes</span>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">
              {inasistencias?.resumen.presentes || 0}
            </p>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <span className="text-xs font-bold text-rose-800 uppercase">Ausentes</span>
            <p className="text-2xl font-extrabold text-rose-900 mt-1">
              {inasistencias?.resumen.ausentes || 0}
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <span className="text-xs font-bold text-amber-800 uppercase">Tardanzas</span>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">
              {inasistencias?.resumen.tardanzas || 0}
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="text-xs font-bold text-blue-800 uppercase">Licencias</span>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">
              {inasistencias?.resumen.licencias || 0}
            </p>
          </div>
        </div>

        {/* Listado de Inasistencias, Solicitudes y Actas */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-base text-[#1b2a4a]">
              Registro Administrativo de Asistencias, Solicitudes y Actas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial de asistencias registradas por secretaría y solicitudes de inasistencia enviadas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-5">Fecha</th>
                  <th className="py-3.5 px-5">Motivo</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-5">Observación / Acta</th>
                  <th className="py-3.5 px-5 text-center">Constancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!inasistencias || inasistencias.listado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No registra inasistencias, solicitudes ni actas administrativas.
                    </td>
                  </tr>
                ) : (
                  inasistencias.listado.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-5 font-bold text-slate-800 whitespace-nowrap">
                        {item.fecha}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-700">
                        {item.motivo || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            item.estado === 'Pendiente'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : item.estado === 'Aprobada'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.estado === 'Desaprobada'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.estado === 'Presente'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.estado === 'Ausente'
                              ? 'bg-rose-100 text-rose-800'
                              : item.estado === 'Tardanza'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.estado === 'Pendiente' && <Clock className="w-3 h-3" />}
                          {item.estado === 'Aprobada' && <CheckCircle2 className="w-3 h-3" />}
                          <span>{item.estado}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        <div>{item.observacion}</div>
                        {item.estado === 'Desaprobada' && item.motivo_rechazo && (
                          <div className="mt-1.5 px-2.5 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                            <span className="font-bold">Motivo de desaprobación:</span>{' '}
                            {item.motivo_rechazo}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {item.adjunto_data ? (
                          <button
                            type="button"
                            onClick={() => handleDescargarConstancia(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title={`Descargar ${item.adjunto_nombre}`}
                          >
                            {item.adjunto_tipo === 'application/pdf' ? (
                              <FileText className="w-3.5 h-3.5" />
                            ) : (
                              <ImageIcon className="w-3.5 h-3.5" />
                            )}
                            <span className="max-w-[130px] truncate">
                              {item.adjunto_nombre || 'Constancia'}
                            </span>
                            <Download className="w-3 h-3" />
                          </button>
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

        {/* MODAL: SOLICITAR INASISTENCIA */}
        {modalSolicitudAbierto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
            onClick={() => setModalSolicitudAbierto(false)}
          >
            <div
              className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera Modal */}
              <div className="px-6 py-4 bg-[#1d3557] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarPlus className="w-5 h-5" />
                  <div>
                    <h4 className="font-bold text-base">Solicitar Inasistencia</h4>
                    <p className="text-[11px] text-blue-100">
                      La solicitud quedará registrada en estado Pendiente para revisión administrativa.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalSolicitudAbierto(false)}
                  aria-label="Cerrar modal"
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleEnviarSolicitud} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Fecha de Inasistencia
                  </label>
                  <input
                    type="date"
                    value={fechaSolicitud}
                    onChange={(e) => setFechaSolicitud(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Motivo <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={motivoSolicitud}
                    onChange={(e) => setMotivoSolicitud(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un motivo...</option>
                    {MOTIVOS_INASISTENCIA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Observación <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={observacionSolicitud}
                    onChange={(e) => setObservacionSolicitud(e.target.value)}
                    placeholder="Detalle adicional sobre el motivo o duración de la inasistencia..."
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Adjuntar constancia (PNG o PDF) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Constancia de Inasistencia <span className="text-slate-400 font-normal">(PNG o PDF)</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,image/png,.pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-[#1d3557]" />
                      <span>Adjuntar constancia (.png / .pdf)</span>
                    </button>

                    {adjuntoNombre && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                        {adjuntoTipo === 'application/pdf' ? (
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="max-w-[180px] truncate">{adjuntoNombre}</span>
                        <button
                          type="button"
                          onClick={limpiarAdjunto}
                          title="Quitar archivo"
                          className="text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {errorAdjunto && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {errorAdjunto}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalSolicitudAbierto(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoSolicitud}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== PANTALLA PRINCIPAL: PANEL DOCENTE ====================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. Encabezado de Datos Personales del Docente */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-xs">
            {perfil?.nombre?.[0]}
            {perfil?.apellido?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1b2a4a]">
                Prof. {perfil?.nombre} {perfil?.apellido}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                Personal Docente
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              DNI: <span className="font-semibold text-slate-700">{perfil?.dni}</span> | Legajo:{' '}
              <span className="font-semibold text-slate-700">{perfil?.legajo}</span> | Título:{' '}
              <span className="font-semibold text-slate-700">{perfil?.titulo}</span>
            </p>
          </div>
        </div>

        {/* Ficha de Ubicación y Contacto Directo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs w-full md:w-auto shrink-0">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Teléfono / Celular</span>
            <span className="font-semibold text-slate-800">{perfil?.celular}</span>
          </div>
          <div className="sm:border-l border-slate-200 sm:pl-3">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Barrio</span>
            <span className="font-semibold text-slate-800">{perfil?.barrio}</span>
          </div>
          <div className="sm:border-l border-slate-200 sm:pl-3">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Dirección</span>
            <span className="font-semibold text-slate-800">{perfil?.direccion}</span>
          </div>
        </div>
      </div>

      {/* 2. Cargar Notas al lado del Buscador Multifiltro de Registros + Resultados abajo */}
      <DocenteMultifiltroRegistros
        modoDocenteAsignatura={true}
        refreshTrigger={refreshRegistrosTrigger}
        docenteNombre={`${perfil?.apellido || ''}, ${perfil?.nombre || ''}`}
        docenteDni={perfil?.dni || ''}
        leftSlot={
          <CargaCalificacionesDocente
            soloFormulario={true}
            onDataChanged={() => setRefreshRegistrosTrigger((prev) => prev + 1)}
          />
        }
      />
    </div>
  );
};
