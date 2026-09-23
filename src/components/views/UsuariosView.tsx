/**
 * @archivo src/components/views/UsuariosView.tsx
 * @descripción Vista para la administración de Usuarios (ABM) del Instituto José Peña.
 * @funcionalidad Soporte de campos dinámicos condicionales (Curso, Sección, Turno) para el rol "Alumno",
 * precarga en edición y persistencia íntegra a través de la API REST (/api/usuarios).
 */

import React, { useEffect, useState, useMemo } from 'react';
import { IUser, UserRole, ICurso, ISeccion } from '../../types.js';
import { Modal } from '../Modal.js';

export const UsuariosView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<IUser[]>([]);
  const [cursos, setCursos] = useState<ICurso[]>([]);
  const [secciones, setSecciones] = useState<ISeccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [rol, setRol] = useState<UserRole>('Alumno');
  const [password, setPassword] = useState('123456');
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');

  // Campos condicionales para Alumno
  const [cursoId, setCursoId] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [turno, setTurno] = useState('Mañana');

  const [guardando, setGuardando] = useState(false);

  // Cargar lista de usuarios desde la API
  const fetchUsuarios = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/usuarios?rol=${filtroRol}`;
      if (busqueda) url += `&search=${encodeURIComponent(busqueda)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setCargando(false);
    }
  };

  // Cargar Cursos y Secciones desde los endpoints del servidor
  const fetchCursosYSecciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resCursos, resSecciones] = await Promise.all([
        fetch('/api/cursos', { headers }),
        fetch('/api/secciones', { headers }),
      ]);

      if (resCursos.ok) {
        const dataCursos = await resCursos.json();
        setCursos(dataCursos);
      }
      if (resSecciones.ok) {
        const dataSecciones = await resSecciones.json();
        setSecciones(dataSecciones);
      }
    } catch (err) {
      console.error('Error al cargar cursos y secciones:', err);
    }
  };

  useEffect(() => {
    fetchCursosYSecciones();
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [filtroRol, busqueda]);

  // Secciones filtradas según el Curso seleccionado
  const seccionesDisponibles = useMemo(() => {
    if (!cursoId) return secciones;
    const filtradas = secciones.filter((s) => {
      const cId = typeof s.curso_id === 'object' ? s.curso_id?._id : s.curso_id;
      return cId === cursoId;
    });
    // Si ninguna sección coincide con el curso seleccionado, permitimos ver todas como resguardo
    return filtradas.length > 0 ? filtradas : secciones;
  }, [secciones, cursoId]);

  // Manejador del cambio de Curso: ajusta la Sección y el Turno sugerido
  const handleCursoChange = (nuevoCursoId: string) => {
    setCursoId(nuevoCursoId);
    if (nuevoCursoId) {
      const seccionesDelCurso = secciones.filter((s) => {
        const cId = typeof s.curso_id === 'object' ? s.curso_id?._id : s.curso_id;
        return cId === nuevoCursoId;
      });

      const seccionSigueValida = seccionesDelCurso.some((s) => s._id === seccionId);
      if (!seccionSigueValida) {
        if (seccionesDelCurso.length > 0) {
          setSeccionId(seccionesDelCurso[0]._id);
          if (seccionesDelCurso[0].turno) {
            setTurno(seccionesDelCurso[0].turno);
          }
        } else {
          setSeccionId('');
        }
      }
    }
  };

  // Manejador del cambio de Sección: auto-selecciona el curso y turno si están vacíos
  const handleSeccionChange = (nuevaSeccionId: string) => {
    setSeccionId(nuevaSeccionId);
    const secObj = secciones.find((s) => s._id === nuevaSeccionId);
    if (secObj) {
      const secCursoId = typeof secObj.curso_id === 'object' ? secObj.curso_id?._id : secObj.curso_id;
      if (secCursoId && (!cursoId || cursoId !== secCursoId)) {
        setCursoId(secCursoId);
      }
      if (secObj.turno) {
        setTurno(secObj.turno);
      }
    }
  };

  // Abrir Modal para Crear Usuario
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setApellido('');
    setDni('');
    setRol('Alumno');
    setPassword('123456');
    setEstado('Activo');

    const primerCurso = cursos.length > 0 ? cursos[0]._id : '';
    setCursoId(primerCurso);

    if (primerCurso) {
      const seccionesDelPrimerCurso = secciones.filter((s) => {
        const cId = typeof s.curso_id === 'object' ? s.curso_id?._id : s.curso_id;
        return cId === primerCurso;
      });
      if (seccionesDelPrimerCurso.length > 0) {
        setSeccionId(seccionesDelPrimerCurso[0]._id);
        setTurno(seccionesDelPrimerCurso[0].turno || 'Mañana');
      } else {
        setSeccionId(secciones.length > 0 ? secciones[0]._id : '');
        setTurno('Mañana');
      }
    } else {
      setSeccionId('');
      setTurno('Mañana');
    }

    setIsModalOpen(true);
  };

  // Abrir Modal para Editar Usuario existente y precargar datos
  const handleOpenEditModal = (u: IUser) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setApellido(u.apellido);
    setDni(u.dni);
    setRol(u.rol);
    setPassword('');
    setEstado(u.estado);

    if (u.rol === 'Alumno') {
      // 1. Precargar curso_id
      let targetCursoId = '';
      if (u.curso_id) {
        targetCursoId = typeof u.curso_id === 'object' ? u.curso_id._id : u.curso_id;
      } else if (u.perfil_metadata?.curso_id) {
        targetCursoId = u.perfil_metadata.curso_id;
      } else if (u.perfil_metadata?.curso) {
        const matchingCurso = cursos.find(
          (c) => c.nombre_curso.toLowerCase() === u.perfil_metadata?.curso?.toLowerCase()
        );
        if (matchingCurso) targetCursoId = matchingCurso._id;
      }

      // 2. Precargar seccion_id
      let targetSeccionId = '';
      if (u.seccion_id) {
        targetSeccionId = typeof u.seccion_id === 'object' ? u.seccion_id._id : u.seccion_id;
      } else if (u.perfil_metadata?.seccion_id) {
        targetSeccionId = u.perfil_metadata.seccion_id;
      } else if (u.perfil_metadata?.seccion) {
        const matchingSeccion = secciones.find(
          (s) => s.nombre_seccion.toLowerCase() === u.perfil_metadata?.seccion?.toLowerCase()
        );
        if (matchingSeccion) targetSeccionId = matchingSeccion._id;
      }

      // Si no tiene curso pero tiene sección, deducir curso de la sección
      if (!targetCursoId && targetSeccionId) {
        const secObj = secciones.find((s) => s._id === targetSeccionId);
        if (secObj) {
          targetCursoId = typeof secObj.curso_id === 'object' ? secObj.curso_id._id : secObj.curso_id;
        }
      }

      // 3. Precargar turno
      let targetTurno = u.turno || u.perfil_metadata?.turno || '';
      if (!targetTurno && targetSeccionId) {
        const secObj = secciones.find((s) => s._id === targetSeccionId);
        if (secObj?.turno) targetTurno = secObj.turno;
      }
      if (!targetTurno) targetTurno = 'Mañana';

      setCursoId(targetCursoId);
      setSeccionId(targetSeccionId);
      setTurno(targetTurno);
    } else {
      setCursoId('');
      setSeccionId('');
      setTurno('Mañana');
    }

    setIsModalOpen(true);
  };

  // Enviar formulario (Crear / Editar) con persistencia garantizada en la API
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingUser ? `/api/usuarios/${editingUser._id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

      const body: any = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        rol,
        estado,
      };

      if (password) body.password = password;

      // Si el rol es Alumno, incluir curso_id, seccion_id y turno en la petición
      if (rol === 'Alumno') {
        body.curso_id = cursoId || null;
        body.seccion_id = seccionId || null;
        body.turno = turno || 'Mañana';
        body.perfil_metadata = {
          ...(editingUser?.perfil_metadata || {}),
          curso_id: cursoId || null,
          seccion_id: seccionId || null,
          turno: turno || 'Mañana',
        };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsuarios();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar el usuario.');
      }
    } catch (err) {
      console.error('Error al guardar usuario:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar usuario
  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchUsuarios();
      } else {
        alert('Error al eliminar el usuario.');
      }
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
    }
  };

  // Badge Estilizado según el Rol
  const getRolBadge = (r: UserRole) => {
    switch (r) {
      case 'Admin':
        return 'bg-[#e2d9f3] text-[#593196] border border-purple-200';
      case 'Docente':
        return 'bg-[#d0e1fd] text-[#084298] border border-blue-200';
      case 'Alumno':
        return 'bg-[#582EEF]/10 text-[#582EEF] border border-[#582EEF]/20';
      case 'Padre':
        return 'bg-[#fff3cd] text-[#664d03] border border-amber-200';
      case 'No Docente':
        return 'bg-[#e2e3e5] text-[#41464b] border border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Formato de detalle de cursada para mostrar en la tabla de Alumnos
  const getDetalleAlumno = (u: IUser): string | null => {
    if (u.rol !== 'Alumno') return null;

    let cursoStr = '';
    if (u.curso_id && typeof u.curso_id === 'object' && u.curso_id.nombre_curso) {
      cursoStr = u.curso_id.nombre_curso;
    } else if (u.perfil_metadata?.curso) {
      cursoStr = u.perfil_metadata.curso;
    } else if (u.curso_id) {
      const match = cursos.find((c) => c._id === u.curso_id);
      if (match) cursoStr = match.nombre_curso;
    }

    let seccionStr = '';
    if (u.seccion_id && typeof u.seccion_id === 'object' && u.seccion_id.nombre_seccion) {
      seccionStr = u.seccion_id.nombre_seccion;
    } else if (u.perfil_metadata?.seccion) {
      seccionStr = u.perfil_metadata.seccion;
    } else if (u.seccion_id) {
      const match = secciones.find((s) => s._id === u.seccion_id);
      if (match) seccionStr = match.nombre_seccion;
    }

    const turnoStr = u.turno || u.perfil_metadata?.turno || '';

    const elementos: string[] = [];
    if (cursoStr) elementos.push(cursoStr);
    if (seccionStr) elementos.push(seccionStr);
    if (turnoStr) elementos.push(turnoStr);

    return elementos.length > 0 ? elementos.join(' • ') : null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-6" id="view-usuarios-container">
      {/* Contenedor Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="card-usuarios-main">
        {/* Barra de Búsqueda, Filtros y Nuevo Usuario */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input Búsqueda */}
            <input
              id="input-busqueda-usuario"
              type="text"
              placeholder="Buscar por DNI, Nombre o Apellido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20 min-w-[260px]"
            />

            {/* Filtro por Rol */}
            <select
              id="select-filtro-rol-usuario"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            >
              <option value="Todos">Todos los Roles</option>
              <option value="Admin">Administrador</option>
              <option value="Docente">Docente</option>
              <option value="No Docente">No Docente</option>
              <option value="Alumno">Alumno</option>
              <option value="Padre">Padre / Tutor</option>
            </select>
          </div>

          <button
            id="btn-abrir-modal-crear-usuario"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#18243b] hover:bg-[#202f4d] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            + Nuevo usuario
          </button>
        </div>

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto p-6" id="tabla-usuarios-wrapper">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No se encontraron usuarios.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm" id="tabla-usuarios-listado">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">NOMBRE Y APELLIDO</th>
                  <th className="py-3.5 px-4">DNI</th>
                  <th className="py-3.5 px-4">ROL / CURSADA</th>
                  <th className="py-3.5 px-4">ESTADO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usuarios.map((u) => {
                  const detalleAlumno = getDetalleAlumno(u);
                  return (
                    <tr key={u._id} id={`fila-usuario-${u._id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {u.apellido}, {u.nombre}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">{u.dni}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md w-fit ${getRolBadge(
                              u.rol
                            )}`}
                          >
                            {u.rol === 'Admin' ? 'Administrador' : u.rol}
                          </span>
                          {detalleAlumno && (
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#582EEF]"></span>
                              {detalleAlumno}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md ${
                            u.estado === 'Activo'
                              ? 'bg-[#d1e7dd] text-[#0f5132]'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          id={`btn-editar-usuario-${u._id}`}
                          onClick={() => handleOpenEditModal(u)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          id={`btn-eliminar-usuario-${u._id}`}
                          onClick={() => handleEliminar(u._id)}
                          className="px-3.5 py-1.5 bg-[#dc3545] hover:bg-red-700 text-white font-medium text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form id="form-usuario-abm" onSubmit={handleGuardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-usuario-nombre" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="input-usuario-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
                required
              />
            </div>
            <div>
              <label htmlFor="input-usuario-apellido" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                id="input-usuario-apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="input-usuario-dni" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              DNI <span className="text-red-500">*</span>
            </label>
            <input
              id="input-usuario-dni"
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="select-usuario-rol" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                id="select-usuario-rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              >
                <option value="Admin">Administrador</option>
                <option value="Docente">Docente</option>
                <option value="No Docente">No Docente</option>
                <option value="Alumno">Alumno</option>
                <option value="Padre">Padre / Tutor</option>
              </select>
            </div>
            <div>
              <label htmlFor="select-usuario-estado" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                id="select-usuario-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* CAMPOS CONDICIONALES DINÁMICOS EXCLUSIVOS PARA EL ROL "Alumno" */}
          {rol === 'Alumno' && (
            <div
              id="contenedor-campos-alumno"
              className="p-4 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#582EEF]"></span>
                  Asignación Académica del Alumno
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Requerido para Alumnos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Campo Curso */}
                <div>
                  <label
                    htmlFor="select-alumno-curso"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Curso <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-alumno-curso"
                    value={cursoId}
                    onChange={(e) => handleCursoChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
                    required={rol === 'Alumno'}
                  >
                    <option value="">-- Seleccione Curso --</option>
                    {cursos.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nombre_curso} ({c.nivel})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo Sección */}
                <div>
                  <label
                    htmlFor="select-alumno-seccion"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Sección <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-alumno-seccion"
                    value={seccionId}
                    onChange={(e) => handleSeccionChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
                    required={rol === 'Alumno'}
                  >
                    <option value="">-- Seleccione Sección --</option>
                    {seccionesDisponibles.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.nombre_seccion} ({s.turno})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo Turno */}
                <div>
                  <label
                    htmlFor="select-alumno-turno"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Turno <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-alumno-turno"
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
                    required={rol === 'Alumno'}
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="input-usuario-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Contraseña {editingUser && '(Dejar en blanco para mantener actual)'}
            </label>
            <input
              id="input-usuario-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingUser ? '••••••••' : '123456'}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              id="btn-cancelar-modal-usuario"
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-modal-usuario"
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
