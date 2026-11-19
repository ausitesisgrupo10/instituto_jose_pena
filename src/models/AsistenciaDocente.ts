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
  estado: 'Presente' | 'Ausente' | 'Licencia' | 'Tardanza' | 'Pendiente' | 'Aprobada' | 'Desaprobada';
  motivo?: string;
  observacion?: string;
  motivo_rechazo?: string;
  revisado_por?: mongoose.Types.ObjectId;
  fecha_revision?: Date;
  notificacion_leida?: boolean;
  adjunto_nombre?: string;
  adjunto_tipo?: string;
  adjunto_data?: string;
}

/**
 * @esquema AsistenciaDocenteSchema
 * @descripción Control del cumplimiento de asistencia y solicitudes de inasistencia de personal Docente y No Docente.
 */
const AsistenciaDocenteSchema = new Schema<IAsistenciaDocenteDocument>(
  {
    docente_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El solicitante es obligatorio.'],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    estado: {
      type: String,
      required: [true, 'El estado de asistencia es obligatorio.'],
      enum: ['Presente', 'Ausente', 'Licencia', 'Tardanza', 'Pendiente', 'Aprobada', 'Desaprobada'],
      default: 'Presente',
    },
    motivo: {
      type: String,
      default: '',
      trim: true,
    },
    observacion: {
      type: String,
      default: '',
    },
    motivo_rechazo: {
      type: String,
      default: '',
      trim: true,
    },
    revisado_por: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fecha_revision: {
      type: Date,
    },
    notificacion_leida: {
      type: Boolean,
      default: false,
    },
    adjunto_nombre: {
      type: String,
      default: '',
    },
    adjunto_tipo: {
      type: String,
      default: '',
    },
    adjunto_data: {
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
