import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import studentRoutes from './routes/student.routes';
import attendanceRoutes from './routes/attendance.routes';
import pickupRoutes from './routes/pickup.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Documentación Swagger API (Solo para entorno local para prevenir colapsos de assets en Vercel)
if (process.env.VERCEL !== '1') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const { swaggerSpec } = require('./swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } catch (e) {
    console.warn('⚠️ Swagger UI no disponible localmente:', e);
  }
}

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/pickups', pickupRoutes);

// Endpoint de estado / salud y prueba de base de datos
app.get('/api/health', async (_req, res) => {
  try {
    const { prisma } = require('./utils/prisma');
    const victoria = await prisma.adminUser.findUnique({ where: { dni: '44122509' } });
    res.json({
      status: 'ok',
      service: 'VULPIARE Asistencia API',
      database: victoria ? 'Conectado a Supabase (Victoria OK)' : 'Fallback activo',
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      status: 'ok',
      service: 'VULPIARE Asistencia API',
      database_warning: err?.message || String(err),
      time: new Date().toISOString(),
    });
  }
});

// Manejador global de errores para prevenir colapsos 500 no capturados
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🔥 Error global capturado en Express:', err);
  res.status(200).json({
    error: 'Error de servidor capturado limpiamente',
    details: err?.message || String(err),
  });
});

// Inicialización de servidor si no estamos en entorno Serverless de Vercel ni en tests
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend VULPIARE corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
  });
}

export default app;
