/**
 * @archivo src/components/views/ReportesView.tsx
 * @descripción Vista para la generación de Reportes Estadísticos, Control de Asistencia Docente y Validación de Planillas.
 * @funcionalidades_clave
 * - Resumen analítico de calificaciones, inasistencias y sanciones con KPIs globales.
 * - Planilla interactiva de asistencia docente con búsqueda por texto y filtros por estado.
 * - Auditoría y validación formal de planillas de calificaciones para cierre de actas.
 * - Exportación de tablas y métricas a documentos PDF oficiales para archivo institucional y legajo reglamentario.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Download,
  BarChart3,
  CheckCircle2,
  Filter,
  Search,
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { IUser, IDashboardStats } from '../../types.js';
import { Modal } from '../Modal.js';
import {
  exportarPDFInformeEstadistico,
  exportarPDFPlanillaAsistenciaDocente,
  exportarPDFActaValidacionPlanillas,
  IEstadisticasResumen,
  IKPISResumen,
  IAsistenciaDocenteItem,
} from '../../utils/pdfReportes.js';

interface ReportesViewProps {
  usuario: IUser | null;
}

interface MateriaPlanillaInfo {
  materia: string;
  curso: string;
  division: string;
  docente: string;
}

const MATERIAS_PLANILLAS_DEFAULT: MateriaPlanillaInfo[] = [
  { materia: 'Matemática I', curso: '1° Año (Secundario)', division: 'División A', docente: 'Rodríguez, Ana' },
  { materia: 'Lengua y Literatura', curso: '1° Año (Secundario)', division: 'División A', docente: 'Pérez, Jorge' },
  { materia: 'Física II', curso: '2° Año (Secundario)', division: 'División B', docente: 'Díaz, Lucía' },
  { materia: 'Historia III', curso: '3° Año (Secundario)', division: 'División A', docente: 'Álvarez, Martín' },
  { materia: 'Ciencias Naturales', curso: '4° Grado (Primario)', division: 'Sección Única', docente: 'Romero, Elena' },
];

export const ReportesView: React.FC<ReportesViewProps> = ({ usuario }) => {
  const [estadisticas, setEstadisticas] = useState<IEstadisticasResumen | null>(null);
  const [kpis, setKpis] = useState<IKPISResumen | null>(null);
  const [asistenciasDocentes, setAsistenciasDocentes] = useState<IAsistenciaDocenteItem[]>([]);
  const [docentes, setDocentes] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros de la Planilla de Asistencia Docente
  const [busquedaDocente, setBusquedaDocente] = useState('');
  const [filtroEstadoDocente, setFiltroEstadoDocente] = useState<'Todos' | 'Presente' | 'Ausente' | 'Licencia' | 'Tardanza'>('Todos');
  const [filtroDocenteId, setFiltroDocenteId] = useState<string>('todos');

  // Modal Carga Asistencia Docente
  const [isAsistenciaModalOpen, setIsAsistenciaModalOpen] = useState(false);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState<'Presente' | 'Ausente' | 'Licencia' | 'Tardanza'>('Presente');
  const [observacionDocente, setObservacionDocente] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado de Validación de Planillas de Notas
  const [planillasValidadas, setPlanillasValidadas] = useState<string[]>([
    'Matemática I',
    'Lengua y Literatura',
  ]);

  // Modal Avanzado de Exportación PDF
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tipoReporteExport, setTipoReporteExport] = useState<'completo' | 'asistencia' | 'validacion'>('completo');
  const [periodoExport, setPeriodoExport] = useState('Ciclo Lectivo 2026');
  const [observacionesExport, setObservacionesExport] = useState('');
  const [exportando, setExportando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resEst, resAsis, resUsers, resKpi] = await Promise.all([
        fetch('/api/reportes/estadisticas', { headers }),
        fetch('/api/asistencia-docente', { headers }),
        fetch('/api/usuarios?rol=Docente', { headers }),
        fetch('/api/reportes/kpi', { headers }).catch(() => null),
      ]);

      if (resEst && resEst.ok) setEstadisticas(await resEst.json());
      if (resAsis && resAsis.ok) setAsistenciasDocentes(await resAsis.json());
      if (resUsers && resUsers.ok) setDocentes(await resUsers.json());
      if (resKpi && resKpi.ok) setKpis(await resKpi.json());
    } catch (err) {
      console.error('Error al cargar datos de reportes:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  // Filtrado reactivo de la tabla de asistencia docente
  const asistenciasFiltradas = useMemo(() => {
    return asistenciasDocentes.filter((item) => {
      // Filtro por Estado
      if (filtroEstadoDocente !== 'Todos' && item.estado !== filtroEstadoDocente) {
        return false;
      }

      // Filtro por Docente ID
      if (filtroDocenteId !== 'todos') {
        const idItem = typeof item.docente_id === 'object' ? item.docente_id?._id : item.docente_id;
        if (idItem !== filtroDocenteId) return false;
      }

      // Filtro por Texto libre (Nombre, Apellido, DNI, Observación)
      if (busquedaDocente.trim() !== '') {
        const query = busquedaDocente.toLowerCase();
        const doc = typeof item.docente_id === 'object' ? item.docente_id : null;
        const nombre = `${doc?.apellido || ''} ${doc?.nombre || ''}`.toLowerCase();
        const dni = (doc?.dni || '').toLowerCase();
        const obs = (item.observacion || '').toLowerCase();

        if (!nombre.includes(query) && !dni.includes(query) && !obs.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [asistenciasDocentes, filtroEstadoDocente, filtroDocenteId, busquedaDocente]);

  // Manejo de Notificaciones
  const mostrarMensajeExito = (texto: string) => {
    setMensajeExito(texto);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4500);
  };

  // 1. Exportación Rápida: Estadísticas Institucionales
  const handleExportarEstadisticasPDF = () => {
    if (!estadisticas) return;
    try {
      exportarPDFInformeEstadistico(estadisticas, kpis, {
        usuario,
        periodo: 'Ciclo Lectivo 2026',
        planillasValidadas: planillasValidadas.map(
          (m) => MATERIAS_PLANILLAS_DEFAULT.find((p) => p.materia === m)?.materia || m
        ),
        observaciones:
          'Informe emitido para archivo institucional, inspección pedagógica y legajo de secretaría académica.',
      });
      mostrarMensajeExito('✓ Se generó y descargó el Informe Estadístico Institucional en formato PDF.');
    } catch (error) {
      console.error('Error al exportar estadísticas:', error);
      alert('Error al generar el PDF de estadísticas.');
    }
  };

  // 2. Exportación Rápida: Planilla de Asistencia Docente
  const handleExportarPlanillaDocentePDF = (soloFiltrados = false) => {
    const listado = soloFiltrados ? asistenciasFiltradas : asistenciasDocentes;
    if (listado.length === 0) {
      alert('No hay registros de asistencia docente para exportar.');
      return;
    }

    try {
      exportarPDFPlanillaAsistenciaDocente(listado, {
        usuario,
        periodo: soloFiltrados && filtroEstadoDocente !== 'Todos'
          ? `Filtrado por estado: ${filtroEstadoDocente}`
          : 'Planilla General de Control Horario',
        filtroEstado: filtroEstadoDocente,
        filtroTexto: busquedaDocente,
        observaciones:
          'Planilla oficial certificada para legajos del personal, control de haberes y auditoría reglamentaria.',
      });
      mostrarMensajeExito(
        `✓ Se generó la Planilla de Asistencia Docente con ${listado.length} registro(s) en PDF.`
      );
    } catch (error) {
      console.error('Error al exportar planilla docente:', error);
      alert('Error al generar el PDF de la planilla.');
    }
  };

  // 3. Exportación Rápida: Acta de Validación de Planillas
  const handleExportarActaValidacionPDF = () => {
    try {
      const datosPlanillas = MATERIAS_PLANILLAS_DEFAULT.map((p) => ({
        materia: `${p.materia} (${p.division})`,
        curso: p.curso,
        validada: planillasValidadas.includes(p.materia),
        docente: p.docente,
      }));

      exportarPDFActaValidacionPlanillas(datosPlanillas, {
        usuario,
        periodo: 'Cierre de Actas de Examen y Evaluaciones Trimestrales',
        observaciones:
          'Acta formal de validación y recepción de calificaciones para la confección reglamentaria de boletines.',
      });
      mostrarMensajeExito('✓ Se generó el Acta Oficial de Auditoría y Validación de Planillas en PDF.');
    } catch (error) {
      console.error('Error al exportar acta:', error);
      alert('Error al generar el PDF del acta de validación.');
    }
  };

  // 4. Exportación Avanzada desde Modal
  const handleEjecutarExportacionModal = () => {
    setExportando(true);
    setTimeout(() => {
      try {
        if (tipoReporteExport === 'completo') {
          if (estadisticas) {
            exportarPDFInformeEstadistico(estadisticas, kpis, {
              usuario,
              periodo: periodoExport,
              planillasValidadas,
              observaciones: observacionesExport,
            });
            mostrarMensajeExito('✓ Informe Institucional Completo descargado con éxito.');
          }
        } else if (tipoReporteExport === 'asistencia') {
          exportarPDFPlanillaAsistenciaDocente(asistenciasFiltradas, {
            usuario,
            periodo: periodoExport,
            observaciones: observacionesExport,
          });
          mostrarMensajeExito('✓ Planilla Oficial de Asistencia Docente descargada con éxito.');
        } else if (tipoReporteExport === 'validacion') {
          const datosPlanillas = MATERIAS_PLANILLAS_DEFAULT.map((p) => ({
            materia: `${p.materia} (${p.division})`,
            curso: p.curso,
            validada: planillasValidadas.includes(p.materia),
            docente: p.docente,
          }));
          exportarPDFActaValidacionPlanillas(datosPlanillas, {
            usuario,
            periodo: periodoExport,
            observaciones: observacionesExport,
          });
          mostrarMensajeExito('✓ Acta de Validación de Calificaciones descargada con éxito.');
        }
        setIsExportModalOpen(false);
      } catch (err) {
        console.error('Error al ejecutar exportación:', err);
        alert('Ocurrió un error al procesar el archivo PDF.');
      } finally {
        setExportando(false);
      }
    }, 200);
  };

  const handleOpenAsistenciaModal = () => {
    setDocenteSeleccionado(docentes[0]?._id || '');
    setEstadoAsistencia('Presente');
    setObservacionDocente('');
    setIsAsistenciaModalOpen(true);
  };

  const handleGuardarAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteSeleccionado) return;

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/asistencia-docente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          docente_id: docenteSeleccionado,
          estado: estadoAsistencia,
          observacion: observacionDocente,
        }),
      });

      if (res.ok) {
        setIsAsistenciaModalOpen(false);
        fetchDatos();
        mostrarMensajeExito('✓ Registro de asistencia docente guardado exitosamente.');
      } else {
        alert('Error al registrar la asistencia docente.');
      }
    } catch (err) {
      console.error('Error al guardar asistencia docente:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleValidarPlanilla = (materia: string) => {
    if (!planillasValidadas.includes(materia)) {
      const nuevas = [...planillasValidadas, materia];
      setPlanillasValidadas(nuevas);
      mostrarMensajeExito(`✓ Planilla de "${materia}" validada correctamente para archivo institucional.`);
    }
  };

  // Cálculo de resumen rápido de asistencia docente
  const statsAsistencia = useMemo(() => {
    const total = asistenciasDocentes.length;
    let presentes = 0;
    let ausentes = 0;
    let licencias = 0;
    let tardanzas = 0;
    asistenciasDocentes.forEach((a) => {
      if (a.estado === 'Presente') presentes++;
      else if (a.estado === 'Ausente') ausentes++;
      else if (a.estado === 'Licencia') licencias++;
      else if (a.estado === 'Tardanza') tardanzas++;
    });
    return {
      total,
      presentes,
      ausentes,
      licencias,
      tardanzas,
      tasaPresentismo: total > 0 ? Math.round((presentes / total) * 100) : 100,
    };
  }, [asistenciasDocentes]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto font-sans space-y-8">
      {/* Toast de confirmación de descarga */}
      {mensajeExito && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18243b] text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700/60 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <div className="text-xs sm:text-sm font-medium">{mensajeExito}</div>
        </div>
      )}

      {/* Encabezado Principal y Barra de Acciones Institucionales */}
      <div className="bg-gradient-to-r from-[#18243b] via-[#1f3052] to-[#18243b] text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-700/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold tracking-wide uppercase text-slate-200 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Sistema de Archivo Institucional & Auditoría
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Reportes Estadísticos y Control Institucional
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Consolidación de métricas de rendimiento, partes diarios del cuerpo docente y generación de documentos
            oficiales descargables en PDF con validez para legajos.
          </p>
        </div>

        {/* Botones de Exportación en Cabecera */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
          <button
            onClick={() => {
              setTipoReporteExport('completo');
              setIsExportModalOpen(true);
            }}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition-all cursor-pointer shadow-xs"
            title="Configurar opciones avanzadas de exportación"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configurar PDF</span>
          </button>

          <button
            onClick={handleExportarEstadisticasPDF}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer hover:shadow-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Informe Completo (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sección 1: Estadísticas y Rendimiento Académico */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18243b]">Gráficos y Estadísticas de Rendimiento</h3>
              <p className="text-xs text-slate-500">Distribución porcentual de notas, disciplina y presentismo.</p>
            </div>
          </div>

          <button
            onClick={handleExportarEstadisticasPDF}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#18243b] hover:text-[#18243b] bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer self-start sm:self-auto"
            title="Exportar informe estadístico y gráfico en PDF"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar Estadísticas (PDF)</span>
          </button>
        </div>

        {cargando ? (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando métricas institucionales...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta Rendimiento Notas */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                  Distribución de Calificaciones
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {estadisticas?.resumenNotas?.total || 0} Registros
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Promocionados (&gt;= 8)</span>
                    <span className="text-emerald-700 font-bold">
                      {estadisticas?.resumenNotas?.promocionados || 0} (
                      {Math.round(
                        ((estadisticas?.resumenNotas?.promocionados || 0) /
                          (estadisticas?.resumenNotas?.total || 1)) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          ((estadisticas?.resumenNotas?.promocionados || 0) /
                            (estadisticas?.resumenNotas?.total || 1)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Aprobados (6 - 7)</span>
                    <span className="text-blue-700 font-bold">
                      {estadisticas?.resumenNotas?.aprobados || 0} (
                      {Math.round(
                        ((estadisticas?.resumenNotas?.aprobados || 0) /
                          (estadisticas?.resumenNotas?.total || 1)) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          ((estadisticas?.resumenNotas?.aprobados || 0) /
                            (estadisticas?.resumenNotas?.total || 1)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Desaprobados (&lt; 6)</span>
                    <span className="text-rose-700 font-bold">
                      {estadisticas?.resumenNotas?.desaprobados || 0} (
                      {Math.round(
                        ((estadisticas?.resumenNotas?.desaprobados || 0) /
                          (estadisticas?.resumenNotas?.total || 1)) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          ((estadisticas?.resumenNotas?.desaprobados || 0) /
                            (estadisticas?.resumenNotas?.total || 1)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Inasistencias y Sanciones */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider mb-2">
                Conducta y Asistencia Estudiantil
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg">
                  <div>
                    <span className="block text-xs font-bold text-amber-900">Total Inasistencias</span>
                    <span className="text-[11px] text-amber-700">Cómputo general de faltas</span>
                  </div>
                  <span className="text-xl font-bold text-amber-900">
                    {estadisticas?.resumenAsistenciaAlumnos?.totalInasistencias || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50/80 border border-red-200/80 rounded-lg">
                  <div>
                    <span className="block text-xs font-bold text-red-900">Total Sanciones</span>
                    <span className="text-[11px] text-red-700">Amonestaciones de conducta</span>
                  </div>
                  <span className="text-xl font-bold text-red-900">
                    {estadisticas?.resumenAsistenciaAlumnos?.totalSanciones || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Cumplimiento Docente */}
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                  Cumplimiento del Personal Docente
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {statsAsistencia.tasaPresentismo}% Presentismo
                </span>
              </div>

              <div className="space-y-2 text-xs font-medium">
                <p className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">Presentes:</span>
                  <span className="font-bold text-emerald-700">{statsAsistencia.presentes}</span>
                </p>
                <p className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">Ausentes:</span>
                  <span className="font-bold text-red-700">{statsAsistencia.ausentes}</span>
                </p>
                <p className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">Licencias Médicas / Oficiales:</span>
                  <span className="font-bold text-amber-700">{statsAsistencia.licencias}</span>
                </p>
                <p className="flex justify-between py-1.5">
                  <span className="text-slate-600">Tardanzas registradas:</span>
                  <span className="font-bold text-purple-700">{statsAsistencia.tardanzas}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección 2: Control de Asistencia Docente */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabecera de la tabla */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18243b]">Planilla de Asistencia Docente</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control diario del cumplimiento horario y partes de presentismo del cuerpo docente.
              </p>
            </div>
          </div>

          {/* Botones de acción de la tabla */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleExportarPlanillaDocentePDF(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#18243b] text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Exportar registros filtrados a PDF para legajo institucional"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Exportar Planilla (PDF)</span>
            </button>

            {(usuario?.rol === 'Admin' || usuario?.rol === 'No Docente') && (
              <button
                onClick={handleOpenAsistenciaModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <span>+ Cargar Asistencia Docente</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros interactiva */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Buscador libre */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busquedaDocente}
                onChange={(e) => setBusquedaDocente(e.target.value)}
                placeholder="Buscar por docente o DNI..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              />
            </div>

            {/* Filtro por estado */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Estado:</span>
              <select
                value={filtroEstadoDocente}
                onChange={(e) => setFiltroEstadoDocente(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18243b]/20 text-slate-700"
              >
                <option value="Todos">Todos</option>
                <option value="Presente">Presente</option>
                <option value="Ausente">Ausente</option>
                <option value="Licencia">Licencia</option>
                <option value="Tardanza">Tardanza</option>
              </select>
            </div>

            {/* Filtro por docente específico */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Docente:</span>
              <select
                value={filtroDocenteId}
                onChange={(e) => setFiltroDocenteId(e.target.value)}
                className="max-w-[190px] px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18243b]/20 text-slate-700 truncate"
              >
                <option value="todos">Todos los docentes</option>
                {docentes.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.apellido}, {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>
              Mostrando <strong className="text-slate-800">{asistenciasFiltradas.length}</strong> de{' '}
              {asistenciasDocentes.length} registros
            </span>
            {(busquedaDocente || filtroEstadoDocente !== 'Todos' || filtroDocenteId !== 'todos') && (
              <button
                onClick={() => {
                  setBusquedaDocente('');
                  setFiltroEstadoDocente('Todos');
                  setFiltroDocenteId('todos');
                }}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                <th className="py-3 px-6">DOCENTE</th>
                <th className="py-3 px-4">DNI / LEGAJO</th>
                <th className="py-3 px-4">FECHA</th>
                <th className="py-3 px-4">ESTADO</th>
                <th className="py-3 px-6">OBSERVACIÓN / JUSTIFICATIVO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {asistenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    No se encontraron registros de asistencia coincidentes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                asistenciasFiltradas.map((a) => {
                  const docObj = typeof a.docente_id === 'object' ? a.docente_id : null;
                  return (
                    <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6 font-semibold text-slate-900">
                        {docObj ? `${docObj.apellido}, ${docObj.nombre}` : 'Docente no asignado'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {docObj?.dni || docObj?.perfil_metadata?.legajo || 'S/D'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {new Date(a.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-md ${
                            a.estado === 'Presente'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.estado === 'Ausente'
                              ? 'bg-red-100 text-red-800'
                              : a.estado === 'Tardanza'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.estado}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-xs text-slate-500">
                        {a.observacion && a.observacion.trim() ? a.observacion : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Validación de Planilla de Notas (No Docente / Admin) */}
      {(usuario?.rol === 'Admin' || usuario?.rol === 'No Docente') && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#18243b]">Validación de Planillas de Notas</h3>
                <p className="text-xs text-slate-500">
                  Auditoría formal y cierre de actas de calificaciones para la emisión reglamentaria de boletines.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportarActaValidacionPDF}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#18243b] hover:text-[#18243b] bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer self-start sm:self-auto"
              title="Descargar acta de auditoría y cierre en PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Descargar Acta de Validación (PDF)</span>
            </button>
          </div>

          <div className="space-y-3">
            {MATERIAS_PLANILLAS_DEFAULT.map((item, i) => {
              const estaValidada = planillasValidadas.includes(item.materia);
              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200/90 rounded-lg gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{item.materia}</h4>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                        {item.division}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.curso} • Docente a cargo: <span className="font-medium text-slate-700">{item.docente}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {estaValidada ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Planilla Validada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleValidarPlanilla(item.materia)}
                        className="px-3.5 py-1.5 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        Validar y Cerrar Acta
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Avanzado de Configuración y Exportación PDF */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Exportación Oficial de Documentos Institucionales en PDF"
      >
        <div className="space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecciona el tipo de informe y parámetros a consolidar. El documento se generará con membrete oficial,
            código de seguridad, tabla detallada, cuadros de estadísticas y campos de firmas de rectoría.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Tipo de Documento a Exportar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTipoReporteExport('completo')}
                className={`p-3 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  tipoReporteExport === 'completo'
                    ? 'border-[#18243b] bg-slate-50 ring-2 ring-[#18243b]/15 text-[#18243b]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  Informe Completo
                </div>
                <div className="text-[11px] text-slate-500">
                  Estadísticas académicas, asistencia docente y disciplina.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoReporteExport('asistencia')}
                className={`p-3 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  tipoReporteExport === 'asistencia'
                    ? 'border-[#18243b] bg-slate-50 ring-2 ring-[#18243b]/15 text-[#18243b]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Planilla Asistencia
                </div>
                <div className="text-[11px] text-slate-500">
                  Partes diarios y nómina con cumplimiento del cuerpo docente.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoReporteExport('validacion')}
                className={`p-3 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  tipoReporteExport === 'validacion'
                    ? 'border-[#18243b] bg-slate-50 ring-2 ring-[#18243b]/15 text-[#18243b]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Acta de Validación
                </div>
                <div className="text-[11px] text-slate-500">
                  Auditoría formal y cierre de notas de cátedras para boletines.
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Período o Ciclo Académico
            </label>
            <input
              type="text"
              value={periodoExport}
              onChange={(e) => setPeriodoExport(e.target.value)}
              placeholder="Ej: Ciclo Lectivo 2026 - 1° Trimestre"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Observaciones Institucionales o Dictamen (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacionesExport}
              onChange={(e) => setObservacionesExport(e.target.value)}
              placeholder="Texto aclaratorio para el legajo o inspección técnica (ej: 'Elevado a Dirección General de Enseñanza')."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20 resize-none"
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              Características del Documento a Generar:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pt-1">
              <li>Formato estándar A4 vertical optimizado para impresión y archivo.</li>
              <li>Tipografía Helvetica oficial y colores del Instituto José Peña.</li>
              <li>Código de comprobante institucional correlativo con fecha y hora.</li>
              <li>Espacio reglamentario para 3 firmas (Rectoría, Secretaría y Emisor).</li>
            </ul>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEjecutarExportacionModal}
              disabled={exportando}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-bold rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exportando ? 'Generando Documento...' : 'Descargar PDF Ahora'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Carga Asistencia Docente */}
      <Modal
        isOpen={isAsistenciaModalOpen}
        onClose={() => setIsAsistenciaModalOpen(false)}
        title="Cargar Asistencia Docente"
      >
        <form onSubmit={handleGuardarAsistencia} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Docente
            </label>
            <select
              value={docenteSeleccionado}
              onChange={(e) => setDocenteSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione Docente...</option>
              {docentes.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.apellido}, {d.nombre} (DNI: {d.dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Estado de Asistencia
            </label>
            <select
              value={estadoAsistencia}
              onChange={(e) => setEstadoAsistencia(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            >
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
              <option value="Licencia">Licencia Médica / Oficial</option>
              <option value="Tardanza">Tardanza</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Observación (Opcional)
            </label>
            <input
              type="text"
              value={observacionDocente}
              onChange={(e) => setObservacionDocente(e.target.value)}
              placeholder="Ej: Justificativo médico presentado / Aviso con anticipación"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAsistenciaModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-[#18243b] text-white text-xs font-semibold rounded-md"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
