/**
 * @archivo src/components/views/LoginView.tsx
 * @descripción Vista de Inicio de Sesión (Login) del Instituto José Peña.
 * @estilo Replicación con tema Clean Minimalism: tarjeta central blanca, escudo superior, fondo azul marino (`#1b2a4a`).
 */

import React, { useState } from 'react';
import { ShieldLogo } from '../ShieldLogo.js';

interface LoginViewProps {
  onLogin: (dni: string, password: string) => Promise<void>;
  errorMsg: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, errorMsg }) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni) return;
    setCargando(true);
    await onLogin(dni, password || '123456');
    setCargando(false);
  };

  const handleQuickLogin = (dniDemo: string) => {
    setDni(dniDemo);
    setPassword('123456');
    onLogin(dniDemo, '123456');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans select-none" style={{ backgroundColor: '#1b2a4a' }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 md:p-10 border border-slate-100 flex flex-col items-center">
        {/* Escudo Institucional Superior */}
        <div className="mb-4">
          <ShieldLogo size={68} />
        </div>

        {/* Título y Subtítulo */}
        <h2 className="text-2xl font-extrabold text-[#1b2a4a] tracking-wider uppercase text-center">
          INSTITUTO JOSÉ PEÑA
        </h2>
        <p className="text-slate-500 text-xs mt-1 mb-8 text-center font-bold tracking-widest uppercase">
          Sistema de Gestión Académica
        </p>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              DNI / Documento
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ingrese su DNI"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 focus:border-[#1b2a4a] transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 focus:border-[#1b2a4a] transition-all placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3.5 px-4 bg-[#1d3557] hover:bg-[#152740] text-white font-bold text-sm rounded-lg shadow-sm transition-all duration-150 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'Ingresando...' : 'Ingresar al Sistema'}
          </button>
        </form>

        {/* Botones de Acceso Rápido para Prueba de Roles */}
        <div className="mt-8 pt-6 border-t border-slate-200 w-full text-center">
          <p className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">
            Acceso Rápido Demo por Rol
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleQuickLogin('11111111')}
              className="px-2.5 py-1 bg-[#e2d9f3] text-[#593196] hover:opacity-90 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('22222222')}
              className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:opacity-90 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Docente
            </button>
            <button
              onClick={() => handleQuickLogin('33333333')}
              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:opacity-90 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              No Docente
            </button>
            <button
              onClick={() => handleQuickLogin('40000000')}
              className="px-2.5 py-1 bg-amber-100 text-amber-800 hover:opacity-90 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Padre
            </button>
            <button
              onClick={() => handleQuickLogin('31000000')}
              className="px-2.5 py-1 bg-[#582EEF]/10 text-[#582EEF] hover:bg-[#582EEF]/20 border border-[#582EEF]/20 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Alumno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

