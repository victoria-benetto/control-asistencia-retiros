import { Router, Request, Response } from 'express';
import { DataStore } from '../utils/store';
import { getTodayDateString, getTodayDayName } from '../utils/date';

const router = Router();

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
 *     responses:
 *       200:
 *         description: Lista de asistencias registradas y alumnas del turno.
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const todayDate = getTodayDateString();
    const todayDayName = getTodayDayName();
    
    const targetShift = (req.query.shift as string) || (['Sábado', 'Domingo'].includes(todayDayName) ? 'Lunes' : todayDayName);
    const studentsResult = DataStore.getTodayAttendance(todayDate, targetShift);

    return res.json({
      date: todayDate,
      shift: targetShift,
      todayDayName,
      students: studentsResult,
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

    const record = DataStore.saveAttendance(studentId, todayDate, status, recordedByAdminId);
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
    const records = DataStore.getAttendanceHistory(date ? String(date) : undefined, shift ? String(shift) : undefined);
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar historial.' });
  }
});

export default router;
