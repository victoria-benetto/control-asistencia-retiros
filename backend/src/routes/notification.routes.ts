import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getVapidPublicKey } from '../utils/webPush';
import { runPaymentRemindersCron } from '../utils/paymentReminderCron';

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

/**
 * Valida la autorización para ejecutar el Cron de recordatorios.
 * Soporta Header Authorization: Bearer <CRON_SECRET> o Header x-cron-secret.
 */
function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Si no hay secreto configurado (entorno local dev), se permite

  const authHeader = req.headers.authorization;
  const xSecret = req.headers['x-cron-secret'];

  if (authHeader && authHeader === `Bearer ${secret}`) return true;
  if (xSecret && xSecret === secret) return true;

  return false;
}

/**
 * Endpoint de ejecución programada (Vercel Cron / Scheduler).
 * Se ejecuta los días 9, 10, 15, 20 y 25 a las 10:00 AM hora argentina.
 * Soporta GET (estándar de Vercel Cron) y POST (invocaciones manuales / API).
 */
const handleCronReminders = async (req: Request, res: Response) => {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'No autorizado para ejecutar el cron de recordatorios' });
  }

  try {
    const rawDay = req.query.dayOverride ?? req.body?.dayOverride;
    const dayOverride = rawDay !== undefined ? parseInt(String(rawDay), 10) : undefined;

    const monthOverride = (req.query.monthOverride as string) || req.body?.monthOverride;
    const force = req.query.force === 'true' || req.body?.force === true;

    const result = await runPaymentRemindersCron({
      dayOverride,
      monthOverride,
      force,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error al ejecutar cron de recordatorios de pago:', err);
    return res.status(500).json({
      error: 'Error interno al despachar recordatorios de pago',
      details: err?.message || String(err),
    });
  }
};

router.get('/cron/send-payment-reminders', handleCronReminders);
router.post('/cron/send-payment-reminders', handleCronReminders);

export default router;
