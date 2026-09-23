/**
 * @archivo src/db/database.ts
 * @descripción Configuración de conexión Mongoose a MongoDB y script de inicialización con datos semilla (Seed Data) para el Instituto José Peña.
 * @reglaDeNegocio Utiliza MongoMemoryServer de forma transparente si no existe una URI externa de MongoDB, garantizando funcionamiento inmediato y persistencia en memoria durante la ejecución.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { Materia } from '../models/Materia.js';
import { Parentesco } from '../models/Parentesco.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { Asistencia } from '../models/Asistencia.js';

let mongoMemoryServer: MongoMemoryServer | null = null;

/**
 * @función conectarBD
 * @descripción Inicia el servidor MongoDB en memoria o conecta a URI configurada e inicializa los registros semilla.
 * @returns {Promise<void>}
 */
export async function conectarBD(): Promise<void> {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      console.log('⚡ MONGODB_URI no provista. Inicializando MongoMemoryServer local...');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
      console.log('✅ Conexión con MongoDB establecida exitosamente.');
    }

    await sembrarDatosIniciales();
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error);
  }
}

/**
 * @función sembrarDatosIniciales
 * @descripción Pobla la base de datos con usuarios de demostración, cursos, materias y registros en caso de estar vacía.
 * @reglaDeNegocio Asegura la existencia de al menos un Admin, Docente, No Docente, Padre y Alumno para pruebas.
 */
