/**
 * @archivo src/controllers/reporteController.ts
 * @descripción Controlador para la consolidación de Reportes, KPIs y Estadísticas del Instituto José Peña.
 */

import { Response } from 'express';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { Materia } from '../models/Materia.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

/**
 * @función obtenerEstadisticasKPI
 * @descripción Calcula el número total de usuarios por rol, materias y cursos para el Dashboard.
 * @param {AuthRequest} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con objeto IDashboardStats.
 */
export async function obtenerEstadisticasKPI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      totalUsuarios,
      totalAlumnos,
      totalDocentes,
      totalPadres,
      totalNoDocentes,
      totalMaterias,
      totalCursos,
      totalSecciones,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ rol: 'Alumno' }),
      User.countDocuments({ rol: 'Docente' }),
      User.countDocuments({ rol: 'Padre' }),
      User.countDocuments({ rol: 'No Docente' }),
      Materia.countDocuments(),
      Curso.countDocuments(),
      Seccion.countDocuments(),
    ]);

    res.json({
      totalUsuarios,
      totalAlumnos,
      totalDocentes,
      totalPadres,
      totalNoDocentes,
      totalMaterias,
      totalCursos,
      totalSecciones,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener estadísticas del dashboard.', detalle: error.message });
  }
}

/**
 * @función generarReporteEstadistico
 * @descripción Genera datos analíticos agregados (distribución de notas, inasistencias por nivel, cumplimiento docente).
 * @param {AuthRequest} req - Solicitud HTTP.
 * @param {Response} res - Respuesta HTTP con conjuntos de datos para gráficos.
 * @reglaDeNegocio Utilizado por Administradores y No Docentes para visualización estadística.
 */
export async function generarReporteEstadistico(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notas = await RegistroAcademico.find({ tipo: 'nota' } as any);
    const inasistencias = await RegistroAcademico.find({ tipo: 'inasistencia' } as any);
    const sanciones = await RegistroAcademico.find({ tipo: 'sancion' } as any);
    const asistenciasDocentes = await AsistenciaDocente.find();

    // Rango de notas
    let aprobados = 0; // >= 6
    let promocionados = 0; // >= 8
    let desaprobados = 0; // < 6

    notas.forEach((n) => {
      const v = parseFloat(n.valor);
      if (!isNaN(v)) {
        if (v >= 8) promocionados++;
        else if (v >= 6) aprobados++;
        else desaprobados++;
      }
    });

    // Asistencia docente
    let docentesPresentes = 0;
    let docentesAusentes = 0;
    let docentesLicencia = 0;

    asistenciasDocentes.forEach((a) => {
      if (a.estado === 'Presente') docentesPresentes++;
      else if (a.estado === 'Ausente') docentesAusentes++;
      else docentesLicencia++;
    });

    res.json({
      resumenNotas: {
        promocionados,
        aprobados,
        desaprobados,
        total: notas.length,
      },
      resumenAsistenciaAlumnos: {
        totalInasistencias: inasistencias.length,
        totalSanciones: sanciones.length,
      },
      resumenAsistenciaDocente: {
        presentes: docentesPresentes,
        ausentes: docentesAusentes,
        licencias: docentesLicencia,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al generar reporte estadístico.', detalle: error.message });
  }
}
