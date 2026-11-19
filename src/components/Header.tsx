/**
 * @archivo src/components/Header.tsx
 * @descripción Encabezado superior de contenido principal con título de sección e información del sistema.
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import { IUser } from '../types.js';
import { DirectorNotificacionesBell } from './DirectorNotificacionesBell.js';

interface HeaderProps {
  title: string;
  usuario?: IUser | null;
  onOpenManualDocs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, usuario, onOpenManualDocs }) => {
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

      <div className="flex items-center space-x-3">
        {usuario?.rol === 'Director' && <DirectorNotificacionesBell />}

        {onOpenManualDocs && (
          <button
            type="button"
            onClick={onOpenManualDocs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Exportar y sincronizar Manual de Usuario a Google Docs"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">Manual en Google Docs</span>
            <span className="sm:hidden">Manual Docs</span>
          </button>
        )}

        <div className="hidden sm:flex items-center px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
          Ciclo Lectivo 2026
        </div>
      </div>
    </header>
  );
};