async function sembrarDatosIniciales(): Promise<void> {
  const conteoUsuarios = await User.countDocuments();
  if (conteoUsuarios > 0) {
    return;
  }

  console.log('🌱 Sembrando datos demo iniciales...');

  // 1. Usuarios demo
  const admin = await User.create({
    dni: '11111111',
    nombre: 'Ana',
    apellido: 'Administradora',
    rol: 'Admin',
    permisos: ['ALL'],
    perfil_metadata: { email: 'admin@josepena.edu.ar', legajo: 'ADM-001' },
    passwordHash: '123456',
    estado: 'Activo',
  });

  const docente1 = await User.create({
    dni: '22222222',
    nombre: 'Carlos',
    apellido: 'Gómez',
    rol: 'Docente',
    permisos: ['REGISTRAR_NOTAS', 'VER_ALUMNOS'],
    perfil_metadata: {
      email: 'cgomez@josepena.edu.ar',
      legajo: 'DOC-2024-001',
      titulo: 'Lic. en Educación Secundaria y Matemática',
      celular: '351-589-4412',
      barrio: 'Villa Cabrera',
      direccion: 'Av. Rafael Núñez 2410',
      antiguedad: '6 años',
    },
    passwordHash: '123456',
    estado: 'Activo',
  });

  const noDocente1 = await User.create({
    dni: '33333333',
    nombre: 'María',
    apellido: 'Preceptora',
    rol: 'No Docente',
    permisos: ['ASISTENCIA', 'SANCIONES', 'PROGRAMAS'],
    perfil_metadata: { email: 'mpreceptora@josepena.edu.ar', turno: 'Mañana' },
    passwordHash: '123456',
    estado: 'Activo',
  });

  const padre1 = await User.create({
    dni: '40000000',
    nombre: 'Pedro',
    apellido: 'Padre',
    rol: 'Padre',
    permisos: ['CONSULTA_HIJOS'],
    perfil_metadata: { telefono: '351-5551234' },
    passwordHash: '123456',
    estado: 'Activo',
  });

  const alumno1 = await User.create({
    dni: '31000000',
    nombre: 'Tomas',
    apellido: 'Estudiante',
    rol: 'Alumno',
    permisos: ['CONSULTA_PROPIA'],
    perfil_metadata: { legajo: 'ALU-2024-042' },
    passwordHash: '123456',
    estado: 'Activo',
  });

  const alumno2 = await User.create({
    dni: '32000000',
    nombre: 'Sofia',
    apellido: 'Gomez',
    rol: 'Alumno',
    permisos: ['CONSULTA_PROPIA'],
    perfil_metadata: { legajo: 'ALU-2024-043' },
    passwordHash: '123456',
    estado: 'Activo',
  });

  // 2. Cursos
  const curso1 = await Curso.create({
    nombre_curso: '1° Año',
    nivel: 'Secundario',
  });

  const curso2 = await Curso.create({
    nombre_curso: '2° Año',
    nivel: 'Secundario',
  });

  // 3. Secciones
  const seccion1 = await Seccion.create({
    nombre_seccion: 'División A',
    curso_id: curso1._id,
    turno: 'Mañana',
  });

  const seccion2 = await Seccion.create({
    nombre_seccion: 'División B',
    curso_id: curso1._id,
    turno: 'Tarde',
  });

  // Actualizar metadata de alumnos con sección y curso asignados
  await User.findByIdAndUpdate(alumno1._id, {
    perfil_metadata: {
      legajo: 'ALU-2024-042',
      curso: '1° Año',
      seccion: 'División A',
      turno: 'Mañana',
      seccion_id: seccion1._id,
    },
  });

  await User.findByIdAndUpdate(alumno2._id, {
    perfil_metadata: {
      legajo: 'ALU-2024-043',
      curso: '1° Año',
      seccion: 'División A',
      turno: 'Mañana',
      seccion_id: seccion1._id,
    },
  });

  // 4. Materias con Grilla Horaria por Módulos
  const materia1 = await Materia.create({
    nombre_materia: 'Matemática',
    seccion_id: seccion1._id,
    docente_id: docente1._id,
    programa_url: 'https://josepena.edu.ar/programas/matematica1.pdf',
    horarios: [
      { dia: 'Lunes', hora_inicio: '07:45', hora_fin: '09:05', duracion_modulo: '2 hs' },
      { dia: 'Miércoles', hora_inicio: '09:15', hora_fin: '09:55', duracion_modulo: '40 min' },
    ],
  });

  const materia2 = await Materia.create({
    nombre_materia: 'Lengua y Literatura',
    seccion_id: seccion1._id,
    docente_id: docente1._id,
    programa_url: 'https://josepena.edu.ar/programas/lengua1.pdf',
    horarios: [
      { dia: 'Martes', hora_inicio: '07:45', hora_fin: '09:05', duracion_modulo: '2 hs' },
      { dia: 'Jueves', hora_inicio: '10:05', hora_fin: '10:45', duracion_modulo: '40 min' },
    ],
  });

  const materia3 = await Materia.create({
    nombre_materia: 'Geografía',
    seccion_id: seccion1._id,
    docente_id: docente1._id,
    programa_url: 'https://josepena.edu.ar/programas/geografia1.pdf',
    horarios: [
      { dia: 'Viernes', hora_inicio: '09:15', hora_fin: '10:35', duracion_modulo: '2 hs' },
    ],
  });

  // 5. Parentescos (Exactamente como en la captura)
  await Parentesco.create({
    padre_id: padre1._id,
    alumno_id: alumno1._id,
    tipo_vinculo: 'Padre',
  });

  await Parentesco.create({
    padre_id: padre1._id,
    alumno_id: alumno2._id,
    tipo_vinculo: 'Padre',
  });

  // 6. Registros Académicos (Notas por Trimestre, Inasistencias, Sanciones)
  // Matemática alumno1
  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia1._id,
    tipo: 'nota',
    valor: '9.00',
    trimestre: 1,
    fecha: new Date('2026-04-15'),
    observacion: '1° Trimestre - Evaluación Parcial',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia1._id,
    tipo: 'nota',
    valor: '8.50',
    trimestre: 2,
    fecha: new Date('2026-07-10'),
    observacion: '2° Trimestre - Trabajo Práctico Integrador',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia1._id,
    tipo: 'nota',
    valor: '9.50',
    trimestre: 3,
    fecha: new Date('2026-11-20'),
    observacion: '3° Trimestre - Examen Final',
  });

  // Lengua y Literatura alumno1
  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia2._id,
    tipo: 'nota',
    valor: '8.00',
    trimestre: 1,
    fecha: new Date('2026-04-18'),
    observacion: '1° Trimestre - Análisis Literario',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia2._id,
    tipo: 'nota',
    valor: '7.50',
    trimestre: 2,
    fecha: new Date('2026-07-12'),
    observacion: '2° Trimestre - Redacción',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia2._id,
    tipo: 'nota',
    valor: '8.50',
    trimestre: 3,
    fecha: new Date('2026-11-18'),
    observacion: '3° Trimestre - Exposición Oral',
  });

  // Geografía alumno1
  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia3._id,
    tipo: 'nota',
    valor: '8.50',
    trimestre: 1,
    fecha: new Date('2026-04-20'),
    observacion: '1° Trimestre - Cartografía',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia3._id,
    tipo: 'nota',
    valor: '9.00',
    trimestre: 2,
    fecha: new Date('2026-07-15'),
    observacion: '2° Trimestre - Geografía de Córdoba',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia3._id,
    tipo: 'nota',
    valor: '9.50',
    trimestre: 3,
    fecha: new Date('2026-11-22'),
    observacion: '3° Trimestre - Evaluación Global',
  });

  // Inasistencias alumno1 con fecha
  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia2._id,
    tipo: 'inasistencia',
    valor: 'Ausente',
    fecha: new Date('2026-05-10'),
    observacion: 'Inasistencia injustificada en Lengua',
  });

  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia1._id,
    tipo: 'inasistencia',
    valor: 'Ausente',
    fecha: new Date('2026-06-14'),
    observacion: 'Falta justificada por certificado médico',
  });

  // Sanciones alumno1
  await RegistroAcademico.create({
    alumno_id: alumno1._id,
    materia_id: materia1._id,
    tipo: 'sancion',
    valor: 'Amonestación',
    fecha: new Date('2026-05-18'),
    observacion: 'Impuntualidad reiterada al inicio de clase',
  });

  // Registros de alumno2 (Sofia Gomez)
  await RegistroAcademico.create({
    alumno_id: alumno2._id,
    materia_id: materia1._id,
    tipo: 'nota',
    valor: '10.00',
    trimestre: 1,
    fecha: new Date('2026-04-15'),
    observacion: '1° Trimestre - Evaluación Parcial',
  });

  await RegistroAcademico.create({
    alumno_id: alumno2._id,
    materia_id: materia1._id,
    tipo: 'nota',
    valor: '9.00',
    trimestre: 2,
    fecha: new Date('2026-07-10'),
    observacion: '2° Trimestre - Trabajo Práctico Integrador',
  });

  await RegistroAcademico.create({
    alumno_id: alumno2._id,
    materia_id: materia2._id,
    tipo: 'nota',
    valor: '9.50',
    trimestre: 1,
    fecha: new Date('2026-04-18'),
    observacion: '1° Trimestre - Análisis Literario',
  });

  // 7. Asistencia Docente y Actas
  await AsistenciaDocente.create({
    docente_id: docente1._id,
    fecha: new Date('2026-07-28'),
    estado: 'Presente',
    observacion: 'Ingreso a tiempo a la 1° hora',
  });

  await AsistenciaDocente.create({
    docente_id: docente1._id,
    fecha: new Date('2026-06-15'),
    estado: 'Tardanza',
    observacion: 'Demora de 10 min. por tránsito pesado en Av. Rafael Núñez',
  });

  await AsistenciaDocente.create({
    docente_id: docente1._id,
    fecha: new Date('2026-05-04'),
    estado: 'Licencia',
    observacion: 'Licencia por examen de posgrado - Presentó comprobante',
  });

  // 8. Asistencias Diarias Generales (Alumnos y Docentes)
  const hoy = new Date().toISOString().split('T')[0];

  await Asistencia.create({
    persona_id: alumno1._id,
    tipo_persona: 'Alumno',
    fecha: new Date(hoy),
    estado: 'Presente',
    comentario: 'Ingreso puntual 07:40 hs',
    materia_id: materia1._id,
    seccion_id: seccion1._id,
  });

  await Asistencia.create({
    persona_id: alumno2._id,
    tipo_persona: 'Alumno',
    fecha: new Date(hoy),
    estado: 'Ausente',
    comentario: 'Aviso de la familia por indisposición de salud',
    materia_id: materia1._id,
    seccion_id: seccion1._id,
  });

  await Asistencia.create({
    persona_id: docente1._id,
    tipo_persona: 'Docente',
    fecha: new Date(hoy),
    estado: 'Presente',
    comentario: 'Presente en Aula 4 - 1° Año A',
    materia_id: materia1._id,
    seccion_id: seccion1._id,
  });

  console.log('✨ Datos semilla creados exitosamente en MongoDB.');
}
