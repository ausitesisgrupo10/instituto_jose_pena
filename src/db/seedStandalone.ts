/**
 * @archivo src/db/seedStandalone.ts
 * @descripción Script ejecutable directamente via CLI / tsx para sembrar o restablecer
 * la base de datos con el Dataset del Instituto José Peña.
 * Uso: npx tsx src/db/seedStandalone.ts
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { sembrarDatasetCompleto } from './seedDataset.js';

async function main() {
  console.log('🚀 Iniciando script de sembrado manual (Standalone)...');
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('⚡ MONGODB_URI no detectada. Levantando instancia local con MongoMemoryServer...');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }

  await mongoose.connect(uri);
  console.log('✅ Conectado a MongoDB:', uri);

  await sembrarDatasetCompleto();

  console.log('🎉 Operación completada.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en seeding standalone:', err);
  process.exit(1);
});
