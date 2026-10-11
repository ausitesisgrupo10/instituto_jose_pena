/**
 * @archivo src/models/EventoAcademico.ts
 * @descripción Esquema y Modelo de Mongoose para Eventos y Fechas del Calendario Académico Institucional.
 * @funcionalidad Soporta exámenes, reuniones de padres, feriados, actos escolares, cierres de notas y jornadas docentes.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type TipoEvento =
  | 'Examen'
  | 'Reunion_Padres'
  | 'Feriado'
  | 'Acto'
  | 'Cierre_Notas'
  | 'Jornada_Docente'
  | 'Inscripcion'
  | 'Otro';

export type NivelAcademico = 'Todos' | 'Secundario' | 'Primario' | 'Inicial';

export interface IEventoAcademicoDocument extends Document {
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
  fecha: string; // Formato YYYY-MM-DD para consistencia temporal
  fechaFin?: string;
  hora: string;
  lugar: string;
  nivel: NivelAcademico;
  curso_nombre?: string;
  seccion_nombre?: string;
  materia_nombre?: string;
  responsable?: string;
  importancia: 'Alta' | 'Media' | 'Informativa';
  creador_id?: mongoose.Types.ObjectId;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventoAcademicoSchema = new Schema<IEventoAcademicoDocument>(
  {
    titulo: {
      type: String,
      required: [true, 'El título del evento es obligatorio.'],
      trim: true,
    },
    descripcion: {
      type: String,
      default: '',
      trim: true,
    },
    tipo: {
      type: String,
      required: true,
      enum: [
        'Examen',
        'Reunion_Padres',
        'Feriado',
        'Acto',
        'Cierre_Notas',
        'Jornada_Docente',
        'Inscripcion',
        'Otro',
      ],
      default: 'Otro',
      index: true,
    },
    fecha: {
      type: String,
      required: [true, 'La fecha del evento es obligatoria (YYYY-MM-DD).'],
      index: true,
    },
    fechaFin: {
      type: String,
      default: null,
    },
    hora: {
      type: String,
      default: 'Horario Escolar',
    },
    lugar: {
      type: String,
      default: 'Sede Institucional',
    },
    nivel: {
      type: String,
      enum: ['Todos', 'Secundario', 'Primario', 'Inicial'],
      default: 'Todos',
      index: true,
    },
    curso_nombre: {
      type: String,
      default: 'Todos',
    },
    seccion_nombre: {
      type: String,
      default: 'Todas',
    },
    materia_nombre: {
      type: String,
      default: '',
    },
    responsable: {
      type: String,
      default: 'Dirección Académica',
    },
    importancia: {
      type: String,
      enum: ['Alta', 'Media', 'Informativa'],
      default: 'Media',
    },
    creador_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EventoAcademico = mongoose.model<IEventoAcademicoDocument>(
  'EventoAcademico',
  EventoAcademicoSchema,
  'eventos_academicos'
);
