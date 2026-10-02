import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

export const OFFICIAL_SHIFTS = [
  'Lunes, miércoles y viernes de 16:45 a 18',
  'Lunes, miércoles y viernes de 17:30 a 19',
  'Martes y Jueves de 16 a 18',
  'Lunes y miércoles de 8 a 10',
];

/**
 * @openapi
 * /api/students:
 *   get:
 *     summary: Listar alumnas registradas (Supabase)
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
    const whereCondition = shift ? { shift: String(shift) } : {};

    const students = await prisma.student.findMany({
      where: whereCondition,
      include: {
        authorizedPeople: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return res.json(students);
  } catch (error) {
    console.warn('⚠️ Base de datos inaccesible en /students, retornando lista vacia:', error);
    return res.json([]);
  }
});

/**
 * @openapi
 * /api/students/shifts:
 *   get:
 *     summary: Obtener turnos disponibles oficiales de VULPIARE
 *     tags: [Alumnas]
 *     responses:
 *       200:
 *         description: Lista de turnos.
 */
router.get('/shifts', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      select: { shift: true },
      distinct: ['shift'],
    });

    const dbShifts = students.map(s => s.shift);
    const allShifts = Array.from(new Set([...OFFICIAL_SHIFTS, ...dbShifts]));

    return res.json(allShifts);
  } catch (error) {
    console.warn('⚠️ Base de datos inaccesible en /shifts, usando turnos por defecto:', error);
    return res.json(OFFICIAL_SHIFTS);
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        authorizedPeople: true,
        attendances: {
          include: {
            pickups: {
              include: { authorizedPerson: true },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }

    return res.json(student);
  } catch (error) {
    return res.status(404).json({ error: 'Alumna no encontrada o base de datos no disponible.' });
  }
});

export default router;
