import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTodayDateString, getTodayDayName } from '../utils/date';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/attendance/today:
 *   get:
 *     summary: Obtener la asistencia de hoy por turno (Detección de fecha automática)
 *     tags: [Asistencia]
 *     parameters:
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *         description: Nombre del turno (ej. Lunes)
 *     responses:
 *       200:
 *         description: Lista de asistencias registradas y alumnas del turno.
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const todayDate = getTodayDateString();
    const todayDayName = getTodayDayName();
    
    const targetShift = (req.query.shift as string) || (['Sábado', 'Domingo'].includes(todayDayName) ? 'Lunes' : todayDayName);

    const studentsInShift = await prisma.student.findMany({
      where: { shift: targetShift },
      include: { authorizedPeople: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const existingAttendances = await prisma.attendanceRecord.findMany({
      where: { date: todayDate },
      include: {
        recordedBy: { select: { fullName: true, dni: true } },
        pickups: {
          include: {
            authorizedPerson: true,
            recordedBy: { select: { fullName: true, dni: true } },
          },
        },
      },
    });

    const attendanceMap = new Map();
    existingAttendances.forEach(record => {
      attendanceMap.set(record.studentId, record);
    });

    const result = studentsInShift.map(student => {
      const record = attendanceMap.get(student.id);
      return {
        student,
        attendanceId: record?.id || null,
        status: record?.status || null,
        date: todayDate,
        recordedBy: record?.recordedBy || null,
        pickups: record?.pickups || [],
      };
    });

    return res.json({
      date: todayDate,
      shift: targetShift,
      todayDayName,
      students: result,
    });
  } catch (error) {
    console.error('Error al obtener asistencia de hoy:', error);
    return res.status(500).json({ error: 'Error interno al consultar asistencia.' });
  }
});

/**
 * @openapi
 * /api/attendance:
 *   post:
 *     summary: Registrar o actualizar la asistencia del día
 *     tags: [Asistencia]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, status]
 *             properties:
 *               studentId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PRESENT, ABSENT]
 *               recordedByAdminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asistencia guardada.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, status, recordedByAdminId } = req.body;
    const todayDate = getTodayDateString();

    if (!studentId || !['PRESENT', 'ABSENT'].includes(status)) {
      return res.status(400).json({ error: 'studentId y estado válido (PRESENT/ABSENT) son requeridos.' });
    }

    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_date: {
          studentId,
          date: todayDate,
        },
      },
      update: {
        status,
        recordedByAdminId: recordedByAdminId || null,
      },
      create: {
        studentId,
        date: todayDate,
        status,
        recordedByAdminId: recordedByAdminId || null,
      },
      include: {
        student: true,
        recordedBy: { select: { fullName: true } },
      },
    });

    return res.json(record);
  } catch (error) {
    console.error('Error al guardar asistencia:', error);
    return res.status(500).json({ error: 'Error al registrar la asistencia.' });
  }
});

/**
 * @openapi
 * /api/attendance/history:
 *   get:
 *     summary: Consultar historial de asistencias pasadas
 *     tags: [Asistencia]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registros históricos de asistencias y retiros.
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { date, shift } = req.query;

    const whereCondition: any = {};
    if (date) {
      whereCondition.date = String(date);
    }
    if (shift) {
      whereCondition.student = { shift: String(shift) };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereCondition,
      include: {
        student: {
          include: { authorizedPeople: true },
        },
        recordedBy: { select: { fullName: true } },
        pickups: {
          include: {
            authorizedPerson: true,
            recordedBy: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { student: { lastName: 'asc' } }],
    });

    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar historial.' });
  }
});

export default router;
