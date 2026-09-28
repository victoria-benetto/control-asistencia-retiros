import { Router, Request, Response } from 'express';
import { DataStore } from '../utils/store';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login Unificado por DNI
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni]
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "44122509"
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna tipo ADMIN o PARENT con sus datos.
 *       400:
 *         description: El DNI es requerido.
 *       404:
 *         description: Usuario o alumna no encontrado con el DNI ingresado.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { dni } = req.body;
    if (!dni || typeof dni !== 'string') {
      return res.status(400).json({ error: 'El DNI es requerido.' });
    }

    const cleanDni = dni.trim();

    // 1. Buscar si es Admin / Profesora / Super Admin Victoria (44122509)
    const adminUser = DataStore.getAdminByDni(cleanDni);
    if (adminUser) {
      return res.json({
        type: 'ADMIN',
        user: adminUser,
      });
    }

    // 2. Buscar si el DNI pertenece a una alumna
    let student = DataStore.getStudentByDni(cleanDni);

    // 3. Si no es el DNI directo de la alumna, buscar si es el DNI de una Persona Autorizada (Tutor/Padre)
    if (!student) {
      student = DataStore.getStudentByAuthorizedDni(cleanDni);
    }

    if (student) {
      const fullStudentData = DataStore.getParentStudentData(student.id);
      return res.json({
        type: 'PARENT',
        student: fullStudentData,
      });
    }

    return res.status(404).json({ error: 'No se encontró ningún usuario o alumna registrado con este DNI.' });
  } catch (error: any) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno al procesar el ingreso.' });
  }
});

export default router;
