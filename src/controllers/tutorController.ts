/**
 * @archivo src/controllers/tutorController.ts
 * @descripción Controlador REST para el rol Padre / Tutor del Instituto José Peña.
 * @reglaDeNegocio Ofrece los endpoints para consultar los estudiantes asociados a un tutor y obtener sus boletines completos con notas trimestrales, inasistencias y sanciones.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Parentesco } from '../models/Parentesco.js';
import { User } from '../models/User.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Materia } from '../models/Materia.js';
import { Seccion } from '../models/Seccion.js';
import { Asistencia } from '../models/Asistencia.js';

/**
 * @función obtenerHijosDelTutor
 * @descripción Obtiene la lista de todos los alumnos vinculados activamente al tutor logueado a través de la colección 'parentescos'.
 * @param {AuthRequest} req - Solicitud HTTP Express con req.usuario autenticado.
 * @param {Response} res - Respuesta HTTP con el listado de hijos (id, nombre, apellido, dni, curso, seccion).
 * @reglaDeNegocio Filtra estrictamente por padre_id == req.usuario._id.
 */
export async function obtenerHijosDelTutor(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const padreId = req.usuario._id;

    // Buscar relaciones en la colección parentescos
    const relaciones = await Parentesco.find({ padre_id: padreId }).populate({
      path: 'alumno_id',
      select: 'nombre apellido dni rol estado perfil_metadata',
    });

    const hijos = await Promise.all(
      relaciones.map(async (rel) => {
        const alumno = rel.alumno_id as any;
        if (!alumno) return null;

        let curso = alumno.perfil_metadata?.curso || '1° Año';
        let seccion = alumno.perfil_metadata?.seccion || 'División A';
        let turno = alumno.perfil_metadata?.turno || 'Mañana';

        if (alumno.perfil_metadata?.seccion_id) {
          const seccionDoc = await Seccion.findById(alumno.perfil_metadata.seccion_id).populate('curso_id');
          if (seccionDoc) {
            seccion = seccionDoc.nombre_seccion;
            turno = seccionDoc.turno;
            if (seccionDoc.curso_id && (seccionDoc.curso_id as any).nombre_curso) {
              curso = (seccionDoc.curso_id as any).nombre_curso;
            }
          }
        }

        return {
          _id: alumno._id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          dni: alumno.dni,
          tipo_vinculo: rel.tipo_vinculo,
          curso,
          seccion,
          turno,
        };
      })
    );

    // Filtrar nulos si hubiese alumnos eliminados
    const hijosValidos = hijos.filter((h) => h !== null);

    res.json(hijosValidos);
  } catch (error: any) {
    console.error('❌ Error al obtener lista de hijos del tutor:', error);
    res.status(500).json({ error: 'Error al consultar estudiantes a cargo.', detalle: error.message });
  }
}

/**
 * @función obtenerBoletinHijo
 * @descripción Devuelve el expediente académico completo de un hijo específico (perfil, notas trimestrales por materia, promedio final, inasistencias acumuladas y sanciones).
 * @param {AuthRequest} req - Solicitud Express con req.usuario (Tutor) y req.params.alumnoId.
 * @param {Response} res - Objeto Express que retorna el JSON estructurado para las tarjetas, tablas y exportación PDF.
 * @reglaDeNegocio La ruta utiliza previamente el middleware 'validarVinculoParentesco' para asegurar la tutoría legal del estudiante.
 */
export async function obtenerBoletinHijo(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { alumnoId } = req.params;

    const alumno = await User.findById(alumnoId).select('-passwordHash');
    if (!alumno || alumno.rol !== 'Alumno') {
      res.status(404).json({ error: 'Estudiante no encontrado en el sistema.' });
      return;
    }

    // 1. Datos de Perfil Institucional
    let curso = alumno.perfil_metadata?.curso || '1° Año';
    let seccion = alumno.perfil_metadata?.seccion || 'División A';
    let turno = alumno.perfil_metadata?.turno || 'Mañana';
    const seccionId = alumno.perfil_metadata?.seccion_id;

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
      id: alumno._id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      dni: alumno.dni,
      legajo: alumno.perfil_metadata?.legajo || `ALU-2026-${alumno.dni.substring(0, 3)}`,
      curso,
      seccion,
      turno,
    };

    // 2. Registros de Inasistencias (RegistroAcademico y Asistencia)
    const inasistenciasDocs = await RegistroAcademico.find({
      alumno_id: alumnoId,
      tipo: 'inasistencia',
    })
      .populate('materia_id')
      .sort({ fecha: -1 });

    const asistenciasGeneralesInasistentes = await Asistencia.find({
      persona_id: alumnoId,
      estado: 'Ausente',
    }).sort({ fecha: -1 });

    const inasistenciasListado = [
      ...inasistenciasDocs.map((doc) => ({
        id: doc._id,
        fecha: doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-AR') : '-',
        materia: (doc.materia_id as any)?.nombre_materia || 'General Preceptoría',
        concepto: doc.valor || 'Inasistencia',
        observacion: doc.observacion || '',
      })),
      ...asistenciasGeneralesInasistentes.map((a) => ({
        id: a._id,
        fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR') : '-',
        materia: 'Asistencia Diaria',
        concepto: 'Ausente',
        observacion: a.comentario || 'Inasistencia registrada por Preceptoría',
      })),
    ];

    const totalInasistencias = inasistenciasListado.length;

    // 3. Sanciones Disciplinarias
    const sancionesDocs = await RegistroAcademico.find({
      alumno_id: alumnoId,
      tipo: 'sancion',
    })
      .populate('materia_id')
      .sort({ fecha: -1 });

    const sancionesListado = sancionesDocs.map((doc) => ({
      id: doc._id,
      fecha: doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-AR') : '-',
      materia: (doc.materia_id as any)?.nombre_materia || 'Conducta / Preceptoría',
      sancion: doc.valor || 'Amonestación',
      observacion: doc.observacion || '',
    }));

    // 4. Tabla de Rendimiento por Materias (Trimestres 1, 2, 3 y Promedio Final)
    let materiasQuery: any = {};
    if (seccionId) materiasQuery = { seccion_id: seccionId };

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
      institucion: 'Instituto José Peña',
      ciclo_lectivo: '2026',
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
  } catch (error: any) {
    console.error('❌ Error al obtener boletín del estudiante para el tutor:', error);
    res.status(500).json({ error: 'Error al procesar el expediente del alumno.', detalle: error.message });
  }
}
