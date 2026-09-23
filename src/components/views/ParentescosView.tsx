/**
 * @archivo src/components/views/ParentescosView.tsx
 * @descripción Vista para la administración de Vínculos de Parentesco (Padre/Tutor - Alumno) en el Instituto José Peña.
 * @estilo Replicación exacta del diseño provisto en las capturas (tabla limpia, botón '+ Nuevo parentesco', botones 'Editar' y 'Eliminar').
 */

import React, { useEffect, useState } from 'react';
import { IParentesco, IUser } from '../../types.js';
import { Modal } from '../Modal.js';

export const ParentescosView: React.FC = () => {
  const [parentescos, setParentescos] = useState<IParentesco[]>([]);
  const [padres, setPadres] = useState<IUser[]>([]);
  const [alumnos, setAlumnos] = useState<IUser[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estado para Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPadre, setSelectedPadre] = useState('');
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState('Padre');
  const [guardando, setGuardando] = useState(false);

  const fetchDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resPar, resUsers] = await Promise.all([
        fetch('/api/parentescos', { headers }),
        fetch('/api/usuarios', { headers }),
      ]);

      if (resPar.ok) {
        const dataPar = await resPar.json();
        setParentescos(dataPar);
      }

      if (resUsers.ok) {
        const dataUsers: IUser[] = await resUsers.json();
        setPadres(dataUsers.filter((u) => u.rol === 'Padre' || u.rol === 'Admin'));
        setAlumnos(dataUsers.filter((u) => u.rol === 'Alumno'));
      }
    } catch (err) {
      console.error('Error al cargar datos de parentesco:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setSelectedPadre(padres[0]?._id || '');
    setSelectedAlumno(alumnos[0]?._id || '');
    setTipoVinculo('Padre');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: IParentesco) => {
    setEditingId(p._id);
    const padreObj = typeof p.padre_id === 'object' ? p.padre_id : null;
    const alumnoObj = typeof p.alumno_id === 'object' ? p.alumno_id : null;

    setSelectedPadre(padreObj?._id || (typeof p.padre_id === 'string' ? p.padre_id : ''));
    setSelectedAlumno(alumnoObj?._id || (typeof p.alumno_id === 'string' ? p.alumno_id : ''));
    setTipoVinculo(p.tipo_vinculo || 'Padre');
    setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPadre || !selectedAlumno) return;

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/parentescos/${editingId}` : '/api/parentescos';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          padre_id: selectedPadre,
          alumno_id: selectedAlumno,
          tipo_vinculo: tipoVinculo,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchDatos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar el parentesco.');
      }
    } catch (err) {
      console.error('Error al guardar parentesco:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta relación de parentesco?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/parentescos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchDatos();
      } else {
        alert('Error al eliminar el parentesco.');
      }
    } catch (err) {
      console.error('Error al eliminar parentesco:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      {/* Contenedor Principal Blanco estilo Captura */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabecera del Panel con Título y Botón */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#18243b]">Parentescos</h2>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#18243b] hover:bg-[#202f4d] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
          >
            + Nuevo parentesco
          </button>
        </div>

        {/* Tabla de Registros */}
        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando relaciones de parentesco...</div>
          ) : parentescos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No hay parentescos registrados.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4">PADRE / TUTOR</th>
                  <th className="py-3.5 px-4">ALUMNO</th>
                  <th className="py-3.5 px-4">VINCULO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parentescos.map((p) => {
                  const padreObj = typeof p.padre_id === 'object' ? p.padre_id : null;
                  const alumnoObj = typeof p.alumno_id === 'object' ? p.alumno_id : null;

                  const padreTexto = padreObj
                    ? `${padreObj.apellido}, ${padreObj.nombre} (${padreObj.dni})`
                    : 'Padre No Especificado';

                  const alumnoTexto = alumnoObj
                    ? `${alumnoObj.apellido}, ${alumnoObj.nombre} (${alumnoObj.dni})`
                    : 'Alumno No Especificado';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-medium text-slate-900">{padreTexto}</td>
                      <td className="py-4 px-4">{alumnoTexto}</td>
                      <td className="py-4 px-4">{p.tipo_vinculo}</td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(p._id)}
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

      {/* Modal Crear / Editar Parentesco */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Parentesco' : 'Nuevo Parentesco'}
      >
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Padre / Tutor
            </label>
            <select
              value={selectedPadre}
              onChange={(e) => setSelectedPadre(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione Padre/Tutor...</option>
              {padres.map((pad) => (
                <option key={pad._id} value={pad._id}>
                  {pad.apellido}, {pad.nombre} (DNI: {pad.dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Alumno
            </label>
            <select
              value={selectedAlumno}
              onChange={(e) => setSelectedAlumno(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
              required
            >
              <option value="">Seleccione Alumno...</option>
              {alumnos.map((alu) => (
                <option key={alu._id} value={alu._id}>
                  {alu.apellido}, {alu.nombre} (DNI: {alu.dni})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Tipo de Vínculo
            </label>
            <select
              value={tipoVinculo}
              onChange={(e) => setTipoVinculo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18243b]/20"
            >
              <option value="Padre">Padre</option>
              <option value="Madre">Madre</option>
              <option value="Tutor Legal">Tutor Legal</option>
              <option value="Encargado">Encargado</option>
            </select>
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
              className="px-4 py-2 bg-[#18243b] hover:bg-[#202f4d] text-white text-xs font-semibold rounded-md transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
