/**
 * @archivo src/types.ts
 * @descripción Definición de interfaces y tipos TypeScript compartidos para el Sistema de Gestión Académica del Instituto José Peña.
 */

/**
 * Roles permitidos en la plataforma del Instituto José Peña.
 */
export type UserRole = 'Admin' | 'Docente' | 'No Docente' | 'Alumno' | 'Padre';

/**
 * Estado del usuario en el sistema.
 */
export type UserStatus = 'Activo' | 'Inactivo';

/**
 * Interfaz que representa un Usuario en el sistema.
 */
export interface IUser {
  _id: string;
  dni: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  permisos: string[];
  perfil_metadata?: {
    email?: string;
    telefono?: string;
    legajo?: string;
    observaciones?: string;
    curso?: string;
    seccion?: string;
    turno?: string;
    curso_id?: string;
    seccion_id?: string;
    [key: string]: any;
  };
  curso_id?: any;
  seccion_id?: any;
  turno?: string;
  estado: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interfaz que representa un Curso académico.
 */
export interface ICurso {
  _id: string;
  nombre_curso: string;
  nivel: 'Primario' | 'Secundario' | 'Inicial';
  createdAt?: string;
}

/**
 * Interfaz que representa una Sección / División de un Curso.
 */
export interface ISeccion {
  _id: string;
  nombre_seccion: string;
  curso_id: string | ICurso;
  turno: 'Mañana' | 'Tarde' | 'Noche';
  createdAt?: string;
}

export interface IHorarioModulo {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_modulo: '40 min' | '2 hs' | '1 módulo';
}

/**
 * Interfaz que representa una Materia asignada a una sección y a un docente.
 */
export interface IMateria {
  _id: string;
  nombre_materia: string;
  seccion_id: string | ISeccion;
  docente_id: string | IUser;
  programa_url?: string;
  horarios?: IHorarioModulo[];
  createdAt?: string;
}

/**
 * Interfaz que representa una relación de Parentesco entre un Padre/Tutor y un Alumno.
 */
export interface IParentesco {
  _id: string;
  padre_id: string | IUser;
  alumno_id: string | IUser;
  tipo_vinculo: 'Padre' | 'Madre' | 'Tutor Legal' | 'Encargado';
  createdAt?: string;
}

/**
 * Tipos de registros académicos admitidos.
 */
export type TipoRegistroAcademico = 'nota' | 'inasistencia' | 'sancion';

/**
 * Interfaz que representa un Registro Académico (calificación, inasistencia o sanción).
 */
export interface IRegistroAcademico {
  _id: string;
  alumno_id: string | IUser;
  materia_id: string | IMateria;
  tipo: TipoRegistroAcademico;
  trimestre?: number;
  valor: string; // Ej: "8", "10", "Ausente", "Amonestación por conducta"
  fecha: string;
  observacion?: string;
  createdAt?: string;
}

/**
 * Interfaz para la Asistencia General (Alumno o Docente) cargada por No Docente.
 */
export interface IAsistencia {
  _id: string;
  persona_id: string | IUser;
  tipo_persona: 'Alumno' | 'Docente';
  fecha: string;
  estado: 'Presente' | 'Ausente';
  comentario?: string;
  materia_id?: string | IMateria;
  seccion_id?: string | ISeccion;
  createdAt?: string;
}

/**
 * Interfaz para la Asistencia Docente cargada por el personal No Docente.
 */
export interface IAsistenciaDocente {
  _id: string;
  docente_id: string | IUser;
  fecha: string;
  estado: 'Presente' | 'Ausente' | 'Licencia' | 'Tardanza';
  observacion?: string;
  createdAt?: string;
}

/**
 * Respuesta devuelta tras un inicio de sesión exitoso.
 */
export interface IAuthResponse {
  token: string;
  usuario: IUser;
}

/**
 * Resumen de indicadores para el Dashboard (KPIs).
 */
export interface IDashboardStats {
  totalUsuarios: number;
  totalAlumnos: number;
  totalDocentes: number;
  totalPadres: number;
  totalNoDocentes: number;
  totalMaterias: number;
  totalCursos: number;
  totalSecciones: number;
}
