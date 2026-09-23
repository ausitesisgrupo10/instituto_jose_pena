/**
 * @archivo src/components/views/CursosView.tsx
 * @descripción Vista para la administración de Cursos (Niveles Primario, Secundario, Inicial).
 */

import React, { useEffect, useState } from 'react';
import { ICurso } from '../../types.js';
import { Modal } from '../Modal.js';

export const CursosView: React.FC = () => {
  const [cursos, setCursos] = useState<ICurso[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombreCurso, setNombreCurso] = useState('');
  const [nivel, setNivel] = useState<'Primario' | 'Secundario' | 'Inicial'>('Secundario');
  const [guardando, setGuardando] = useState(false);

  const fetchCursos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cursos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCursos(data);
      }
    } catch (err) {
      console.error('Error al obtener cursos:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombreCurso('');
    setNivel('Secundario');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: ICurso) => {
    setEditingId(c._id);
    setNombreCurso(c.nombre_curso);
    setNivel(c.nivel);
    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/cursos/${editingId}` : '/api/cursos';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre_curso: nombreCurso, nivel }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCursos();
      } else {
        alert('Error al guardar el curso.');
      }
    } catch (err) {
      console.error('Error al guardar curso:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desea eliminar este curso?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cursos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchCursos();
    } catch (err) {
      console.error('Error al eliminar curso:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#18243b]">Gestión de Cursos</h2>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#18243b] hover:bg-[#202f4d] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            + Nuevo curso
          </button>
        </div>

        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando cursos...</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">NOMBRE DEL CURSO</th>
                  <th className="py-3.5 px-4">NIVEL EDUCATIVO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cursos.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">{c.nombre_curso}</td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                        {c.nivel}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(c._id)}
                        className="px-3.5 py-1.5 bg-[#dc3545] hover:bg-red-700 text-white font-medium text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Curso' : 'Nuevo Curso'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Nombre del Curso</label>
            <input
              type="text"
              value={nombreCurso}
              onChange={(e) => setNombreCurso(e.target.value)}
              placeholder="Ej: 1° Año, 5° Grado"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Nivel Educativo</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            >
              <option value="Inicial">Inicial</option>
              <option value="Primario">Primario</option>
              <option value="Secundario">Secundario</option>
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
