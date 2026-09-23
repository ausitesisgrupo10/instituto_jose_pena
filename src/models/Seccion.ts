/**
 * @archivo src/models/Seccion.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'secciones' del Instituto José Peña.
 * @reglaDeNegocio Una sección/división pertenece a un Curso y se dicta en un Turno determinado.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Sección.
 */
export interface ISeccionDocument extends Document {
  nombre_seccion: string;
  curso_id: mongoose.Types.ObjectId;
  turno: 'Mañana' | 'Tarde' | 'Noche';
}

/**
 * @esquema SeccionSchema
 * @descripción Define las divisiones o secciones que integran los cursos.
 */
const SeccionSchema = new Schema<ISeccionDocument>(
  {
    nombre_seccion: {
      type: String,
      required: [true, 'El nombre de la sección es obligatorio.'],
      trim: true,
    },
    curso_id: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      required: [true, 'El ID del curso es obligatorio.'],
    },
    turno: {
      type: String,
      required: [true, 'El turno es obligatorio.'],
      enum: ['Mañana', 'Tarde', 'Noche'],
      default: 'Mañana',
    },
  },
  {
    timestamps: true,
    collection: 'secciones',
  }
);

export const Seccion: mongoose.Model<ISeccionDocument> =
  mongoose.models.Seccion || mongoose.model<ISeccionDocument>('Seccion', SeccionSchema);
