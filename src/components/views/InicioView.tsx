/**
 * @archivo src/components/views/InicioView.tsx
 * @descripción Vista principal (Dashboard) del Instituto José Peña con tarjetas KPI resumidas,
 * accesos rápidos y el componente interactivo de Calendario Académico Institucional (exámenes, reuniones, actos).
 */

import React, { useEffect, useState } from 'react';
import { Calendar, LayoutDashboard, Sparkles, BookOpen, Users, Clock, ArrowRight } from 'lucide-react';
import { IDashboardStats, IUser } from '../../types.js';
import { AlumnoDashboardView } from './AlumnoDashboardView.js';
import { DocenteDashboardView } from './DocenteDashboardView.js';
import { CalendarioAcademico } from '../CalendarioAcademico.js';

interface InicioViewProps {
  usuario: IUser | null;
  onNavigate: (tab: any) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ usuario, onNavigate }) => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subTabRol, setSubTabRol] = useState<'panel' | 'calendario'>('panel');

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

  // Si el usuario es Alumno, permitimos alternar entre su Boletín personalizado y el Calendario Académico de Exámenes
  if (usuario?.rol === 'Alumno') {
    return (
      <div className="space-y-6">
        {/* Barra superior de pestañas para Alumnos */}
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTabRol('panel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTabRol === 'panel'
                  ? 'bg-[#582EEF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Mi Boletín y Calificaciones</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTabRol('calendario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTabRol === 'calendario'
                  ? 'bg-[#582EEF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario Académico y Fechas de Exámenes</span>
            </button>
          </div>
        </div>

        {subTabRol === 'panel' ? (
          <AlumnoDashboardView usuario={usuario} />
        ) : (
          <div className="max-w-7xl mx-auto px-6 pb-12">
            <CalendarioAcademico usuario={usuario} onNavigateToSection={onNavigate} />
          </div>
        )}
      </div>
    );
  }

  // Si el usuario es Docente, permitimos alternar entre su Panel Docente y el Calendario Académico Institucional
  if (usuario?.rol === 'Docente') {
    return (
      <div className="space-y-6">
        {/* Barra superior de pestañas para Docentes */}
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTabRol('panel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTabRol === 'panel'
                  ? 'bg-[#1d3557] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel Docente y Gestión de Notas</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTabRol('calendario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTabRol === 'calendario'
                  ? 'bg-[#1d3557] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario Académico Institucional</span>
            </button>
          </div>
        </div>

        {subTabRol === 'panel' ? (
          <DocenteDashboardView usuario={usuario} />
        ) : (
          <div className="max-w-7xl mx-auto px-6 pb-12">
            <CalendarioAcademico usuario={usuario} onNavigateToSection={onNavigate} />
          </div>
        )}
      </div>
    );
  }

  // Tarjetas KPI institucionales para Administradores, No Docentes y personal general
  const kpiCards = [
    {
      title: 'Usuarios Totales',
      val: stats?.totalUsuarios ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-[#e2d9f3] text-[#593196]',
      route: 'usuarios',
    },
    {
      title: 'Alumnos Matriculados',
      val: stats?.totalAlumnos ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-[#582EEF]/10 text-[#582EEF] border border-[#582EEF]/20',
      route: 'usuarios',
    },
    {
      title: 'Cuerpo Docente',
      val: stats?.totalDocentes ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-blue-100 text-blue-800',
      route: 'usuarios',
    },
    {
      title: 'Padres / Tutores',
      val: stats?.totalPadres ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-amber-100 text-amber-800',
      route: 'parentescos',
    },
    {
      title: 'Personal No Docente',
      val: stats?.totalNoDocentes ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-slate-100 text-slate-700',
      route: 'usuarios',
    },
    {
      title: 'Materias Curriculares',
      val: stats?.totalMaterias ?? 0,
      bg: 'bg-white border-slate-200 text-slate-800',
      badgeBg: 'bg-purple-100 text-purple-800',
      route: 'materias',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Saludo de Bienvenida y Estado del Ciclo */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-extrabold text-[#1b2a4a] tracking-tight">
              ¡Bienvenido/a, {usuario?.nombre} {usuario?.apellido}!
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              {usuario?.rol}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Panel del Sistema de Gestión Académica e Institucional — Instituto José Peña
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Período Lectivo 2026 Activo</span>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Resumidas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#1b2a4a]">Resumen General de la Institución</h3>
          <span className="text-xs text-slate-500">Datos consolidados en tiempo real</span>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Cargando indicadores...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kpiCards.map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate(kpi.route)}
                className={`p-6 rounded-2xl border shadow-2xs cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${kpi.bg}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${kpi.badgeBg}`}>
                    Activos
                  </span>
                </div>
                <p className="text-3xl font-black mt-3 tracking-tight text-[#1b2a4a]">{kpi.val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= COMPONENTE DE CALENDARIO ACADÉMICO INTERACTIVO ================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-[#1b2a4a] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>Cronograma & Calendario Académico</span>
            </h3>
            <p className="text-xs text-slate-500">
              Explora y planifica las fechas clave del año lectivo: exámenes, jornadas y reuniones de tutores.
            </p>
          </div>
        </div>

        <CalendarioAcademico usuario={usuario} onNavigateToSection={onNavigate} />
      </section>

      {/* Secciones Rápidas / Atajos e Información Institucional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs">
          <h4 className="font-bold text-base text-[#1b2a4a] mb-3">Acciones Frecuentes</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li
              onClick={() => onNavigate('registros')}
              aria-label="Ir a Carga de Calificaciones y Asistencias"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Carga de Calificaciones y Asistencias</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                <span>Ingresar</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </li>
            <li
              onClick={() => onNavigate('parentescos')}
              aria-label="Ir a Gestión de Parentescos"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Gestión de Parentescos y Tutores</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                <span>Ingresar</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </li>
            <li
              onClick={() => onNavigate('reportes')}
              aria-label="Ir a Reportes Estadísticos"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer flex justify-between items-center transition-colors border border-slate-100"
            >
              <span className="font-medium text-slate-800">Reportes Estadísticos y Planillas Oficiales</span>
              <span className="text-xs bg-[#1d3557] text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                <span>Ingresar</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs">
          <h4 className="font-bold text-base text-[#1b2a4a] mb-3">Información Institucional</h4>
          <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <p>
              El <strong>Instituto José Peña</strong> impulsa el desarrollo educativo integral a través de un seguimiento constante y transparente de la trayectoria académica de cada estudiante.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              <p className="flex items-center gap-2">
                <span>📍</span>
                <span>Dirección: Av. Rafael Núñez, Córdoba, Argentina</span>
              </p>
              <p className="flex items-center gap-2">
                <span>📧</span>
                <span>Contacto oficial: info@josepena.edu.ar</span>
              </p>
              <p className="flex items-center gap-2">
                <span>🕒</span>
                <span>Horarios de Secretaría: Lunes a Viernes de 07:30 a 18:30 hs</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
