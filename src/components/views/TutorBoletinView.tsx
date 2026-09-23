/**
 * @archivo src/components/views/TutorBoletinView.tsx
 * @descripción Vista exclusiva para el Rol Tutor / Padre en el Instituto José Peña.
 * @reglaDeNegocio Ofrece selección desplegable de hijos a cargo, resumen de inasistencias/sanciones, boletín trimestral con promedios y exportación oficial a PDF con jsPDF.
 */

import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IUser } from '../../types.js';

interface Hijo {
  _id: string;
  nombre: string;
  apellido: string;
  dni: string;
  tipo_vinculo: string;
  curso: string;
  seccion: string;
  turno: string;
}

interface ItemAcademico {
  materia_id: string;
  materia: string;
  t1: string;
  t2: string;
  t3: string;
  promedioFinal: string;
}

interface ItemInasistencia {
  id: string;
  fecha: string;
  materia: string;
  concepto: string;
  observacion: string;
}

interface ItemSancion {
  id: string;
  fecha: string;
  materia: string;
  sancion: string;
  observacion: string;
}

interface BoletinData {
  institucion: string;
  ciclo_lectivo: string;
  perfil: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: string;
    curso: string;
    seccion: string;
    turno: string;
  };
  inasistencias: {
    total: number;
    listado: ItemInasistencia[];
  };
  sanciones: {
    total: number;
    listado: ItemSancion[];
  };
  tablaAcademica: ItemAcademico[];
}

interface TutorBoletinViewProps {
  usuario: IUser | null;
}

