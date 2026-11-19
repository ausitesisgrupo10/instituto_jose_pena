/**
 * @archivo src/components/ManualGoogleDocsModal.tsx
 * @descripción Modal interactivo para sincronizar y exportar el Manual de Usuario
 * directamente como un documento oficial de Google Docs en la cuenta de Google del usuario.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Modal } from './Modal.js';
import {
  signInWithGoogleDocs,
  exportManualToGoogleDoc,
  getGoogleAccessToken,
  initGoogleAuth,
  logoutGoogle,
} from '../services/googleDocsService.js';
import { User } from 'firebase/auth';

interface ManualGoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualGoogleDocsModal: React.FC<ManualGoogleDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getGoogleAccessToken());
  const [conectando, setConectando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [resultadoDoc, setResultadoDoc] = useState<{ documentId: string; url: string } | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tituloPersonalizado, setTituloPersonalizado] = useState(
    'Manual de Usuario - Sistema Instituto José Peña (Ciclo 2026)'
  );

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, t) => {
        setGoogleUser(user);
        setToken(t);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConectarGoogle = async () => {
    setErrorMsg(null);
    setConectando(true);
    try {
      const res = await signInWithGoogleDocs();
      setGoogleUser(res.user);
      setToken(res.accessToken);
    } catch (err: any) {
      console.error('Error al conectar Google:', err);
      setErrorMsg(
        err.message || 'No se pudo conectar con tu cuenta de Google. Verifica los permisos de ventanas emergentes.'
      );
    } finally {
      setConectando(false);
    }
  };

  const handleExportarDocumento = async () => {
    setErrorMsg(null);
    if (!token) {
      setErrorMsg('Primero debes iniciar sesión con tu cuenta de Google.');
      return;
    }

    setExportando(true);
    try {
      const res = await exportManualToGoogleDoc(token, tituloPersonalizado);
      setResultadoDoc(res);
    } catch (err: any) {
      console.error('Error al exportar documento:', err);
      setErrorMsg(
        err.message || 'Error al crear el documento en Google Docs. Comprueba la conexión.'
      );
    } finally {
      setExportando(false);
    }
  };

  const handleCerrarSesionGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setToken(null);
    setResultadoDoc(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronizar Manual de Usuario con Google Docs"
    >
      <div className="space-y-5 font-sans text-slate-800">
        {/* Cabecera descriptiva */}
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-blue-950 text-sm">
              Exportación Oficial a Google Docs
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Exporta el manual institucional completo (explicación de la aplicación, matriz de permisos de los 5 roles y detalle de módulos) directamente a tu cuenta corporativa de Google Drive.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Paso 1: Conexión con Google */}
        {!googleUser ? (
          <div className="p-6 bg-slate-50 border border-slate-200/90 rounded-xl text-center space-y-4">
            <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center shadow-xs border border-slate-200">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h5 className="font-bold text-sm text-[#1b2a4a]">
                Conectar cuenta de Google
              </h5>
              <p className="text-xs text-slate-500">
                Inicia sesión con tu cuenta de Google autorizando los permisos de Google Docs y Google Drive para crear el documento de forma segura.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConectarGoogle}
              disabled={conectando}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-3 disabled:opacity-50"
            >
              {conectando ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>{conectando ? 'Conectando con Google...' : 'Iniciar sesión con Google'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cuenta conectada */}
            <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {googleUser.displayName?.[0] || 'G'}
                </div>
                <div>
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>{googleUser.displayName || 'Usuario de Google'}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded font-bold">
                      Conectado
                    </span>
                  </div>
                  <div className="text-emerald-700 text-[11px]">{googleUser.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCerrarSesionGoogle}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
              >
                Cambiar cuenta
              </button>
            </div>

            {/* Configuración del Documento */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Título del Documento en Google Docs
              </label>
              <input
                type="text"
                value={tituloPersonalizado}
                onChange={(e) => setTituloPersonalizado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              />
            </div>

            {/* Resultado si ya fue exportado */}
            {resultadoDoc && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Documento sincronizado y creado exitosamente en tu Google Drive!</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Ya puedes abrirlo directamente para editarlo, compartirlo con los directivos o imprimirlo en tu Google Workspace.
                </p>
                <div className="pt-1">
                  <a
                    href={resultadoDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en Google Docs</span>
                  </a>
                </div>
              </div>
            )}

            {/* Botón de Exportar */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleExportarDocumento}
                disabled={exportando}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#1b2a4a] hover:bg-[#22355c] active:bg-[#15233e] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {exportando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizando con Google Docs...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>{resultadoDoc ? 'Crear Otra Copia' : 'Exportar a Google Docs Ahora'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
