/**
 * @archivo src/components/CargaCalificacionesDocente.tsx
 * @descripción Módulo "Cargar Notas" para el Rol Docente (Panel Docente y Registros).
 * Incluye:
 * - Campo Fecha tipo calendario
 * - Desplegable de asignaturas relacionadas exclusivamente al profesor con su curso y división
 * - Lista de Trimestre (Trim. 1, Trim. 2, Trim. 3)
 * - Botón "Seleccionar Estudiante" con modal de todos los estudiantes cargados y check de selección única
 * - Campo Calificación decimal hasta 2 dígitos antes y después de la coma
 * - Campo Observación de texto libre hasta 50 caracteres
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
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

interface EstudianteModalItem {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  curso: string;
  division: string;
  turno: string;
  estado?: string;
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
  todosLosRegistros?: IRegistroAcademico[];
  onDataChanged?: () => void;
  soloFormulario?: boolean;
}

export const CargaCalificacionesDocente: React.FC<CargaCalificacionesDocenteProps> = ({
  todosLosRegistros = [],
  onDataChanged,
  soloFormulario = false,
}) => {
  const [materiasData, setMateriasData] = useState<MateriaAlumnoData[]>([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<MateriaAlumnoData | null>(null);
  const [notasExistentes, setNotasExistentes] = useState<NotaRegistro[]>([]);

  // Todos los estudiantes cargados en la base de datos para el modal de selección única
  const [estudiantesCargados, setEstudiantesCargados] = useState<EstudianteModalItem[]>([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteModalItem | null>(null);

  // Campos del formulario Cargar Notas
  const [fechaNota, setFechaNota] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [trimestreCarga, setTrimestreCarga] = useState<number>(1);
  const [valorNota, setValorNota] = useState<string>('8,50');
  const [observacionNota, setObservacionNota] = useState<string>('');

  // Modal "Seleccionar Estudiante"
  const [modalEstudiantesAbierto, setModalEstudiantesAbierto] = useState(false);
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  const [estudianteTemporalId, setEstudianteTemporalId] = useState<string>('');
  const [modalNotasAbierto, setModalNotasAbierto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeOperacion, setMensajeOperacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(
    null
  );

  const fechaInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar asignaturas relacionadas al profesor y todos los estudiantes cargados
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setCargando(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [resMaterias, resEstudiantes] = await Promise.all([
          fetch('/api/docentes/mis-materias', { headers }),
          fetch('/api/docentes/buscar-registros?alcance=todos', { headers }),
        ]);

        if (resMaterias.ok) {
          const dataMat: MateriaAlumnoData[] = await resMaterias.json();
          setMateriasData(dataMat);
          if (dataMat.length > 0) {
            setMateriaSeleccionada(dataMat[0]);
          }
        }

        if (resEstudiantes.ok) {
          const dataEst = await resEstudiantes.json();
          setEstudiantesCargados(dataEst.resultados || []);
        }
      } catch (err) {
        console.error('Error al cargar datos de Cargar Notas:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosIniciales();
  }, []);

  // Cargar notas de la materia seleccionada
  useEffect(() => {
    if (!materiaSeleccionada) {
      setNotasExistentes([]);
      return;
    }

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

  // Filtro en tiempo real dentro del modal de estudiantes
  const estudiantesFiltradosModal = useMemo(() => {
    const q = busquedaEstudiante.trim().toLowerCase();
    if (!q) return estudiantesCargados;
    return estudiantesCargados.filter((e) => {
      const texto = `${e.apellido} ${e.nombre} ${e.dni} ${e.curso} ${e.division} ${e.turno}`.toLowerCase();
      return texto.includes(q);
    });
  }, [estudiantesCargados, busquedaEstudiante]);

  // Abrir modal de selección única de estudiante
  const handleAbrirModalEstudiantes = () => {
    setBusquedaEstudiante('');
    setEstudianteTemporalId(estudianteSeleccionado?.id || '');
    setModalEstudiantesAbierto(true);
  };

  // Confirmar selección única desde el modal
  const handleConfirmarEstudianteModal = () => {
    const encontrado = estudiantesCargados.find((e) => e.id === estudianteTemporalId) || null;
    setEstudianteSeleccionado(encontrado);
    setModalEstudiantesAbierto(false);
  };

  // Control estricto de calificación decimal: hasta 2 dígitos antes y 2 después de la coma (o punto)
  const handleChangeCalificacion = (raw: string) => {
    // Permitir vacío mientras edita
    if (raw === '') {
      setValorNota('');
      return;
    }
    // Solo dígitos, coma o punto; máximo un separador y máximo 2 dígitos antes y 2 después
    const sanitized = raw.replace(/[^0-9.,]/g, '');
    if (/^\d{0,2}([.,]\d{0,2})?$/.test(sanitized)) {
      setValorNota(sanitized);
    }
  };

  // Abrir calendario nativo al hacer clic en Fecha
  const handleClickFecha = () => {
    const input = fechaInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input) {
      input.focus();
      try {
        input.showPicker?.();
      } catch {
        // Algunos navegadores bloquean showPicker si no proviene de gesto directo; el foco mantiene soporte nativo
      }
    }
  };

  // Guardar nueva calificación
  const handleGuardarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeOperacion(null);

    if (!fechaNota) {
      setMensajeOperacion({ tipo: 'error', texto: 'Por favor seleccione la fecha de la calificación.' });
      return;
    }

    if (!materiaSeleccionada) {
      setMensajeOperacion({
        tipo: 'error',
        texto: 'No tiene asignaturas relacionadas para registrar calificaciones.',
      });
      return;
    }

    if (!estudianteSeleccionado) {
      setMensajeOperacion({
        tipo: 'error',
        texto: 'Debe seleccionar un estudiante mediante el botón "Seleccionar Estudiante".',
      });
      return;
    }

    const valorConPunto = valorNota.trim().replace(',', '.');
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(valorConPunto)) {
      setMensajeOperacion({
        tipo: 'error',
        texto: 'La calificación debe tener hasta dos dígitos antes y después de la coma (ej: 8,50 o 10,00).',
      });
      return;
    }

    const numNota = parseFloat(valorConPunto);
    if (isNaN(numNota) || numNota < 0 || numNota > 10) {
      setMensajeOperacion({
        tipo: 'error',
        texto: 'La calificación debe estar entre 0,00 y 10,00.',
      });
      return;
    }

    if (observacionNota.length > 50) {
      setMensajeOperacion({
        tipo: 'error',
        texto: 'La observación no puede superar los 50 caracteres.',
      });
      return;
    }

    setGuardando(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/registros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alumno_id: estudianteSeleccionado.id,
          materia_id: materiaSeleccionada.materia_id,
          tipo: 'nota',
          fecha: fechaNota,
          valor: numNota.toFixed(2),
          trimestre: trimestreCarga,
          observacion: observacionNota.trim(),
        }),
      });

      if (res.ok) {
        setMensajeOperacion({
          tipo: 'exito',
          texto: `Calificación (${numNota.toFixed(2).replace('.', ',')}) registrada para ${estudianteSeleccionado.apellido}, ${estudianteSeleccionado.nombre}.`,
        });
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
          texto: err.error || 'No tienes permisos para registrar en esta asignatura.',
        });
      }
    } catch {
      setMensajeOperacion({ tipo: 'error', texto: 'Error de conexión al guardar la nota.' });
    } finally {
      setGuardando(false);
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
        trimestre: n.trimestre ? `Trim. ${n.trimestre}` : 'Trim. 1',
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
        Cargando módulo Cargar Notas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mensajeOperacion && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
            mensajeOperacion.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensajeOperacion.tipo === 'exito' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensajeOperacion.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeOperacion(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={soloFormulario ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {/* Formulario: Cargar Notas */}
        <div
          className={`bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4 ${
            soloFormulario ? '' : 'lg:col-span-1'
          }`}
        >
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-[#1b2a4a]">Cargar Notas</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Registra calificaciones en tus asignaturas asignadas.
              </p>
            </div>
            {soloFormulario && (
              <button
                type="button"
                onClick={() => setModalNotasAbierto(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold whitespace-nowrap cursor-pointer"
              >
                Ver notas ({notasExistentes.length})
              </button>
            )}
          </div>

          <form onSubmit={handleGuardarNota} className="space-y-4">
            {/* Fecha tipo calendario */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <div className="relative" onClick={handleClickFecha}>
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={fechaInputRef}
                  type="date"
                  required
                  value={fechaNota}
                  onChange={(e) => setFechaNota(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Asignatura relacionada al profesor (con curso y división) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Asignatura (Curso y División) <span className="text-rose-500">*</span>
              </label>
              {materiasData.length === 0 ? (
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                  No posee asignaturas asignadas actualmente.
                </div>
              ) : (
                <select
                  value={materiaSeleccionada?.materia_id || ''}
                  onChange={(e) => {
                    const mat = materiasData.find((m) => m.materia_id === e.target.value) || null;
                    setMateriaSeleccionada(mat);
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {materiasData.map((m) => (
                    <option key={m.materia_id} value={m.materia_id}>
                      {m.nombre_materia} - {m.curso} ({m.seccion})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Botón Seleccionar Estudiante -> Modal con check de selección única */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Estudiante <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 min-h-[38px] flex items-center justify-between gap-2">
                  {estudianteSeleccionado ? (
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {estudianteSeleccionado.apellido}, {estudianteSeleccionado.nombre}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        DNI: {estudianteSeleccionado.dni} • {estudianteSeleccionado.curso} ({estudianteSeleccionado.division})
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Ningún estudiante seleccionado</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAbrirModalEstudiantes}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Seleccionar Estudiante</span>
                </button>
              </div>
            </div>

            {/* Trimestre (Trim. 1, Trim. 2, Trim. 3) y Calificación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trimestre</label>
                <select
                  value={trimestreCarga}
                  onChange={(e) => setTrimestreCarga(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Trim. 1</option>
                  <option value={2}>Trim. 2</option>
                  <option value={3}>Trim. 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Calificación <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ej: 8,50"
                  value={valorNota}
                  onChange={(e) => handleChangeCalificacion(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Hasta 2 dígitos antes y después de la coma (0,00 - 10,00)
                </span>
              </div>
            </div>

            {/* Observación hasta 50 caracteres */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600">Observación</label>
                <span
                  className={`text-[10px] font-semibold ${
                    observacionNota.length >= 50 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {observacionNota.length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                placeholder="Texto libre hasta 50 caracteres..."
                value={observacionNota}
                onChange={(e) => setObservacionNota(e.target.value.slice(0, 50))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={guardando || materiasData.length === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {guardando ? 'Registrando...' : 'Registrar Calificación'}
            </button>
          </form>
        </div>

        {/* Tabla de Notas Registradas (en vista Registros y Sanciones) */}
        {!soloFormulario && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#1b2a4a]">
                    Calificaciones - {materiaSeleccionada?.nombre_materia || 'Sin asignatura asignada'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {materiaSeleccionada
                      ? `${materiaSeleccionada.curso} (${materiaSeleccionada.seccion})`
                      : 'Asigne una materia desde el módulo Materias para comenzar'}
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
                      <th className="py-3 px-4">Fecha</th>
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
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No hay calificaciones registradas aún en esta materia.
                        </td>
                      </tr>
                    ) : (
                      notasExistentes.map((n) => {
                        const alumno = n.alumno_id;
                        const nombreAlumno = alumno?.nombre
                          ? `${alumno.apellido}, ${alumno.nombre}`
                          : 'Alumno';
                        const fechaStr = n.fecha
                          ? new Date(n.fecha).toISOString().split('T')[0]
                          : '-';

                        return (
                          <tr key={n._id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {fechaStr}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{nombreAlumno}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-600 whitespace-nowrap">
                              {n.trimestre ? `Trim. ${n.trimestre}` : 'Trim. 1'}
                            </td>
                            <td className="py-3 px-3 text-center font-extrabold text-blue-700">
                              {parseFloat(n.valor).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{n.observacion || '-'}</td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
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
              * Regla de negocio: Únicamente el docente titular de la asignatura puede cargar, modificar o eliminar calificaciones.
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Ver y gestionar notas cargadas cuando soloFormulario está activo */}
      {soloFormulario && modalNotasAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setModalNotasAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#1b2a4a] text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <h4 className="text-base font-bold">
                  Calificaciones - {materiaSeleccionada?.nombre_materia || 'Sin asignatura asignada'}
                </h4>
                <p className="text-[11px] text-white/75 mt-0.5">
                  {materiaSeleccionada
                    ? `${materiaSeleccionada.curso} (${materiaSeleccionada.seccion})`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportarExcelMateria}
                  disabled={notasExistentes.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Descargar Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalNotasAbierto(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
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
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hay calificaciones registradas aún en esta materia.
                      </td>
                    </tr>
                  ) : (
                    notasExistentes.map((n) => {
                      const alumno = n.alumno_id;
                      const nombreAlumno = alumno?.nombre
                        ? `${alumno.apellido}, ${alumno.nombre}`
                        : 'Alumno';
                      const fechaStr = n.fecha
                        ? new Date(n.fecha).toISOString().split('T')[0]
                        : '-';

                      return (
                        <tr key={n._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {fechaStr}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{nombreAlumno}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-600 whitespace-nowrap">
                            {n.trimestre ? `Trim. ${n.trimestre}` : 'Trim. 1'}
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-blue-700">
                            {parseFloat(n.valor).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{n.observacion || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarNota(n._id)}
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
        </div>
      )}

      {/* MODAL: SELECCIONAR ESTUDIANTE (Todos los estudiantes cargados + check de selección única) */}
      {modalEstudiantesAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setModalEstudiantesAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Modal */}
            <div className="px-6 py-4 bg-[#1b2a4a] text-white flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-base font-bold">Seleccionar Estudiante</h4>
                <p className="text-[11px] text-white/75 mt-0.5">
                  Todos los estudiantes cargados ({estudiantesCargados.length}). Marca el check de un único estudiante para asignarle la nota.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEstudiantesAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador dentro del modal */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaEstudiante}
                  onChange={(e) => setBusquedaEstudiante(e.target.value)}
                  placeholder="Filtrar por apellido, nombre, DNI, curso o división..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {/* Listado de todos los estudiantes */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 z-10">
                  <tr>
                    <th className="py-2.5 px-4 text-center w-14">Check</th>
                    <th className="py-2.5 px-4">Apellido y Nombre</th>
                    <th className="py-2.5 px-4">DNI</th>
                    <th className="py-2.5 px-4">Curso y División</th>
                    <th className="py-2.5 px-4">Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estudiantesFiltradosModal.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No se encontraron estudiantes con el filtro ingresado.
                      </td>
                    </tr>
                  ) : (
                    estudiantesFiltradosModal.map((est) => {
                      const estaSeleccionado = estudianteTemporalId === est.id;
                      return (
                        <tr
                          key={est.id}
                          onClick={() =>
                            setEstudianteTemporalId(estaSeleccionado ? '' : est.id)
                          }
                          className={`cursor-pointer transition-colors ${
                            estaSeleccionado
                              ? 'bg-blue-50 hover:bg-blue-100/70'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={estaSeleccionado}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setEstudianteTemporalId(estaSeleccionado ? '' : est.id);
                              }}
                              className={`w-5 h-5 rounded border inline-flex items-center justify-center transition-colors cursor-pointer ${
                                estaSeleccionado
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-slate-300 text-transparent hover:border-blue-400'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {est.apellido}, {est.nombre}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{est.dni}</td>
                          <td className="py-2.5 px-4 text-slate-700">
                            {est.curso} ({est.division})
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{est.turno}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-600">
                {estudianteTemporalId ? (
                  <span>
                    Seleccionado:{' '}
                    <strong className="text-[#1b2a4a]">
                      {(() => {
                        const s = estudiantesCargados.find((x) => x.id === estudianteTemporalId);
                        return s ? `${s.apellido}, ${s.nombre} (DNI ${s.dni})` : '';
                      })()}
                    </strong>
                  </span>
                ) : (
                  <span className="text-slate-400">Seleccione un estudiante con el check</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalEstudiantesAbierto(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!estudianteTemporalId}
                  onClick={handleConfirmarEstudianteModal}
                  className="px-4 py-2 rounded-lg bg-[#1b2a4a] hover:bg-[#243761] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                >
                  Confirmar Estudiante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
