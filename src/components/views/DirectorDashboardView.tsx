/**
 * @archivo src/components/views/DirectorDashboardView.tsx
 * @descripción Tablero Directivo principal para el Rol Director del Instituto José Peña.
 * Consolida indicadores en tiempo real de todos los roles (Matrícula Total, Plantel Docente,
 * Asistencia General y Promedio Académico Global), Accesos Rápidos y Calendario Académico desplegable.
 */

import React, { useEffect, useState } from 'react';
import {
  FilePlus2,
  UserCheck,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { IUser } from '../../types.js';

interface DirectorDashboardViewProps {
  usuario: IUser | null;
  onNavigate: (tab: any) => void;
}

interface ResumenDirectivo {
  matriculaTotal: number;
  plantelDocente: number;
  asistenciaGeneral: number;
  promedioAcademico: number;
  mesActual: string;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = ({
  usuario,
  onNavigate,
}) => {
  const [resumen, setResumen] = useState<ResumenDirectivo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarResumen = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/director/resumen', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: ResumenDirectivo = await res.json();
          setResumen(data);
        }
      } catch (err) {
        console.error('Error al obtener resumen directivo:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarResumen();
  }, []);

  const kpis = [
    {
      label: 'MATRÍCULA TOTAL',
      badge: 'Alumnos',
      value: cargando ? '...' : String(resumen?.matriculaTotal ?? 0),
      route: 'consulta_personas',
    },
    {
      label: 'PLANTEL DOCENTE',
      badge: 'Activos',
      value: cargando ? '...' : String(resumen?.plantelDocente ?? 0),
      route: 'consulta_personas',
    },
    {
      label: 'ASISTENCIA GENERAL',
      badge: resumen?.mesActual || 'Actual',
      value: cargando ? '...' : `${(resumen?.asistenciaGeneral ?? 0).toFixed(1)}%`,
      route: 'asistencias',
    },
    {
      label: 'PROMEDIO ACADÉMICO',
      badge: 'Global',
      value: cargando ? '...' : (resumen?.promedioAcademico ?? 0).toFixed(2),
      route: 'registros',
    },
  ];

  const accesosRapidos = [
    {
      title: 'Generar Reporte Mensual',
      icon: FilePlus2,
      route: 'reportes',
    },
    {
      title: 'Auditar Calificaciones',
      icon: UserCheck,
      route: 'registros',
    },
    {
      title: 'Asistencia Hoy',
      icon: CheckCircle2,
      route: 'asistencias',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-7 font-sans">
      {/* 1. Tarjeta de Bienvenida del Director */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-extrabold text-[#1b2a4a] tracking-tight">
              ¡Bienvenido/a, {usuario?.nombre} {usuario?.apellido}!
            </h2>
            <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80">
              Director
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Panel del Sistema de Gestión Académica e Institucional — Instituto José Peña
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Período Lectivo 2026 Activo</span>
        </div>
      </div>

      {/* 2. Resumen General de la Institución (4 KPIs en tiempo real) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1b2a4a]">Resumen General de la Institución</h3>
          <span className="text-xs text-slate-500">Datos consolidados en tiempo real</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => onNavigate(kpi.route)}
              className="text-left bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {kpi.badge}
                </span>
              </div>
              <p className="text-3xl font-black mt-3 tracking-tight text-[#1b2a4a]">
                {kpi.value}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Accesos Rápidos */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-[#1b2a4a]">Accesos Rápidos</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {accesosRapidos.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onNavigate(item.route)}
                className="bg-white rounded-2xl px-5 py-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-[#1b2a4a] leading-snug">
                    {item.title}
                  </span>
                </div>

                <span className="w-8 h-8 rounded-lg bg-[#1b2a4a] group-hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors">
                  <Plus className="w-4 h-4" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
