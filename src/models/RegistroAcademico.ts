/**
 * @archivo src/models/RegistroAcademico.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'registros_academicos' del Instituto José Peña.
 * @reglaDeNegocio Almacena calificaciones, inasistencias y sanciones disciplinarias asociadas a un alumno y materia.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Registro Académico.
 */
export interface IRegistroAcademicoDocument extends Document {
  alumno_id: mongoose.Types.ObjectId;
  materia_id: mongoose.Types.ObjectId;
  tipo: 'nota' | 'inasistencia' | 'sancion';
  valor: string;
  trimestre?: number;
  fecha: Date;
  observacion?: string;
}

/**
 * @esquema RegistroAcademicoSchema
 * @descripción Almacena las evaluaciones, inasistencias y amonestaciones de los estudiantes.
 */
const RegistroAcademicoSchema = new Schema<IRegistroAcademicoDocument>(
  {
    alumno_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El alumno es obligatorio.'],
    },
    materia_id: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
      required: [true, 'La materia es obligatoria.'],
    },
    tipo: {
      type: String,
      required: [true, 'El tipo de registro es obligatorio.'],
      enum: ['nota', 'inasistencia', 'sancion'],
    },
    valor: {
      type: String,
      required: [true, 'El valor o concepto del registro es obligatorio.'],
      trim: true,
    },
    trimestre: {
      type: Number,
      enum: [1, 2, 3],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    observacion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'registros_academicos',
  }
);

export const RegistroAcademico: mongoose.Model<IRegistroAcademicoDocument> =
  mongoose.models.RegistroAcademico ||
  mongoose.model<IRegistroAcademicoDocument>('RegistroAcademico', RegistroAcademicoSchema);
