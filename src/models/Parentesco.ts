/**
 * @archivo src/models/Parentesco.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'parentescos' del Instituto José Peña.
 * @reglaDeNegocio Vincula un Usuario tutor/padre (rol 'Padre') con un Usuario estudiante (rol 'Alumno').
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Parentesco.
 */
export interface IParentescoDocument extends Document {
  padre_id: mongoose.Types.ObjectId;
  alumno_id: mongoose.Types.ObjectId;
  tipo_vinculo: string;
}

/**
 * @esquema ParentescoSchema
 * @descripción Modela las relaciones de tutoría o filiación entre un responsable y un estudiante.
 */
const ParentescoSchema = new Schema<IParentescoDocument>(
  {
    padre_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El padre o tutor es obligatorio.'],
    },
    alumno_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El alumno vinculado es obligatorio.'],
    },
    tipo_vinculo: {
      type: String,
      required: [true, 'El tipo de vínculo es obligatorio (Padre, Madre, Tutor, etc.).'],
      trim: true,
      default: 'Padre',
    },
  },
  {
    timestamps: true,
    collection: 'parentescos',
  }
);

export const Parentesco: mongoose.Model<IParentescoDocument> =
  mongoose.models.Parentesco || mongoose.model<IParentescoDocument>('Parentesco', ParentescoSchema);
