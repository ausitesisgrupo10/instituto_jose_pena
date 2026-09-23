/**
 * @archivo src/components/views/DocenteDashboardView.tsx
 * @descripción Dashboard exclusivo para el Rol Docente en el Instituto José Peña.
 * @reglaDeNegocio Permite al docente consultar sus datos personales, ver su grilla horaria, sus inasistencias/actas y gestionar exclusivamente las notas de sus materias.
 */

import React, { useEffect, useState } from 'react';
import { IUser } from '../../types.js';

interface DocenteDashboardViewProps {
  usuario: IUser | null;
  tabInicial?: 'notas' | 'horarios' | 'inasistencias';
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

interface InasistenciasDocente {
  resumen: {
    presentes: number;
    ausentes: number;
    tardanzas: number;
    licencias: number;
    total: number;
  };
  listado: Array<{
    id: string;
    fecha: string;
    estado: string;
    observacion: string;
  }>;
}

interface GrillaHoraria {
  hora: string;
  modulo: number;
  dias: Record<string, { materia: string; curso: string; seccion: string; aula: string } | null>;
}

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

export const DocenteDashboardView: React.FC<DocenteDashboardViewProps> = ({ usuario, tabInicial }) => {
  const [tabActiva, setTabActiva] = useState<'notas' | 'horarios' | 'inasistencias'>(tabInicial || 'notas');
  const [perfil, setPerfil] = useState<PerfilDocente | null>(null);
  const [inasistencias, setInasistencias] = useState<InasistenciasDocente | null>(null);
  const [horarios, setHorarios] = useState<GrillaHoraria[]>([]);
  const [materiasData, setMateriasData] = useState<MateriaAlumnoData[]>([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<MateriaAlumnoData | null>(null);

  // Estados de notas
  const [notasExistentes, setNotasExistentes] = useState<NotaRegistro[]>([]);
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<string>('');
  const [trimestreCarga, setTrimestreCarga] = useState<number>(1);
  const [valorNota, setValorNota] = useState<string>('8.50');
  const [observacionNota, setObservacionNota] = useState<string>('');

  const [cargando, setCargando] = useState(true);
  const [mensajeOperacion, setMensajeOperacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(
    null
  );

  // Cargar datos principales del docente
  useEffect(() => {
    const cargarDatosDocente = async () => {
      setCargando(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // 1. Perfil
        const resPerfil = await fetch('/api/docentes/perfil', { headers });
        if (resPerfil.ok) {
          const dataPerfil = await resPerfil.json();
          setPerfil(dataPerfil);
        }

        // 2. Horarios
        const resHorarios = await fetch('/api/docentes/horarios', { headers });
        if (resHorarios.ok) {
          const dataHorarios = await resHorarios.json();
          setHorarios(dataHorarios.grilla || []);
        }

        // 3. Inasistencias y Actas
        const resInas = await fetch('/api/docentes/mis-inasistencias', { headers });
        if (resInas.ok) {
          const dataInas = await resInas.json();
          setInasistencias(dataInas);
        }

        // 4. Mis Materias y Alumnos
        const resMaterias = await fetch('/api/docentes/mis-materias', { headers });
        if (resMaterias.ok) {
          const dataMat = await resMaterias.json();
          setMateriasData(dataMat);
          if (dataMat.length > 0) {
            setMateriaSeleccionada(dataMat[0]);
            if (dataMat[0].alumnos.length > 0) {
              setAlumnoSeleccionadoId(dataMat[0].alumnos[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar panel docente:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosDocente();
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

  // Manejador para guardar / crear nota
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
        // Recargar notas
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
      } else {
        const err = await res.json();
        setMensajeOperacion({
          tipo: 'error',
          texto: err.error || 'No tienes permisos para registrar en esta materia.',
        });
      }
    } catch (err) {
      setMensajeOperacion({ tipo: 'error', texto: 'Error de conexión al guardar la nota.' });
    }
  };

  // Manejador para eliminar nota
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
      } else {
        const err = await res.json();
        setMensajeOperacion({
          tipo: 'error',
          texto: err.error || 'No se pudo eliminar la calificación.',
        });
      }
    } catch (err) {
      setMensajeOperacion({ tipo: 'error', texto: 'Error de red al eliminar la nota.' });
    }
  };

  if (cargando) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium text-sm">
        Cargando Panel Docente...
      </div>
    );
  }

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

      {/* Navegación por Pestañas Internas del Panel Docente */}
      <div className="flex border-b border-slate-200 space-x-4 text-sm font-semibold">
        <button
          onClick={() => setTabActiva('notas')}
          className={`pb-3 border-b-2 transition-colors ${
            tabActiva === 'notas'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📘 Carga de Calificaciones
        </button>
        <button
          onClick={() => setTabActiva('horarios')}
          className={`pb-3 border-b-2 transition-colors ${
            tabActiva === 'horarios'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🗓️ Grilla Horaria
        </button>
        <button
          onClick={() => setTabActiva('inasistencias')}
          className={`pb-3 border-b-2 transition-colors ${
            tabActiva === 'inasistencias'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📋 Mis Inasistencias y Actas ({inasistencias?.resumen.ausentes || 0})
        </button>
      </div>

      {/* MENSAJES DE OPERACIÓN */}
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

      {/* VISTA 1: CARGA Y EDICIÓN DE NOTAS */}
      {tabActiva === 'notas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de Carga */}
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
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
              >
                Registrar Calificación
              </button>
            </form>
          </div>

          {/* Tabla de Notas Registradas */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#1b2a4a]">
                    Calificaciones - {materiaSeleccionada?.nombre_materia}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {materiaSeleccionada?.curso} ({materiaSeleccionada?.seccion})
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-md">
                  {notasExistentes.length} Registros
                </span>
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
                                className="px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded"
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
      )}

      {/* VISTA 2: GRILLA HORARIA */}
      {tabActiva === 'horarios' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-base text-[#1b2a4a]">Grilla Horaria Docente</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Horario semanal de dictado de clases asignado para el ciclo lectivo actual.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 text-center border-r border-slate-200 w-28">Módulo / Hora</th>
                  <th className="py-3.5 px-4 text-center w-1/5">Lunes</th>
                  <th className="py-3.5 px-4 text-center w-1/5">Martes</th>
                  <th className="py-3.5 px-4 text-center w-1/5">Miércoles</th>
                  <th className="py-3.5 px-4 text-center w-1/5">Jueves</th>
                  <th className="py-3.5 px-4 text-center w-1/5">Viernes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {horarios.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-center font-bold text-slate-600 bg-slate-50 border-r border-slate-200">
                      <div>Módulo {b.modulo}</div>
                      <div className="text-[10px] font-normal text-slate-400">{b.hora}</div>
                    </td>
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => {
                      const slot = b.dias[dia];
                      return (
                        <td key={dia} className="py-3 px-3 text-center border-r border-slate-100 last:border-r-0">
                          {slot ? (
                            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-left">
                              <p className="font-extrabold text-blue-900 text-xs">{slot.materia}</p>
                              <p className="text-[11px] font-medium text-slate-600">
                                {slot.curso} - {slot.seccion}
                              </p>
                              <span className="inline-block mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                {slot.aula}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-light">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: INASISTENCIAS Y ACTAS DOCENTES */}
      {tabActiva === 'inasistencias' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-xs font-bold text-emerald-800 uppercase">Presentes</span>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">{inasistencias?.resumen.presentes || 0}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <span className="text-xs font-bold text-rose-800 uppercase">Ausentes</span>
              <p className="text-2xl font-extrabold text-rose-900 mt-1">{inasistencias?.resumen.ausentes || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-xs font-bold text-amber-800 uppercase">Tardanzas</span>
              <p className="text-2xl font-extrabold text-amber-900 mt-1">{inasistencias?.resumen.tardanzas || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <span className="text-xs font-bold text-blue-800 uppercase">Licencias</span>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">{inasistencias?.resumen.licencias || 0}</p>
            </div>
          </div>

          {/* Listado de Inasistencias y Actas */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-base text-[#1b2a4a]">
                Registro Administrativo de Asistencias y Actas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial cargado por el departamento de preceptoria / secretaría no docente.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-6">Fecha</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-6">Observación / Acta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!inasistencias || inasistencias.listado.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        No registra inasistencias ni actas administrativas.
                      </td>
                    </tr>
                  ) : (
                    inasistencias.listado.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-6 font-bold text-slate-800">{item.fecha}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              item.estado === 'Presente'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.estado === 'Ausente'
                                ? 'bg-rose-100 text-rose-800'
                                : item.estado === 'Tardanza'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">{item.observacion}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
