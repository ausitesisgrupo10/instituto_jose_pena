/**
 * @archivo src/components/views/AlumnoDashboardView.tsx
 * @descripción Vista exclusiva y restringida para usuarios con rol 'Alumno' en el Instituto José Peña.
 * @estilo Tema Clean Minimalism con acento violeta #582EEF para la identidad de Estudiantes.
 */

import React, { useEffect, useState } from 'react';
import { IUser } from '../../types.js';

interface AlumnoDashboardViewProps {
  usuario: IUser | null;
}

interface BoletinData {
  perfil: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
    curso: string;
    seccion: string;
    turno: string;
  };
  inasistencias: {
    total: number;
    listado: Array<{
      id: string;
      fecha: string;
      materia: string;
      concepto: string;
      observacion: string;
    }>;
  };
  sanciones: {
    total: number;
    listado: Array<{
      id: string;
      fecha: string;
      materia: string;
      sancion: string;
      observacion: string;
    }>;
  };
  tablaAcademica: Array<{
    materia_id: string;
    materia: string;
    t1: string;
    t2: string;
    t3: string;
    promedioFinal: string;
  }>;
}

export const AlumnoDashboardView: React.FC<AlumnoDashboardViewProps> = ({ usuario }) => {
  const [data, setData] = useState<BoletinData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarBoletin = async () => {
      setCargando(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        const res = await fetch('/api/alumnos/mi-boletin', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Error al obtener datos del boletín.');
        }
      } catch (err) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setCargando(false);
      }
    };

    cargarBoletin();
  }, []);

  if (cargando) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium text-sm">
        Cargando boletín del estudiante...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error || 'No fue posible cargar el boletín.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. Encabezado de Perfil */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 rounded-full bg-[#582EEF]/10 border border-[#582EEF]/20 text-[#582EEF] flex items-center justify-center font-extrabold text-xl shrink-0">
            {data.perfil.nombre?.[0]}
            {data.perfil.apellido?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1b2a4a]">
                {data.perfil.nombre} {data.perfil.apellido}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#582EEF]/10 text-[#582EEF] text-xs font-bold border border-[#582EEF]/20">
                Estudiante
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              DNI: <span className="font-semibold text-slate-700">{data.perfil.dni}</span> | Legajo:{' '}
              <span className="font-semibold text-slate-700">{data.perfil.legajo}</span>
            </p>
          </div>
        </div>

        {/* Ficha de Asignación Educativa */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center shrink-0">
          <div className="px-3 py-1">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Año / Curso
            </span>
            <span className="text-sm font-extrabold text-[#1b2a4a]">{data.perfil.curso}</span>
          </div>
          <div className="px-3 py-1 border-l border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Sección
            </span>
            <span className="text-sm font-extrabold text-[#1b2a4a]">{data.perfil.seccion}</span>
          </div>
          <div className="px-3 py-1 border-l border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Turno
            </span>
            <span className="text-sm font-extrabold text-[#1b2a4a]">{data.perfil.turno}</span>
          </div>
        </div>
      </div>

      {/* 2. Resumen de Inasistencias y Sanciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta / Contador de Inasistencias */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#1b2a4a] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Inasistencias y Faltas Acumuladas
              </h3>
              <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-extrabold rounded-full border border-amber-200">
                {data.inasistencias.total} {data.inasistencias.total === 1 ? 'Falta' : 'Faltas'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {data.inasistencias.listado.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No registra inasistencias acumuladas.</p>
              ) : (
                data.inasistencias.listado.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[11px] shrink-0">
                        {item.fecha}
                      </span>
                      <span className="font-medium text-slate-800">{item.materia}</span>
                    </div>
                    <span className="text-slate-500 truncate max-w-[180px] text-right" title={item.observacion}>
                      {item.observacion || item.concepto}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            * Consulta histórica de inasistencias.
          </div>
        </div>

        {/* Tarjeta de Sanciones */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#1b2a4a] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Sanciones Disciplinarias
              </h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-800 text-xs font-extrabold rounded-full border border-rose-200">
                {data.sanciones.total} Registradas
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {data.sanciones.listado.length === 0 ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-emerald-800 font-medium">
                  ✓ El estudiante no registra sanciones ni faltas disciplinarias.
                </div>
              ) : (
                data.sanciones.listado.map((sanc) => (
                  <div
                    key={sanc.id}
                    className="p-3 bg-rose-50/30 border border-rose-100 rounded-lg text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900">{sanc.sancion}</span>
                      <span className="text-[11px] font-semibold text-slate-500">{sanc.fecha}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{sanc.materia}</p>
                    {sanc.observacion && (
                      <p className="text-slate-500 italic text-[11px]">{sanc.observacion}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            * Registros sancionatorios cargados por preceptores o directivos.
          </div>
        </div>
      </div>

      {/* 3. Tabla Académica por Materia (Notas de los 3 Trimestres & Promedio Final) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-base text-[#1b2a4a]">
              Boletín Calificaciones por Materia
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Desglose trimestral de evaluaciones y cálculo del promedio final numérico.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#582EEF]/10 text-[#582EEF] font-bold text-xs rounded-full border border-[#582EEF]/20">
            Ciclo Lectivo 2026
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Materia Curricular</th>
                <th className="py-3.5 px-4 text-center">1° Trimestre</th>
                <th className="py-3.5 px-4 text-center">2° Trimestre</th>
                <th className="py-3.5 px-4 text-center">3° Trimestre</th>
                <th className="py-3.5 px-6 text-center">Promedio Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.tablaAcademica.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No hay materias cargadas en el boletín.
                  </td>
                </tr>
              ) : (
                data.tablaAcademica.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#1b2a4a]">{m.materia}</td>
                    <td className="py-4 px-4 text-center font-medium text-slate-700">
                      {m.t1 !== '-' ? (
                        <span className="inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-bold">
                          {m.t1}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-medium text-slate-700">
                      {m.t2 !== '-' ? (
                        <span className="inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-bold">
                          {m.t2}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-medium text-slate-700">
                      {m.t3 !== '-' ? (
                        <span className="inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-bold">
                          {m.t3}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {m.promedioFinal !== '-' ? (
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${
                            parseFloat(m.promedioFinal) >= 7
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : parseFloat(m.promedioFinal) >= 4
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {m.promedioFinal}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
