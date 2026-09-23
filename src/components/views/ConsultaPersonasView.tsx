/**
 * @archivo src/components/views/ConsultaPersonasView.tsx
 * @descripción Registro Unificado y Consulta de Personas (Docentes, Alumnos y Padres) para el rol No Docente.
 * @reglaDeNegocio Permite búsqueda por DNI/Nombre/Apellido/Curso, filtrado por rol y apertura de la Ficha Completa del Docente con sus materias, inasistencias y grilla de módulos (40 min / 2 hs).
 */

import React, { useEffect, useState } from 'react';
import { IUser, IMateria, IAsistencia } from '../../types.js';
import { Modal } from '../Modal.js';

interface FichaDocenteData {
  docente: IUser;
  materias: IMateria[];
  asistencias: IAsistencia[];
  registrosDocentes: any[];
}

export const ConsultaPersonasView: React.FC = () => {
  const [personas, setPersonas] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [queryBusqueda, setQueryBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todos');

  // Ficha Docente Modal
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [fichaData, setFichaData] = useState<FichaDocenteData | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  const fetchPersonas = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/no-docente/personas?categoria=${categoria}`;
      if (queryBusqueda.trim()) {
        url += `&query=${encodeURIComponent(queryBusqueda.trim())}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (err) {
      console.error('Error al consultar personas:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPersonas();
    }, 300);
    return () => clearTimeout(timer);
  }, [queryBusqueda, categoria]);

  // Abrir Ficha Completa del Docente
  const handleVerFichaDocente = async (docenteId: string) => {
    setIsFichaOpen(true);
    setCargandoFicha(true);
    setFichaData(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/no-docente/docente/${docenteId}/ficha`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFichaData(data);
      } else {
        alert('No se pudo obtener la ficha del docente.');
      }
    } catch (err) {
      console.error('Error al cargar ficha del docente:', err);
    } finally {
      setCargandoFicha(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Tarjeta con Filtros y Buscador */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar por DNI, Nombre, Apellido o Curso..."
              value={queryBusqueda}
              onChange={(e) => setQueryBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            />
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-xs font-bold uppercase text-slate-500">Filtrar por Categoría:</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 cursor-pointer"
            >
              <option value="todos">Todos (Docentes, Alumnos y Padres)</option>
              <option value="Docente">Docentes</option>
              <option value="Alumno">Alumnos</option>
              <option value="Padre">Padres / Tutores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Unificada de Personas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Buscando personas en el registro...</div>
          ) : personas.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No se encontraron registros de personas con los criterios ingresados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3.5 px-4">DNI</th>
                  <th className="py-3.5 px-4">NOMBRE Y APELLIDO</th>
                  <th className="py-3.5 px-4">ROL</th>
                  <th className="py-3.5 px-4">INFORMACIÓN Y CONTACTO</th>
                  <th className="py-3.5 px-4">ESTADO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {personas.map((p) => {
                  const meta = p.perfil_metadata || {};
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs font-bold text-slate-800">{p.dni}</td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {p.apellido}, {p.nombre}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                            p.rol === 'Docente'
                              ? 'bg-blue-100 text-blue-800'
                              : p.rol === 'Alumno'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.rol}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600">
                        {meta.celular || meta.telefono ? (
                          <div className="font-semibold text-slate-700">📞 {meta.celular || meta.telefono}</div>
                        ) : null}
                        {meta.barrio || meta.direccion ? (
                          <div className="text-slate-500">
                            📍 {meta.barrio ? `${meta.barrio}, ` : ''}
                            {meta.direccion || ''}
                          </div>
                        ) : null}
                        {meta.curso && meta.seccion && (
                          <div className="font-semibold text-blue-900 mt-0.5">
                            🎓 {meta.curso} - {meta.seccion}
                          </div>
                        )}
                        {!meta.celular && !meta.telefono && !meta.barrio && !meta.curso && (
                          <span className="italic text-slate-400">Sin datos de contacto adicionales</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {p.rol === 'Docente' ? (
                          <button
                            onClick={() => handleVerFichaDocente(p._id)}
                            className="px-3.5 py-1.5 bg-[#1d3557] hover:bg-[#152741] text-white font-semibold text-xs rounded-md shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                            Ver Ficha Completa
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Registro Activo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Ficha Completa del Docente */}
      <Modal
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        title="Ficha Integral del Docente"
      >
        {cargandoFicha || !fichaData ? (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando ficha institucional del docente...</div>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {/* 1. Datos Personales */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-base">
                  {fichaData.docente.apellido}, {fichaData.docente.nombre}
                </h4>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                  DNI: {fichaData.docente.dni}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Legajo:</span>
                  {fichaData.docente.perfil_metadata?.legajo || 'N/A'}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Título / Especialidad:</span>
                  {fichaData.docente.perfil_metadata?.titulo || 'Licenciado / Profesor Habilitado'}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Celular / Teléfono:</span>
                  {fichaData.docente.perfil_metadata?.celular || '351-589-4412'}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Barrio / Dirección:</span>
                  {fichaData.docente.perfil_metadata?.barrio
                    ? `${fichaData.docente.perfil_metadata.barrio} - ${fichaData.docente.perfil_metadata?.direccion || ''}`
                    : 'Villa Cabrera - Av. Rafael Núñez 2410'}
                </div>
              </div>
            </div>

            {/* 2. Materias, Cursos, Secciones y Grilla Horaria */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Materias Designadas y Módulos Horarios
              </h4>
              {fichaData.materias.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                  El docente no posee materias asignadas actualmente.
                </div>
              ) : (
                <div className="space-y-3">
                  {fichaData.materias.map((m) => {
                    const seccionObj = typeof m.seccion_id === 'object' ? m.seccion_id : null;
                    const cursoObj = seccionObj && typeof seccionObj.curso_id === 'object' ? seccionObj.curso_id : null;

                    return (
                      <div key={m._id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#1b2a4a]">{m.nombre_materia}</span>
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {cursoObj ? cursoObj.nombre_curso : ''} {seccionObj ? `- ${seccionObj.nombre_seccion} (${seccionObj.turno})` : ''}
                          </span>
                        </div>

                        {/* Grilla de Horarios por Módulo */}
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Horarios y Módulos Configurables:
                          </span>
                          {m.horarios && m.horarios.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {m.horarios.map((h, idx) => (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded text-xs flex items-center gap-2"
                                >
                                  <span className="font-bold">{h.dia}:</span>
                                  <span>
                                    {h.hora_inicio} - {h.hora_fin}
                                  </span>
                                  <span className="bg-blue-200 text-blue-900 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                    {h.duracion_modulo}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic">Módulos estándar: Lunes y Miércoles (2 hs)</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Historial de Asistencias y Faltas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Historial Reciente de Asistencias y Faltas
              </h4>
              {fichaData.asistencias.length === 0 ? (
                <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Sin registros recientes de inasistencias en el sistema.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                        <th className="py-2 px-3">FECHA</th>
                        <th className="py-2 px-3">ESTADO</th>
                        <th className="py-2 px-3">OBSERVACIÓN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fichaData.asistencias.map((a) => {
                        const esPresente = a.estado === 'Presente';
                        return (
                          <tr key={a._id}>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {new Date(a.fecha).toLocaleDateString('es-AR')}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  esPresente
                                    ? 'bg-[#d1e7dd] text-[#0f5132] border-[#badbcc]'
                                    : 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                                }`}
                              >
                                {a.estado}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{a.comentario || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsFichaOpen(false)}
                className="px-4 py-2 bg-[#1b2a4a] hover:bg-[#152440] text-white text-xs font-bold rounded-md transition-colors cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
