import { Router, Request, Response } from 'express';
import { DataStore } from '../utils/store';
import { getTodayDateString } from '../utils/date';

const router = Router();

/**
 * @openapi
 * /api/pickups/today:
 *   get:
 *     summary: Obtener alumnas PRESENTES de hoy para gestionar sus retiros
 *     tags: [Retiros]
 *     parameters:
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de alumnas presentes con sus autorizados y retiros registrados.
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const todayDate = getTodayDateString();
    const { shift } = req.query;
    const targetShift = shift ? String(shift) : 'Lunes';

    const presentStudents = DataStore.getTodayAttendance(todayDate, targetShift).filter((s) => s.status === 'PRESENT');

    return res.json({
      date: todayDate,
      presentStudents,
    });
  } catch (error) {
    console.error('Error al obtener retiros de hoy:', error);
    return res.status(500).json({ error: 'Error al consultar retiros de hoy.' });
  }
});

/**
 * @openapi
 * /api/pickups:
 *   post:
 *     summary: Registrar retiro de una alumna presente (guarda hora y docente a cargo automáticamente)
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

    const pickup = DataStore.savePickup(attendanceId, authorizedPersonId, recordedByAdminId, notes);
    return res.status(201).json(pickup);
  } catch (error) {
    console.error('Error al registrar retiro:', error);
    return res.status(500).json({ error: 'Error al guardar el retiro.' });
  }
});

export default router;
