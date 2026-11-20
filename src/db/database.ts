/**
 * @archivo src/db/database.ts
 * @descripción Configuración de conexión Mongoose a MongoDB y script de inicialización con datos semilla (Seed Data) para el Instituto José Peña.
 * @reglaDeNegocio Utiliza MongoMemoryServer de forma transparente si no existe una URI externa de MongoDB, garantizando funcionamiento inmediato y persistencia en memoria durante la ejecución.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { sembrarDatasetCompleto, DATOS_PERSONAL_POR_DNI } from './seedDataset.js';
import { estudiantesPdfDataset } from './estudiantesPdfDataset.js';
import { docentesPdfDataset } from './docentesPdfDataset.js';
import { noDocentesPdfDataset } from './noDocentesPdfDataset.js';

let mongoMemoryServer: MongoMemoryServer | null = null;

/**
 * Asegura de forma idempotente que Docentes, No Docentes, Director y Admin tengan
 * sus metadatos institucionales (legajo, cargo, turno, teléfono, dirección, ciudad, fecha_inicio)
 * poblados si aún no los poseen, sin sobrescribir cambios manuales.
 */
async function asegurarMetadatosPersonalInstitucional(): Promise<void> {
  const usuarios = await User.find({
    rol: { $in: ['Docente', 'No Docente', 'Director', 'Admin', 'Alumno', 'Padre'] },
  });

  const cargosLegacyANormalizar = new Set([
    'Profesor Titular',
    'Profesora Adjunta',
    'Profesora de Grado',
    'Preceptor',
    'Preceptora',
    'Secretaria Académica',
    'Auxiliar Administrativo',
    'Bibliotecario',
    'Director',
    'Administrador',
    'Administrativo',
    'Estudiante',
    'Padre / Tutor',
  ]);

  for (const u of usuarios) {
    const meta = { ...(u.perfil_metadata || {}) };
    let modificado = false;

    if (u.rol === 'Alumno') {
      if (!meta.cargo || cargosLegacyANormalizar.has(meta.cargo)) {
        meta.cargo = 'Estudiantes';
        modificado = true;
      }
      if (!meta.legajo) {
        meta.legajo = `ALU-${String(u.dni || '').slice(-4)}`;
        modificado = true;
      }
    } else if (u.rol === 'Padre') {
      if (!meta.cargo || cargosLegacyANormalizar.has(meta.cargo)) {
        meta.cargo = 'Padre/Tutor';
        modificado = true;
      }
      if (!meta.legajo) {
        meta.legajo = `TUT-${String(u.dni || '').slice(-4)}`;
        modificado = true;
      }
      if (!u.turno && !meta.turno) {
        u.turno = 'Mañana';
        meta.turno = 'Mañana';
        modificado = true;
      }
    } else {
      const info = DATOS_PERSONAL_POR_DNI[u.dni];
      const prefijo =
        u.rol === 'Docente'
          ? 'DOC'
          : u.rol === 'No Docente'
            ? 'NOD'
            : u.rol === 'Director'
              ? 'DIR'
              : 'ADM';

      if (!meta.legajo) {
        meta.legajo = info?.legajo || `${prefijo}-${String(u.dni || '').slice(-4)}`;
        modificado = true;
      }
      if (!meta.cargo || cargosLegacyANormalizar.has(meta.cargo)) {
        meta.cargo =
          info?.cargo ||
          (u.rol === 'Docente'
            ? 'Docente'
            : u.rol === 'No Docente'
              ? 'Secretaría'
              : 'Directivo');
        modificado = true;
      }
      if (meta.asignatura === undefined && info?.asignatura) {
        meta.asignatura = info.asignatura;
        modificado = true;
      }
      if (!u.turno && !meta.turno) {
        const t = info?.turno || 'Mañana';
        u.turno = t;
        meta.turno = t;
        modificado = true;
      } else if (!meta.turno && u.turno) {
        meta.turno = u.turno;
        modificado = true;
      } else if (!u.turno && meta.turno) {
        u.turno = meta.turno;
        modificado = true;
      }
      if (!meta.telefono && !meta.celular) {
        const tel = info?.telefono || '351-400-0000';
        meta.telefono = tel;
        meta.celular = tel;
        modificado = true;
      }
      if (!meta.direccion) {
        meta.direccion = info?.direccion || 'Av. Colón 500';
        modificado = true;
      }
      if (!meta.ciudad) {
        meta.ciudad = info?.ciudad || meta.localidad || 'Córdoba';
        modificado = true;
      }
      if (!meta.fecha_inicio) {
        meta.fecha_inicio = info?.fecha_inicio || '2024-03-01';
        modificado = true;
      }
      if (meta.fecha_fin === undefined) {
        meta.fecha_fin = info?.fecha_fin || '';
        modificado = true;
      }
      if (u.rol === 'Docente' && !meta.categoria) {
        meta.categoria = 'Titular';
        modificado = true;
      }
      if (u.rol === 'No Docente') {
        if (!meta.area_usuario) {
          meta.area_usuario = meta.cargo || 'Secretaría';
          modificado = true;
        }
        if (!meta.cargo_sector) {
          meta.cargo_sector = meta.asignatura || info?.asignatura || 'Administración General';
          modificado = true;
        }
      }
      if (!meta.email) {
        const emailBase = `${u.nombre}.${u.apellido}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, '');
        meta.email = `${emailBase}@josepena.edu.ar`;
        modificado = true;
      }
    }

    if (modificado) {
      u.perfil_metadata = meta;
      u.markModified('perfil_metadata');
      await u.save();
    }
  }
}

/**
 * Asegura de forma idempotente que los 50 estudiantes del PDF estén presentes en la base de datos
 * sin sobrescribir modificaciones ni altas manuales realizadas por el usuario.
 */
async function asegurarEstudiantesPdfPersistidos(): Promise<void> {
  const existentes = await User.find({ rol: 'Alumno' }).select('dni');
  const dnisExistentes = new Set(existentes.map((u) => u.dni));

  const faltantes = estudiantesPdfDataset.filter((e) => !dnisExistentes.has(e.dni));
  if (faltantes.length === 0) return;

  const [cursos, secciones] = await Promise.all([Curso.find({}), Seccion.find({})]);
  const mapaCursos = new Map<string, any>();
  for (const c of cursos) mapaCursos.set(c.nombre_curso, c);

  const mapaSecciones = new Map<string, any>();
  for (const s of secciones) {
    mapaSecciones.set(`${String(s.curso_id)}::${s.nombre_seccion}`, s);
  }

  const alumnoDefaultHash = await bcrypt.hash('Alumno123!', 10);

  for (const est of faltantes) {
    const cursoNombre = `${est.curso}° Año`;
    let cursoDoc = mapaCursos.get(cursoNombre);
    if (!cursoDoc) {
      cursoDoc = await Curso.create({ nombre_curso: cursoNombre, nivel: 'Secundario' });
      mapaCursos.set(cursoNombre, cursoDoc);
    }

    const divisionNombre = `División ${est.division}`;
    const secKey = `${String(cursoDoc._id)}::${divisionNombre}`;
    let seccionDoc = mapaSecciones.get(secKey);
    if (!seccionDoc) {
      seccionDoc = await Seccion.create({
        nombre_seccion: divisionNombre,
        curso_id: cursoDoc._id,
        turno: est.turno,
      });
      mapaSecciones.set(secKey, seccionDoc);
    }

    const emailBase = `${est.nombre}.${est.apellido}.${est.dni.slice(-3)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');

    await User.create({
      dni: est.dni,
      nombre: est.nombre,
      apellido: est.apellido,
      rol: 'Alumno',
      permisos: ['CONSULTA_PROPIA'],
      curso_id: cursoDoc._id,
      seccion_id: seccionDoc._id,
      turno: est.turno,
      passwordHash: alumnoDefaultHash,
      estado: est.estado,
      perfil_metadata: {
        email: `${emailBase}@josepena.edu.ar`,
        dni: est.dni,
        legajo: `ALU-${est.dni.slice(-4)}`,
        cargo: 'Estudiantes',
        fecha_nacimiento: est.fecha_nacimiento,
        curso: cursoNombre,
        curso_numero: est.curso,
        division: est.division,
        seccion: divisionNombre,
        turno: est.turno,
        curso_id: cursoDoc._id,
        seccion_id: seccionDoc._id,
        direccion: est.direccion,
        barrio: est.barrio,
        localidad: est.localidad,
        provincia: est.provincia,
        contacto: est.contacto,
        telefono: est.contacto,
        contacto_emergencia: est.contacto,
        promedio_general: est.promedio_general,
        sanciones: est.sanciones,
        observacion_general: `Estudiante de ${cursoNombre} División ${est.division} (${est.turno}). Promedio general: ${est.promedio_general.toFixed(2)}.`,
      },
    });
  }
  console.log(`✅ ${faltantes.length} estudiantes del PDF persistidos en la base de datos.`);
}

/**
 * Asegura de forma idempotente que los 30 docentes del PDF estén presentes en la base de datos
 * sin sobrescribir modificaciones ni altas manuales realizadas por el usuario.
 */
async function asegurarDocentesPdfPersistidos(): Promise<void> {
  const existentes = await User.find({ rol: 'Docente' }).select('dni');
  const dnisExistentes = new Set(existentes.map((u) => u.dni));

  const faltantes = docentesPdfDataset.filter((d) => !dnisExistentes.has(d.dni));
  if (faltantes.length === 0) return;

  const docenteDefaultHash = await bcrypt.hash('Docente123!', 10);

  for (const doc of faltantes) {
    const emailBase = `${doc.nombre}.${doc.apellido}.${doc.dni.slice(-3)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');

    await User.create({
      dni: doc.dni,
      nombre: doc.nombre,
      apellido: doc.apellido,
      rol: 'Docente',
      permisos: ['REGISTRAR_NOTAS', 'VER_ALUMNOS'],
      curso_id: null,
      seccion_id: null,
      turno: doc.turno,
      passwordHash: docenteDefaultHash,
      estado: doc.estado,
      perfil_metadata: {
        email: `${emailBase}@josepena.edu.ar`,
        dni: doc.dni,
        legajo: doc.legajo,
        cargo: 'Docente',
        categoria: doc.categoria,
        asignatura: doc.area_materia,
        turno: doc.turno,
        telefono: doc.telefono,
        celular: doc.telefono,
        direccion: doc.direccion,
        ciudad: 'Córdoba',
        localidad: 'Córdoba',
        fecha_inicio: doc.fecha_inicio,
        fecha_fin: doc.fecha_fin,
        titulo: 'Profesor de Nivel Secundario',
      },
    });
  }
  console.log(`✅ ${faltantes.length} docentes del PDF persistidos en la base de datos.`);
}

/**
 * Asegura de forma idempotente que los 30 agentes No Docentes del PDF estén presentes en la base de datos
 * sin sobrescribir modificaciones ni altas manuales realizadas por el usuario.
 */
async function asegurarNoDocentesPdfPersistidos(): Promise<void> {
  const existentes = await User.find({ rol: 'No Docente' }).select('dni');
  const dnisExistentes = new Set(existentes.map((u) => u.dni));

  const faltantes = noDocentesPdfDataset.filter((nd) => !dnisExistentes.has(nd.dni));
  if (faltantes.length === 0) return;

  const noDocDefaultHash = await bcrypt.hash('NoDoc123!', 10);

  for (const nd of faltantes) {
    await User.create({
      dni: nd.dni,
      nombre: nd.nombre,
      apellido: nd.apellido,
      rol: 'No Docente',
      permisos: ['ASISTENCIA', 'SANCIONES', 'PROGRAMAS'],
      curso_id: null,
      seccion_id: null,
      turno: nd.turno,
      passwordHash: noDocDefaultHash,
      estado: nd.estado,
      perfil_metadata: {
        numero_orden: nd.numero,
        email: nd.email,
        dni: nd.dni,
        legajo: `NOD-${String(nd.numero).padStart(4, '0')}`,
        cargo: nd.area_usuario,
        area_usuario: nd.area_usuario,
        cargo_sector: nd.cargo_sector,
        asignatura: nd.cargo_sector,
        turno: nd.turno,
        telefono: nd.telefono,
        celular: nd.telefono,
        direccion: 'Av. Colón 500',
        ciudad: 'Córdoba',
        localidad: 'Córdoba',
        fecha_inicio: '2024-03-01',
        fecha_fin: nd.estado === 'Inactivo' ? '2026-03-01' : '',
      },
    });
  }
  console.log(`✅ ${faltantes.length} no docentes del PDF persistidos en la base de datos.`);
}

/**
 * @función conectarBD
 * @descripción Inicia el servidor MongoDB local persistente (o conecta a URI configurada) e inicializa los registros semilla.
 * @returns {Promise<void>}
 */
export async function conectarBD(): Promise<void> {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      const dbPath = path.join(process.cwd(), '.data', 'mongodb');
      fs.mkdirSync(dbPath, { recursive: true });
      try {
        console.log('⚡ Inicializando MongoDB local persistente en .data/mongodb...');
        mongoMemoryServer = await MongoMemoryServer.create({
          instance: {
            dbPath,
            storageEngine: 'wiredTiger',
          },
        });
        uri = mongoMemoryServer.getUri();
      } catch (persistErr) {
        console.warn('⚠️ No se pudo abrir dbPath persistente, usando instancia en memoria:', persistErr);
        mongoMemoryServer = await MongoMemoryServer.create();
        uri = mongoMemoryServer.getUri();
      }
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
      console.log('✅ Conexión con MongoDB establecida exitosamente.');
    }

    const conteoUsuarios = await User.countDocuments();
    if (conteoUsuarios === 0) {
      await sembrarDatasetCompleto();
    } else {
      await asegurarEstudiantesPdfPersistidos();
      await asegurarDocentesPdfPersistidos();
      await asegurarNoDocentesPdfPersistidos();
      await asegurarMetadatosPersonalInstitucional();
    }
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error);
  }
}


