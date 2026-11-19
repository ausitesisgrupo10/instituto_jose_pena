/**
 * @archivo src/components/CargaCalificacionesDocente.tsx
 * @descripción Grilla de Carga Trimestral de Notas y listado de calificaciones por materia asignada al Docente.
 * Ubicada en la vista "Registros y Sanciones" con soporte de exportación a Excel (.xlsx).
 */

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { IRegistroAcademico } from '../types.js';
import { exportarRegistrosAExcel, FilaExcelRegistro } from '../utils/exportExcel.js';

interface MateriaAlumnoData {
  materia_id: string;
  nombre_materia: string;
  seccion: string;
  curso: string;
  alumnos: Array<{
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
  }>;
}

interface NotaRegistro {
  _id: string;
  alumno_id: any;
  materia_id: any;
  valor: string;
  trimestre?: number;
  fecha: string;
  observacion?: string;
}

interface CargaCalificacionesDocenteProps {
  todosLosRegistros: IRegistroAcademico[];
  onDataChanged?: () => void;
}

export const CargaCalificacionesDocente: React.FC<CargaCalificacionesDocenteProps> = ({
  todosLosRegistros,
  onDataChanged,
}) => {
  const [materiasData, setMateriasData] = useState<MateriaAlumnoData[]>([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<MateriaAlumnoData | null>(null);
  const [notasExistentes, setNotasExistentes] = useState<NotaRegistro[]>([]);

  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<string>('');
  const [trimestreCarga, setTrimestreCarga] = useState<number>(1);
  const [valorNota, setValorNota] = useState<string>('8.50');
  const [observacionNota, setObservacionNota] = useState<string>('');

  const [cargando, setCargando] = useState(true);
  const [mensajeOperacion, setMensajeOperacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(
    null
  );

  // Cargar materias asignadas al docente
  useEffect(() => {
    const cargarMaterias = async () => {
      setCargando(true);
      const token = localStorage.getItem('token');
      try {
        const resMaterias = await fetch('/api/docentes/mis-materias', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resMaterias.ok) {
          const dataMat: MateriaAlumnoData[] = await resMaterias.json();
          setMateriasData(dataMat);
          if (dataMat.length > 0) {
            setMateriaSeleccionada(dataMat[0]);
            if (dataMat[0].alumnos.length > 0) {
              setAlumnoSeleccionadoId(dataMat[0].alumnos[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar materias del docente:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarMaterias();
  }, []);

  // Cargar notas de la materia seleccionada
  useEffect(() => {
    if (!materiaSeleccionada) return;

    const cargarNotasMateria = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(
          `/api/registros?tipo=nota&materia_id=${materiaSeleccionada.materia_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const result = await res.json();
          setNotasExistentes(result);
        }
      } catch (err) {
        console.error('Error al consultar notas:', err);
      }
    };

    cargarNotasMateria();
  }, [materiaSeleccionada]);

  // Guardar nueva calificación
  const handleGuardarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeOperacion(null);

    if (!materiaSeleccionada || !alumnoSeleccionadoId || !valorNota) {
      setMensajeOperacion({ tipo: 'error', texto: 'Por favor completa todos los campos requeridos.' });
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/registros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alumno_id: alumnoSeleccionadoId,
          materia_id: materiaSeleccionada.materia_id,
          tipo: 'nota',
          valor: valorNota,
          trimestre: trimestreCarga,
          observacion: observacionNota || `${trimestreCarga}° Trimestre`,
        }),
      });

      if (res.ok) {
        setMensajeOperacion({ tipo: 'exito', texto: 'Calificación registrada con éxito.' });
        setObservacionNota('');
        const resNotas = await fetch(
          `/api/registros?tipo=nota&materia_id=${materiaSeleccionada.materia_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (resNotas.ok) {
          const data = await resNotas.json();
          setNotasExistentes(data);
        }
        onDataChanged?.();
      } else {
        const err = await res.json();
        setMensajeOperacion({
          tipo: 'error',
          texto: err.error || 'No tienes permisos para registrar en esta materia.',
        });
      }
    } catch {
      setMensajeOperacion({ tipo: 'error', texto: 'Error de conexión al guardar la nota.' });
    }
  };

  // Eliminar calificación
  const handleEliminarNota = async (idNota: string) => {
    if (!window.confirm('¿Confirma que desea eliminar este registro de calificación?')) return;

    setMensajeOperacion(null);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/registros/${idNota}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMensajeOperacion({ tipo: 'exito', texto: 'Nota eliminada correctamente.' });
        setNotasExistentes((prev) => prev.filter((n) => n._id !== idNota));
        onDataChanged?.();
      } else {
        const err = await res.json();
        setMensajeOperacion({
          tipo: 'error',
          texto: err.error || 'No se pudo eliminar la calificación.',
        });
      }
    } catch {
      setMensajeOperacion({ tipo: 'error', texto: 'Error de red al eliminar la nota.' });
    }
  };

  // Exportar calificaciones de la materia seleccionada a Excel (.xlsx)
  const handleExportarExcelMateria = () => {
    if (!materiaSeleccionada || notasExistentes.length === 0) return;

    // Calcular promedio general de la materia por alumno
    const notasPorAlumno = new Map<string, number[]>();
    notasExistentes.forEach((n) => {
      const aluId = String(typeof n.alumno_id === 'object' ? n.alumno_id?._id : n.alumno_id);
      const valNum = parseFloat(n.valor);
      if (!isNaN(valNum)) {
        const lista = notasPorAlumno.get(aluId) || [];
        lista.push(valNum);
        notasPorAlumno.set(aluId, lista);
      }
    });

    // Contar sanciones totales por alumno desde todosLosRegistros
    const sancionesPorAlumno = new Map<string, number>();
    todosLosRegistros.forEach((r) => {
      if (r.tipo === 'sancion') {
        const aluId = String(typeof r.alumno_id === 'object' ? r.alumno_id?._id : r.alumno_id);
        sancionesPorAlumno.set(aluId, (sancionesPorAlumno.get(aluId) || 0) + 1);
      }
    });

    const filas: FilaExcelRegistro[] = notasExistentes.map((n) => {
      const alu = typeof n.alumno_id === 'object' ? n.alumno_id : null;
      const aluId = String(alu?._id || n.alumno_id || '');
      const notasAlu = notasPorAlumno.get(aluId) || [];
      const promedio =
        notasAlu.length > 0
          ? (notasAlu.reduce((acc, v) => acc + v, 0) / notasAlu.length).toFixed(2)
          : '-';

      const notaNum = parseFloat(n.valor);

      return {
        dni: alu?.dni || '-',
        apellido: alu?.apellido || '-',
        nombre: alu?.nombre || '-',
        curso: materiaSeleccionada.curso || '-',
        division: materiaSeleccionada.seccion || '-',
        materia: materiaSeleccionada.nombre_materia || '-',
        nota: !isNaN(notaNum) ? notaNum.toFixed(2) : n.valor || '-',
        trimestre: n.trimestre ? `${n.trimestre}° Trimestre` : '1° Trimestre',
        promedioGeneralMateria: promedio,
        cantidadSanciones: sancionesPorAlumno.get(aluId) || 0,
      };
    });

    const nombreSeguro = materiaSeleccionada.nombre_materia
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '')
      .replace(/\s+/g, '_');

    exportarRegistrosAExcel(filas, `Calificaciones_${nombreSeguro}`);
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-slate-400 text-sm">
        Cargando grilla de Carga Trimestral de Notas...
      </div>
    );
  }

  if (materiasData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {mensajeOperacion && (
        <div
          className={`p-4 rounded-lg text-xs font-semibold ${
            mensajeOperacion.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {mensajeOperacion.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Carga Trimestral de Notas */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs lg:col-span-1 space-y-4">
          <h3 className="font-bold text-base text-[#1b2a4a] border-b border-slate-100 pb-3">
            Carga Trimestral de Notas
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Materia Asignada</label>
            <select
              value={materiaSeleccionada?.materia_id || ''}
              onChange={(e) => {
                const mat = materiasData.find((m) => m.materia_id === e.target.value);
                if (mat) {
                  setMateriaSeleccionada(mat);
                  if (mat.alumnos.length > 0) setAlumnoSeleccionadoId(mat.alumnos[0].id);
                }
              }}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
            >
              {materiasData.map((m) => (
                <option key={m.materia_id} value={m.materia_id}>
                  {m.nombre_materia} - {m.curso} ({m.seccion})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleGuardarNota} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Estudiante</label>
              <select
                value={alumnoSeleccionadoId}
                onChange={(e) => setAlumnoSeleccionadoId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
              >
                {materiaSeleccionada?.alumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.apellido}, {a.nombre} (DNI: {a.dni})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trimestre</label>
                <select
                  value={trimestreCarga}
                  onChange={(e) => setTrimestreCarga(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1° Trimestre</option>
                  <option value={2}>2° Trimestre</option>
                  <option value={3}>3° Trimestre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Calificación</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="10"
                  value={valorNota}
                  onChange={(e) => setValorNota(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Observación</label>
              <input
                type="text"
                placeholder="Ej: Evaluación Parcial / TP Integrador"
                value={observacionNota}
                onChange={(e) => setObservacionNota(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Registrar Calificación
            </button>
          </form>
        </div>

        {/* Tabla de Notas Registradas */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#1b2a4a]">
                  Calificaciones - {materiaSeleccionada?.nombre_materia}
                </h3>
                <p className="text-xs text-slate-500">
                  {materiaSeleccionada?.curso} ({materiaSeleccionada?.seccion})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportarExcelMateria}
                  disabled={notasExistentes.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Descargar Excel</span>
                </button>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-md">
                  {notasExistentes.length} Registros
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Alumno</th>
                    <th className="py-3 px-3 text-center">Trimestre</th>
                    <th className="py-3 px-3 text-center">Nota</th>
                    <th className="py-3 px-4">Observación</th>
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {notasExistentes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No hay calificaciones registradas aún en esta materia.
                      </td>
                    </tr>
                  ) : (
                    notasExistentes.map((n) => {
                      const alumno = n.alumno_id;
                      const nombreAlumno = alumno?.nombre
                        ? `${alumno.apellido}, ${alumno.nombre}`
                        : 'Alumno';

                      return (
                        <tr key={n._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold text-slate-800">{nombreAlumno}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-600">
                            {n.trimestre ? `${n.trimestre}°` : '1°'}
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-blue-700">
                            {parseFloat(n.valor).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{n.observacion || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleEliminarNota(n._id)}
                              title="Eliminar Calificación"
                              className="px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400">
            * Regla de negocio: Únicamente el docente titular de la asignatura puede modificar o eliminar calificaciones.
          </div>
        </div>
      </div>
    </div>
  );
};
