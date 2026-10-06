import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Aplicando políticas de seguridad RLS y restricción de API pública en Supabase...');

  const tables = [
    'AdminUser',
    'Student',
    'AuthorizedPerson',
    'AttendanceRecord',
    'PickupRecord',
    'ShiftAssistant',
  ];

  for (const table of tables) {
    try {
      console.log(`🛡️ Habilitando Row Level Security (RLS) en la tabla "${table}"...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    } catch (err: any) {
      console.warn(`⚠️ Aviso al modificar "${table}":`, err.message);
    }
  }

  try {
    console.log('🚫 Revocando permisos directos al rol anónimo (anon) en el esquema public...');
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;`);

    console.log('🚫 Revocando permisos directos al rol autenticado (authenticated) por REST en public...');
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;`);

    console.log('🔒 Ajustando privilegios por defecto para futuras tablas...');
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;`);

    console.log('✅ ¡Seguridad RLS y bloqueo de API pública aplicada con éxito en Supabase!');
  } catch (err: any) {
    console.error('❌ Error al revocar permisos:', err.message);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el script RLS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
