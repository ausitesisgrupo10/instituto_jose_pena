/**
 * @archivo src/models/RegistroDocente.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'registros_docentes' del Instituto José Peña.
 * @reglaDeNegocio Almacena inasistencias y actas administrativas asociadas al personal docente.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Registro Docente.
 */
export interface IRegistroDocenteDocument extends Document {
  docente_id: mongoose.Types.ObjectId;
  tipo: 'inasistencia' | 'acta';
  fecha: Date;
  motivo_observacion?: string;
}

/**
 * @esquema RegistroDocenteSchema
 * @descripción Almacena actas de preceptoría e inasistencias formales de los profesores.
 */
const RegistroDocenteSchema = new Schema<IRegistroDocenteDocument>(
  {
    docente_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El docente es obligatorio.'],
    },
    tipo: {
      type: String,
      required: [true, 'El tipo de registro es obligatorio.'],
      enum: ['inasistencia', 'acta'],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    motivo_observacion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'registros_docentes',
  }
);

export const RegistroDocente: mongoose.Model<IRegistroDocenteDocument> =
  mongoose.models.RegistroDocente ||
  mongoose.model<IRegistroDocenteDocument>('RegistroDocente', RegistroDocenteSchema);
