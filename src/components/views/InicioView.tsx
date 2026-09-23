/**
 * @archivo src/components/views/InicioView.tsx
 * @descripción Vista principal (Dashboard) del Instituto José Peña con tarjetas KPI resumidas e información institucional.
 */

import React, { useEffect, useState } from 'react';
import { IDashboardStats, IUser } from '../../types.js';
import { AlumnoDashboardView } from './AlumnoDashboardView.js';
import { DocenteDashboardView } from './DocenteDashboardView.js';

interface InicioViewProps {
  usuario: IUser | null;
  onNavigate: (tab: any) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ usuario, onNavigate }) => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [cargando, setCargando] = useState(true);

  if (usuario?.rol === 'Alumno') {
    return <AlumnoDashboardView usuario={usuario} />;
  }

  if (usuario?.rol === 'Docente') {
    return <DocenteDashboardView usuario={usuario} />;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/reportes/kpi', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error al obtener KPIs:', err);
      } finally {
        setCargando(false);
      }
    };

    fetchStats();
  }, []);

  const kpiCards = [
    { title: 'Usuarios Totales', val: stats?.totalUsuarios ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-[#e2d9f3] text-[#593196]', route: 'usuarios' },
    { title: 'Alumnos Matriculados', val: stats?.totalAlumnos ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-[#582EEF]/10 text-[#582EEF] border border-[#582EEF]/20', route: 'usuarios' },
    { title: 'Cuerpo Docente', val: stats?.totalDocentes ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-blue-100 text-blue-800', route: 'usuarios' },
    { title: 'Padres / Tutores', val: stats?.totalPadres ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-amber-100 text-amber-800', route: 'parentescos' },
    { title: 'Personal No Docente', val: stats?.totalNoDocentes ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-slate-100 text-slate-700', route: 'usuarios' },
    { title: 'Materias Curriculares', val: stats?.totalMaterias ?? 0, bg: 'bg-white border-slate-200 text-slate-800', badgeBg: 'bg-purple-100 text-purple-800', route: 'materias' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Saludo de Bienvenida */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1b2a4a]">
              ¡Bienvenido/a, {usuario?.nombre} {usuario?.apellido}!
            </h2>
            {usuario?.rol === 'Alumno' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#582EEF]/10 text-[#582EEF] text-xs font-bold border border-[#582EEF]/20">
                Estudiante
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Panel del Sistema de Gestión Académica — Instituto José Peña ({usuario?.rol})
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#d1e7dd] text-[#0f5132] text-xs font-semibold">
          ● Período Lectivo 2026 Activo
        </div>
      </div>

      {/* Tarjetas KPI Resumidas */}
      <div>
        <h3 className="text-base font-bold text-[#1b2a4a] mb-4">Resumen General de la Institución</h3>
        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando indicadores...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kpiCards.map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate(kpi.route)}
                className={`p-6 rounded-xl border shadow-2xs cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${kpi.bg}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${kpi.badgeBg}`}>
                    Activos
                  </span>
                </div>
                <p className="text-3xl font-extrabold mt-3 tracking-tight text-[#1b2a4a]">{kpi.val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secciones Rápidas / Atajos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
          <h4 className="font-bold text-base text-[#1b2a4a] mb-3">Acciones Frecuentes</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li
              onClick={() => onNavigate('registros')}
              aria-label="Ir a Carga de Calificaciones y Asistencias"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Carga de Calificaciones y Asistencias</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold">Ingresar</span>
            </li>
            <li
              onClick={() => onNavigate('parentescos')}
              aria-label="Ir a Gestión de Parentescos"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Gestión de Parentescos y Tutores</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold">Ingresar</span>
            </li>
            <li
              onClick={() => onNavigate('reportes')}
              aria-label="Ir a Reportes Estadísticos"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Reportes Estadísticos y Planillas</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold">Ingresar</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
          <h4 className="font-bold text-base text-[#1b2a4a] mb-3">Información Institucional</h4>
          <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <p>
              El <strong>Instituto José Peña</strong> impulsa el desarrollo educativo integral a través de un seguimiento constante y transparente de la trayectoria académica de cada estudiante.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <p>📍 Dirección: Av. Rafael Núñez, Córdoba, Argentina</p>
              <p>📧 Contacto: info@josepena.edu.ar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

