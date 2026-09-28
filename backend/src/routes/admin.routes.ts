import { Router, Request, Response } from 'express';
import { DataStore } from '../utils/store';

const router = Router();

const requireSuperAdmin = async (req: Request, res: Response, next: Function) => {
  const requesterDni = req.headers['x-user-dni'] as string;
  if (!requesterDni) {
    return res.status(401).json({ error: 'Acceso no autorizado. Falta DNI del usuario.' });
  }
  const admin = DataStore.getAdminByDni(requesterDni);
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
 */
router.get('/teachers', requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const teachers = DataStore.getAllAdmins();
    return res.json(teachers);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar profesores.' });
  }
});

/**
 * @openapi
 * /api/admin/teachers:
 *   post:
 *     summary: Crear nuevo profesor (Solo Victoria)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
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

    const existing = DataStore.getAdminByDni(dni);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este DNI.' });
    }

    const newTeacher = DataStore.createAdmin({ dni, fullName, permissions });
    return res.status(201).json(newTeacher);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear profesor.' });
  }
});

/**
 * @openapi
 * /api/admin/teachers/{id}:
 *   put:
 *     summary: Actualizar profesor (Solo Victoria)
 *     tags: [Administración]
 *     security:
 *       - UserDniHeader: []
 *     responses:
 *       200:
 *         description: Profesor actualizado.
 */
router.put('/teachers/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, permissions } = req.body;

    const updated = DataStore.updateAdmin(id, { fullName, permissions });
    if (!updated) {
      return res.status(404).json({ error: 'Profesor no encontrado.' });
    }

    return res.json(updated);
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
 *     responses:
 *       200:
 *         description: Profesor eliminado.
 */
router.delete('/teachers/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = DataStore.deleteAdmin(id);
    if (!success) {
      return res.status(400).json({ error: 'No se puede eliminar la cuenta de Victoria.' });
    }
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

    const existing = DataStore.getStudentByDni(dni);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una alumna registrada con este DNI.' });
    }

    const student = DataStore.createStudent({ firstName, lastName, dni, shift, notes, authorizedPeople });
    return res.status(201).json(student);
  } catch (error) {
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
 *     responses:
 *       200:
 *         description: Alumna actualizada.
 */
router.put('/students/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, shift, notes, authorizedPeople } = req.body;

    const updated = DataStore.updateStudent(id, { firstName, lastName, shift, notes, authorizedPeople });
    if (!updated) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }

    return res.json(updated);
  } catch (error) {
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
 *     responses:
 *       200:
 *         description: Alumna eliminada.
 */
router.delete('/students/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = DataStore.deleteStudent(id);
    if (!success) {
      return res.status(404).json({ error: 'Alumna no encontrada.' });
    }
    return res.json({ message: 'Alumna dada de baja exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar la alumna.' });
  }
});

export default router;
