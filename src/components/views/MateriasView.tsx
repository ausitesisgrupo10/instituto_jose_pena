/**
 * @archivo src/components/views/MateriasView.tsx
 * @descripción Vista para la administración de Materias curriculares y asignación docente.
 */

import React, { useEffect, useState } from 'react';
import { IMateria, ISeccion, IUser } from '../../types.js';
import { Modal } from '../Modal.js';

export const MateriasView: React.FC = () => {
  const [materias, setMaterias] = useState<IMateria[]>([]);
  const [secciones, setSecciones] = useState<ISeccion[]>([]);
  const [docentes, setDocentes] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombreMateria, setNombreMateria] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [programaUrl, setProgramaUrl] = useState('');
  const [guardando, setGuardando] = useState(false);

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resMat, resSec, resUsers] = await Promise.all([
        fetch('/api/materias', { headers }),
        fetch('/api/secciones', { headers }),
        fetch('/api/usuarios', { headers }),
      ]);

      if (resMat.ok) {
        const dataMat = await resMat.json();
        setMaterias(dataMat);
      }

      if (resSec.ok) {
        const dataSec = await resSec.json();
        setSecciones(dataSec);
      }

      if (resUsers.ok) {
        const dataUsers: IUser[] = await resUsers.json();
        setDocentes(dataUsers.filter((u) => u.rol === 'Docente' || u.rol === 'Admin'));
      }
    } catch (err) {
      console.error('Error al obtener materias:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombreMateria('');
    setSeccionId(secciones[0]?._id || '');
    setDocenteId(docentes[0]?._id || '');
    setProgramaUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: IMateria) => {
    setEditingId(m._id);
    setNombreMateria(m.nombre_materia);

    const sObj = typeof m.seccion_id === 'object' ? m.seccion_id : null;
    const dObj = typeof m.docente_id === 'object' ? m.docente_id : null;

    setSeccionId(sObj?._id || (typeof m.seccion_id === 'string' ? m.seccion_id : ''));
    setDocenteId(dObj?._id || (typeof m.docente_id === 'string' ? m.docente_id : ''));
    setProgramaUrl(m.programa_url || '');
    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seccionId || !docenteId) return;

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/materias/${editingId}` : '/api/materias';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre_materia: nombreMateria,
          seccion_id: seccionId,
          docente_id: docenteId,
          programa_url: programaUrl,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchDatos();
      } else {
        alert('Error al guardar la materia.');
      }
    } catch (err) {
      console.error('Error al guardar materia:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Desea eliminar esta materia?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/materias/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchDatos();
    } catch (err) {
      console.error('Error al eliminar materia:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#18243b]">Materias Curriculares</h2>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#18243b] hover:bg-[#202f4d] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            + Nueva materia
          </button>
        </div>

        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando materias...</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">MATERIA</th>
                  <th className="py-3.5 px-4">SECCIÓN / DIVISIÓN</th>
                  <th className="py-3.5 px-4">DOCENTE A CARGO</th>
                  <th className="py-3.5 px-4">PROGRAMA DE ESTUDIOS</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {materias.map((m) => {
                  const sObj = typeof m.seccion_id === 'object' ? m.seccion_id : null;
                  const cObj = sObj && typeof sObj.curso_id === 'object' ? sObj.curso_id : null;
                  const dObj = typeof m.docente_id === 'object' ? m.docente_id : null;

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900">{m.nombre_materia}</td>
                      <td className="py-4 px-4">
                        {sObj ? `${sObj.nombre_seccion} ${cObj ? `(${cObj.nombre_curso})` : ''}` : 'Sin Sección'}
                      </td>
                      <td className="py-4 px-4 font-medium">
                        {dObj ? `${dObj.apellido}, ${dObj.nombre}` : 'Docente No Asignado'}
                      </td>
                      <td className="py-4 px-4">
                        {m.programa_url ? (
                          <a
                            href={m.programa_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs font-semibold"
                          >
                            Ver Programa 📄
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pendiente de Carga</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(m._id)}
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
        title={editingId ? 'Editar Materia' : 'Nueva Materia'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Nombre de la Materia
            </label>
            <input
              type="text"
              value={nombreMateria}
              onChange={(e) => setNombreMateria(e.target.value)}
              placeholder="Ej: Matemática, Lengua, Física"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Sección Asignada
            </label>
            <select
              value={seccionId}
              onChange={(e) => setSeccionId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione Sección...</option>
              {secciones.map((sec) => {
                const cObj = typeof sec.curso_id === 'object' ? sec.curso_id : null;
                return (
                  <option key={sec._id} value={sec._id}>
                    {sec.nombre_seccion} {cObj ? `(${cObj.nombre_curso} - ${cObj.nivel})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Docente a Cargo
            </label>
            <select
              value={docenteId}
              onChange={(e) => setDocenteId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione Docente...</option>
              {docentes.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.apellido}, {doc.nombre} (DNI: {doc.dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              URL del Programa de Materia (Opcional)
            </label>
            <input
              type="url"
              value={programaUrl}
              onChange={(e) => setProgramaUrl(e.target.value)}
              placeholder="https://josepena.edu.ar/programas/matematica.pdf"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            />
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
