/**
 * @archivo src/components/CalendarioAcademico.tsx
 * @descripción Componente interactivo de Calendario Académico Institucional del Instituto José Peña.
 * Permite visualizar, explorar, filtrar y gestionar fechas críticas como exámenes parciales/trimestrales,
 * reuniones de padres, feriados nacionales, jornadas institucionales y actos escolares.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Plus,
  X,
  AlertCircle,
  FileText,
  Award,
  Sun,
  ClipboardCheck,
  BookOpen,
  CheckCircle,
  RotateCcw,
  CalendarDays,
  Tag
} from 'lucide-react';
import { IEventoAcademico, TipoEventoAcademico, NivelAcademicoEvento, IUser } from '../types.js';

interface CalendarioAcademicoProps {
  usuario?: IUser | null;
  onNavigateToSection?: (section: string) => void;
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Estilos visuales semánticos y oficiales por tipo de evento
const CONFIG_TIPOS: Record<
  TipoEventoAcademico,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Examen: {
    label: 'Exámenes y Evaluaciones',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: GraduationCap,
  },
  Reunion_Padres: {
    label: 'Reuniones de Padres',
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    dot: 'bg-indigo-600',
    icon: Users,
  },
  Feriado: {
    label: 'Feriados y Asuetos',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: Sun,
  },
  Acto: {
    label: 'Actos Institucionales',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    icon: Award,
  },
  Cierre_Notas: {
    label: 'Cierre de Calificaciones',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    icon: ClipboardCheck,
  },
  Jornada_Docente: {
    label: 'Jornadas Pedagógicas (PNFP)',
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    icon: BookOpen,
  },
  Inscripcion: {
    label: 'Matriculaciones',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    icon: FileText,
  },
  Otro: {
    label: 'Eventos Generales',
    bg: 'bg-slate-50',
    text: 'text-slate-900',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    icon: CalendarDays,
  },
};

export const CalendarioAcademico: React.FC<CalendarioAcademicoProps> = ({ usuario }) => {
  // Estado de navegación temporal (iniciado en el año lectivo 2026, mes de octubre o actual)
  const hoyReal = new Date();
  const esAno2026 = hoyReal.getFullYear() === 2026;
  const mesInicial = esAno2026 ? hoyReal.getMonth() : 9; // Octubre (índice 9) para reflejar el período activo si estamos en 2026
  const anoInicial = 2026;

  const [mesActual, setMesActual] = useState<number>(mesInicial);
  const [anoActual, setAnoActual] = useState<number>(anoInicial);
  const [vista, setVista] = useState<'grilla' | 'agenda'>('grilla');

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroNivel, setFiltroNivel] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Datos
  const [eventos, setEventos] = useState<IEventoAcademico[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [eventoSeleccionado, setEventoSeleccionado] = useState<IEventoAcademico | null>(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState<boolean>(false);
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario nuevo evento
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<TipoEventoAcademico>('Examen');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('08:00 hs');
  const [nuevoLugar, setNuevoLugar] = useState('Aulas del Instituto');
  const [nuevoNivel, setNuevoNivel] = useState<NivelAcademicoEvento>('Secundario');
  const [nuevoCurso, setNuevoCurso] = useState('1° Año');
  const [nuevaSeccion, setNuevaSeccion] = useState('División A');
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cargar eventos desde el backend
  const cargarEventos = async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/eventos-academicos', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('No se pudieron obtener los eventos académicos.');
      }

      const data = await res.json();
      setEventos(data.eventos || []);
    } catch (err: any) {
      console.error('Error al cargar calendario académico:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  // Filtrado reactivo en cliente para máxima agilidad interactiva
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      // Filtro tipo
      if (filtroTipo !== 'Todos' && ev.tipo !== filtroTipo) {
        return false;
      }
      // Filtro nivel
      if (filtroNivel !== 'Todos' && ev.nivel !== 'Todos' && ev.nivel !== filtroNivel) {
        return false;
      }
      // Búsqueda por texto libre
      if (busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        const coincideTitulo = ev.titulo.toLowerCase().includes(q);
        const coincideDesc = (ev.descripcion || '').toLowerCase().includes(q);
        const coincideMateria = (ev.materia_nombre || '').toLowerCase().includes(q);
        const coincideLugar = (ev.lugar || '').toLowerCase().includes(q);
        const coincideCurso = (ev.curso_nombre || '').toLowerCase().includes(q);
        if (!coincideTitulo && !coincideDesc && !coincideMateria && !coincideLugar && !coincideCurso) {
          return false;
        }
      }
      return true;
    });
  }, [eventos, filtroTipo, filtroNivel, busqueda]);

  // Próximos eventos destacados para el panel lateral / strip
  const proximosEventos = useMemo(() => {
    const hoyStr = `${anoActual}-${String(mesActual + 1).padStart(2, '0')}-01`;
    // Ordenados cronológicamente
    const ordenados = [...eventosFiltrados].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const futuros = ordenados.filter((e) => e.fecha >= hoyStr);
    return (futuros.length > 0 ? futuros : ordenados).slice(0, 5);
  }, [eventosFiltrados, anoActual, mesActual]);

  // Navegación de mes
  const irMesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnoActual((prev) => prev - 1);
    } else {
      setMesActual((prev) => prev - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnoActual((prev) => prev + 1);
    } else {
      setMesActual((prev) => prev + 1);
    }
  };

  const irAHoy = () => {
    setMesActual(9); // Octubre 2026 (período de demostración activo)
    setAnoActual(2026);
  };

  // Cálculo de la matriz del calendario para el mes y año seleccionado
  const matrizCalendario = useMemo(() => {
    const primerDiaMes = new Date(anoActual, mesActual, 1);
    const ultimoDiaMes = new Date(anoActual, mesActual + 1, 0);

    // En JS 0 = Domingo, 1 = Lunes... Queremos Lunes = 0
    let diaInicioSemana = primerDiaMes.getDay() - 1;
    if (diaInicioSemana === -1) diaInicioSemana = 6;

    const totalDiasMes = ultimoDiaMes.getDate();

    // Días del mes anterior para rellenar
    const ultimoDiaMesAnterior = new Date(anoActual, mesActual, 0).getDate();
    const celdas = [];

    // Relleno mes anterior
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      const diaNum = ultimoDiaMesAnterior - i;
      const mesPrev = mesActual === 0 ? 11 : mesActual - 1;
      const anoPrev = mesActual === 0 ? anoActual - 1 : anoActual;
      const fechaStr = `${anoPrev}-${String(mesPrev + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      celdas.push({
        dia: diaNum,
        fechaStr,
        esMesActual: false,
        eventos: eventosFiltrados.filter((e) => e.fecha === fechaStr),
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDiasMes; d++) {
      const fechaStr = `${anoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      celdas.push({
        dia: d,
        fechaStr,
        esMesActual: true,
        eventos: eventosFiltrados.filter((e) => e.fecha === fechaStr),
      });
    }

    // Relleno mes posterior hasta completar múltiplo de 7 (mínimo 35 celdas o 42)
    const resto = celdas.length % 7;
    if (resto > 0) {
      const diasFaltantes = 7 - resto;
      for (let s = 1; s <= diasFaltantes; s++) {
        const mesSig = mesActual === 11 ? 0 : mesActual + 1;
        const anoSig = mesActual === 11 ? anoActual + 1 : anoActual;
        const fechaStr = `${anoSig}-${String(mesSig + 1).padStart(2, '0')}-${String(s).padStart(2, '0')}`;
        celdas.push({
          dia: s,
          fechaStr,
          esMesActual: false,
          eventos: eventosFiltrados.filter((e) => e.fecha === fechaStr),
        });
      }
    }

    return celdas;
  }, [anoActual, mesActual, eventosFiltrados]);

  // Manejo de creación de nuevo evento
  const handleCrearEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo || !nuevaFecha) return;

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/eventos-academicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: nuevoTitulo,
          descripcion: nuevaDescripcion,
          tipo: nuevoTipo,
          fecha: nuevaFecha,
          hora: nuevaHora,
          lugar: nuevoLugar,
          nivel: nuevoNivel,
          curso_nombre: nuevoCurso,
          seccion_nombre: nuevaSeccion,
          materia_nombre: nuevaMateria,
          responsable: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Docente Responsable',
        }),
      });

      if (res.ok) {
        setMensajeExito('¡Evento institucional agendado con éxito!');
        setTimeout(() => setMensajeExito(null), 4000);
        setMostrarModalCrear(false);
        // Reset campos
        setNuevoTitulo('');
        setNuevaDescripcion('');
        setNuevaMateria('');
        await cargarEventos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar el evento.');
      }
    } catch (err) {
      console.error('Error al guardar evento:', err);
      alert('Error de conexión al guardar el evento.');
    } finally {
      setGuardando(false);
    }
  };

  // Restablecer valores 2026 de fábrica
  const handleRestablecerCalendario = async () => {
    if (!confirm('¿Deseas restablecer el calendario a los hitos oficiales del Instituto para 2026?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/eventos-academicos/restablecer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMensajeExito('Calendario oficial 2026 restablecido con éxito.');
        setTimeout(() => setMensajeExito(null), 4000);
        await cargarEventos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Formateador de fechas elegante
  const formatearFechaLarga = (fechaStr: string) => {
    try {
      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        const anio = partes[0];
        const mes = parseInt(partes[1], 10) - 1;
        const dia = parseInt(partes[2], 10);
        return `${dia} de ${MESES[mes]} de ${anio}`;
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  const puedeGestionar = usuario?.rol === 'Admin' || usuario?.rol === 'Docente';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden font-sans">
      {/* Notificación de éxito */}
      {mensajeExito && (
        <div className="bg-emerald-600 text-white px-6 py-3 text-sm font-medium flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-200" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-100 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera Principal del Calendario */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-[#17253d] via-[#1e3256] to-[#17253d] text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Agenda Académica Oficial · Ciclo Lectivo 2026</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Calendario Institucional</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Cronograma de exámenes trimestrales, jornadas pedagógicas, actos patrios y reuniones de padres del Instituto José Peña.
            </p>
          </div>

          {/* Botones de acción rápida y switch de vista */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Vista: Cuadrícula o Agenda */}
            <div className="bg-white/10 p-1 rounded-xl flex items-center border border-white/10 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setVista('grilla')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  vista === 'grilla'
                    ? 'bg-white text-[#17253d] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mes (Grilla)
              </button>
              <button
                type="button"
                onClick={() => setVista('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  vista === 'agenda'
                    ? 'bg-white text-[#17253d] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Agenda (Lista)
              </button>
            </div>

            {/* Botón Agendar Evento (Admin / Docente) */}
            {puedeGestionar && (
              <button
                type="button"
                onClick={() => {
                  setNuevaFecha(`${anoActual}-${String(mesActual + 1).padStart(2, '0')}-15`);
                  setMostrarModalCrear(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agendar Evento</span>
              </button>
            )}

            {/* Restablecer (Admin) */}
            {usuario?.rol === 'Admin' && (
              <button
                type="button"
                onClick={handleRestablecerCalendario}
                title="Restablecer calendario oficial 2026"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fila de Controles de Navegación del Mes */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={irMesAnterior}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={mesActual}
                onChange={(e) => setMesActual(parseInt(e.target.value, 10))}
                className="bg-white/10 text-white font-bold text-base md:text-lg rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {MESES.map((m, idx) => (
                  <option key={m} value={idx} className="text-slate-900 bg-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={anoActual}
                onChange={(e) => setAnoActual(parseInt(e.target.value, 10))}
                className="bg-white/10 text-white font-bold text-base md:text-lg rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value={2025} className="text-slate-900 bg-white">2025</option>
                <option value={2026} className="text-slate-900 bg-white">2026</option>
                <option value={2027} className="text-slate-900 bg-white">2027</option>
              </select>
            </div>

            <button
              type="button"
              onClick={irMesSiguiente}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={irAHoy}
              className="ml-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 hover:text-white transition-colors border border-white/10 cursor-pointer"
            >
              Período Activo
            </button>
          </div>

          {/* Contador de eventos en el mes */}
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              <strong>
                {
                  eventosFiltrados.filter((e) =>
                    e.fecha.startsWith(`${anoActual}-${String(mesActual + 1).padStart(2, '0')}`)
                  ).length
                }
              </strong>{' '}
              actividades programadas en {MESES[mesActual]}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 md:px-8 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filtros por Categoría */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </span>

          <button
            type="button"
            onClick={() => setFiltroTipo('Todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filtroTipo === 'Todos'
                ? 'bg-[#17253d] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos ({eventos.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('Examen')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'Examen'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Exámenes</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('Reunion_Padres')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'Reunion_Padres'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Reuniones de Padres</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('Feriado')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'Feriado'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Feriados / Asuetos</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('Acto')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'Acto'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Actos</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroTipo('Cierre_Notas')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'Cierre_Notas'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Cierre Notas</span>
          </button>
        </div>

        {/* Filtro por Nivel y Buscador de Texto */}
        <div className="flex items-center gap-2">
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#17253d] cursor-pointer"
          >
            <option value="Todos">Todos los niveles</option>
            <option value="Secundario">Nivel Secundario</option>
            <option value="Primario">Nivel Primario</option>
            <option value="Inicial">Nivel Inicial</option>
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar materia o tema..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#17253d]"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Principal: Grilla Mensual o Lista de Agenda */}
      <div className="p-4 md:p-8">
        {cargando ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#17253d] border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando eventos académicos del Instituto José Peña...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 text-sm">
            {error}
          </div>
        ) : vista === 'grilla' ? (
          /* ================= VISTA GRILLA MENSUAL ================= */
          <div className="space-y-6">
            {/* Cabecera de los Días de la Semana */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {DIAS_SEMANA.map((dia, idx) => (
                <div
                  key={dia}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg ${
                    idx >= 5 ? 'text-slate-400 bg-slate-50' : 'text-slate-700 bg-slate-100/70'
                  }`}
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Grilla de Celdas de Días */}
            <div className="grid grid-cols-7 gap-2">
              {matrizCalendario.map((celda, idx) => {
                const esHoy =
                  celda.fechaStr ===
                  `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(
                    hoyReal.getDate()
                  ).padStart(2, '0')}`;
                const esFinDeSemana = idx % 7 === 5 || idx % 7 === 6;

                return (
                  <div
                    key={`${celda.fechaStr}-${idx}`}
                    onClick={() => {
                      if (celda.eventos.length > 0) {
                        setDiaSeleccionadoModal(celda.fechaStr);
                      } else if (puedeGestionar && celda.esMesActual) {
                        setNuevaFecha(celda.fechaStr);
                        setMostrarModalCrear(true);
                      }
                    }}
                    className={`min-h-[105px] md:min-h-[125px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      celda.esMesActual
                        ? esFinDeSemana
                          ? 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                          : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-xs'
                        : 'bg-slate-100/40 border-slate-100 text-slate-300 opacity-60'
                    } ${esHoy ? 'ring-2 ring-indigo-500/80 bg-indigo-50/20' : ''}`}
                  >
                    {/* Número de Día y Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          esHoy
                            ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                            : celda.esMesActual
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {celda.dia}
                      </span>

                      {celda.eventos.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {celda.eventos.length}
                        </span>
                      )}
                    </div>

                    {/* Chips de Eventos en el día */}
                    <div className="mt-1.5 space-y-1 flex-1 overflow-hidden">
                      {celda.eventos.slice(0, 2).map((ev) => {
                        const conf = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS.Otro;
                        const Icono = conf.icon;
                        return (
                          <div
                            key={ev._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventoSeleccionado(ev);
                            }}
                            className={`group text-[11px] leading-tight px-1.5 py-1 rounded-md border font-medium truncate flex items-center gap-1 transition-all hover:scale-102 hover:shadow-xs ${conf.bg} ${conf.text} ${conf.border}`}
                            title={`${ev.titulo} (${ev.hora || 'Todo el día'})`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`}></span>
                            <span className="truncate">{ev.titulo}</span>
                          </div>
                        );
                      })}

                      {celda.eventos.length > 2 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiaSeleccionadoModal(celda.fechaStr);
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:underline pt-0.5 text-center"
                        >
                          +{celda.eventos.length - 2} eventos más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================= VISTA AGENDA / LISTA CRONOLÓGICA ================= */
          <div className="space-y-4">
            {eventosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                No se encontraron actividades que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {eventosFiltrados.map((ev) => {
                  const conf = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS.Otro;
                  const Icono = conf.icon;
                  const partesFecha = ev.fecha.split('-');
                  const mesNum = parseInt(partesFecha[1], 10) - 1;
                  const diaNum = partesFecha[2];

                  return (
                    <div
                      key={ev._id}
                      onClick={() => setEventoSeleccionado(ev)}
                      className="py-4 hover:bg-slate-50/80 rounded-xl px-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Bloque visual de fecha */}
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center text-center shrink-0 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 transition-colors">
                          <span className="text-[11px] font-bold uppercase text-slate-500">
                            {MESES[mesNum]?.slice(0, 3)}
                          </span>
                          <span className="text-xl font-extrabold text-[#17253d] leading-none">
                            {diaNum}
                          </span>
                        </div>

                        {/* Detalles del evento */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${conf.bg} ${conf.text} ${conf.border}`}
                            >
                              <Icono className="w-3 h-3" />
                              <span>{conf.label}</span>
                            </span>

                            {ev.nivel && (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {ev.nivel === 'Todos' ? 'Todos los niveles' : ev.nivel}
                              </span>
                            )}

                            {ev.curso_nombre && ev.curso_nombre !== 'Todos' && (
                              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {ev.curso_nombre}
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {ev.titulo}
                          </h4>

                          {ev.descripcion && (
                            <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl leading-relaxed">
                              {ev.descripcion}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Metadatos laterales */}
                      <div className="flex flex-row md:flex-col items-end gap-1.5 text-xs text-slate-500 shrink-0 w-full md:w-auto justify-between md:justify-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{ev.hora || 'Horario Escolar'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.lugar || 'Instituto José Peña'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= PANEL DE PRÓXIMOS EVENTOS DESTACADOS ================= */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Próximos Hitos Destacados del Calendario
              </h3>
            </div>
            <span className="text-xs text-slate-400">Exámenes y Reuniones Programadas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proximosEventos.slice(0, 3).map((item) => {
              const conf = CONFIG_TIPOS[item.tipo] || CONFIG_TIPOS.Otro;
              const Icono = conf.icon;
              return (
                <div
                  key={item._id}
                  onClick={() => setEventoSeleccionado(item)}
                  className="p-4 rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between cursor-pointer space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${conf.bg} ${conf.text} ${conf.border}`}
                      >
                        <Icono className="w-3 h-3" />
                        <span>{conf.label}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatearFechaLarga(item.fecha)}
                      </span>
                    </div>

                    <h5 className="font-bold text-sm text-slate-800 line-clamp-1">{item.titulo}</h5>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.descripcion || 'Sin descripción detallada disponible.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-700">{item.hora || 'Horario Regular'}</span>
                    <span className="text-indigo-600 font-semibold hover:underline">Ver detalle →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MODAL: DETALLE DE EVENTO ================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal con color temático */}
            {(() => {
              const conf = CONFIG_TIPOS[eventoSeleccionado.tipo] || CONFIG_TIPOS.Otro;
              const Icono = conf.icon;
              return (
                <div className={`p-6 border-b ${conf.bg} ${conf.border}`}>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${conf.bg} ${conf.text} ${conf.border}`}
                    >
                      <Icono className="w-3.5 h-3.5" />
                      <span>{conf.label}</span>
                    </span>
                    <button
                      onClick={() => setEventoSeleccionado(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-3">{eventoSeleccionado.titulo}</h3>
                </div>
              );
            })()}

            {/* Cuerpo del modal */}
            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Fecha</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatearFechaLarga(eventoSeleccionado.fecha)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Horario</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {eventoSeleccionado.hora || 'Horario Escolar'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Lugar / Aula</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {eventoSeleccionado.lugar || 'Instituto José Peña'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Nivel / Destinatarios</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {eventoSeleccionado.nivel}{' '}
                    {eventoSeleccionado.curso_nombre && eventoSeleccionado.curso_nombre !== 'Todos'
                      ? `(${eventoSeleccionado.curso_nombre})`
                      : ''}
                  </p>
                </div>
              </div>

              {eventoSeleccionado.materia_nombre && (
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Materia Evaluada</span>
                  <p className="font-semibold text-indigo-700">{eventoSeleccionado.materia_nombre}</p>
                </div>
              )}

              {eventoSeleccionado.descripcion && (
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Temario y Descripción Oficial
                  </span>
                  <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed text-xs">
                    {eventoSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {eventoSeleccionado.responsable && (
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Coordinado por: <strong>{eventoSeleccionado.responsable}</strong></span>
                  <span className="text-[10px] text-slate-400">Instituto José Peña</span>
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Evento Académico: ${eventoSeleccionado.titulo}\nFecha: ${eventoSeleccionado.fecha}\nHorario: ${eventoSeleccionado.hora}\nLugar: ${eventoSeleccionado.lugar}\nInstituto José Peña`
                  );
                  alert('Información del evento copiada al portapapeles.');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Copiar Recordatorio
              </button>

              <button
                type="button"
                onClick={() => setEventoSeleccionado(null)}
                className="px-4 py-2 bg-[#17253d] hover:bg-[#203254] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LISTADO DE EVENTOS DEL DÍA SELECCIONADO ================= */}
      {diaSeleccionadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 bg-[#17253d] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                  Actividades del Día
                </span>
                <h3 className="text-lg font-bold mt-0.5">{formatearFechaLarga(diaSeleccionadoModal)}</h3>
              </div>
              <button
                onClick={() => setDiaSeleccionadoModal(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {(() => {
                const eventosDelDia = eventosFiltrados.filter((e) => e.fecha === diaSeleccionadoModal);
                if (eventosDelDia.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No hay actividades programadas para esta fecha.
                    </div>
                  );
                }
                return eventosDelDia.map((ev) => {
                  const conf = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS.Otro;
                  const Icono = conf.icon;
                  return (
                    <div
                      key={ev._id}
                      onClick={() => {
                        setDiaSeleccionadoModal(null);
                        setEventoSeleccionado(ev);
                      }}
                      className={`p-4 rounded-xl border transition-all hover:shadow-xs cursor-pointer ${conf.bg} ${conf.border}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <Icono className="w-3 h-3" />
                          <span>{conf.label}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-600">{ev.hora}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{ev.titulo}</h4>
                      {ev.descripcion && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ev.descripcion}</p>
                      )}
                      <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Lugar: {ev.lugar}</span>
                        <span className="font-semibold text-indigo-700">Ver ficha completa →</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDiaSeleccionadoModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AGENDAR NUEVO EVENTO ================= */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-[#17253d] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Agendar Nueva Fecha Académica</h3>
              </div>
              <button
                onClick={() => setMostrarModalCrear(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearEvento} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Título del Evento / Hito *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej: Examen Parcial de Historia, Reunión Informativa..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tipo de Actividad *
                  </label>
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value as TipoEventoAcademico)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  >
                    <option value="Examen">Examen / Evaluación</option>
                    <option value="Reunion_Padres">Reunión de Padres / Tutores</option>
                    <option value="Feriado">Feriado / Asueto</option>
                    <option value="Acto">Acto Institucional</option>
                    <option value="Cierre_Notas">Cierre de Calificaciones</option>
                    <option value="Jornada_Docente">Jornada Docente (PNFP)</option>
                    <option value="Otro">Otro Evento</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha (AAAA-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Horario</label>
                  <input
                    type="text"
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                    placeholder="Ej: 08:00 - 10:00 hs"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lugar / Aula</label>
                  <input
                    type="text"
                    value={nuevoLugar}
                    onChange={(e) => setNuevoLugar(e.target.value)}
                    placeholder="Ej: Aula Magna, Aulas 1° Año..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nivel</label>
                  <select
                    value={nuevoNivel}
                    onChange={(e) => setNuevoNivel(e.target.value as NivelAcademicoEvento)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Secundario">Secundario</option>
                    <option value="Primario">Primario</option>
                    <option value="Inicial">Inicial</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Curso</label>
                  <input
                    type="text"
                    value={nuevoCurso}
                    onChange={(e) => setNuevoCurso(e.target.value)}
                    placeholder="1° Año, 2° Año..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Materia</label>
                  <input
                    type="text"
                    value={nuevaMateria}
                    onChange={(e) => setNuevaMateria(e.target.value)}
                    placeholder="Matemática..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descripción / Pautas Institucionales
                </label>
                <textarea
                  rows={3}
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  placeholder="Temario de examen, requerimientos para la reunión o información general..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17253d]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#17253d] hover:bg-[#203254] text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar y Publicar en Calendario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
