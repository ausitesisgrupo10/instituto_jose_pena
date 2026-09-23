/**
 * @archivo src/controllers/alumnoController.ts
 * @descripción Controlador REST para el endpoint exclusivo del Alumno (Mi Boletín / Dashboard Alumno).
 * @reglaDeNegocio Filtra estrictamente por el alumno_id autenticado en req.usuario._id.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Materia } from '../models/Materia.js';
import { Seccion } from '../models/Seccion.js';

/**
 * @función obtenerMiBoletin
 * @descripción Devuelve el perfil del alumno, resumen de inasistencias con fecha, sanciones y tabla académica por materia con promedio numérico exacto de 3 trimestres.
 */
export async function obtenerMiBoletin(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const alumnoId = req.usuario._id;

    // 1. Datos de Perfil (Año/Curso, Sección, Turno)
    let curso = req.usuario.perfil_metadata?.curso || '1° Año';
    let seccion = req.usuario.perfil_metadata?.seccion || 'División A';
    let turno = req.usuario.perfil_metadata?.turno || 'Mañana';

    const seccionId = req.usuario.perfil_metadata?.seccion_id;
    if (seccionId) {
      const seccionDoc = await Seccion.findById(seccionId).populate('curso_id');
      if (seccionDoc) {
        seccion = seccionDoc.nombre_seccion;
        turno = seccionDoc.turno;
        if (seccionDoc.curso_id && (seccionDoc.curso_id as any).nombre_curso) {
          curso = (seccionDoc.curso_id as any).nombre_curso;
        }
      }
    }

    const perfil = {
      id: req.usuario._id,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      dni: req.usuario.dni,
      legajo: req.usuario.perfil_metadata?.legajo || 'ALU-2026-001',
      curso,
      seccion,
      turno,
    };

    // 2. Inasistencias (Filtradas estrictamente por alumnoId)
    const inasistenciasDocs = await RegistroAcademico.find({
      alumno_id: alumnoId,
      tipo: 'inasistencia',
    })
      .populate('materia_id')
      .sort({ fecha: -1 });

    const inasistenciasListado = inasistenciasDocs.map((doc) => ({
      id: doc._id,
      fecha: doc.fecha ? doc.fecha.toISOString().split('T')[0] : '',
      materia: (doc.materia_id as any)?.nombre_materia || 'General',
      concepto: doc.valor || 'Ausente',
      observacion: doc.observacion || '',
    }));

    const totalInasistencias = inasistenciasDocs.length;

    // 3. Sanciones (Filtradas estrictamente por alumnoId)
    const sancionesDocs = await RegistroAcademico.find({
      alumno_id: alumnoId,
      tipo: 'sancion',
    })
      .populate('materia_id')
      .sort({ fecha: -1 });

    const sancionesListado = sancionesDocs.map((doc) => ({
      id: doc._id,
      fecha: doc.fecha ? doc.fecha.toISOString().split('T')[0] : '',
      materia: (doc.materia_id as any)?.nombre_materia || 'General',
      sancion: doc.valor || 'Sanción',
      observacion: doc.observacion || '',
    }));

    // 4. Notas Académicas por Materia (Notas de los 3 Trimestres + Promedio Final)
    // Obtener todas las materias asignadas a la sección del alumno (o asociadas a sus notas)
    let materiasQuery: any = {};
    if (seccionId) {
      materiasQuery = { seccion_id: seccionId };
    }
    let materias = await Materia.find(materiasQuery);
    if (materias.length === 0) {
      materias = await Materia.find({});
    }

    const notasDocs = await RegistroAcademico.find({
      alumno_id: alumnoId,
      tipo: 'nota',
    }).populate('materia_id');

    const tablaAcademica = materias.map((mat) => {
      const notasMateria = notasDocs.filter(
        (n) => n.materia_id && (n.materia_id as any)._id.toString() === mat._id.toString()
      );

      // Obtener o inferir notas para los 3 trimestres
      let n1: number | null = null;
      let n2: number | null = null;
      let n3: number | null = null;

      notasMateria.forEach((n) => {
        const valNum = parseFloat(n.valor);
        if (isNaN(valNum)) return;

        if (n.trimestre === 1 || (n.observacion && n.observacion.includes('1°'))) {
          n1 = valNum;
        } else if (n.trimestre === 2 || (n.observacion && n.observacion.includes('2°'))) {
          n2 = valNum;
        } else if (n.trimestre === 3 || (n.observacion && n.observacion.includes('3°'))) {
          n3 = valNum;
        } else {
          if (n1 === null) n1 = valNum;
          else if (n2 === null) n2 = valNum;
          else if (n3 === null) n3 = valNum;
        }
      });

      const notasValidas = [n1, n2, n3].filter((val): val is number => val !== null);
      let promedioFinal: string = '-';

      if (notasValidas.length > 0) {
        const suma = notasValidas.reduce((acc, curr) => acc + curr, 0);
        const prom = suma / notasValidas.length;
        promedioFinal = prom.toFixed(2);
      }

      return {
        materia_id: mat._id,
        materia: mat.nombre_materia,
        t1: n1 !== null ? n1.toFixed(2) : '-',
        t2: n2 !== null ? n2.toFixed(2) : '-',
        t3: n3 !== null ? n3.toFixed(2) : '-',
        promedioFinal,
      };
    });

    res.json({
      perfil,
      inasistencias: {
        total: totalInasistencias,
        listado: inasistenciasListado,
      },
      sanciones: {
        total: sancionesListado.length,
        listado: sancionesListado,
      },
      tablaAcademica,
    });
  } catch (error) {
    console.error('❌ Error al obtener boletín del alumno:', error);
    res.status(500).json({ error: 'Error interno al consultar el boletín del alumno.' });
  }
}