export const TutorBoletinView: React.FC<TutorBoletinViewProps> = ({ usuario }) => {
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [hijoSeleccionadoId, setHijoSeleccionadoId] = useState<string>('');
  const [boletin, setBoletin] = useState<BoletinData | null>(null);
  const [cargandoHijos, setCargandoHijos] = useState(true);
  const [cargandoBoletin, setCargandoBoletin] = useState(false);

  // 1. Cargar la lista de hijos vinculados al tutor
  useEffect(() => {
    const fetchHijos = async () => {
      setCargandoHijos(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/tutor/hijos', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: Hijo[] = await res.json();
          setHijos(data);
          if (data.length > 0) {
            setHijoSeleccionadoId(data[0]._id);
          }
        }
      } catch (error) {
        console.error('Error al cargar hijos del tutor:', error);
      } finally {
        setCargandoHijos(false);
      }
    };

    fetchHijos();
  }, []);

  // 2. Cargar el boletín del hijo seleccionado
  useEffect(() => {
    if (!hijoSeleccionadoId) return;

    const fetchBoletin = async () => {
      setCargandoBoletin(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/tutor/boletin/${hijoSeleccionadoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: BoletinData = await res.json();
          setBoletin(data);
        } else {
          setBoletin(null);
        }
      } catch (error) {
        console.error('Error al cargar boletín del hijo:', error);
      } finally {
        setCargandoBoletin(false);
      }
    };

    fetchBoletin();
  }, [hijoSeleccionadoId]);

  // 3. Generar y Descargar PDF Oficial del Boletín
  const handleDescargarPDF = () => {
    if (!boletin) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Colores Institucionales
    const azulMarino = [27, 42, 74]; // #1b2a4a
    const bordoInstitucional = [164, 22, 26]; // #a4161a
    const grisFondo = [244, 246, 249];

    // Encabezado con Membrete Oficial
    doc.setFillColor(azulMarino[0], azulMarino[1], azulMarino[2]);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('INSTITUTO JOSÉ PEÑA', 14, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('BOLETÍN DE CALIFICACIONES Y INFORME ACADÉMICO OFICIAL', 14, 20);
    doc.text(`CICLO LECTIVO ${boletin.ciclo_lectivo}`, 196, 20, { align: 'right' });

    // Ficha del Estudiante
    doc.setFillColor(grisFondo[0], grisFondo[1], grisFondo[2]);
    doc.roundedRect(14, 34, 182, 26, 2, 2, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${boletin.perfil.apellido}, ${boletin.perfil.nombre}`, 18, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`DNI: ${boletin.perfil.dni}  |  Legajo: ${boletin.perfil.legajo}`, 18, 48);
    doc.text(
      `Curso / Sección: ${boletin.perfil.curso} - ${boletin.perfil.seccion} (${boletin.perfil.turno})`,
      18,
      54
    );

    // Resumen de Inasistencias y Sanciones
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(140, 40, 52, 16, 2, 2, 'FD');

    doc.setTextColor(bordoInstitucional[0], bordoInstitucional[1], bordoInstitucional[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Faltas: ${boletin.inasistencias.total}`, 144, 46);
    doc.text(`Sanciones: ${boletin.sanciones.total}`, 144, 52);

    // Tabla de Calificaciones por Materia
    const headersAcademico = [
      ['MATERIA', '1° TRIMESTRE', '2° TRIMESTRE', '3° TRIMESTRE', 'PROMEDIO FINAL'],
    ];

    const rowsAcademico = boletin.tablaAcademica.map((m) => [
      m.materia,
      m.t1,
      m.t2,
      m.t3,
      m.promedioFinal,
    ]);

    autoTable(doc, {
      startY: 66,
      head: headersAcademico,
      body: rowsAcademico,
      theme: 'grid',
      headStyles: {
        fillColor: azulMarino as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
      },
    });

    // Obtener posición final de la tabla académica
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Sección de Inasistencias y Sanciones si existen
    if (boletin.inasistencias.listado.length > 0 || boletin.sanciones.listado.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]);
      doc.text('DETALLE DE INASISTENCIAS Y SANCIONES', 14, finalY);

      const headersObservaciones = [['TIPO', 'FECHA', 'CONCEPTO / OBSERVACIÓN']];
      const rowsObs = [
        ...boletin.inasistencias.listado.map((i) => [
          'Inasistencia',
          i.fecha,
          `${i.materia}: ${i.observacion || i.concepto}`,
        ]),
        ...boletin.sanciones.listado.map((s) => [
          'Sanción',
          s.fecha,
          `${s.materia}: ${s.sancion} - ${s.observacion}`,
        ]),
      ];

      autoTable(doc, {
        startY: finalY + 4,
        head: headersObservaciones,
        body: rowsObs,
        theme: 'striped',
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: [255, 255, 255],
          fontSize: 8.5,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
      });
    }

    // Pie de página con Firma Institucional
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.line(14, pageHeight - 25, 74, pageHeight - 25);
    doc.text('Firma Preceptoría / Dirección', 14, pageHeight - 20);

    doc.text(`Documento emitido el ${new Date().toLocaleDateString('es-AR')}`, 196, pageHeight - 20, {
      align: 'right',
    });

    // Guardar PDF
    const nombreArchivo = `Boletin_${boletin.perfil.apellido}_${boletin.perfil.nombre}_2026.pdf`;
    doc.save(nombreArchivo);
  };

  if (cargandoHijos) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center text-slate-500 font-sans text-sm">
        Cargando estudiantes a su cargo...
      </div>
    );
  }

  if (hijos.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-sans">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-amber-800 text-sm">
          <h3 className="font-bold text-base mb-1">Sin Hijos Registrados</h3>
          <p>
            No se encontraron alumnos vinculados a su cuenta de tutor. Si cree que esto es un error,
            por favor comuníquese con la Preceptoría o Administración del Instituto José Peña.
          </p>
        </div>
      </div>
    );
  }

  const hijoActual = hijos.find((h) => h._id === hijoSeleccionadoId) || hijos[0];

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* 1. Selector de Hijos y Descargar PDF */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Seleccionar Estudiante:
          </span>
          <select
            value={hijoSeleccionadoId}
            onChange={(e) => setHijoSeleccionadoId(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]/20 cursor-pointer"
          >
            {hijos.map((h) => (
              <option key={h._id} value={h._id}>
                {h.apellido}, {h.nombre} — {h.curso} ({h.seccion})
              </option>
            ))}
          </select>
        </div>

        {/* Botón Destacado de Exportación PDF con Rojo Institucional #a4161a */}
        <button
          onClick={handleDescargarPDF}
          disabled={!boletin}
          className="px-5 py-2.5 bg-[#a4161a] hover:bg-[#801013] text-white font-bold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          📄 Descargar Boletín (PDF)
        </button>
      </div>

      {cargandoBoletin || !boletin ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Cargando expediente escolar del estudiante...
        </div>
      ) : (
        <>
          {/* 2. Tarjeta Encabezado del Estudiante */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Expediente Estudiantil • Ciclo Lectivo 2026
              </div>
              <h2 className="text-2xl font-bold text-[#1b2a4a] mt-0.5">
                {boletin.perfil.apellido}, {boletin.perfil.nombre}
              </h2>
              <div className="text-xs font-semibold text-slate-500 mt-1 flex flex-wrap gap-4">
                <span>DNI: {boletin.perfil.dni}</span>
                <span>•</span>
                <span>Legajo: {boletin.perfil.legajo}</span>
                <span>•</span>
                <span className="text-[#1b2a4a] font-bold">
                  {boletin.perfil.curso} - {boletin.perfil.seccion} ({boletin.perfil.turno})
                </span>
              </div>
            </div>

            {/* 3. Tarjetas Resumen */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl text-center min-w-[120px]">
                <span className="text-2xl font-extrabold text-[#842029] block">
                  {boletin.inasistencias.total}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Faltas Acumuladas
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-center min-w-[120px]">
                <span className="text-2xl font-extrabold text-amber-900 block">
                  {boletin.sanciones.total}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Sanciones
                </span>
              </div>
            </div>
          </div>

          {/* 4. Tabla de Calificaciones Trimestrales */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-[#1b2a4a]">
              Rendimiento Académico y Calificaciones
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th className="py-3.5 px-6">MATERIA</th>
                    <th className="py-3.5 px-4 text-center">1° TRIMESTRE</th>
                    <th className="py-3.5 px-4 text-center">2° TRIMESTRE</th>
                    <th className="py-3.5 px-4 text-center">3° TRIMESTRE</th>
                    <th className="py-3.5 px-6 text-center">PROMEDIO FINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {boletin.tablaAcademica.map((m) => {
                    const promNum = parseFloat(m.promedioFinal);
                    const esAprobado = !isNaN(promNum) && promNum >= 6;

                    return (
                      <tr key={m.materia_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">{m.materia}</td>
                        <td className="py-4 px-4 text-center font-mono">
                          {m.t1 !== '-' ? (
                            <span className="px-2.5 py-1 bg-[#e2eafc] text-[#003566] font-bold text-xs rounded-md">
                              {m.t1}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-mono">
                          {m.t2 !== '-' ? (
                            <span className="px-2.5 py-1 bg-[#e2eafc] text-[#003566] font-bold text-xs rounded-md">
                              {m.t2}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-mono">
                          {m.t3 !== '-' ? (
                            <span className="px-2.5 py-1 bg-[#e2eafc] text-[#003566] font-bold text-xs rounded-md">
                              {m.t3}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-mono">
                          {m.promedioFinal !== '-' ? (
                            <span
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                                esAprobado
                                  ? 'bg-[#d1e7dd] text-[#0f5132] border border-[#badbcc]'
                                  : 'bg-[#f8d7da] text-[#842029] border border-[#f5c2c7]'
                              }`}
                            >
                              {m.promedioFinal}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Tablas Secundarias: Inasistencias y Sanciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lista de Inasistencias */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-[#842029] flex items-center justify-between">
                <span>Historial de Inasistencias</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#f8d7da] text-[#842029]">
                  {boletin.inasistencias.total}
                </span>
              </div>
              {boletin.inasistencias.listado.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No registra inasistencias acumuladas.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {boletin.inasistencias.listado.map((item, idx) => (
                    <div key={idx} className="p-3.5 text-xs flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">{item.materia}</span>
                        <span className="text-slate-500">{item.observacion || item.concepto}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-400 shrink-0">
                        {item.fecha}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Sanciones */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-amber-900 flex items-center justify-between">
                <span>Historial de Sanciones</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-900">
                  {boletin.sanciones.total}
                </span>
              </div>
              {boletin.sanciones.listado.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  Sin registros disciplinarios o sanciones.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {boletin.sanciones.listado.map((item, idx) => (
                    <div key={idx} className="p-3.5 text-xs flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {item.sancion} — {item.materia}
                        </span>
                        <span className="text-slate-500">{item.observacion}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-400 shrink-0">
                        {item.fecha}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
