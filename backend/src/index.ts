import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

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

// Documentación Swagger API (solamente en entorno local o si no falla el asset serving)
try {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (e) {
  console.warn('⚠️ Swagger UI setup skipped:', e);
}

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/pickups', pickupRoutes);

// Endpoint de estado / salud
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'VULPIARE Asistencia API', time: new Date().toISOString() });
});

// Inicialización de servidor si no estamos en entorno Serverless de Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend VULPIARE corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
  });
}

export default app;
