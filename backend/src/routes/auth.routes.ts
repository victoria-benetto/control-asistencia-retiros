import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login Unificado por DNI
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni]
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "44122509"
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna tipo ADMIN o PARENT con sus datos.
 *       400:
 *         description: El DNI es requerido.
 *       404:
 *         description: Usuario o alumna no encontrado con el DNI ingresado.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { dni } = req.body;
    if (!dni || typeof dni !== 'string') {
      return res.status(400).json({ error: 'El DNI es requerido.' });
    }

    const cleanDni = dni.trim();

    // 1. Buscar si el DNI pertenece a un Admin / Profesor / Super Admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { dni: cleanDni },
    });

    if (adminUser) {
      let permissionsParsed = {};
      try {
        permissionsParsed = JSON.parse(adminUser.permissions || '{}');
      } catch (e) {
        permissionsParsed = { canAttendance: true, canPickups: true, canHistory: true };
      }

      return res.json({
        type: 'ADMIN',
        user: {
          id: adminUser.id,
          dni: adminUser.dni,
          fullName: adminUser.fullName,
          role: adminUser.role,
          permissions: permissionsParsed,
        },
      });
    }

    // 2. Buscar si el DNI pertenece directamente a una Alumna
    let student = await prisma.student.findUnique({
      where: { dni: cleanDni },
      include: {
        authorizedPeople: true,
        attendances: {
          include: {
            recordedBy: { select: { fullName: true } },
            pickups: {
              include: {
                authorizedPerson: true,
                recordedBy: { select: { fullName: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    // 3. Si no es el DNI directo de la alumna, buscar si es el DNI de una Persona Autorizada (Tutor/Padre)
    if (!student) {
      const authorizedPerson = await prisma.authorizedPerson.findFirst({
        where: { dni: cleanDni },
        include: {
          student: {
            include: {
              authorizedPeople: true,
              attendances: {
                include: {
                  recordedBy: { select: { fullName: true } },
                  pickups: {
                    include: {
                      authorizedPerson: true,
                      recordedBy: { select: { fullName: true } },
                    },
                  },
                },
                orderBy: { date: 'desc' },
              },
            },
          },
        },
      });

      if (authorizedPerson && authorizedPerson.student) {
        student = authorizedPerson.student;
      }
    }

    if (student) {
      return res.json({
        type: 'PARENT',
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          dni: student.dni,
          shift: student.shift,
          authorizedPeople: student.authorizedPeople,
          attendances: student.attendances,
        },
      });
    }

    return res.status(404).json({ error: 'No se encontró ningún usuario o alumna registrado con este DNI.' });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;
