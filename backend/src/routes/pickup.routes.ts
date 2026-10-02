import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getTodayDateString } from '../utils/date';

const router = Router();

/**
 * @openapi
 * /api/pickups/today:
 *   get:
 *     summary: Obtener alumnas PRESENTES de hoy (o fecha personalizada) para gestionar sus retiros
 *     tags: [Retiros]
 *     parameters:
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de alumnas presentes con sus autorizados y retiros registrados.
 */
router.get('/today', async (req: Request, res: Response) => {
  const selectedDate = (req.query.date as string) || getTodayDateString();
  const { shift } = req.query;

  try {
    const whereCondition: any = {
      date: selectedDate,
      status: 'PRESENT',
    };

    if (shift) {
      whereCondition.student = { shift: String(shift) };
    }

    const presentRecords = await prisma.attendanceRecord.findMany({
      where: whereCondition,
      include: {
        student: {
          include: { authorizedPeople: true },
        },
        recordedBy: { select: { fullName: true } },
        pickups: {
          include: {
            authorizedPerson: true,
            recordedBy: { select: { fullName: true, dni: true } },
          },
        },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    return res.json({
      date: selectedDate,
      presentStudents: presentRecords,
    });
  } catch (error) {
    console.warn('⚠️ Base de datos inaccesible en /pickups/today, retornando lista vacia:', error);
    return res.json({
      date: selectedDate,
      presentStudents: [],
    });
  }
});

/**
 * @openapi
 * /api/pickups:
 *   post:
 *     summary: Registrar retiro de una alumna presente
 *     tags: [Retiros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attendanceId, authorizedPersonId]
 *             properties:
 *               attendanceId:
 *                 type: string
 *               authorizedPersonId:
 *                 type: string
 *               recordedByAdminId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Retiro registrado exitosamente.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { attendanceId, authorizedPersonId, recordedByAdminId, notes } = req.body;

    if (!attendanceId || !authorizedPersonId) {
      return res.status(400).json({ error: 'attendanceId y authorizedPersonId son requeridos.' });
    }

    const attendance = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado.' });
    }

    if (attendance.status !== 'PRESENT') {
      return res.status(400).json({ error: 'No se puede registrar el retiro de una alumna ausente.' });
    }

    const pickup = await prisma.pickupRecord.create({
      data: {
        attendanceId,
        authorizedPersonId,
        recordedByAdminId: recordedByAdminId || null,
        pickupTime: new Date(),
        notes: notes ? notes.trim() : null,
      },
      include: {
        authorizedPerson: true,
        recordedBy: { select: { fullName: true } },
      },
    });

    return res.status(201).json(pickup);
  } catch (error) {
    console.error('Error al registrar retiro:', error);
    return res.status(500).json({ error: 'Error al guardar el retiro en Supabase.' });
  }
});

export default router;
