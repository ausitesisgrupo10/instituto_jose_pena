/**
 * @archivo src/models/Asistencia.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'asistencias' del Instituto José Peña.
 * @reglaDeNegocio Permite al personal No Docente registrar la asistencia diaria (Presente/Ausente) con comentarios tanto para Alumnos como Docentes.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Asistencia General (Alumno o Docente).
 */
export interface IAsistenciaDocument extends Document {
  persona_id: mongoose.Types.ObjectId;
  tipo_persona: 'Alumno' | 'Docente';
  fecha: Date;
  estado: 'Presente' | 'Ausente';
  comentario?: string;
  materia_id?: mongoose.Types.ObjectId;
  seccion_id?: mongoose.Types.ObjectId;
}

/**
 * @esquema AsistenciaSchema
 * @descripción Define la estructura para el seguimiento de presentismo en la institución.
 */
const AsistenciaSchema = new Schema<IAsistenciaDocument>(
  {
    persona_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'La persona asociada es obligatoria.'],
    },
    tipo_persona: {
      type: String,
      required: [true, 'El tipo de persona es obligatorio.'],
      enum: ['Alumno', 'Docente'],
    },
    fecha: {
      type: Date,
      default: Date.now,
      required: true,
    },
    estado: {
      type: String,
      required: [true, 'El estado de la asistencia es obligatorio.'],
      enum: ['Presente', 'Ausente'],
      default: 'Presente',
    },
    comentario: {
      type: String,
      default: '',
    },
    materia_id: {
      type: Schema.Types.ObjectId,
      ref: 'Materia',
    },
    seccion_id: {
      type: Schema.Types.ObjectId,
      ref: 'Seccion',
    },
  },
  {
    timestamps: true,
    collection: 'asistencias',
  }
);

export const Asistencia: mongoose.Model<IAsistenciaDocument> =
  mongoose.models.Asistencia || mongoose.model<IAsistenciaDocument>('Asistencia', AsistenciaSchema);
