import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno locales de backend/.env si no fueron inyectadas externamente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';

// ⛔ CORTAFUEGOS DE SEGURIDAD: Bloqueo terminante contra ejecución sobre producción (public)
if (
  dbUrl.includes('schema=public') ||
  directUrl.includes('schema=public') ||
  (dbUrl.includes('supabase.com') && !dbUrl.includes('schema=dev'))
) {
  const fatalMsg = [
    '═══════════════════════════════════════════════════════════════════════════════',
    '⛔ BLOQUEO DE SEGURIDAD CRÍTICO:',
    'Se detectó un intento de ejecutar tests contra la base de datos de producción (public).',
    'La ejecución fue abortada inmediatamente para proteger los datos de las alumnas.',
    'Asegúrese de configurar schema=dev en DATABASE_URL.',
    '═══════════════════════════════════════════════════════════════════════════════',
  ].join('\n');

  console.error('\n' + fatalMsg + '\n');
  throw new Error('⛔ BLOQUEO DE SEGURIDAD: Prohibido ejecutar tests contra el esquema de producción (public).');
}

// Asegurar que el entorno de test siempre esté aislado
process.env.NODE_ENV = 'test';
