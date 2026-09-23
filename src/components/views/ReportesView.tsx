/**
 * @archivo src/components/views/ReportesView.tsx
 * @descripción Vista para la generación de Reportes Estadísticos, Control de Asistencia Docente y Validación de Planillas.
 */

import React, { useEffect, useState } from 'react';
import { IUser } from '../../types.js';
import { Modal } from '../Modal.js';

interface ReportesViewProps {
  usuario: IUser | null;
}

export const ReportesView: React.FC<ReportesViewProps> = ({ usuario }) => {
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [asistenciasDocentes, setAsistenciasDocentes] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Carga Asistencia Docente
  const [isAsistenciaModalOpen, setIsAsistenciaModalOpen] = useState(false);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState<'Presente' | 'Ausente' | 'Licencia' | 'Tardanza'>('Presente');
  const [observacionDocente, setObservacionDocente] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado de Validación de Planillas de Notas
  const [planillasValidadas, setPlanillasValidadas] = useState<string[]>([]);

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resEst, resAsis, resUsers] = await Promise.all([
        fetch('/api/reportes/estadisticas', { headers }),
        fetch('/api/asistencia-docente', { headers }),
        fetch('/api/usuarios?rol=Docente', { headers }),
      ]);

      if (resEst.ok) setEstadisticas(await resEst.json());
      if (resAsis.ok) setAsistenciasDocentes(await resAsis.json());
      if (resUsers.ok) setDocentes(await resUsers.json());
    } catch (err) {
      console.error('Error al cargar reportes:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

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
      setPlanillasValidadas([...planillasValidadas, materia]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-8">
      {/* Sección 1: Estadísticas y Rendimiento Académico */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-[#18243b] mb-4">Gráficos y Estadísticas de Rendimiento</h3>
        {cargando ? (
          <div className="py-8 text-center text-slate-400 text-sm">Cargando métricas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta Rendimiento Notas */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                Distribución de Calificaciones
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Promocionados (&gt;= 8)</span>
                    <span>{estadisticas?.resumenNotas?.promocionados || 0}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
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
                    <span>Aprobados (6 - 7)</span>
                    <span>{estadisticas?.resumenNotas?.aprobados || 0}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
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
                    <span>Desaprobados (&lt; 6)</span>
                    <span>{estadisticas?.resumenNotas?.desaprobados || 0}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full"
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
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                Conducta y Asistencia Estudiantil
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <span className="text-xs font-semibold text-amber-900">Total Inasistencias</span>
                  <span className="text-lg font-bold text-amber-900">
                    {estadisticas?.resumenAsistenciaAlumnos?.totalInasistencias || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-md">
                  <span className="text-xs font-semibold text-red-900">Total Sanciones</span>
                  <span className="text-lg font-bold text-red-900">
                    {estadisticas?.resumenAsistenciaAlumnos?.totalSanciones || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Cumplimiento Docente */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                Asistencia del Personal Docente
              </h4>
              <div className="space-y-2 text-xs font-medium">
                <p className="flex justify-between py-1 border-b border-slate-200">
                  <span>Presentes:</span>
                  <span className="font-bold text-emerald-700">
                    {estadisticas?.resumenAsistenciaDocente?.presentes || 0}
                  </span>
                </p>
                <p className="flex justify-between py-1 border-b border-slate-200">
                  <span>Ausentes:</span>
                  <span className="font-bold text-red-700">
                    {estadisticas?.resumenAsistenciaDocente?.ausentes || 0}
                  </span>
                </p>
                <p className="flex justify-between py-1">
                  <span>Licencias Médicas:</span>
                  <span className="font-bold text-amber-700">
                    {estadisticas?.resumenAsistenciaDocente?.licencias || 0}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección 2: Control de Asistencia Docente (No Docente / Admin) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#18243b]">Planilla de Asistencia Docente</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control diario del cumplimiento horario del cuerpo docente.
            </p>
          </div>
          {(usuario?.rol === 'Admin' || usuario?.rol === 'No Docente') && (
            <button
              onClick={handleOpenAsistenciaModal}
              className="px-4 py-2 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              + Cargar Asistencia Docente
            </button>
          )}
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                <th className="py-3 px-4">DOCENTE</th>
                <th className="py-3 px-4">FECHA</th>
                <th className="py-3 px-4">ESTADO</th>
                <th className="py-3 px-4">OBSERVACIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {asistenciasDocentes.map((a) => {
                const docObj = typeof a.docente_id === 'object' ? a.docente_id : null;
                return (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {docObj ? `${docObj.apellido}, ${docObj.nombre}` : 'N/A'}
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
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{a.observacion || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Validación de Planilla de Notas (No Docente / Admin) */}
      {(usuario?.rol === 'Admin' || usuario?.rol === 'No Docente') && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-[#18243b] mb-2">Validación de Planillas de Notas</h3>
          <p className="text-xs text-slate-500 mb-4">
            Auditoría y cierre formal de actas de calificaciones enviadas por el cuerpo docente.
          </p>

          <div className="space-y-3">
            {['Matemática 1° Año - Div. A', 'Lengua 1° Año - Div. A', 'Física 2° Año - Div. B'].map(
              (materia, i) => {
                const estaValidada = planillasValidadas.includes(materia);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{materia}</h4>
                      <p className="text-xs text-slate-500">Planilla de Evaluaciones Parciales 2026</p>
                    </div>

                    {estaValidada ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200">
                        ✓ Planilla Validada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleValidarPlanilla(materia)}
                        className="px-3 py-1.5 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        Validar Planilla
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

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
              placeholder="Ej: Justificativo médico presentado"
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
