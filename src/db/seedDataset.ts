/**
 * @archivo src/db/seedDataset.ts
 * @descripción Script de inicialización y seeding completo para poblar la base de datos de MongoDB (Mongoose)
 * con el Dataset oficial del Instituto José Peña.
 * @funcionalidades
 * - Hashing seguro de contraseñas con bcryptjs (saltRounds = 10).
 * - Creación de Cursos y Secciones con sus referencias correspondientes.
 * - Ingesta de Usuarios (Administrador, Docente, No Docente, Alumno, Padre / Tutor).
 * - Resolución y asignación dinámica de IDs foráneos (curso_id, seccion_id, docente_id, padre_id, alumno_id).
 * - Creación de Materias vinculadas a su Sección y Docente titular.
 * - Creación de Parentescos con tipo de vínculo estricto.
 */

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { Materia } from '../models/Materia.js';
import { Parentesco } from '../models/Parentesco.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { Asistencia } from '../models/Asistencia.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { estudiantesPdfDataset } from './estudiantesPdfDataset.js';
import { docentesPdfDataset } from './docentesPdfDataset.js';
import { noDocentesPdfDataset } from './noDocentesPdfDataset.js';

// Dataset crudo suministrado
export const rawDataset = {
  usuarios: [
    { nombre: 'Roberto', apellido: 'Peña', dni: '20123456', rol: 'Director', estado: 'Activo', seccion: null, turno: null, password: 'Director123!' },

    { nombre: 'Carlos', apellido: 'Gómez', dni: '28456123', rol: 'Administrador', estado: 'Activo', seccion: null, turno: null, password: 'Admin123!' },
    { nombre: 'Mariana', apellido: 'López', dni: '29876543', rol: 'Administrador', estado: 'Activo', seccion: null, turno: null, password: 'Admin123!' },
    { nombre: 'Roberto', apellido: 'Fernández', dni: '27345678', rol: 'Administrador', estado: 'Activo', seccion: null, turno: null, password: 'Admin123!' },
    { nombre: 'Patricia', apellido: 'Sánchez', dni: '30123456', rol: 'Administrador', estado: 'Activo', seccion: null, turno: null, password: 'Admin123!' },
    { nombre: 'Gustavo', apellido: 'Martínez', dni: '31987654', rol: 'Administrador', estado: 'Activo', seccion: null, turno: null, password: 'Admin123!' },

    { nombre: 'Ana', apellido: 'Rodríguez', dni: '32456789', rol: 'Docente', estado: 'Activo', seccion: null, turno: null, password: 'Docente123!' },
    { nombre: 'Jorge', apellido: 'Pérez', dni: '33567890', rol: 'Docente', estado: 'Activo', seccion: null, turno: null, password: 'Docente123!' },
    { nombre: 'Lucía', apellido: 'Díaz', dni: '34678901', rol: 'Docente', estado: 'Activo', seccion: null, turno: null, password: 'Docente123!' },
    { nombre: 'Martín', apellido: 'Álvarez', dni: '35789012', rol: 'Docente', estado: 'Activo', seccion: null, turno: null, password: 'Docente123!' },
    { nombre: 'Elena', apellido: 'Romero', dni: '36890123', rol: 'Docente', estado: 'Activo', seccion: null, turno: null, password: 'Docente123!' },

    { nombre: 'Fernando', apellido: 'Torres', dni: '31234567', rol: 'No Docente', estado: 'Activo', seccion: null, turno: null, password: 'NoDoc123!' },
    { nombre: 'Silvia', apellido: 'Benítez', dni: '32345678', rol: 'No Docente', estado: 'Activo', seccion: null, turno: null, password: 'NoDoc123!' },
    { nombre: 'Diego', apellido: 'Acosta', dni: '33456789', rol: 'No Docente', estado: 'Activo', seccion: null, turno: null, password: 'NoDoc123!' },
    { nombre: 'Valeria', apellido: 'Medina', dni: '34567890', rol: 'No Docente', estado: 'Activo', seccion: null, turno: null, password: 'NoDoc123!' },
    { nombre: 'Ricardo', apellido: 'Castro', dni: '35678901', rol: 'No Docente', estado: 'Activo', seccion: null, turno: null, password: 'NoDoc123!' },

    { nombre: 'Tomas', apellido: 'Estudiante', dni: '48123456', rol: 'Alumno', estado: 'Activo', seccion: 'División A (1° Año - Secundario)', turno: 'Mañana', password: 'Alumno123!' },
    { nombre: 'Sofía', apellido: 'Herrera', dni: '48234567', rol: 'Alumno', estado: 'Activo', seccion: 'División A (1° Año - Secundario)', turno: 'Mañana', password: 'Alumno123!' },
    { nombre: 'Mateo', apellido: 'Giménez', dni: '47345678', rol: 'Alumno', estado: 'Activo', seccion: 'División B (2° Año - Secundario)', turno: 'Tarde', password: 'Alumno123!' },
    { nombre: 'Valentina', apellido: 'Ríos', dni: '47456789', rol: 'Alumno', estado: 'Activo', seccion: 'División B (2° Año - Secundario)', turno: 'Tarde', password: 'Alumno123!' },
    { nombre: 'Joaquín', apellido: 'Mendoza', dni: '46567890', rol: 'Alumno', estado: 'Activo', seccion: 'División A (3° Año - Secundario)', turno: 'Mañana', password: 'Alumno123!' },

    { nombre: 'Guillermo', apellido: 'Estudiante', dni: '25123456', rol: 'Padre / Tutor', estado: 'Activo', seccion: null, turno: null, password: 'Tutor123!' },
    { nombre: 'Claudia', apellido: 'Herrera', dni: '26234567', rol: 'Padre / Tutor', estado: 'Activo', seccion: null, turno: null, password: 'Tutor123!' },
    { nombre: 'Esteban', apellido: 'Giménez', dni: '27345678', rol: 'Padre / Tutor', estado: 'Activo', seccion: null, turno: null, password: 'Tutor123!' },
    { nombre: 'Mónica', apellido: 'Ríos', dni: '28456789', rol: 'Padre / Tutor', estado: 'Activo', seccion: null, turno: null, password: 'Tutor123!' },
    { nombre: 'Héctor', apellido: 'Mendoza', dni: '29567890', rol: 'Padre / Tutor', estado: 'Activo', seccion: null, turno: null, password: 'Tutor123!' }
  ],
  cursos: [
    { nombre: '1° Año', nivel: 'Secundario' },
    { nombre: '2° Año', nivel: 'Secundario' },
    { nombre: '3° Año', nivel: 'Secundario' },
    { nombre: '4° Año', nivel: 'Secundario' },
    { nombre: '5° Año', nivel: 'Secundario' },
    { nombre: '6° Año', nivel: 'Secundario' },
    { nombre: '4° Grado', nivel: 'Primario' },
    { nombre: 'Sala de 5', nivel: 'Inicial' }
  ],
  secciones: [
    { nombre: 'División A', curso: '1° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '1° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'División A', curso: '2° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '2° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'División A', curso: '3° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '3° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'División A', curso: '4° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '4° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'División A', curso: '5° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '5° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'División A', curso: '6° Año (Secundario)', turno: 'Mañana' },
    { nombre: 'División B', curso: '6° Año (Secundario)', turno: 'Tarde' },
    { nombre: 'Sección Única', curso: '4° Grado (Primario)', turno: 'Mañana' },
    { nombre: 'Sala Verde', curso: 'Sala de 5 (Inicial)', turno: 'Mañana' }
  ],
  materias: [
    { nombre: 'Matemática I', seccion: 'División A (1° Año - Secundario)', docente: 'Rodríguez, Ana (DNI: 32456789)', url_programa: 'https://josepena.edu.ar/programas/matematica_1.pdf' },
    { nombre: 'Lengua y Literatura', seccion: 'División A (1° Año - Secundario)', docente: 'Pérez, Jorge (DNI: 33567890)', url_programa: 'https://josepena.edu.ar/programas/lengua_1.pdf' },
    { nombre: 'Física II', seccion: 'División B (2° Año - Secundario)', docente: 'Díaz, Lucía (DNI: 34678901)', url_programa: 'https://josepena.edu.ar/programas/fisica_2.pdf' },
    { nombre: 'Historia III', seccion: 'División A (3° Año - Secundario)', docente: 'Álvarez, Martín (DNI: 35789012)', url_programa: 'https://josepena.edu.ar/programas/historia_3.pdf' },
    { nombre: 'Ciencias Naturales', seccion: 'Sección Única (4° Grado - Primario)', docente: 'Romero, Elena (DNI: 36890123)', url_programa: 'https://josepena.edu.ar/programas/cnaturales_4.pdf' }
  ],
  parentescos: [
    { tutor: 'Estudiante, Guillermo (DNI: 25123456)', alumno: 'Estudiante, Tomas (DNI: 48123456)', vinculo: 'Padre' },
    { tutor: 'Herrera, Claudia (DNI: 26234567)', alumno: 'Herrera, Sofía (DNI: 48234567)', vinculo: 'Madre' },
    { tutor: 'Giménez, Esteban (DNI: 27345678)', alumno: 'Giménez, Mateo (DNI: 47345678)', vinculo: 'Padre' },
    { tutor: 'Ríos, Mónica (DNI: 28456789)', alumno: 'Ríos, Valentina (DNI: 47456789)', vinculo: 'Madre' },
    { tutor: 'Mendoza, Héctor (DNI: 29567890)', alumno: 'Mendoza, Joaquín (DNI: 46567890)', vinculo: 'Tutor Legal' }
  ]
};

