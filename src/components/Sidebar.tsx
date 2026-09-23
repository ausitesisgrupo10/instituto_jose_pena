/**
 * @archivo src/components/Sidebar.tsx
 * @descripción Barra de navegación lateral con el tema "Clean Minimalism" para el Instituto José Peña.
 */

import React from 'react';
import { ShieldLogo } from './ShieldLogo.js';
import { IUser } from '../types.js';

export type TabType =
  | 'inicio'
  | 'asistencias'
  | 'consulta_personas'
  | 'usuarios'
  | 'cursos'
  | 'secciones'
  | 'materias'
  | 'parentescos'
  | 'registros'
  | 'reportes'
  | 'inasistencias_docente';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  usuario: IUser | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  usuario,
  onLogout,
}) => {
  const menuItems: { id: TabType; label: string; rolesAllowed?: string[]; icon: React.ReactNode }[] = [
    {
      id: 'inicio',
      label: usuario?.rol === 'Alumno' ? 'Mi Boletín' : usuario?.rol === 'Docente' ? 'Panel Docente' : 'Dashboard',
      rolesAllowed: ['Admin', 'Docente', 'No Docente', 'Alumno'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'asistencias',
      label: 'Control de Asistencias',
      rolesAllowed: ['Admin', 'No Docente'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'consulta_personas',
      label: 'Consulta de Personas',
      rolesAllowed: ['Admin', 'No Docente'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'registros',
      label: 'Registros y Sanciones',
      rolesAllowed: ['Admin', 'Docente', 'No Docente', 'Padre'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'reportes',
      label: 'Reportes y Estadísticas',
      rolesAllowed: ['Admin', 'No Docente'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'inasistencias_docente',
      label: 'Mis Inasistencias / Actas',
      rolesAllowed: ['Docente'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      rolesAllowed: ['Admin'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'cursos',
      label: 'Cursos',
      rolesAllowed: ['Admin'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
    },
    {
      id: 'secciones',
      label: 'Secciones',
      rolesAllowed: ['Admin'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'materias',
      label: 'Materias',
      rolesAllowed: ['Admin'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'parentescos',
      label: 'Parentescos',
      rolesAllowed: ['Admin'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const userRole = usuario?.rol || 'Alumno';
  const menuFiltrado = menuItems.filter((item) => {
    if (!item.rolesAllowed) return true;
    if (userRole === 'Admin') return true;
    return item.rolesAllowed.includes(userRole);
  });

  const getInitials = () => {
    if (!usuario) return 'JP';
    const n = usuario.nombre?.[0] || '';
    const a = usuario.apellido?.[0] || '';
    return `${n}${a}`.toUpperCase() || 'JP';
  };

  return (
    <aside className="w-64 flex flex-col text-white shadow-xl shrink-0 min-h-screen select-none font-sans" style={{ backgroundColor: '#1b2a4a' }}>
      {/* Cabecera Sidebar */}
      <div className="p-6 flex items-center space-x-3 border-b border-blue-900/50">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-xs shrink-0">
          <ShieldLogo size={32} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-white">INSTITUTO</span>
          <span className="text-xs opacity-70 text-white font-medium">JOSÉ PEÑA</span>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-4 py-2 text-[10px] uppercase tracking-wider opacity-40 font-bold text-white">
          Navegación Principal
        </div>
        {menuFiltrado.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-800/40 text-white font-bold border-l-4 border-white shadow-xs'
                  : 'text-white/80 hover:bg-blue-800/20 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tarjeta Inferior de Usuario */}
      {usuario && (
        <div className="p-4">
          <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-700/50">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 rounded-full ${usuario.rol === 'Alumno' ? 'bg-[#582EEF]' : 'bg-blue-500'} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                {getInitials()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate text-white">
                  {usuario.nombre} {usuario.apellido}
                </span>
                <span className="text-[9px] opacity-60 uppercase text-white tracking-wider">
                  {usuario.rol}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-white transition-colors cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

