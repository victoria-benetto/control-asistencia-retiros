import { Router, Request, Response } from 'express';
import { DataStore } from '../utils/store';

const router = Router();

/**
 * @openapi
 * /api/students:
 *   get:
 *     summary: Listar alumnas registradas
 *     tags: [Alumnas]
 *     parameters:
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de alumnas.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { shift } = req.query;
    const students = DataStore.getAllStudents(shift ? String(shift) : undefined);
    return res.json(students);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la lista de alumnas.' });
  }
});

/**
 * @openapi
 * /api/students/shifts:
 *   get:
 *     summary: Obtener turnos disponibles
 *     tags: [Alumnas]
 *     responses:
 *       200:
 *         description: Lista de turnos.
 */
router.get('/shifts', async (_req: Request, res: Response) => {
  try {
    const shifts = DataStore.getAvailableShifts();
    return res.json(shifts);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener turnos.' });
  }
});

/**
 * @openapi
 * /api/students/{id}:
 *   get:
 *     summary: Detalle de una alumna por ID
 *     tags: [Alumnas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos completos de la alumna.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = DataStore.getStudentById(id);
    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }
    return res.json(student);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener datos de la alumna.' });
  }
});

export default router;
