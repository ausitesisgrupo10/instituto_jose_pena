/**
 * @archivo src/db/database.ts
 * @descripción Configuración de conexión Mongoose a MongoDB y script de inicialización con datos semilla (Seed Data) para el Instituto José Peña.
 * @reglaDeNegocio Utiliza MongoMemoryServer de forma transparente si no existe una URI externa de MongoDB, garantizando funcionamiento inmediato y persistencia en memoria durante la ejecución.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { Curso } from '../models/Curso.js';
import { Seccion } from '../models/Seccion.js';
import { Materia } from '../models/Materia.js';
import { Parentesco } from '../models/Parentesco.js';
import { RegistroAcademico } from '../models/RegistroAcademico.js';
import { AsistenciaDocente } from '../models/AsistenciaDocente.js';
import { Asistencia } from '../models/Asistencia.js';

import { sembrarDatasetCompleto } from './seedDataset.js';

let mongoMemoryServer: MongoMemoryServer | null = null;

/**
 * @función conectarBD
 * @descripción Inicia el servidor MongoDB en memoria o conecta a URI configurada e inicializa los registros semilla.
 * @returns {Promise<void>}
 */
export async function conectarBD(): Promise<void> {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      console.log('⚡ MONGODB_URI no provista. Inicializando MongoMemoryServer local...');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
      console.log('✅ Conexión con MongoDB establecida exitosamente.');
    }

    const conteoUsuarios = await User.countDocuments();
    if (conteoUsuarios === 0) {
      await sembrarDatasetCompleto();
    }
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error);
  }
}