/**
 * Normaliza el rol del dataset al enum admitido por el sistema
 */
function normalizarRol(rol: string): 'Admin' | 'Director' | 'Docente' | 'No Docente' | 'Alumno' | 'Padre' {
  if (rol === 'Director') return 'Director';
  if (rol === 'Administrador' || rol === 'Admin') return 'Admin';
  if (rol === 'Padre / Tutor' || rol === 'Padre' || rol === 'Tutor') return 'Padre';
  if (rol === 'Docente') return 'Docente';
  if (rol === 'No Docente') return 'No Docente';
  return 'Alumno';
}

/**
 * Extrae el DNI contenido entre paréntesis o texto de strings como:
 * "Rodríguez, Ana (DNI: 32456789)" -> "32456789"
 */
function extraerDni(texto: string): string {
  const match = texto.match(/DNI:\s*([0-9]+)/i);
  if (match) return match[1];
  const numeros = texto.match(/[0-9]{7,9}/);
  return numeros ? numeros[0] : '';
}

export const DATOS_PERSONAL_POR_DNI: Record<
  string,
  {
    legajo: string;
    cargo: string;
    asignatura: string;
    turno: string;
    telefono: string;
    direccion: string;
    ciudad: string;
    fecha_inicio: string;
    fecha_fin: string;
  }
