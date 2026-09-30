import swaggerJsdoc from 'swagger-jsdoc';

let spec = {};
try {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'VULPIARE API - Asistencia & Control de Retiros',
        version: '1.0.0',
        description: 'Documentación de la API Backend de VULPIARE para la gestión de asistencia, control de retiros de alumnas, ABM y login por DNI.',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Servidor de Desarrollo Local',
        },
      ],
      components: {
        securitySchemes: {
          UserDniHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'x-user-dni',
            description: 'DNI del usuario para verificación de permisos de Super Admin (ej: 44122509)',
          },
        },
      },
    },
    apis: ['./src/routes/*.ts', './src/index.ts', './routes/*.js'],
  };
  spec = swaggerJsdoc(options);
} catch (e) {
  console.warn('⚠️ Swagger spec generation skipped in serverless environment:', e);
}

export const swaggerSpec = spec;
