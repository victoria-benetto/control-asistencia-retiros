import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const requireSuperAdmin = async (req: Request, res: Response, next: Function) => {
  const requesterDni = req.headers['x-user-dni'] as string;
  if (!requesterDni) {
    return res.status(401).json({ error: 'Acceso no autorizado. Falta DNI del usuario.' });
  }
  const admin = await prisma.adminUser.findUnique({ where: { dni: requesterDni } });
  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Solamente Victoria puede realizar esta acción.' });
  }
  next();
};

/**
 * @openapi
 * /api/admin/teachers:
 *   get:
 *     summary: Listar todos los profesores (Solo Victoria / Super Admin)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
 *     responses:
 *       200:
 *         description: Lista de profesores registrados.
 *       403:
 *         description: Acceso denegado.
 */
router.get('/teachers', requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const teachers = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const formatted = teachers.map(t => ({
      ...t,
      permissions: JSON.parse(t.permissions || '{}'),
    }));
    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar profesores.' });
  }
});

/**
 * @openapi
 * /api/admin/teachers:
 *   post:
 *     summary: Crear nuevo profesor (Solo Victoria / Super Admin)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni, fullName]
 *             properties:
 *               dni:
 *                 type: string
 *               fullName:
 *                 type: string
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Profesor creado exitosamente.
 */
router.post('/teachers', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { dni, fullName, permissions } = req.body;
    if (!dni || !fullName) {
      return res.status(400).json({ error: 'DNI y Nombre completo son requeridos.' });
    }

    const existing = await prisma.adminUser.findUnique({ where: { dni: dni.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este DNI.' });
    }

    const newTeacher = await prisma.adminUser.create({
      data: {
        dni: dni.trim(),
        fullName: fullName.trim(),
        role: 'ADMIN',
        permissions: JSON.stringify(permissions || { canAttendance: true, canPickups: true, canHistory: true }),
      },
    });

    return res.status(201).json({
      ...newTeacher,
      permissions: JSON.parse(newTeacher.permissions),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear profesor.' });
  }
});

/**
 * @openapi
 * /api/admin/teachers/{id}:
 *   put:
 *     summary: Actualizar profesor y permisos (Solo Victoria)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profesor actualizado.
 */
router.put('/teachers/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, permissions } = req.body;

    const teacher = await prisma.adminUser.findUnique({ where: { id } });
    if (!teacher) {
      return res.status(404).json({ error: 'Profesor no encontrado.' });
    }

    if (teacher.dni === '44122509') {
      return res.status(400).json({ error: 'No se pueden modificar los permisos del Super Admin principal.' });
    }

    const updated = await prisma.adminUser.update({
      where: { id },
      data: {
        fullName: fullName ? fullName.trim() : teacher.fullName,
        permissions: permissions ? JSON.stringify(permissions) : teacher.permissions,
      },
    });

    return res.json({
      ...updated,
      permissions: JSON.parse(updated.permissions),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar profesor.' });
  }
});

/**
 * @openapi
 * /api/admin/teachers/{id}:
 *   delete:
 *     summary: Eliminar profesor (Solo Victoria)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profesor eliminado.
 */
router.delete('/teachers/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await prisma.adminUser.findUnique({ where: { id } });
    if (!teacher) {
      return res.status(404).json({ error: 'Profesor no encontrado.' });
    }
    if (teacher.dni === '44122509') {
      return res.status(400).json({ error: 'No se puede eliminar al Super Admin principal.' });
    }

    await prisma.adminUser.delete({ where: { id } });
    return res.json({ message: 'Profesor eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar profesor.' });
  }
});

/**
 * @openapi
 * /api/admin/students:
 *   post:
 *     summary: Crear nueva alumna (Solo Victoria)
 *     tags: [Alumnas ABM]
 *     security:
 *       - UserDniHeader: []
 *     responses:
 *       201:
 *         description: Alumna creada exitosamente.
 */
router.post('/students', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, dni, shift, notes, authorizedPeople } = req.body;
    if (!firstName || !lastName || !dni || !shift) {
      return res.status(400).json({ error: 'Nombre, Apellido, DNI y Turno son requeridos.' });
    }

    const existing = await prisma.student.findUnique({ where: { dni: dni.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una alumna registrada con este DNI.' });
    }

    const student = await prisma.student.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        shift: shift.trim(),
        notes: notes ? notes.trim() : '',
        authorizedPeople: {
          create: Array.isArray(authorizedPeople)
            ? authorizedPeople.map((p: any) => ({
                fullName: p.fullName.trim(),
                dni: p.dni.trim(),
                relationship: p.relationship.trim(),
                phone: p.phone ? p.phone.trim() : '',
              }))
            : [],
        },
      },
      include: { authorizedPeople: true },
    });

    return res.status(201).json(student);
  } catch (error) {
    console.error('Error al crear alumna:', error);
    return res.status(500).json({ error: 'Error al crear la alumna.' });
  }
});

/**
 * @openapi
 * /api/admin/students/{id}:
 *   put:
 *     summary: Actualizar alumna y autorizados (Solo Victoria)
 *     tags: [Alumnas ABM]
 *     security:
 *       - UserDniHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alumna actualizada.
 */
router.put('/students/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, shift, notes, authorizedPeople } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }

    await prisma.student.update({
      where: { id },
      data: {
        firstName: firstName ? firstName.trim() : student.firstName,
        lastName: lastName ? lastName.trim() : student.lastName,
        shift: shift ? shift.trim() : student.shift,
        notes: notes !== undefined ? notes.trim() : student.notes,
      },
    });

    if (Array.isArray(authorizedPeople)) {
      await prisma.authorizedPerson.deleteMany({ where: { studentId: id } });
      await prisma.authorizedPerson.createMany({
        data: authorizedPeople.map((p: any) => ({
          studentId: id,
          fullName: p.fullName.trim(),
          dni: p.dni.trim(),
          relationship: p.relationship.trim(),
          phone: p.phone ? p.phone.trim() : '',
        })),
      });
    }

    const updatedStudent = await prisma.student.findUnique({
      where: { id },
      include: { authorizedPeople: true },
    });

    return res.json(updatedStudent);
  } catch (error) {
    console.error('Error al actualizar alumna:', error);
    return res.status(500).json({ error: 'Error al actualizar la alumna.' });
  }
});

/**
 * @openapi
 * /api/admin/students/{id}:
 *   delete:
 *     summary: Dar de baja alumna (Solo Victoria)
 *     tags: [Alumnas ABM]
 *     security:
 *       - UserDniHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alumna eliminada.
 */
router.delete('/students/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }

    await prisma.student.delete({ where: { id } });
    return res.json({ message: 'Alumna dada de baja exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar la alumna.' });
  }
});

export default router;