> = {
  // Director
  '20123456': {
    legajo: 'DIR-3456',
    cargo: 'Directivo',
    asignatura: 'Dirección General',
    turno: 'Mañana',
    telefono: '351-410-0001',
    direccion: 'Av. General Paz 150',
    ciudad: 'Córdoba',
    fecha_inicio: '2016-03-01',
    fecha_fin: '',
  },
  // Administradores
  '28456123': {
    legajo: 'ADM-6123',
    cargo: 'Directivo',
    asignatura: 'Gestión de Sistemas',
    turno: 'Mañana',
    telefono: '351-410-0101',
    direccion: 'Calle Rosario de Santa Fe 240',
    ciudad: 'Córdoba',
    fecha_inicio: '2019-03-01',
    fecha_fin: '',
  },
  '29876543': {
    legajo: 'ADM-6543',
    cargo: 'Secretaría',
    asignatura: 'Gestión Académica',
    turno: 'Tarde',
    telefono: '351-410-0102',
    direccion: 'Av. Olmos 380',
    ciudad: 'Córdoba',
    fecha_inicio: '2020-02-15',
    fecha_fin: '',
  },
  '27345678': {
    legajo: 'ADM-5678',
    cargo: 'Directivo',
    asignatura: 'Gestión Administrativa',
    turno: 'Mañana',
    telefono: '351-410-0103',
    direccion: 'Calle Tucumán 510',
    ciudad: 'Córdoba',
    fecha_inicio: '2018-05-01',
    fecha_fin: '',
  },
  '30123456': {
    legajo: 'ADM-3456',
    cargo: 'Secretaría',
    asignatura: 'Gestión Institucional',
    turno: 'Tarde',
    telefono: '351-410-0104',
    direccion: 'Av. Emilio Caraffa 1120',
    ciudad: 'Córdoba',
    fecha_inicio: '2021-04-01',
    fecha_fin: '',
  },
  '31987654': {
    legajo: 'ADM-7654',
    cargo: 'Secretaría',
    asignatura: 'Soporte Institucional',
    turno: 'Noche',
    telefono: '351-410-0105',
    direccion: 'Calle Santa Rosa 840',
    ciudad: 'Córdoba',
    fecha_inicio: '2022-03-01',
    fecha_fin: '',
  },
  // Docentes
  '32456789': {
    legajo: 'DOC-6789',
    cargo: 'Docente',
    asignatura: 'Matemática I',
    turno: 'Mañana',
    telefono: '351-421-3001',
    direccion: 'Av. Hipólito Yrigoyen 450',
    ciudad: 'Córdoba',
    fecha_inicio: '2021-03-01',
    fecha_fin: '',
  },
  '33567890': {
    legajo: 'DOC-7890',
    cargo: 'Docente',
    asignatura: 'Lengua y Literatura',
    turno: 'Mañana',
    telefono: '351-421-3002',
    direccion: 'Bv. San Juan 720',
    ciudad: 'Córdoba',
    fecha_inicio: '2020-03-01',
    fecha_fin: '',
  },
  '34678901': {
    legajo: 'DOC-8901',
    cargo: 'Docente',
    asignatura: 'Física II',
    turno: 'Tarde',
    telefono: '351-421-3003',
    direccion: 'Calle Independencia 890',
    ciudad: 'Córdoba',
    fecha_inicio: '2022-03-01',
    fecha_fin: '',
  },
  '35789012': {
    legajo: 'DOC-9012',
    cargo: 'Docente',
    asignatura: 'Historia III',
    turno: 'Mañana',
    telefono: '351-421-3004',
    direccion: 'Av. Vélez Sarsfield 1140',
    ciudad: 'Córdoba',
    fecha_inicio: '2019-03-01',
    fecha_fin: '',
  },
  '36890123': {
    legajo: 'DOC-0123',
    cargo: 'Docente',
    asignatura: 'Ciencias Naturales',
    turno: 'Mañana',
    telefono: '351-421-3005',
    direccion: 'Calle Dean Funes 530',
    ciudad: 'Córdoba',
    fecha_inicio: '2023-03-01',
    fecha_fin: '',
  },
  // No Docentes
  '31234567': {
    legajo: 'NOD-4567',
    cargo: 'Preceptoría',
    asignatura: 'Preceptoría Nivel Secundario',
    turno: 'Mañana',
    telefono: '351-432-1001',
    direccion: 'Av. Colón 980',
    ciudad: 'Córdoba',
    fecha_inicio: '2020-02-15',
    fecha_fin: '',
  },
  '32345678': {
    legajo: 'NOD-5678',
    cargo: 'Secretaría',
    asignatura: 'Secretaría Institucional',
    turno: 'Mañana',
    telefono: '351-432-1002',
    direccion: 'Calle Caseros 640',
    ciudad: 'Córdoba',
    fecha_inicio: '2018-04-01',
    fecha_fin: '',
  },
  '33456789': {
    legajo: 'NOD-6789',
    cargo: 'Secretaría',
    asignatura: 'Administración General',
    turno: 'Tarde',
    telefono: '351-432-1003',
    direccion: 'Bv. Las Heras 310',
    ciudad: 'Córdoba',
    fecha_inicio: '2022-05-10',
    fecha_fin: '',
  },
  '34567890': {
    legajo: 'NOD-7890',
    cargo: 'Preceptoría',
    asignatura: 'Preceptoría Turno Tarde',
    turno: 'Tarde',
    telefono: '351-432-1004',
    direccion: 'Calle Belgrano 415',
    ciudad: 'Córdoba',
    fecha_inicio: '2021-08-01',
    fecha_fin: '',
  },
  '35678901': {
    legajo: 'NOD-8901',
    cargo: 'Directivo',
    asignatura: 'Coordinación Directiva',
    turno: 'Noche',
    telefono: '351-432-1005',
    direccion: 'Av. Pueyrredón 770',
    ciudad: 'Córdoba',
    fecha_inicio: '2019-06-01',
    fecha_fin: '',
  },
};

