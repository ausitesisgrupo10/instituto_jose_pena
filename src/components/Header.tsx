/**
 * @archivo src/components/Header.tsx
 * @descripción Encabezado superior de contenido principal con título de sección e información del sistema.
 */

import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-2xs shrink-0 select-none">
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Sistema de Gestión Académica
        </span>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight capitalize leading-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
          Ciclo Lectivo 2026
        </div>
      </div>
    </header>
  );
};

