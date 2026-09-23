/**
 * @archivo src/components/views/SeccionesView.tsx
 * @descripción Vista para la administración de Secciones / Divisiones por Curso y Turno.
 */

import React, { useEffect, useState } from 'react';
import { ICurso, ISeccion } from '../../types.js';
import { Modal } from '../Modal.js';

export const SeccionesView: React.FC = () => {
  const [secciones, setSecciones] = useState<ISeccion[]>([]);
  const [cursos, setCursos] = useState<ICurso[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombreSeccion, setNombreSeccion] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [turno, setTurno] = useState<'Mañana' | 'Tarde' | 'Noche'>('Mañana');
  const [guardando, setGuardando] = useState(false);

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resSec, resCur] = await Promise.all([
        fetch('/api/secciones', { headers }),
        fetch('/api/cursos', { headers }),
      ]);

      if (resSec.ok) {
        const dataSec = await resSec.json();
        setSecciones(dataSec);
      }

      if (resCur.ok) {
        const dataCur = await resCur.json();
        setCursos(dataCur);
      }
    } catch (err) {
      console.error('Error al obtener secciones:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombreSeccion('');
    setCursoId(cursos[0]?._id || '');
    setTurno('Mañana');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: ISeccion) => {
    setEditingId(s._id);
    setNombreSeccion(s.nombre_seccion);
    const cObj = typeof s.curso_id === 'object' ? s.curso_id : null;
    setCursoId(cObj?._id || (typeof s.curso_id === 'string' ? s.curso_id : ''));
    setTurno(s.turno);
    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoId) return;
    setGuardando(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/secciones/${editingId}` : '/api/secciones';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre_seccion: nombreSeccion,
          curso_id: cursoId,
          turno,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchDatos();
      } else {
        alert('Error al guardar la sección.');
      }
    } catch (err) {
      console.error('Error al guardar sección:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desea eliminar esta sección?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/secciones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchDatos();
    } catch (err) {
      console.error('Error al eliminar sección:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#18243b]">Secciones y Divisiones</h2>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#18243b] hover:bg-[#202f4d] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            + Nueva sección
          </button>
        </div>

        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando secciones...</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">SECCIÓN / DIVISIÓN</th>
                  <th className="py-3.5 px-4">CURSO ASOCIADO</th>
                  <th className="py-3.5 px-4">TURNO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {secciones.map((s) => {
                  const cObj = typeof s.curso_id === 'object' ? s.curso_id : null;
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900">{s.nombre_seccion}</td>
                      <td className="py-4 px-4">{cObj ? `${cObj.nombre_curso} (${cObj.nivel})` : 'Sin Curso'}</td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                          {s.turno}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(s._id)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Sección' : 'Nueva Sección'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Nombre de la Sección</label>
            <input
              type="text"
              value={nombreSeccion}
              onChange={(e) => setNombreSeccion(e.target.value)}
              placeholder="Ej: División A, Sección B"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Curso Asignado</label>
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione un curso...</option>
              {cursos.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre_curso} ({c.nivel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Turno</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            >
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
              <option value="Noche">Noche</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