/**
 * Ejecuta el proceso de seeding en MongoDB utilizando Mongoose y bcrypt.
 * Limpia colecciones previas y reconstruye el grafo relacional íntegro.
 */
export async function sembrarDatasetCompleto(): Promise<void> {
  console.log('🚀 Iniciando proceso de Ingestión y Seeding del Dataset Institucional...');

  // 1. Limpieza de datos existentes
  await Promise.all([
    User.deleteMany({}),
    Curso.deleteMany({}),
    Seccion.deleteMany({}),
    Materia.deleteMany({}),
    Parentesco.deleteMany({}),
    RegistroAcademico.deleteMany({}),
    Asistencia.deleteMany({}),
    AsistenciaDocente.deleteMany({}),
  ]);
  console.log('🧹 Colecciones limpiadas.');

  // 2. Poblar Cursos
  const mapaCursos = new Map<string, any>();
  for (const c of rawDataset.cursos) {
    const cursoDoc = await Curso.create({
      nombre_curso: c.nombre,
      nivel: c.nivel as 'Primario' | 'Secundario' | 'Inicial',
    });
    // Llave: "1° Año (Secundario)" o "1° Año"
    mapaCursos.set(`${c.nombre} (${c.nivel})`, cursoDoc);
    mapaCursos.set(c.nombre, cursoDoc);
  }
  console.log(`✅ ${rawDataset.cursos.length} Cursos insertados.`);

  // 3. Poblar Secciones
  const mapaSecciones = new Map<string, any>();
  for (const s of rawDataset.secciones) {
    const cursoRelacionado = mapaCursos.get(s.curso);
    if (!cursoRelacionado) {
      throw new Error(`No se encontró el curso asociado para la sección: ${s.nombre} (${s.curso})`);
    }

    const seccionDoc = await Seccion.create({
      nombre_seccion: s.nombre,
      curso_id: cursoRelacionado._id,
      turno: s.turno as 'Mañana' | 'Tarde' | 'Noche',
    });

    // Identificador compuesto: "División A (1° Año - Secundario)"
    const keyConGuion = `${s.nombre} (${cursoRelacionado.nombre_curso} - ${cursoRelacionado.nivel})`;
    const keyConParentesis = `${s.nombre} (${s.curso})`;
    mapaSecciones.set(keyConGuion, seccionDoc);
    mapaSecciones.set(keyConParentesis, seccionDoc);
    mapaSecciones.set(s.nombre, seccionDoc);
  }
  console.log(`✅ ${rawDataset.secciones.length} Secciones insertadas.`);

  // 4. Poblar Usuarios con Bcrypt Hashes
  const mapaUsuarios = new Map<string, any>(); // DNI -> UserDoc
  const SALT_ROUNDS = 10;

  for (const u of rawDataset.usuarios) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const rolNormalizado = normalizarRol(u.rol);

    let cursoId: any = null;
    let seccionId: any = null;
    let turnoFinal: string | null = u.turno;

    if (rolNormalizado === 'Alumno' && u.seccion) {
      const seccionDoc = mapaSecciones.get(u.seccion);
      if (seccionDoc) {
        seccionId = seccionDoc._id;
        cursoId = seccionDoc.curso_id;
        if (!turnoFinal) {
          turnoFinal = seccionDoc.turno;
        }
      }
    }

    const permisos: string[] = [];
    if (rolNormalizado === 'Admin') permisos.push('ALL');
    if (rolNormalizado === 'Director') permisos.push('ALL_READ', 'AUDITAR_CALIFICACIONES', 'REPORTES', 'ASISTENCIA', 'CALENDARIO');
    if (rolNormalizado === 'Docente') permisos.push('REGISTRAR_NOTAS', 'VER_ALUMNOS');
    if (rolNormalizado === 'No Docente') permisos.push('ASISTENCIA', 'SANCIONES', 'PROGRAMAS');
    if (rolNormalizado === 'Alumno') permisos.push('CONSULTA_PROPIA');
    if (rolNormalizado === 'Padre') permisos.push('CONSULTA_HIJOS');

    const perfilMetadata: Record<string, any> = {
      email: `${u.nombre.toLowerCase()}.${u.apellido.toLowerCase().replace(/[^a-z0-9]/g, '')}@josepena.edu.ar`,
      dni: u.dni,
    };

    const datosPersonalesPorDni: Record<string, Record<string, string>> = {
      '48123456': {
        direccion: 'Av. Rafael Núñez 3420',
        barrio: 'Cerro de las Rosas',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-482-1120',
        contacto_emergencia: '351-512-9044',
        observacion_general: 'Estudiante participativo con muy buen desempeño general y asistencia regular.',
      },
      '48234567': {
        direccion: 'Bv. Chacabuco 845',
        barrio: 'Nueva Córdoba',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-469-3315',
        contacto_emergencia: '351-533-7781',
        observacion_general: 'Rendimiento académico destacado en el ciclo lectivo actual.',
      },
      '47345678': {
        direccion: 'Av. Colón 2150',
        barrio: 'Alberdi',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-471-8890',
        contacto_emergencia: '351-544-2019',
        observacion_general: 'Buen progreso en materias exactas; se recomienda seguimiento en entregas prácticas.',
      },
      '47456789': {
        direccion: 'Calle Roma 612',
        barrio: 'General Paz',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-452-6640',
        contacto_emergencia: '351-598-4410',
        observacion_general: 'Excelente convivencia escolar y compromiso en proyectos grupales.',
      },
      '46567890': {
        direccion: 'Av. Fuerza Aérea 1890',
        barrio: 'Los Naranjos',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-465-9102',
        contacto_emergencia: '351-577-3185',
        observacion_general: 'Estudiante en proceso de consolidación de contenidos de 3° Año.',
      },
    };

    if (rolNormalizado === 'Alumno') {
      const datosExtra = datosPersonalesPorDni[u.dni] || {
        direccion: 'Av. Rafael Núñez 2410',
        barrio: 'Villa Cabrera',
        localidad: 'Córdoba',
        provincia: 'Córdoba',
        contacto: '351-555-0142',
        contacto_emergencia: '351-555-0199',
        observacion_general: 'Sin observaciones generales registradas.',
      };
      perfilMetadata.legajo = `ALU-${u.dni.slice(-4)}`;
      perfilMetadata.cargo = 'Estudiantes';
      perfilMetadata.turno = turnoFinal || 'Mañana';
      perfilMetadata.seccion_id = seccionId;
      perfilMetadata.curso_id = cursoId;
      perfilMetadata.direccion = datosExtra.direccion;
      perfilMetadata.barrio = datosExtra.barrio;
      perfilMetadata.localidad = datosExtra.localidad;
      perfilMetadata.provincia = datosExtra.provincia;
      perfilMetadata.contacto = datosExtra.contacto;
      perfilMetadata.contacto_emergencia = datosExtra.contacto_emergencia;
      perfilMetadata.observacion_general = datosExtra.observacion_general;
    } else if (rolNormalizado === 'Padre') {
      perfilMetadata.legajo = `TUT-${u.dni.slice(-4)}`;
      perfilMetadata.cargo = 'Padre/Tutor';
      perfilMetadata.turno = 'Mañana';
      turnoFinal = 'Mañana';
    } else if (
      rolNormalizado === 'Docente' ||
      rolNormalizado === 'No Docente' ||
      rolNormalizado === 'Director' ||
      rolNormalizado === 'Admin'
    ) {
      const infoPersonal = DATOS_PERSONAL_POR_DNI[u.dni];
      const prefijo =
        rolNormalizado === 'Docente'
          ? 'DOC'
          : rolNormalizado === 'No Docente'
            ? 'NOD'
            : rolNormalizado === 'Director'
              ? 'DIR'
              : 'ADM';
      const turnoPersonal = infoPersonal?.turno || 'Mañana';
      turnoFinal = turnoPersonal;
      perfilMetadata.legajo = infoPersonal?.legajo || `${prefijo}-${u.dni.slice(-4)}`;
      perfilMetadata.cargo =
        infoPersonal?.cargo ||
        (rolNormalizado === 'Docente'
          ? 'Docente'
          : rolNormalizado === 'No Docente'
            ? 'Secretaría'
            : 'Directivo');
      perfilMetadata.asignatura = infoPersonal?.asignatura || '';
      perfilMetadata.turno = turnoPersonal;
      perfilMetadata.telefono = infoPersonal?.telefono || '351-400-0000';
      perfilMetadata.celular = infoPersonal?.telefono || '351-400-0000';
      perfilMetadata.direccion = infoPersonal?.direccion || 'Av. Colón 500';
      perfilMetadata.ciudad = infoPersonal?.ciudad || 'Córdoba';
      perfilMetadata.localidad = infoPersonal?.ciudad || 'Córdoba';
      perfilMetadata.fecha_inicio = infoPersonal?.fecha_inicio || '2024-03-01';
      perfilMetadata.fecha_fin = infoPersonal?.fecha_fin || '';
      if (rolNormalizado === 'Docente') {
        perfilMetadata.titulo = 'Profesor de Nivel Secundario';
        perfilMetadata.categoria = 'Titular';
      }
      if (rolNormalizado === 'No Docente') {
        perfilMetadata.area_usuario = perfilMetadata.cargo;
        perfilMetadata.cargo_sector = perfilMetadata.asignatura || 'Secretaría General';
      }
    }

    // Verificar si el DNI ya fue insertado previamente (por ejemplo, si una persona tiene más de un rol)
    let usuarioDoc = mapaUsuarios.get(u.dni);
    if (usuarioDoc) {
      // Actualizar roles o perfil si es un caso multi-rol
      if (!usuarioDoc.permisos.includes('CONSULTA_HIJOS') && rolNormalizado === 'Padre') {
        usuarioDoc.permisos.push('CONSULTA_HIJOS');
      }
      if (rolNormalizado === 'Alumno' && seccionId) {
        usuarioDoc.curso_id = cursoId;
        usuarioDoc.seccion_id = seccionId;
        usuarioDoc.turno = turnoFinal;
      }
      await usuarioDoc.save();
    } else {
      usuarioDoc = await User.create({
        dni: u.dni,
        nombre: u.nombre,
        apellido: u.apellido,
        rol: rolNormalizado,
        permisos,
        perfil_metadata: perfilMetadata,
        curso_id: cursoId,
        seccion_id: seccionId,
        turno: turnoFinal,
        passwordHash,
        estado: u.estado as 'Activo' | 'Inactivo',
      });
      mapaUsuarios.set(u.dni, usuarioDoc);
    }
  }

  // 4b. Poblar los 50 estudiantes del archivo PDF oficial (Estudiantes_Instituto_Jose_Pena_2026.pdf)
  const alumnoDefaultHash = await bcrypt.hash('Alumno123!', SALT_ROUNDS);
  for (const est of estudiantesPdfDataset) {
    if (mapaUsuarios.has(est.dni)) continue;

    const cursoNombre = `${est.curso}° Año`;
    const divisionNombre = `División ${est.division}`;
    const seccionKey = `${divisionNombre} (${cursoNombre} - Secundario)`;
    const seccionDoc = mapaSecciones.get(seccionKey);
    const cursoDoc = seccionDoc ? mapaCursos.get(cursoNombre) : mapaCursos.get(cursoNombre);

    const seccionId = seccionDoc ? seccionDoc._id : null;
    const cursoId = cursoDoc ? cursoDoc._id : seccionDoc?.curso_id || null;

    const emailBase = `${est.nombre}.${est.apellido}.${est.dni.slice(-3)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');

    const alumnoPdfDoc = await User.create({
      dni: est.dni,
      nombre: est.nombre,
      apellido: est.apellido,
      rol: 'Alumno',
      permisos: ['CONSULTA_PROPIA'],
      curso_id: cursoId,
      seccion_id: seccionId,
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
        curso_id: cursoId,
        seccion_id: seccionId,
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
    mapaUsuarios.set(est.dni, alumnoPdfDoc);
  }
  // 4c. Poblar los 30 docentes del archivo PDF oficial (Alta Masiva de 30 Profesores)
  const docenteDefaultHash = await bcrypt.hash('Docente123!', SALT_ROUNDS);
  for (const doc of docentesPdfDataset) {
    if (mapaUsuarios.has(doc.dni)) continue;

    const emailBase = `${doc.nombre}.${doc.apellido}.${doc.dni.slice(-3)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');

    const docentePdfDoc = await User.create({
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
    mapaUsuarios.set(doc.dni, docentePdfDoc);
  }
  // 4d. Poblar los 30 usuarios No Docentes del archivo PDF oficial (Base_NoDocente_30_usuarios.pdf)
  const noDocDefaultHash = await bcrypt.hash('NoDoc123!', SALT_ROUNDS);
  for (const nd of noDocentesPdfDataset) {
    if (mapaUsuarios.has(nd.dni)) continue;

    const noDocPdfDoc = await User.create({
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
    mapaUsuarios.set(nd.dni, noDocPdfDoc);
  }
  console.log(
    `✅ ${rawDataset.usuarios.length} usuarios base + ${estudiantesPdfDataset.length} alumnos PDF + ${docentesPdfDataset.length} docentes PDF + ${noDocentesPdfDataset.length} no docentes PDF insertados con bcrypt.`
  );

  // 5. Poblar Materias y Vincular con Sección y Docente
  for (const m of rawDataset.materias) {
    const seccionDoc = mapaSecciones.get(m.seccion);
    if (!seccionDoc) {
      console.warn(`⚠️ Sección no encontrada para la materia: ${m.nombre} (${m.seccion})`);
      continue;
    }

    const docenteDni = extraerDni(m.docente);
    const docenteDoc = mapaUsuarios.get(docenteDni);
    if (!docenteDoc) {
      console.warn(`⚠️ Docente no encontrado con DNI ${docenteDni} para materia ${m.nombre}`);
      continue;
    }

    // Normalizar URL (remover markdown de URLs si existen)
    let urlLimpia = m.url_programa.replace(/\[|\]|\(.*\)/g, '').trim();
    if (m.url_programa.includes('(') && m.url_programa.includes(')')) {
      const matchUrl = m.url_programa.match(/\((https?:\/\/[^\s)]+)\)/);
      if (matchUrl) urlLimpia = matchUrl[1];
    }

    await Materia.create({
      nombre_materia: m.nombre,
      seccion_id: seccionDoc._id,
      docente_id: docenteDoc._id,
      programa_url: urlLimpia,
      horarios: [
        { dia: 'Lunes', hora_inicio: '07:45', hora_fin: '09:05', duracion_modulo: '2 hs' },
        { dia: 'Miércoles', hora_inicio: '09:15', hora_fin: '09:55', duracion_modulo: '40 min' },
      ],
    });
  }
  console.log(`✅ ${rawDataset.materias.length} Materias creadas y vinculadas.`);

  // 6. Poblar Parentescos
  for (const p of rawDataset.parentescos) {
    const tutorDni = extraerDni(p.tutor);
    const alumnoDni = extraerDni(p.alumno);

    const tutorDoc = mapaUsuarios.get(tutorDni);
    const alumnoDoc = mapaUsuarios.get(alumnoDni);

    if (!tutorDoc || !alumnoDoc) {
      console.warn(`⚠️ Parentesco inválido: tutor ${tutorDni} o alumno ${alumnoDni} no existe.`);
      continue;
    }

    await Parentesco.create({
      padre_id: tutorDoc._id,
      alumno_id: alumnoDoc._id,
      tipo_vinculo: p.vinculo,
    });
  }
  console.log(`✅ ${rawDataset.parentescos.length} Parentescos creados.`);

  // 7. Generar registros académicos de demostración para los alumnos creados
  const materiasCreadas = await Materia.find();
  const alumnoTomas = mapaUsuarios.get('48123456');
  const alumnoSofia = mapaUsuarios.get('48234567');

  if (alumnoTomas && materiasCreadas.length > 0) {
    const mat1 = materiasCreadas[0];
    const mat2 = materiasCreadas[1] || materiasCreadas[0];

    await RegistroAcademico.create([
      { alumno_id: alumnoTomas._id, materia_id: mat1._id, tipo: 'nota', valor: '9.00', trimestre: 1, fecha: new Date('2026-04-15'), observacion: '1° Trimestre - Evaluación Parcial' },
      { alumno_id: alumnoTomas._id, materia_id: mat1._id, tipo: 'nota', valor: '8.50', trimestre: 2, fecha: new Date('2026-07-10'), observacion: '2° Trimestre - Trabajo Integrador' },
      { alumno_id: alumnoTomas._id, materia_id: mat1._id, tipo: 'nota', valor: '9.50', trimestre: 3, fecha: new Date('2026-11-20'), observacion: '3° Trimestre - Examen Final' },
      { alumno_id: alumnoTomas._id, materia_id: mat2._id, tipo: 'nota', valor: '8.00', trimestre: 1, fecha: new Date('2026-04-18'), observacion: '1° Trimestre - Diagnóstico' },
      { alumno_id: alumnoTomas._id, materia_id: mat2._id, tipo: 'nota', valor: '8.50', trimestre: 2, fecha: new Date('2026-07-12'), observacion: '2° Trimestre - Proyecto' },
      { alumno_id: alumnoTomas._id, materia_id: mat1._id, tipo: 'inasistencia', valor: 'Ausente', fecha: new Date('2026-05-10'), observacion: 'Falta justificada médica' },
      { alumno_id: alumnoTomas._id, materia_id: mat2._id, tipo: 'sancion', valor: 'Llamado de atención', fecha: new Date('2026-06-03'), observacion: 'Uso reiterado de teléfono celular durante el desarrollo de la clase.' },
    ]);
  }

  if (alumnoSofia && materiasCreadas.length > 0) {
    const mat1 = materiasCreadas[0];
    await RegistroAcademico.create([
      { alumno_id: alumnoSofia._id, materia_id: mat1._id, tipo: 'nota', valor: '10.00', trimestre: 1, fecha: new Date('2026-04-15'), observacion: '1° Trimestre - Examen Destacado' },
      { alumno_id: alumnoSofia._id, materia_id: mat1._id, tipo: 'nota', valor: '9.50', trimestre: 2, fecha: new Date('2026-07-10'), observacion: '2° Trimestre - Evaluación Parcial' },
    ]);
  }

  console.log('🎉 Seeding del Instituto José Peña finalizado con éxito.');
}
