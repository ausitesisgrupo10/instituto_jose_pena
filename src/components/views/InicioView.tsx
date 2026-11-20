/**
 * @archivo src/components/views/InicioView.tsx
 * @descripción Vista principal (Dashboard) del Instituto José Peña con tarjetas KPI resumidas,
 * accesos rápidos y el componente interactivo de Calendario Académico Institucional (exámenes, reuniones, actos).
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { IUser } from '../../types.js';
import { AlumnoDashboardView } from './AlumnoDashboardView.js';
import { DocenteDashboardView } from './DocenteDashboardView.js';
import { DirectorDashboardView } from './DirectorDashboardView.js';
import { DocenteMultifiltroRegistros } from '../DocenteMultifiltroRegistros.js';

interface InicioViewProps {
  usuario: IUser | null;
  onNavigate: (tab: any) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ usuario, onNavigate }) => {
  // Si el usuario es Alumno, renderizamos directamente su Boletín personalizado
  if (usuario?.rol === 'Alumno') {
    return <AlumnoDashboardView usuario={usuario} />;
  }

  // Si el usuario es Docente, renderizamos directamente su Panel Docente principal
  if (usuario?.rol === 'Docente') {
    return <DocenteDashboardView usuario={usuario} />;
  }

  // Si el usuario es Director, renderizamos el Tablero Directivo
  if (usuario?.rol === 'Director') {
    return <DirectorDashboardView usuario={usuario} onNavigate={onNavigate} />;
  }

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

      {/* Buscador Multifiltro de Registros con Descarga Excel (.xls) para el perfil No Docente */}
      {usuario?.rol === 'No Docente' && (
        <DocenteMultifiltroRegistros mostrarDescargasExcel={true} />
      )}

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
