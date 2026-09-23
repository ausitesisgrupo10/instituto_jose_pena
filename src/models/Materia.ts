/**
 * @archivo src/models/Materia.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'materias' del Instituto José Peña.
 * @reglaDeNegocio Asocia una materia curricular a una Sección y a un Docente a cargo.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IHorarioModulo {
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_modulo: '40 min' | '2 hs' | '1 módulo';
}

/**
 * Interfaz de documento Mongoose para Materia.
 */
export interface IMateriaDocument extends Document {
  nombre_materia: string;
  seccion_id: mongoose.Types.ObjectId;
  docente_id: mongoose.Types.ObjectId;
  programa_url?: string;
  horarios?: IHorarioModulo[];
}

/**
 * @esquema MateriaSchema
 * @descripción Define las asignaturas dictadas en cada sección con su docente designado y grilla horaria.
 */
const MateriaSchema = new Schema<IMateriaDocument>(
  {
    nombre_materia: {
      type: String,
      required: [true, 'El nombre de la materia es obligatorio.'],
      trim: true,
    },
    seccion_id: {
      type: Schema.Types.ObjectId,
      ref: 'Seccion',
      required: [true, 'La sección asignada es obligatoria.'],
    },
    docente_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El docente a cargo es obligatorio.'],
    },
    programa_url: {
      type: String,
      default: '',
    },
    horarios: [
      {
        dia: { type: String, required: true },
        hora_inicio: { type: String, required: true },
        hora_fin: { type: String, required: true },
        duracion_modulo: {
          type: String,
          enum: ['40 min', '2 hs', '1 módulo'],
          default: '40 min',
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'materias',
  }
);

export const Materia: mongoose.Model<IMateriaDocument> =
  mongoose.models.Materia || mongoose.model<IMateriaDocument>('Materia', MateriaSchema);
