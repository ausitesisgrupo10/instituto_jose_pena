/**
 * @archivo src/components/views/RegistrosView.tsx
 * @descripción Vista para la consulta y gestión de Registros Académicos (Calificaciones, Inasistencias, Sanciones).
 * @reglaDeNegocio Muestra la columna CURSO Y SECCIÓN y restringe edición/eliminación según titularidad docente o rol administrativo.
 */

import React, { useEffect, useState } from 'react';
import { IMateria, IRegistroAcademico, IUser } from '../../types.js';
import { Modal } from '../Modal.js';

interface RegistrosViewProps {
  usuario: IUser | null;
}

export const RegistrosView: React.FC<RegistrosViewProps> = ({ usuario }) => {
  const [registros, setRegistros] = useState<IRegistroAcademico[]>([]);
  const [alumnos, setAlumnos] = useState<IUser[]>([]);
  const [materias, setMaterias] = useState<IMateria[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros Avanzados y Búsqueda Multicriterio
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [cursoSeccionFiltro, setCursoSeccionFiltro] = useState<string>('todos');
  const [alumnoFiltro, setAlumnoFiltro] = useState<string>('todos');

  // Modal Estado (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [registroEditandoId, setRegistroEditandoId] = useState<string | null>(null);

  // Campos de formulario modal
  const [alumnoIdModal, setAlumnoIdModal] = useState('');
  const [materiaIdModal, setMateriaIdModal] = useState('');
  const [tipoModal, setTipoModal] = useState<'nota' | 'inasistencia' | 'sancion'>('nota');
  const [trimestreModal, setTrimestreModal] = useState<number>(1);
  const [valorModal, setValorModal] = useState('');
  const [observacionModal, setObservacionModal] = useState('');
  const [fechaModal, setFechaModal] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);

  const userRol = usuario?.rol || 'Alumno';

  // Obtener nombre formateado de Curso y Sección para un registro
  const getCursoSeccionText = (r: IRegistroAcademico): string => {
    const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;
    if (!matObj) return 'Sin asignar';
    const secObj = typeof matObj.seccion_id === 'object' ? matObj.seccion_id : null;
    if (!secObj) return 'Sin asignar';
    const curObj = typeof secObj.curso_id === 'object' ? secObj.curso_id : null;

    const curso = curObj?.nombre_curso || '';
    const seccion = secObj.nombre_seccion || '';

    if (curso && seccion) return `${curso} - ${seccion}`;
    if (seccion) return seccion;
    return 'Sin asignar';
  };

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resReg, resUsers, resMat] = await Promise.all([
        fetch('/api/registros', { headers }),
        fetch('/api/usuarios', { headers }),
        fetch('/api/materias', { headers }),
      ]);

      if (resReg.ok) {
        const dataReg = await resReg.json();
        setRegistros(dataReg);
      }

      if (resUsers.ok) {
        const dataUsers: IUser[] = await resUsers.json();
        setAlumnos(dataUsers.filter((u) => u.rol === 'Alumno'));
      }

      if (resMat.ok) {
        const dataMat = await resMat.json();
        setMaterias(dataMat);
      }
    } catch (err) {
      console.error('Error al obtener registros académicos:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  // Extraer lista única de Cursos/Secciones presentes en los registros
  const listaCursosSecciones = Array.from(
    new Set(registros.map((r) => getCursoSeccionText(r)).filter((cs) => cs !== 'Sin asignar'))
  );

  // Filtrado multicriterio en el frontend
  const registrosFiltrados = registros.filter((r) => {
    const aluObj = typeof r.alumno_id === 'object' ? r.alumno_id : null;
    const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;
    const cursoSeccion = getCursoSeccionText(r);

    // Filtro por tipo
    if (tipoFiltro !== 'todos' && r.tipo !== tipoFiltro) return false;

    // Filtro por curso/sección
    if (cursoSeccionFiltro !== 'todos' && cursoSeccion !== cursoSeccionFiltro) return false;

    // Filtro por alumno específico
    if (alumnoFiltro !== 'todos' && String(aluObj?._id) !== String(alumnoFiltro)) return false;

    // Búsqueda por texto (Nombre, Apellido, Materia, Concepto/Valor, Curso/Sección)
    if (busquedaTexto.trim() !== '') {
      const query = busquedaTexto.toLowerCase();
      const nombreCompleto = `${aluObj?.nombre || ''} ${aluObj?.apellido || ''}`.toLowerCase();
      const materiaNombre = (matObj?.nombre_materia || '').toLowerCase();
      const valorText = (r.valor || '').toLowerCase();
      const observacionText = (r.observacion || '').toLowerCase();
      const csText = cursoSeccion.toLowerCase();

      const coincide =
        nombreCompleto.includes(query) ||
        materiaNombre.includes(query) ||
        valorText.includes(query) ||
        observacionText.includes(query) ||
        csText.includes(query);

      if (!coincide) return false;
    }

    return true;
  });

  // Cálculo de resumen para Alumnos / Padres
  const calcularResumenAlumno = () => {
    const notas = registros.filter((r) => r.tipo === 'nota');
    const inasistencias = registros.filter((r) => r.tipo === 'inasistencia');
    const sanciones = registros.filter((r) => r.tipo === 'sancion');

    let suma = 0;
    let cantNotas = 0;
    notas.forEach((n) => {
      const val = parseFloat(n.valor);
      if (!isNaN(val)) {
        suma += val;
        cantNotas++;
      }
    });

    const promedio = cantNotas > 0 ? (suma / cantNotas).toFixed(2) : 'N/A';

    return { promedio, totalInasistencias: inasistencias.length, totalSanciones: sanciones.length };
  };

  const resumen = calcularResumenAlumno();

  // Abrir modal en modo creación
  const handleOpenModalCrear = () => {
    setModoEdicion(false);
    setRegistroEditandoId(null);

    // Filtrar materias asignadas si es docente
    const materiasDisponibles =
      userRol === 'Docente'
        ? materias.filter((m) => {
            const docId = typeof m.docente_id === 'object' ? m.docente_id?._id : m.docente_id;
            return String(docId) === String(usuario?._id);
          })
        : materias;

    setAlumnoIdModal(alumnos[0]?._id || '');
    setMateriaIdModal(materiasDisponibles[0]?._id || materias[0]?._id || '');
    setValorModal('');
    setTrimestreModal(1);
    setObservacionModal('');
    setFechaModal(new Date().toISOString().split('T')[0]);

    if (userRol === 'Docente') setTipoModal('nota');
    else if (userRol === 'No Docente') setTipoModal('inasistencia');
    else setTipoModal('nota');

    setIsModalOpen(true);
  };

  // Abrir modal en modo edición
  const handleOpenModalEditar = (r: IRegistroAcademico) => {
    const aluObj = typeof r.alumno_id === 'object' ? r.alumno_id : null;
    const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;

    setModoEdicion(true);
    setRegistroEditandoId(r._id);
    setAlumnoIdModal(aluObj?._id || String(r.alumno_id));
    setMateriaIdModal(matObj?._id || String(r.materia_id));
    setTipoModal(r.tipo as any);
    setValorModal(r.valor);
    setTrimestreModal(r.trimestre || 1);
    setFechaModal(r.fecha ? new Date(r.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setObservacionModal(r.observacion || '');

    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnoIdModal || !materiaIdModal || !valorModal) {
      alert('Por favor complete todos los campos requeridos.');
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
        alumno_id: alumnoIdModal,
        materia_id: materiaIdModal,
        tipo: tipoModal,
        valor: valorModal,
        trimestre: tipoModal === 'nota' ? trimestreModal : undefined,
        fecha: fechaModal,
        observacion: observacionModal,
      };

      let res: Response;
      if (modoEdicion && registroEditandoId) {
        res = await fetch(`/api/registros/${registroEditandoId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/registros', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchDatos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al procesar el registro académico.');
      }
    } catch (err) {
      console.error('Error al guardar registro:', err);
      alert('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar
  const handleEliminar = async (id: string) => {
    if (!confirm('¿Confirma que desea eliminar este registro académico? Esta acción no se puede deshacer.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/registros/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchDatos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar el registro.');
      }
    } catch (err) {
      console.error('Error al eliminar registro:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Tarjeta Resumen para Alumnos / Padres */}
      {(userRol === 'Alumno' || userRol === 'Padre') && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#582EEF]/10 border border-[#582EEF]/20 rounded-lg text-center">
            <p className="text-xs font-bold text-[#582EEF] uppercase tracking-wider">Promedio General</p>
            <p className="text-3xl font-extrabold text-[#582EEF] mt-1">{resumen.promedio}</p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Inasistencias</p>
            <p className="text-3xl font-extrabold text-amber-900 mt-1">{resumen.totalInasistencias}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Total Sanciones</p>
            <p className="text-3xl font-extrabold text-red-900 mt-1">{resumen.totalSanciones}</p>
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Barra de Búsqueda y Filtros Multicriterio */}
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Input de Búsqueda por Texto */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar por Alumno, Materia, Concepto o Curso/Sección..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              />
            </div>

            {/* Botón Cargar Registro */}
            {(userRol === 'Admin' || userRol === 'Docente' || userRol === 'No Docente') && (
              <button
                onClick={handleOpenModalCrear}
                className="px-5 py-2 bg-[#1b2a4a] hover:bg-[#23365c] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Nuevo registro
              </button>
            )}
          </div>

          {/* Desplegables de Filtro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Filtro por Tipo */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tipo de Registro
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="nota">Calificaciones (Notas)</option>
                <option value="inasistencia">Inasistencias</option>
                <option value="sancion">Sanciones</option>
              </select>
            </div>

            {/* Filtro por Curso y Sección */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Curso y Sección
              </label>
              <select
                value={cursoSeccionFiltro}
                onChange={(e) => setCursoSeccionFiltro(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              >
                <option value="todos">Todos los Cursos / Secciones</option>
                {listaCursosSecciones.map((cs, idx) => (
                  <option key={idx} value={cs}>
                    {cs}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Alumno */}
            {(userRol === 'Admin' || userRol === 'Docente' || userRol === 'No Docente') && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Alumno Específico
                </label>
                <select
                  value={alumnoFiltro}
                  onChange={(e) => setAlumnoFiltro(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                >
                  <option value="todos">Todos los Alumnos</option>
                  {alumnos.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.apellido}, {a.nombre} (DNI: {a.dni})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Registros Académicos */}
        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando registros académicos...</div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No se encontraron registros académicos que coincidan con los criterios.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3.5 px-4">ALUMNO</th>
                  <th className="py-3.5 px-4">CURSO Y SECCIÓN</th>
                  <th className="py-3.5 px-4">MATERIA</th>
                  <th className="py-3.5 px-4">TIPO</th>
                  <th className="py-3.5 px-4">CONCEPTO / VALOR</th>
                  <th className="py-3.5 px-4">FECHA</th>
                  <th className="py-3.5 px-4">OBSERVACIÓN</th>
                  {(userRol === 'Admin' || userRol === 'Docente' || userRol === 'No Docente') && (
                    <th className="py-3.5 px-4 text-right">ACCIONES</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {registrosFiltrados.map((r) => {
                  const aluObj = typeof r.alumno_id === 'object' ? r.alumno_id : null;
                  const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;
                  const cursoSeccionText = getCursoSeccionText(r);

                  // Verificar si el docente logueado es titular de la materia
                  const docIdMateria = typeof matObj?.docente_id === 'object' ? matObj?.docente_id?._id : matObj?.docente_id;
                  const esTitularDocente =
                    userRol === 'Admin' ||
                    userRol === 'No Docente' ||
                    (userRol === 'Docente' && String(docIdMateria) === String(usuario?._id));

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {aluObj ? `${aluObj.apellido}, ${aluObj.nombre}` : 'N/A'}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                          {cursoSeccionText}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-800">{matObj?.nombre_materia || 'N/A'}</td>
                      <td className="py-4 px-4 capitalize">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md ${
                            r.tipo === 'nota'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : r.tipo === 'inasistencia'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {r.tipo}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {r.valor}
                        {r.tipo === 'nota' && r.trimestre && (
                          <span className="ml-1 text-xs font-normal text-slate-400">({r.trimestre}° Trim.)</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono">
                        {r.fecha ? new Date(r.fecha).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">{r.observacion || '-'}</td>
                      {(userRol === 'Admin' || userRol === 'Docente' || userRol === 'No Docente') && (
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {esTitularDocente ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleOpenModalEditar(r)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md transition-colors cursor-pointer border border-slate-200"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminar(r._id)}
                                className="px-2.5 py-1 bg-[#dc3545] hover:bg-red-700 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Lectura</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Cargar / Editar Registro Académico */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modoEdicion ? 'Modificar Registro Académico' : 'Nuevo Registro Académico'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Alumno
            </label>
            <select
              value={alumnoIdModal}
              onChange={(e) => setAlumnoIdModal(e.target.value)}
              disabled={modoEdicion}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Seleccione Alumno...</option>
              {alumnos.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.apellido}, {a.nombre} (DNI: {a.dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Materia
            </label>
            <select
              value={materiaIdModal}
              onChange={(e) => setMateriaIdModal(e.target.value)}
              disabled={modoEdicion}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-500"
              required
            >
              <option value="">Seleccione Materia...</option>
              {materias.map((m) => {
                const docId = typeof m.docente_id === 'object' ? m.docente_id?._id : m.docente_id;
                const esPropia = String(docId) === String(usuario?._id);
                return (
                  <option key={m._id} value={m._id}>
                    {m.nombre_materia} {userRol === 'Docente' ? (esPropia ? '(Mi Asignatura)' : '(Otro Docente)') : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Tipo
              </label>
              <select
                value={tipoModal}
                onChange={(e) => setTipoModal(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              >
                <option value="nota">Calificación (Nota)</option>
                <option value="inasistencia">Inasistencia</option>
                <option value="sancion">Sanción Disciplinaria</option>
              </select>
            </div>

            {tipoModal === 'nota' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Trimestre
                </label>
                <select
                  value={trimestreModal}
                  onChange={(e) => setTrimestreModal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
                >
                  <option value={1}>1° Trimestre</option>
                  <option value={2}>2° Trimestre</option>
                  <option value={3}>3° Trimestre</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Valor / Calificación / Concepto
            </label>
            <input
              type="text"
              value={valorModal}
              onChange={(e) => setValorModal(e.target.value)}
              placeholder={
                tipoModal === 'nota'
                  ? 'Ej: 8, 9.50, 10'
                  : tipoModal === 'inasistencia'
                  ? 'Ej: Ausente, Media Falta'
                  : 'Ej: Amonestación'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              required
            />
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Observación
            </label>
            <textarea
              value={observacionModal}
              onChange={(e) => setObservacionModal(e.target.value)}
              placeholder="Detalles adicionales u observaciones pedagógicas..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-[#1b2a4a] hover:bg-[#23365c] text-white text-xs font-semibold rounded-md transition-colors"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

