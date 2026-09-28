import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos de prueba iniciales...');

  // 1. Crear Super Admin Victoria (44122509)
  const superAdmin = await prisma.adminUser.upsert({
    where: { dni: '44122509' },
    update: {
      fullName: 'Victoria',
    },
    create: {
      dni: '44122509',
      fullName: 'Victoria',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify({
        canAttendance: true,
        canPickups: true,
        canHistory: true,
      }),
    },
  });

  // 2. Crear Profesora de prueba (43213538)
  const teacherAdmin = await prisma.adminUser.upsert({
    where: { dni: '43213538' },
    update: {
      fullName: 'Profe María',
    },
    create: {
      dni: '43213538',
      fullName: 'Profe María',
      role: 'ADMIN',
      permissions: JSON.stringify({
        canAttendance: true,
        canPickups: true,
        canHistory: true,
      }),
    },
  });

  console.log('✅ Admins creados:', superAdmin.fullName, teacherAdmin.fullName);

  // 3. Crear Alumnas para el turno de los Lunes (Pepa, Pepita, Popa)
  const pepa = await prisma.student.upsert({
    where: { dni: '55111222' },
    update: {},
    create: {
      firstName: 'Pepa',
      lastName: 'Pérez',
      dni: '55111222',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: {
        create: [
          { fullName: 'Juan Pérez', dni: '30111222', relationship: 'Papá', phone: '1144556677' },
          { fullName: 'Ana Gómez', dni: '30111223', relationship: 'Mamá', phone: '1144556678' },
        ],
      },
    },
  });

  const pepita = await prisma.student.upsert({
    where: { dni: '55222333' },
    update: {},
    create: {
      firstName: 'Pepita',
      lastName: 'Gómez',
      dni: '55222333',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: {
        create: [
          { fullName: 'Carlos Gómez', dni: '30222333', relationship: 'Papá', phone: '1155667788' },
          { fullName: 'María Rodríguez', dni: '20111222', relationship: 'Abuela', phone: '1155667789' },
        ],
      },
    },
  });

  const popa = await prisma.student.upsert({
    where: { dni: '55333444' },
    update: {},
    create: {
      firstName: 'Popa',
      lastName: 'López',
      dni: '55333444',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: {
        create: [
          { fullName: 'Lucía López', dni: '30333444', relationship: 'Mamá', phone: '1166778899' },
          { fullName: 'Esteban López', dni: '31333444', relationship: 'Tío', phone: '1166778800' },
        ],
      },
    },
  });

  console.log('✅ Alumnas sembradas:', pepa.firstName, pepita.firstName, popa.firstName);
  console.log('🚀 Sembrado completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
