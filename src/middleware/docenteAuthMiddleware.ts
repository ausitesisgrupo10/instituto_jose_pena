/**
 * @archivo src/middleware/docenteAuthMiddleware.ts
 * @descripción Middleware de autorización para validar la titularidad del docente sobre las materias asignadas.
 * @reglaDeNegocio Un docente solo puede crear, modificar y eliminar calificaciones en asignaturas donde figura como titular (docente_id === req.usuario._id).
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { Materia } from '../models/Materia.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { User } from '../models/User.js';

function normTxt(v: unknown): string {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @función validarTitularidadMateria
 * @descripción Verifica que el docente autenticado sea el titular de la materia antes de permitir crear, actualizar o borrar registros.
 * Para inasistencias y sanciones, verifica además que el alumno pertenezca al curso y división de la asignatura.
 */
export async function validarTitularidadMateria(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    // Admins, Directores y No Docentes tienen permiso administrativo global
    if (
      req.usuario.rol === 'Admin' ||
      req.usuario.rol === 'Director' ||
      req.usuario.rol === 'No Docente'
    ) {
      next();
      return;
    }

    if (req.usuario.rol !== 'Docente') {
      res.status(403).json({ error: 'Acceso denegado: Requiere rol de Docente, No Docente o Admin.' });
      return;
    }

    let materiaIdStr: string | null = null;
    let alumnoIdStr: string | null = null;
    let tipoRegistro: string | null = req.body?.tipo ? String(req.body.tipo) : null;

    let registroExistente: any = null;
    if (req.params && req.params.id) {
      registroExistente = await RegistroAcademico.findById(req.params.id);
      if (!registroExistente) {
        res.status(404).json({ error: 'Registro académico no encontrado.' });
        return;
      }
      materiaIdStr = registroExistente.materia_id.toString();
      alumnoIdStr = registroExistente.alumno_id.toString();
      if (!tipoRegistro) tipoRegistro = registroExistente.tipo;
    }

    if (req.body && req.body.materia_id) {
      materiaIdStr = req.body.materia_id.toString();
    }
    if (req.body && req.body.alumno_id) {
      alumnoIdStr = req.body.alumno_id.toString();
    }

    if (!materiaIdStr) {
      res.status(400).json({ error: 'No se pudo identificar la materia asociada a la operación.' });
      return;
    }

    // Verificar si la materia está asignada al docente autenticado
    const materiaAsignada: any = await Materia.findOne({
      _id: materiaIdStr,
      docente_id: req.usuario._id,
    }).populate({
      path: 'seccion_id',
      populate: { path: 'curso_id' },
    });

    if (!materiaAsignada) {
      res.status(403).json({
        error: 'Acceso denegado: Un docente no puede cargar, modificar ni eliminar registros de asignaturas de otros docentes.',
      });
      return;
    }

    // Para asistencias (inasistencia) y sanciones: validar que el alumno pertenezca al curso y división de la asignatura
    if (
      (req.method === 'POST' || req.method === 'PUT') &&
      (tipoRegistro === 'inasistencia' || tipoRegistro === 'sancion')
    ) {
      if (!alumnoIdStr) {
        res.status(400).json({ error: 'Debe especificar un alumno válido.' });
        return;
      }

      const alumno: any = await User.findOne({ _id: alumnoIdStr, rol: 'Alumno' })
        .populate('curso_id', 'nombre_curso')
        .populate({
          path: 'seccion_id',
          populate: { path: 'curso_id', select: 'nombre_curso' },
        });

      if (!alumno) {
        res.status(404).json({ error: 'Alumno no encontrado.' });
        return;
      }

      const seccionMateria: any = materiaAsignada.seccion_id;
      const seccionMateriaId = seccionMateria?._id ? String(seccionMateria._id) : '';
      const cursoMateriaNorm = normTxt(seccionMateria?.curso_id?.nombre_curso);
      const divisionMateriaNorm = normTxt(seccionMateria?.nombre_seccion);

      const meta = alumno.perfil_metadata || {};
      const aluSeccionDirecta = alumno.seccion_id?._id ? String(alumno.seccion_id._id) : '';
      const aluSeccionMeta = meta.seccion_id ? String(meta.seccion_id) : '';

      const aluCursoNorm = normTxt(
        alumno.curso_id?.nombre_curso ||
          alumno.seccion_id?.curso_id?.nombre_curso ||
          meta.curso
      );
      const aluDivisionNorm = normTxt(
        alumno.seccion_id?.nombre_seccion || meta.seccion || (meta.division ? `División ${meta.division}` : '')
      );

      const coincidePorId =
        Boolean(seccionMateriaId) &&
        (aluSeccionDirecta === seccionMateriaId || aluSeccionMeta === seccionMateriaId);
      const coincidePorCursoDivision =
        Boolean(cursoMateriaNorm && divisionMateriaNorm) &&
        aluCursoNorm === cursoMateriaNorm &&
        aluDivisionNorm === divisionMateriaNorm;

      if (!coincidePorId && !coincidePorCursoDivision) {
        res.status(403).json({
          error:
            'Acceso denegado: Solamente se pueden cargar o modificar asistencias y sanciones sobre alumnos inscriptos en la asignatura, curso y división seleccionados.',
        });
        return;
      }
    }

    next();
  } catch (error: any) {
    console.error('❌ Error en middleware de validación docente:', error);
    res.status(500).json({ error: 'Error interno de autorización docente.', detalle: error.message });
  }
}
