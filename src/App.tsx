/**
 * @archivo src/App.tsx
 * @descripción Componente Principal de la Aplicación del Instituto José Peña.
 * @funcionalidad Maneja el estado de autenticación JWT, la sesión del usuario y la navegación entre vistas.
 */

import React, { useEffect, useState } from 'react';
import { TabType, Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { LoginView } from './components/views/LoginView.js';
import { InicioView } from './components/views/InicioView.js';
import { UsuariosView } from './components/views/UsuariosView.js';
import { CursosView } from './components/views/CursosView.js';
import { SeccionesView } from './components/views/SeccionesView.js';
import { MateriasView } from './components/views/MateriasView.js';
import { ParentescosView } from './components/views/ParentescosView.js';
import { RegistrosView } from './components/views/RegistrosView.js';
import { ReportesView } from './components/views/ReportesView.js';
import { DocenteDashboardView } from './components/views/DocenteDashboardView.js';
import { AsistenciasView } from './components/views/AsistenciasView.js';
import { ConsultaPersonasView } from './components/views/ConsultaPersonasView.js';
import { TutorBoletinView } from './components/views/TutorBoletinView.js';
import { IUser } from './types.js';

export default function App() {
  const [usuario, setUsuario] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentTab, setCurrentTab] = useState<TabType>('inicio');
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Verificar la validez del token guardado al iniciar
  useEffect(() => {
    const verificarSesion = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setCargandoSesion(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const userObj = await res.json();
          setUsuario(userObj);
          setToken(storedToken);
          if (userObj.rol === 'Padre') {
            setCurrentTab('registros');
          }
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setUsuario(null);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setCargandoSesion(false);
      }
    };

    verificarSesion();
  }, []);

  // Función de Login
  const handleLogin = async (dni: string, password: string) => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUsuario(data.usuario);
        if (data.usuario?.rol === 'Padre') {
          setCurrentTab('registros');
        } else {
          setCurrentTab('inicio');
        }
      } else {
        setLoginError(data.error || 'Error de credenciales.');
      }
    } catch (err) {
      setLoginError('No se pudo conectar con el servidor.');
    }
  };

  // Función de Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUsuario(null);
    setCurrentTab('inicio');
  };

  // Mapeo de títulos de encabezado según pestaña seleccionada
  const getTabTitle = (tab: TabType): string => {
    if (usuario?.rol === 'Padre') {
      return 'Expediente del Estudiante (Boletín del Tutor)';
    }
    if (usuario?.rol === 'Alumno') {
      return 'Mi Boletín Académico';
    }
    if (usuario?.rol === 'Docente') {
      if (tab === 'inicio') return 'Panel Docente';
      if (tab === 'inasistencias_docente') return 'Mis Inasistencias y Actas';
    }
    switch (tab) {
      case 'inicio':
        return 'Inicio';
      case 'asistencias':
        return 'Control de Asistencias (Alumnos y Docentes)';
      case 'consulta_personas':
        return 'Registro Unificado / Consulta de Personas';
      case 'usuarios':
        return 'Gestión de Usuarios';
      case 'cursos':
        return 'Cursos';
      case 'secciones':
        return 'Secciones y Divisiones';
      case 'materias':
        return 'Materias Curriculares';
      case 'parentescos':
        return 'Parentescos';
      case 'registros':
        return 'Registros y Sanciones Académicas';
      case 'reportes':
        return 'Reportes y Estadísticas';
      case 'inasistencias_docente':
        return 'Mis Inasistencias y Actas';
      default:
        return 'Inicio';
    }
  };

  // Renderizar la vista correspondiente a la pestaña activa
  const renderCurrentView = () => {
    if (usuario?.rol === 'Padre') {
      return <TutorBoletinView usuario={usuario} />;
    }
    if (usuario?.rol === 'Alumno') {
      return <InicioView usuario={usuario} onNavigate={setCurrentTab} />;
    }
    switch (currentTab) {
      case 'inicio':
        return <InicioView usuario={usuario} onNavigate={setCurrentTab} />;
      case 'asistencias':
        return <AsistenciasView />;
      case 'consulta_personas':
        return <ConsultaPersonasView />;
      case 'inasistencias_docente':
        return <DocenteDashboardView usuario={usuario} tabInicial="inasistencias" />;
      case 'usuarios':
        return <UsuariosView />;
      case 'cursos':
        return <CursosView />;
      case 'secciones':
        return <SeccionesView />;
      case 'materias':
        return <MateriasView />;
      case 'parentescos':
        return <ParentescosView />;
      case 'registros':
        return <RegistrosView usuario={usuario} />;
      case 'reportes':
        return <ReportesView usuario={usuario} />;
      default:
        return <InicioView usuario={usuario} onNavigate={setCurrentTab} />;
    }
  };

  if (cargandoSesion) {
    return (
      <div className="min-h-screen bg-[#18243b] flex items-center justify-center text-white text-sm font-sans">
        Cargando Sistema del Instituto José Peña...
      </div>
    );
  }

  // Pantalla de Login si no hay usuario autenticado
  if (!token || !usuario) {
    return <LoginView onLogin={handleLogin} errorMsg={loginError} />;
  }

  // Interfaz Principal Dashboard
  return (
    <div className="flex min-h-screen bg-[#f4f6f9] font-sans antialiased text-slate-800">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        usuario={usuario}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <Header title={getTabTitle(currentTab)} />
        <main className="flex-1 pb-12">{renderCurrentView()}</main>
      </div>
    </div>
  );
}
