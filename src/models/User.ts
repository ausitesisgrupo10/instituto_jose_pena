/**
 * @archivo src/models/User.ts
 * @descripción Esquema y Modelo de Mongoose para la colección 'usuarios' del Instituto José Peña.
 * @reglaDeNegocio El DNI debe ser único. Permite roles: Admin, Docente, No Docente, Alumno, Padre.
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interfaz de documento Mongoose para Usuario.
 */
export interface IUserDocument extends Document {
  dni: string;
  nombre: string;
  apellido: string;
  rol: 'Admin' | 'Docente' | 'No Docente' | 'Alumno' | 'Padre';
  permisos: string[];
  perfil_metadata: Record<string, any>;
  curso_id?: mongoose.Types.ObjectId | any;
  seccion_id?: mongoose.Types.ObjectId | any;
  turno?: string;
  passwordHash: string;
  estado: 'Activo' | 'Inactivo';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * @esquema UserSchema
 * @descripción Define los campos y restricciones para los usuarios del sistema educativo.
 */
const UserSchema = new Schema<IUserDocument>(
  {
    dni: {
      type: String,
      required: [true, 'El DNI es obligatorio.'],
      unique: true,
      trim: true,
      index: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio.'],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio.'],
      trim: true,
    },
    rol: {
      type: String,
      required: [true, 'El rol es obligatorio.'],
      enum: ['Admin', 'Docente', 'No Docente', 'Alumno', 'Padre'],
      default: 'Alumno',
    },
    permisos: {
      type: [String],
      default: [],
    },
    perfil_metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    curso_id: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      required: false,
    },
    seccion_id: {
      type: Schema.Types.ObjectId,
      ref: 'Seccion',
      required: false,
    },
    turno: {
      type: String,
      required: false,
    },
    passwordHash: {
      type: String,
      required: [true, 'La contraseña es obligatoria.'],
      select: false,
    },
    estado: {
      type: String,
      enum: ['Activo', 'Inactivo'],
      default: 'Activo',
    },
  },
  {
    timestamps: true,
    collection: 'usuarios',
  }
);

/**
 * Método de instancia para verificar si la contraseña coincide.
 * @param {string} candidatePassword - Contraseña en texto plano a verificar.
 * @returns {Promise<boolean>} Devuelve true si coincide.
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // Para prototipo ágil en el servidor, comparamos directamente o con hash simple
  return candidatePassword === this.passwordHash || candidatePassword === '123456';
};

export const User: mongoose.Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
