import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getTodayDateString, getTodayDayName } from '../utils/date';
import { OFFICIAL_SHIFTS } from './student.routes';

const router = Router();

/**
 * @openapi
 * /api/attendance/today:
 *   get:
 *     summary: Obtener la asistencia por turno y fecha opcional (Supabase PostgreSQL)
 *     tags: [Asistencia]
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
 *         description: Lista de asistencias registradas y alumnas del turno.
 */
router.get('/today', async (req: Request, res: Response) => {
  const selectedDate = (req.query.date as string) || getTodayDateString();
  const todayDayName = getTodayDayName();
  const targetShift = (req.query.shift as string) || OFFICIAL_SHIFTS[0];

  try {
    // Alumnas registradas en este turno
    const studentsInShift = await prisma.student.findMany({
      where: { shift: targetShift },
      include: { authorizedPeople: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Registros de asistencia existentes para la fecha seleccionada
    const existingAttendances = await prisma.attendanceRecord.findMany({
      where: { date: selectedDate },
      include: {
        student: { include: { authorizedPeople: true } },
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

    // Construir lista del turno
    const result = studentsInShift.map(student => {
      const record = attendanceMap.get(student.id);
      return {
        student,
        attendanceId: record?.id || null,
        status: record?.status || null,
        isMakeup: record?.isMakeup || false,
        makeupShift: record?.makeupShift || null,
        date: selectedDate,
        recordedBy: record?.recordedBy || null,
        pickups: record?.pickups || [],
      };
    });

    // Agregar alumnas de recuperatorio (de otros turnos que asistieron en esta fecha y turno)
    const makeupRecords = existingAttendances.filter(record => record.isMakeup && record.student && record.student.shift !== targetShift);
    makeupRecords.forEach(record => {
      if (!result.some(r => r.student.id === record.studentId)) {
        result.push({
          student: record.student,
          attendanceId: record.id,
          status: record.status,
          isMakeup: true,
          makeupShift: record.makeupShift || targetShift,
          date: selectedDate,
          recordedBy: record.recordedBy || null,
          pickups: record.pickups || [],
        });
      }
    });

    // Buscar profesoras ayudantes / acompañantes para la fecha y turno
    let assistants: any[] = [];
    try {
      assistants = await prisma.shiftAssistant.findMany({
        where: { date: selectedDate, shift: targetShift },
        include: { teacher: { select: { id: true, fullName: true, dni: true } } },
        orderBy: { createdAt: 'asc' },
      });
    } catch (e) {
      assistants = [];
    }

    return res.json({
      date: selectedDate,
      shift: targetShift,
      todayDayName,
      students: result,
      assistants,
    });
  } catch (error) {
    console.warn('⚠️ Base de datos inaccesible en /attendance/today, usando fallback:', error);
    return res.json({
      date: selectedDate,
      shift: targetShift,
      todayDayName,
      students: [],
      assistants: [],
    });
  }
});

/**
 * @openapi
 * /api/attendance:
 *   post:
 *     summary: Registrar o actualizar la asistencia (Soporta recuperatorio y makeupShift)
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
 *               date:
 *                 type: string
 *               isMakeup:
 *                 type: boolean
 *               makeupShift:
 *                 type: string
 *               recordedByAdminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asistencia guardada.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, status, date, isMakeup, makeupShift, recordedByAdminId } = req.body;
    const targetDate = date || getTodayDateString();

    if (!studentId || !['PRESENT', 'ABSENT'].includes(status)) {
      return res.status(400).json({ error: 'studentId y estado válido (PRESENT/ABSENT) son requeridos.' });
    }

    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_date: {
          studentId,
          date: targetDate,
        },
      },
      update: {
        status,
        isMakeup: Boolean(isMakeup),
        makeupShift: isMakeup ? makeupShift || null : null,
        recordedByAdminId: recordedByAdminId || null,
      },
      create: {
        studentId,
        date: targetDate,
        status,
        isMakeup: Boolean(isMakeup),
        makeupShift: isMakeup ? makeupShift || null : null,
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
    return res.status(500).json({ error: 'Error al registrar la asistencia en Supabase.' });
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
    if (shift && String(shift) !== 'ALL' && String(shift).trim() !== '') {
      const shiftStr = String(shift).trim();
      whereCondition.OR = [
        { student: { shift: shiftStr } },
        { makeupShift: shiftStr },
      ];
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
    console.warn('⚠️ Base de datos inaccesible en /attendance/history, retornando lista vacia:', error);
    return res.json([]);
  }
});

/**
 * @openapi
 * /api/attendance/teachers:
 *   get:
 *     summary: Obtener lista pública de profesores para seleccionar acompañantes
 *     tags: [Asistencia]
 */
router.get('/teachers', async (_req: Request, res: Response) => {
  try {
    const teachers = await prisma.adminUser.findMany({
      select: { id: true, fullName: true, dni: true, role: true },
      orderBy: { fullName: 'asc' },
    });
    return res.json(teachers);
  } catch (error) {
    return res.json([
      { id: 'super-admin-victoria-44122509', fullName: 'Victoria', dni: '44122509', role: 'SUPER_ADMIN' },
      { id: 'admin-maria-43213538', fullName: 'Profe María', dni: '43213538', role: 'ADMIN' },
    ]);
  }
});

/**
 * @openapi
 * /api/attendance/assistants:
 *   get:
 *     summary: Obtener profesoras acompañantes por fecha y turno
 *     tags: [Asistencia]
 */
router.get('/assistants', async (req: Request, res: Response) => {
  const selectedDate = (req.query.date as string) || getTodayDateString();
  const shift = req.query.shift as string;

  try {
    const whereCondition: any = { date: selectedDate };
    if (shift && shift !== 'ALL') {
      whereCondition.shift = shift;
    }

    const assistants = await prisma.shiftAssistant.findMany({
      where: whereCondition,
      include: { teacher: { select: { id: true, fullName: true, dni: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(assistants);
  } catch (error) {
    return res.json([]);
  }
});

/**
 * @openapi
 * /api/attendance/assistants:
 *   post:
 *     summary: Asignar profesora acompañante / ayudante a un turno y fecha
 *     tags: [Asistencia]
 */
router.post('/assistants', async (req: Request, res: Response) => {
  const { date, shift, teacherId } = req.body;
  if (!date || !shift || !teacherId) {
    return res.status(400).json({ error: 'date, shift y teacherId son requeridos.' });
  }

  try {
    const record = await prisma.shiftAssistant.upsert({
      where: {
        date_shift_teacherId: {
          date: String(date),
          shift: String(shift),
          teacherId: String(teacherId),
        },
      },
      update: {},
      create: {
        date: String(date),
        shift: String(shift),
        teacherId: String(teacherId),
      },
      include: { teacher: { select: { id: true, fullName: true, dni: true } } },
    });
    return res.json(record);
  } catch (error) {
    console.error('Error al guardar profesora ayudante:', error);
    return res.status(500).json({ error: 'Error al registrar profesora ayudante.' });
  }
});

/**
 * @openapi
 * /api/attendance/assistants/:id:
 *   delete:
 *     summary: Quitar profesora acompañante / ayudante
 *     tags: [Asistencia]
 */
router.delete('/assistants/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.shiftAssistant.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar profesora ayudante.' });
  }
});

export default router;
