/**
 * @archivo src/components/DocenteRegistrosSancionesPanel.tsx
 * @descripción Módulo de Registros y Sanciones exclusivo para el Rol Docente.
 * Permite cargar y modificar Asistencias/Faltas y Sanciones únicamente sobre los alumnos
 * inscriptos en la asignatura, curso y división asignados al profesor, buscar por DNI o Fecha (calendario)
 * con botón Buscar y orden ASC, y descargar Todo o por Criterio en formato PDF.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { IRegistroAcademico, IUser } from '../types.js';
import { Modal } from './Modal.js';
import {
  exportarFaltasSancionesDocenteAPdf,
  FaltaSancionPdfRow,
} from '../utils/pdfFaltasSancionesDocente.js';

interface AlumnoAsignatura {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  legajo?: string;
  curso?: string;
  division?: string;
}

interface MateriaDocenteItem {
  materia_id: string;
  nombre_materia: string;
  seccion_id?: string | null;
  seccion: string;
  curso: string;
  alumnos: AlumnoAsignatura[];
}

interface DocenteRegistrosSancionesPanelProps {
  usuario: IUser | null;
}

const CONCEPTOS_ASISTENCIA = [
  'Presente',
  'Ausente',
  'Tardanza',
  'Media Falta',
  'Ausente Justificado',
];

const CONCEPTOS_SANCION = [
  'Llamado de atención',
  'Amonestación',
  'Apercibimiento',
  'Suspensión',
];

function extraerFechaIso(fechaRaw?: string): string {
  if (!fechaRaw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(fechaRaw)) {
    return fechaRaw.slice(0, 10);
  }
  const d = new Date(fechaRaw);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function formatearFechaAr(fechaRaw?: string): string {
  const iso = extraerFechaIso(fechaRaw);
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const DocenteRegistrosSancionesPanel: React.FC<DocenteRegistrosSancionesPanelProps> = ({
  usuario,
}) => {
  // Materias del docente y alumnos estrictamente inscriptos en su curso/división
  const [materiasDocente, setMateriasDocente] = useState<MateriaDocenteItem[]>([]);
  const [registros, setRegistros] = useState<IRegistroAcademico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState<'todo' | 'filtrado' | null>(null);

  // Filtros de búsqueda (DNI o Fecha calendario + Tipo)
  const [dniFiltro, setDniFiltro] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'inasistencia' | 'sancion'>('todos');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [feedbackExito, setFeedbackExito] = useState<string | null>(null);

  const fechaFiltroRef = useRef<HTMLInputElement | null>(null);
  const fechaModalRef = useRef<HTMLInputElement | null>(null);

  // Modal Crear / Modificar Asistencia o Sanción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [registroEditandoId, setRegistroEditandoId] = useState<string | null>(null);
  const [tipoModal, setTipoModal] = useState<'inasistencia' | 'sancion'>('inasistencia');
  const [materiaIdModal, setMateriaIdModal] = useState('');
  const [alumnoIdModal, setAlumnoIdModal] = useState('');
  const [valorModal, setValorModal] = useState('Ausente');
  const [fechaModal, setFechaModal] = useState(() => new Date().toISOString().split('T')[0]);
  const [observacionModal, setObservacionModal] = useState('');
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrirCalendario = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input) {
      input.focus();
      try {
        input.showPicker?.();
      } catch {
        // Fallback nativo
      }
    }
  };

  // Cargar materias asignadas al docente con sus alumnos del curso y división correspondientes
  const cargarMisMaterias = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/docentes/mis-materias', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: MateriaDocenteItem[] = await res.json();
        setMateriasDocente(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar materias del docente:', err);
    }
  }, []);

  // Consultar faltas y sanciones del docente (orden ASC)
  const consultarRegistros = useCallback(
    async (criterios?: {
      dni?: string;
      fecha?: string;
      tipo?: 'todos' | 'inasistencia' | 'sancion';
    }) => {
      const dniVal = (criterios?.dni ?? dniFiltro).replace(/\D/g, '').trim();
      const fechaVal = (criterios?.fecha ?? fechaFiltro).trim();
      const tipoVal = criterios?.tipo ?? tipoFiltro;

      setBuscando(true);
      setErrorBanner(null);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        params.append('soloMisMaterias', 'true');
        params.append('orden', 'asc');
        if (tipoVal === 'todos') {
          params.append('tipos', 'inasistencia,sancion');
        } else {
          params.append('tipos', tipoVal);
        }
        if (dniVal) params.append('dni', dniVal);
        if (fechaVal) params.append('fecha', fechaVal);

        const res = await fetch(`/api/registros?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'No se pudieron consultar los registros de faltas y sanciones.');
        }

        const data: IRegistroAcademico[] = await res.json();
        setRegistros(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setErrorBanner(err.message || 'Error al consultar registros.');
      } finally {
        setCargando(false);
        setBuscando(false);
      }
    },
    [dniFiltro, fechaFiltro, tipoFiltro]
  );

  useEffect(() => {
    cargarMisMaterias();
    consultarRegistros({ dni: '', fecha: '', tipo: 'todos' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Orden ASC garantizado en cliente (Fecha ASC, luego DNI ASC)
  const registrosOrdenadosAsc = useMemo(() => {
    const copia = [...registros];
    copia.sort((a, b) => {
      const fa = extraerFechaIso(a.fecha);
      const fb = extraerFechaIso(b.fecha);
      if (fa !== fb) return fa.localeCompare(fb);
      const aluA = typeof a.alumno_id === 'object' ? a.alumno_id : null;
      const aluB = typeof b.alumno_id === 'object' ? b.alumno_id : null;
      const dniA = String(aluA?.dni || '');
      const dniB = String(aluB?.dni || '');
      return dniA.localeCompare(dniB);
    });
    return copia;
  }, [registros]);

  // Alumnos permitidos según la asignatura seleccionada en el modal (estrictamente su curso y división)
  const materiaSeleccionadaModal = useMemo(
    () => materiasDocente.find((m) => String(m.materia_id) === String(materiaIdModal)) || null,
    [materiasDocente, materiaIdModal]
  );

  const alumnosPermitidosModal = useMemo(
    () => materiaSeleccionadaModal?.alumnos || [],
    [materiaSeleccionadaModal]
  );

  // Abrir Modal para Cargar Asistencia o Cargar Sanción
  const handleOpenCrear = (tipoInicial: 'inasistencia' | 'sancion') => {
    setErrorBanner(null);
    setFeedbackExito(null);
    setErrorModal(null);
    setModoEdicion(false);
    setRegistroEditandoId(null);
    setTipoModal(tipoInicial);

    const primeraMat = materiasDocente[0] || null;
    setMateriaIdModal(primeraMat ? String(primeraMat.materia_id) : '');
    setAlumnoIdModal(primeraMat?.alumnos?.[0] ? String(primeraMat.alumnos[0].id) : '');
    setValorModal(tipoInicial === 'inasistencia' ? 'Ausente' : 'Amonestación');
    setFechaModal(new Date().toISOString().split('T')[0]);
    setObservacionModal('');
    setIsModalOpen(true);
  };

  // Abrir Modal para Modificar un registro existente
  const handleOpenEditar = (reg: IRegistroAcademico) => {
    const aluObj = typeof reg.alumno_id === 'object' ? reg.alumno_id : null;
    const matObj = typeof reg.materia_id === 'object' ? reg.materia_id : null;
    const tipoReg = reg.tipo === 'sancion' ? 'sancion' : 'inasistencia';

    setErrorBanner(null);
    setFeedbackExito(null);
    setErrorModal(null);
    setModoEdicion(true);
    setRegistroEditandoId(reg._id);
    setTipoModal(tipoReg);
    setMateriaIdModal(matObj?._id ? String(matObj._id) : String(reg.materia_id));
    setAlumnoIdModal(aluObj?._id ? String(aluObj._id) : String(reg.alumno_id));
    setValorModal(reg.valor || (tipoReg === 'inasistencia' ? 'Ausente' : 'Amonestación'));
    setFechaModal(extraerFechaIso(reg.fecha) || new Date().toISOString().split('T')[0]);
    setObservacionModal(reg.observacion || '');
    setIsModalOpen(true);
  };

  // Cambio de asignatura en modal: reinicia alumno para exigir selección válida del curso y división
  const handleCambioMateriaModal = (nuevaMateriaId: string) => {
    setMateriaIdModal(nuevaMateriaId);
    const mat = materiasDocente.find((m) => String(m.materia_id) === String(nuevaMateriaId));
    setAlumnoIdModal(mat?.alumnos?.[0] ? String(mat.alumnos[0].id) : '');
  };

  // Guardar (Crear o Modificar)
  const handleGuardarModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    if (!materiaIdModal) {
      setErrorModal('Debe seleccionar una de sus asignaturas.');
      return;
    }
    if (!alumnoIdModal) {
      setErrorModal(
        'Debe seleccionar un estudiante inscripto en el curso y división de la asignatura.'
      );
      return;
    }
    if (!valorModal.trim()) {
      setErrorModal('Debe indicar el concepto o estado.');
      return;
    }
    if (!fechaModal) {
      setErrorModal('Debe seleccionar una fecha.');
      return;
    }

    // Validación adicional en cliente: el alumno debe pertenecer a la materia seleccionada
    const pertenece = alumnosPermitidosModal.some(
      (a) => String(a.id) === String(alumnoIdModal)
    );
    if (!pertenece && !modoEdicion) {
      setErrorModal(
        'El estudiante seleccionado no pertenece al curso y división de la asignatura.'
      );
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const payload = {
        alumno_id: alumnoIdModal,
        materia_id: materiaIdModal,
        tipo: tipoModal,
        valor: valorModal.trim(),
        fecha: fechaModal,
        observacion: observacionModal.trim(),
      };

      const url =
        modoEdicion && registroEditandoId
          ? `/api/registros/${registroEditandoId}`
          : '/api/registros';
      const method = modoEdicion && registroEditandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorModal(data.error || 'No se pudo guardar el registro.');
        return;
      }

      setIsModalOpen(false);
      setFeedbackExito(
        modoEdicion
          ? 'Registro actualizado correctamente y sincronizado en el legajo del alumno.'
          : tipoModal === 'inasistencia'
          ? 'Asistencia / falta registrada correctamente en el legajo del alumno.'
          : 'Sanción registrada correctamente en el legajo del alumno.'
      );
      await consultarRegistros();
    } catch {
      setErrorModal('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar registro
  const handleEliminar = async (id: string) => {
    if (!confirm('¿Confirma que desea eliminar este registro de asistencia o sanción?')) return;
    setErrorBanner(null);
    setFeedbackExito(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/registros/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorBanner(err.error || 'No se pudo eliminar el registro.');
        return;
      }
      setFeedbackExito('Registro eliminado correctamente.');
      await consultarRegistros();
    } catch {
      setErrorBanner('Error de conexión al eliminar el registro.');
    }
  };

  // Buscar con criterios
  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackExito(null);
    consultarRegistros({ dni: dniFiltro, fecha: fechaFiltro, tipo: tipoFiltro });
  };

  // Limpiar criterios y restaurar listado ASC
  const handleLimpiar = () => {
    setDniFiltro('');
    setFechaFiltro('');
    setTipoFiltro('todos');
    setErrorBanner(null);
    setFeedbackExito(null);
    consultarRegistros({ dni: '', fecha: '', tipo: 'todos' });
  };

  // Formatear filas para PDF
  const mapearParaPdf = (lista: IRegistroAcademico[]): FaltaSancionPdfRow[] => {
    const ordenada = [...lista].sort((a, b) => {
      const fa = extraerFechaIso(a.fecha);
      const fb = extraerFechaIso(b.fecha);
      if (fa !== fb) return fa.localeCompare(fb);
      const aluA = typeof a.alumno_id === 'object' ? a.alumno_id : null;
      const aluB = typeof b.alumno_id === 'object' ? b.alumno_id : null;
      return String(aluA?.dni || '').localeCompare(String(aluB?.dni || ''));
    });

    return ordenada.map((r) => {
      const aluObj = typeof r.alumno_id === 'object' ? r.alumno_id : null;
      const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;
      const secObj = matObj && typeof matObj.seccion_id === 'object' ? matObj.seccion_id : null;
      const curObj = secObj && typeof secObj.curso_id === 'object' ? secObj.curso_id : null;

      const cursoDivision =
        curObj?.nombre_curso && secObj?.nombre_seccion
          ? `${curObj.nombre_curso} - ${secObj.nombre_seccion}`
          : secObj?.nombre_seccion || 'Sin asignar';

      return {
        fecha: formatearFechaAr(r.fecha),
        dni: aluObj?.dni || '-',
        apellidoNombre: aluObj ? `${aluObj.apellido}, ${aluObj.nombre}` : 'N/A',
        cursoDivision,
        asignatura: matObj?.nombre_materia || '-',
        tipo: r.tipo === 'sancion' ? 'Sanción' : 'Asistencia / Falta',
        valor: r.valor || '-',
        observacion: r.observacion || '-',
      };
    });
  };

  // Descargar Todo en formato PDF
  const handleDescargarTodoPdf = async () => {
    setDescargandoPdf('todo');
    setErrorBanner(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        '/api/registros?soloMisMaterias=true&tipos=inasistencia,sancion&orden=asc',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los registros para descargar.');
      }
      const data: IRegistroAcademico[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setErrorBanner('No hay registros de asistencias, faltas o sanciones para descargar en PDF.');
        return;
      }

      exportarFaltasSancionesDocenteAPdf({
        registros: mapearParaPdf(data),
        esDescargaTotal: true,
        docenteNombre: usuario ? `${usuario.apellido}, ${usuario.nombre}` : '',
        docenteDni: usuario?.dni || '',
      });
    } catch (err: any) {
      setErrorBanner(err.message || 'Error al generar el PDF completo.');
    } finally {
      setDescargandoPdf(null);
    }
  };

  // Descargar según un criterio en formato PDF
  const handleDescargarFiltradoPdf = async () => {
    const dniLimpio = dniFiltro.replace(/\D/g, '').trim();
    const fechaLimpia = fechaFiltro.trim();
    const hayCriterio = Boolean(dniLimpio || fechaLimpia || tipoFiltro !== 'todos');

    if (!hayCriterio) {
      setErrorBanner(
        'Para usar "Descargar", ingrese al menos un criterio de búsqueda (DNI, Fecha o Tipo) o utilice "Descargar Todo".'
      );
      return;
    }

    setDescargandoPdf('filtrado');
    setErrorBanner(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('soloMisMaterias', 'true');
      params.append('orden', 'asc');
      params.append('tipos', tipoFiltro === 'todos' ? 'inasistencia,sancion' : tipoFiltro);
      if (dniLimpio) params.append('dni', dniLimpio);
      if (fechaLimpia) params.append('fecha', fechaLimpia);

      const res = await fetch(`/api/registros?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los registros filtrados.');
      }
      const data: IRegistroAcademico[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setErrorBanner('No se encontraron faltas o sanciones coincidentes con el criterio ingresado para descargar en PDF.');
        return;
      }

      const criteriosTexto: string[] = [];
      if (dniLimpio) criteriosTexto.push(`DNI: ${dniLimpio}`);
      if (fechaLimpia) criteriosTexto.push(`Fecha: ${formatearFechaAr(fechaLimpia)}`);
      if (tipoFiltro !== 'todos') {
        criteriosTexto.push(`Tipo: ${tipoFiltro === 'sancion' ? 'Sanciones' : 'Asistencias / Faltas'}`);
      }

      exportarFaltasSancionesDocenteAPdf({
        registros: mapearParaPdf(data),
        esDescargaTotal: false,
        docenteNombre: usuario ? `${usuario.apellido}, ${usuario.nombre}` : '',
        docenteDni: usuario?.dni || '',
        criteriosTexto,
      });
    } catch (err: any) {
      setErrorBanner(err.message || 'Error al generar el PDF filtrado.');
    } finally {
      setDescargandoPdf(null);
    }
  };

  // Estadísticas rápidas visibles
  const totalFaltas = useMemo(
    () =>
      registrosOrdenadosAsc.filter(
        (r) =>
          r.tipo === 'inasistencia' &&
          String(r.valor || '').trim().toLowerCase() !== 'presente'
      ).length,
    [registrosOrdenadosAsc]
  );

  const totalPresentes = useMemo(
    () =>
      registrosOrdenadosAsc.filter(
        (r) =>
          r.tipo === 'inasistencia' &&
          String(r.valor || '').trim().toLowerCase() === 'presente'
      ).length,
    [registrosOrdenadosAsc]
  );

  const totalSanciones = useMemo(
    () => registrosOrdenadosAsc.filter((r) => r.tipo === 'sancion').length,
    [registrosOrdenadosAsc]
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Cabecera Institucional + Acciones de Carga (igual flujo que No Docente para Asistencias y Sanciones) */}
      <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg md:text-xl font-bold text-[#1b2a4a]">
              Asistencias, Faltas y Sanciones por Asignatura
            </h2>
            {materiasDocente.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                {materiasDocente
                  .map((m) => `${m.nombre_materia} (${m.curso} ${m.seccion})`)
                  .join(' • ')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Carga y modifica asistencias, faltas y sanciones únicamente para los alumnos inscriptos en tu asignatura, curso y división. Todos los cambios impactan en el boletín y registro del alumno.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCrear('inasistencia')}
            disabled={materiasDocente.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>+ Cargar Asistencia</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCrear('sancion')}
            disabled={materiasDocente.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>+ Cargar Sanción</span>
          </button>
        </div>
      </section>

      {/* Resumen Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Asistencias (Presente)
            </p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{totalPresentes}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#d1e7dd] text-[#0f5132] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Faltas / Tardanzas
            </p>
            <p className="text-2xl font-extrabold text-amber-700 mt-0.5">{totalFaltas}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sanciones Disciplinarias
            </p>
            <p className="text-2xl font-extrabold text-rose-700 mt-0.5">{totalSanciones}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#f8d7da] text-[#842029] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Buscador por DNI o Fecha (Calendario) + Descargas PDF + Botón Buscar */}
      <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <form onSubmit={handleBuscar} className="p-6 border-b border-slate-200 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Búsqueda por DNI */}
            <div>
              <label htmlFor="rs-dni" className="block text-xs font-bold text-slate-600 mb-1.5">
                Buscar por DNI del Alumno
              </label>
              <input
                id="rs-dni"
                type="text"
                inputMode="numeric"
                value={dniFiltro}
                onChange={(e) => setDniFiltro(e.target.value)}
                placeholder="Ej: 48123456"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Búsqueda por Fecha (Calendario) */}
            <div>
              <label htmlFor="rs-fecha" className="block text-xs font-bold text-slate-600 mb-1.5">
                Buscar por Fecha (Calendario)
              </label>
              <div className="relative" onClick={() => abrirCalendario(fechaFiltroRef)}>
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={fechaFiltroRef}
                  id="rs-fecha"
                  type="date"
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Tipo */}
            <div>
              <label htmlFor="rs-tipo" className="block text-xs font-bold text-slate-600 mb-1.5">
                Tipo de Registro
              </label>
              <select
                id="rs-tipo"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as 'todos' | 'inasistencia' | 'sancion')}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos (Faltas y Sanciones)</option>
                <option value="inasistencia">Asistencias / Faltas</option>
                <option value="sancion">Sanciones</option>
              </select>
            </div>
          </div>

          {errorBanner && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {feedbackExito && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackExito}</span>
            </div>
          )}

          {/* Barra de botones: Descargar Todo PDF, Descargar criterio PDF, Limpiar y Buscar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDescargarTodoPdf}
                disabled={buscando || descargandoPdf !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {descargandoPdf === 'todo' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>{descargandoPdf === 'todo' ? 'Generando PDF...' : 'Descargar Todo'}</span>
              </button>

              <button
                type="button"
                onClick={handleDescargarFiltradoPdf}
                disabled={buscando || descargandoPdf !== null}
                title="Descargar en PDF según los criterios ingresados (DNI, Fecha o Tipo)"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {descargandoPdf === 'filtrado' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{descargandoPdf === 'filtrado' ? 'Generando PDF...' : 'Descargar'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLimpiar}
                disabled={buscando}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>

              <button
                type="submit"
                disabled={buscando}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {buscando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>{buscando ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Encabezado de tabla */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Registros de faltas y sanciones ordenados de forma <strong>ASC</strong> (por Fecha y DNI).
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
            {registrosOrdenadosAsc.length}{' '}
            {registrosOrdenadosAsc.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Tabla de Resultados */}
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Cargando asistencias, faltas y sanciones...
            </div>
          ) : registrosOrdenadosAsc.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No se encontraron registros de faltas o sanciones para los criterios seleccionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Fecha (ASC)</th>
                  <th className="py-3.5 px-4">DNI</th>
                  <th className="py-3.5 px-4">Alumno</th>
                  <th className="py-3.5 px-4">Curso y División</th>
                  <th className="py-3.5 px-4">Asignatura</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Concepto / Valor</th>
                  <th className="py-3.5 px-4">Observación</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {registrosOrdenadosAsc.map((r) => {
                  const aluObj = typeof r.alumno_id === 'object' ? r.alumno_id : null;
                  const matObj = typeof r.materia_id === 'object' ? r.materia_id : null;
                  const secObj = matObj && typeof matObj.seccion_id === 'object' ? matObj.seccion_id : null;
                  const curObj = secObj && typeof secObj.curso_id === 'object' ? secObj.curso_id : null;
                  const cursoDivision =
                    curObj?.nombre_curso && secObj?.nombre_seccion
                      ? `${curObj.nombre_curso} - ${secObj.nombre_seccion}`
                      : secObj?.nombre_seccion || 'Sin asignar';

                  const esSancion = r.tipo === 'sancion';
                  const esPresente =
                    !esSancion && String(r.valor || '').trim().toLowerCase() === 'presente';

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {formatearFechaAr(r.fecha)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {aluObj?.dni || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1b2a4a] whitespace-nowrap">
                        {aluObj ? `${aluObj.apellido}, ${aluObj.nombre}` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {cursoDivision}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {matObj?.nombre_materia || '-'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            esSancion
                              ? 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                              : esPresente
                              ? 'bg-[#d1e7dd] text-[#0f5132] border-[#badbcc]'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {esSancion ? 'Sanción' : 'Asistencia / Falta'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {r.valor}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {r.observacion || <span className="italic text-slate-400">Sin observaciones</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditar(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e9ecef] hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md transition-colors cursor-pointer border border-slate-300"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(r._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#dc3545] hover:bg-red-700 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modal Cargar / Modificar Asistencia o Sanción */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modoEdicion
            ? tipoModal === 'sancion'
              ? 'Modificar Sanción Disciplinaria'
              : 'Modificar Registro de Asistencia / Falta'
            : tipoModal === 'sancion'
            ? 'Cargar Nueva Sanción Disciplinaria'
            : 'Cargar Registro de Asistencia / Falta'
        }
      >
        <form onSubmit={handleGuardarModal} className="space-y-4">
          {errorModal && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorModal}</span>
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Tipo de Registro
            </label>
            <select
              value={tipoModal}
              onChange={(e) => {
                const nuevo = e.target.value as 'inasistencia' | 'sancion';
                setTipoModal(nuevo);
                setValorModal(nuevo === 'inasistencia' ? 'Ausente' : 'Amonestación');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            >
              <option value="inasistencia">Asistencia / Inasistencia</option>
              <option value="sancion">Sanción Disciplinaria</option>
            </select>
          </div>

          {/* Asignatura (Curso y División) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Asignatura (Curso y División)
            </label>
            <select
              value={materiaIdModal}
              onChange={(e) => handleCambioMateriaModal(e.target.value)}
              disabled={modoEdicion}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-600"
              required
            >
              <option value="">Seleccione asignatura...</option>
              {materiasDocente.map((m) => (
                <option key={m.materia_id} value={m.materia_id}>
                  {m.nombre_materia} — {m.curso} ({m.seccion})
                </option>
              ))}
            </select>
          </div>

          {/* Alumno (estrictamente filtrado al curso y división de la asignatura) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Estudiante del Curso y División
              </label>
              {materiaSeleccionadaModal && (
                <span className="text-[11px] font-semibold text-indigo-700">
                  {alumnosPermitidosModal.length} inscripto(s) en {materiaSeleccionadaModal.curso}{' '}
                  {materiaSeleccionadaModal.seccion}
                </span>
              )}
            </div>
            <select
              value={alumnoIdModal}
              onChange={(e) => setAlumnoIdModal(e.target.value)}
              disabled={modoEdicion || alumnosPermitidosModal.length === 0}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 disabled:bg-slate-100 disabled:text-slate-600"
              required
            >
              {alumnosPermitidosModal.length === 0 ? (
                <option value="">Sin alumnos inscriptos en este curso y división</option>
              ) : (
                <>
                  <option value="">Seleccione estudiante...</option>
                  {alumnosPermitidosModal.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.apellido}, {a.nombre} (DNI: {a.dni})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Concepto / Estado y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                {tipoModal === 'inasistencia' ? 'Estado / Concepto' : 'Tipo de Sanción'}
              </label>
              <select
                value={
                  (tipoModal === 'inasistencia' ? CONCEPTOS_ASISTENCIA : CONCEPTOS_SANCION).includes(
                    valorModal
                  )
                    ? valorModal
                    : '__otro__'
                }
                onChange={(e) => {
                  if (e.target.value !== '__otro__') {
                    setValorModal(e.target.value);
                  } else {
                    setValorModal('');
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              >
                {(tipoModal === 'inasistencia' ? CONCEPTOS_ASISTENCIA : CONCEPTOS_SANCION).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
                <option value="__otro__">Otro (especificar debajo)...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Fecha
              </label>
              <div className="relative" onClick={() => abrirCalendario(fechaModalRef)}>
                <input
                  ref={fechaModalRef}
                  type="date"
                  value={fechaModal}
                  onChange={(e) => setFechaModal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 cursor-pointer"
                  required
                />
              </div>
            </div>
          </div>

          {/* Texto libre editable del concepto para permitir personalización o ajuste fino */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Detalle del Concepto / Valor
            </label>
            <input
              type="text"
              value={valorModal}
              onChange={(e) => setValorModal(e.target.value)}
              placeholder={
                tipoModal === 'inasistencia'
                  ? 'Ej: Ausente, Presente, Media Falta, Tardanza...'
                  : 'Ej: Amonestación, Llamado de atención, Suspensión...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
              required
            />
          </div>

          {/* Observación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Observación / Motivo
            </label>
            <textarea
              value={observacionModal}
              onChange={(e) => setObservacionModal(e.target.value)}
              placeholder="Ej: Inasistencia sin justificación, retiro anticipado o detalle de la sanción..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || (!modoEdicion && alumnosPermitidosModal.length === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d3557] hover:bg-[#152741] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {guardando ? 'Guardando...' : modoEdicion ? 'Guardar Cambios' : 'Guardar Registro'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
