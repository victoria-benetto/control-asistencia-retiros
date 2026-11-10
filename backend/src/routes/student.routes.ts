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
    const { shift, status } = req.query;
    const whereCondition: any = {};
    if (shift) whereCondition.shift = String(shift);
    if (status) whereCondition.status = String(status);

    const students = await prisma.student.findMany({
      where: whereCondition,
      include: {
        authorizedPeople: true,
        attendances: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            status: true,
            shift: true,
            isMakeup: true,
            makeupShift: true,
            createdAt: true,
            recordedBy: { select: { fullName: true } },
          },
        },
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

/**
 * @openapi
 * /api/students/{id}/terms:
 *   post:
 *     summary: Registrar aceptación vinculante de Términos y Condiciones / Reglamento
 *     tags: [Alumnas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Aceptación registrada con éxito.
 */
router.post('/:id/terms', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version } = req.body || {};
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }
    const updated = await prisma.student.update({
      where: { id },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: typeof version === 'string' && version.trim() ? version.trim() : '2026.11',
      },
      select: {
        id: true,
        termsAcceptedAt: true,
        termsVersion: true,
      },
    });
    return res.json({ success: true, student: updated });
  } catch (error) {
    console.error('Error al registrar aceptación de términos:', error);
    return res.status(500).json({ error: 'Error al registrar la aceptación de términos.' });
  }
});

export default router;
