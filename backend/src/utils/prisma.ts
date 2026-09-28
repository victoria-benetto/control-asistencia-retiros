import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Manejar ruta de SQLite para Vercel Serverless (/tmp/vulpiare.db) vs Local (backend/prisma/dev.db)
if (process.env.VERCEL === '1') {
  const tmpDbPath = '/tmp/vulpiare.db';
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db')) {
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
  }
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

export const prisma = new PrismaClient();

let isInitialized = false;

/**
 * Garantiza que la base de datos tenga las tablas y a la Super Admin Victoria (44122509)
 */
export async function ensureDatabaseReady() {
  if (isInitialized) return;

  try {
    // Intentar buscar a Victoria
    const victoria = await prisma.adminUser.findUnique({
      where: { dni: '44122509' },
    });

    if (!victoria) {
      console.log('🌱 Inicializando Super Admin Victoria (44122509)...');
      await prisma.adminUser.upsert({
        where: { dni: '44122509' },
        update: { fullName: 'Victoria', role: 'SUPER_ADMIN' },
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
    }
    isInitialized = true;
  } catch (err: any) {
    console.log('⚠️ Creando tablas iniciales en base de datos...');
    try {
      // Crear esquema si las tablas aún no existían
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AdminUser" (
          "id" TEXT PRIMARY KEY,
          "dni" TEXT UNIQUE NOT NULL,
          "fullName" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'ADMIN',
          "permissions" TEXT NOT NULL DEFAULT '{"canAttendance":true,"canPickups":true,"canHistory":true}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Student" (
          "id" TEXT PRIMARY KEY,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "dni" TEXT UNIQUE NOT NULL,
          "shift" TEXT NOT NULL DEFAULT 'Lunes',
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AuthorizedPerson" (
          "id" TEXT PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "fullName" TEXT NOT NULL,
          "dni" TEXT NOT NULL,
          "relationship" TEXT NOT NULL,
          "phone" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
          "id" TEXT PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "recordedByAdminId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("recordedByAdminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL,
          UNIQUE("studentId", "date")
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PickupRecord" (
          "id" TEXT PRIMARY KEY,
          "attendanceId" TEXT NOT NULL,
          "authorizedPersonId" TEXT NOT NULL,
          "pickupTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "recordedByAdminId" TEXT,
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("authorizedPersonId") REFERENCES "AuthorizedPerson" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("recordedByAdminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL
        );
      `);

      // Insertar Victoria
      await prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO "AdminUser" ("id", "dni", "fullName", "role", "permissions", "createdAt", "updatedAt")
        VALUES (
          'super-admin-victoria-uuid',
          '44122509',
          'Victoria',
          'SUPER_ADMIN',
          '{"canAttendance":true,"canPickups":true,"canHistory":true}',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      `);

      isInitialized = true;
      console.log('✅ Base de datos inicializada con Victoria (44122509).');
    } catch (createErr) {
      console.error('Error al inicializar base de datos:', createErr);
    }
  }
}
