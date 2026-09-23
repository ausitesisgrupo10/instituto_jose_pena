/**
 * @archivo src/models/AsistenciaDocente.ts
 * @descripción Esquema y Modelo de Mongoose para el control de asistencia del personal docente.
 * @reglaDeNegocio Permite al personal No Docente registrar asistencias, tardanzas y licencias de los docentes.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Asistencia Docente.
 */
export interface IAsistenciaDocenteDocument extends Document {
  docente_id: mongoose.Types.ObjectId;
  fecha: Date;
  estado: 'Presente' | 'Ausente' | 'Licencia' | 'Tardanza';
  observacion?: string;
}

/**
 * @esquema AsistenciaDocenteSchema
 * @descripción Control del cumplimiento de asistencia de profesores y maestras.
 */
const AsistenciaDocenteSchema = new Schema<IAsistenciaDocenteDocument>(
  {
    docente_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El docente es obligatorio.'],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    estado: {
      type: String,
      required: [true, 'El estado de asistencia es obligatorio.'],
      enum: ['Presente', 'Ausente', 'Licencia', 'Tardanza'],
      default: 'Presente',
    },
    observacion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'asistencias_docentes',
  }
);

export const AsistenciaDocente: mongoose.Model<IAsistenciaDocenteDocument> =
  mongoose.models.AsistenciaDocente ||
  mongoose.model<IAsistenciaDocenteDocument>('AsistenciaDocente', AsistenciaDocenteSchema);
