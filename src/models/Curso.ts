/**
 * @archivo src/models/Curso.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'cursos' del Instituto José Peña.
 * @reglaDeNegocio Define el año lectivo o grado y el nivel educativo correspondiente (Primario, Secundario, Inicial).
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Curso.
 */
export interface ICursoDocument extends Document {
  nombre_curso: string;
  nivel: 'Primario' | 'Secundario' | 'Inicial';
}

/**
 * @esquema CursoSchema
 * @descripción Define la estructura de los cursos dictados en la institución.
 */
const CursoSchema = new Schema<ICursoDocument>(
  {
    nombre_curso: {
      type: String,
      required: [true, 'El nombre del curso es obligatorio.'],
      trim: true,
    },
    nivel: {
      type: String,
      required: [true, 'El nivel educativo es obligatorio.'],
      enum: ['Primario', 'Secundario', 'Inicial'],
    },
  },
  {
    timestamps: true,
    collection: 'cursos',
  }
);

export const Curso: mongoose.Model<ICursoDocument> =
  mongoose.models.Curso || mongoose.model<ICursoDocument>('Curso', CursoSchema);
