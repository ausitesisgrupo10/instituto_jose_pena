/**
 * @archivo server.ts
 * @descripción Servidor principal Node.js con Express.js e integración Vite para el "Instituto José Peña".
 * @arquitectura REST API con MongoDB / Mongoose ODM y Middleware de seguridad JWT.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { conectarBD } from './src/db/database.js';

import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.ts';
import cursoRoutes from './src/routes/cursoRoutes.ts';
import seccionRoutes from './src/routes/seccionRoutes.ts';
import materiaRoutes from './src/routes/materiaRoutes.ts';
import parentescoRoutes from './src/routes/parentescoRoutes.ts';
import registroRoutes from './src/routes/registroRoutes.ts';
import asistenciaDocenteRoutes from './src/routes/asistenciaDocenteRoutes.ts';
import reporteRoutes from './src/routes/reporteRoutes.ts';
import alumnoRoutes from './src/routes/alumnoRoutes.ts';
import docenteRoutes from './src/routes/docenteRoutes.ts';
import noDocenteRoutes from './src/routes/noDocenteRoutes.ts';
import tutorRoutes from './src/routes/tutorRoutes.ts';

const PORT = 3000;
const HOST = '0.0.0.0';

/**
 * @función iniciarServidor
 * @descripción Configura e inicia la base de datos, middlewares de Express y enrutamiento REST.
 */
async function iniciarServidor() {
  const app = express();

  // Middlewares globales
  app.use(cors());
  app.use(express.json());

  // Conexión a MongoDB / MongoMemoryServer y siembra de datos demo
  await conectarBD();

  // Rutas REST de la API del Instituto José Peña
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', userRoutes);
  app.use('/api/cursos', cursoRoutes);
  app.use('/api/secciones', seccionRoutes);
  app.use('/api/materias', materiaRoutes);
  app.use('/api/parentescos', parentescoRoutes);
  app.use('/api/registros', registroRoutes);
  app.use('/api/asistencia-docente', asistenciaDocenteRoutes);
  app.use('/api/reportes', reporteRoutes);
  app.use('/api/alumnos', alumnoRoutes);
  app.use('/api/docentes', docenteRoutes);
  app.use('/api/no-docente', noDocenteRoutes);
  app.use('/api/tutor', tutorRoutes);

  // Endpoint de salud
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', institucion: 'Instituto José Peña', fecha: new Date().toISOString() });
  });

  // Configuración de Vite / Servidor Estático
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor del Instituto José Peña ejecutándose en http://${HOST}:${PORT}`);
  });
}

iniciarServidor().catch((error) => {
  console.error('❌ Error fatal al iniciar el servidor:', error);
});
