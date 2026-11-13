import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getVapidPublicKey } from '../utils/webPush';

const router = Router();

/**
 * @swagger
 * /api/notifications/vapid-public-key:
 *   get:
 *     summary: Obtiene la clave pública VAPID para suscripción Web Push
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Clave pública VAPID
 */
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      error: 'Servicio de notificaciones Push no configurado (falta VAPID_PUBLIC_KEY)',
    });
  }
  return res.json({ publicKey });
});

/**
 * @swagger
 * /api/notifications/subscribe:
 *   post:
 *     summary: Registra o actualiza la suscripción Web Push de un dispositivo de una alumna
 *     tags: [Notifications]
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { studentId, subscription, userAgent } = req.body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'studentId es obligatorio' });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Objeto de suscripción Web Push inválido o incompleto' });
    }

    // Verificar existencia de la alumna
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Alumna no encontrada' });
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;

    // Upsert para actualizar si el mismo endpoint ya estaba registrado
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        studentId,
        p256dh,
        auth,
        userAgent: userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        studentId,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
      },
    });

    return res.json({
      success: true,
      message: 'Suscripción Web Push registrada con éxito',
      id: saved.id,
    });
  } catch (err: any) {
    console.error('Error al registrar suscripción Web Push:', err);
    return res.status(500).json({
      error: 'Error interno al registrar la suscripción',
      details: err?.message || String(err),
    });
  }
});

/**
 * @swagger
 * /api/notifications/unsubscribe:
 *   post:
 *     summary: Elimina una suscripción Web Push por su endpoint
 *     tags: [Notifications]
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'endpoint es obligatorio' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return res.json({
      success: true,
      message: 'Suscripción Web Push eliminada con éxito',
    });
  } catch (err: any) {
    console.error('Error al eliminar suscripción Web Push:', err);
    return res.status(500).json({
      error: 'Error interno al eliminar la suscripción',
      details: err?.message || String(err),
    });
  }
});

export default router;
