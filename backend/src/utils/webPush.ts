import webpush from 'web-push';
import { prisma } from './prisma';

let isVapidConfigured = false;

export function configureVapid(): boolean {
  if (isVapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@vulpiare.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️ Claves VAPID no configuradas en el entorno. Las notificaciones Push estarán inactivas.');
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
    return true;
  } catch (err) {
    console.error('❌ Error al configurar VAPID en web-push:', err);
    return false;
  }
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  badge?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Envía una notificación Web Push a todas las suscripciones activas de una alumna.
 * Si un endpoint responde con 410 (Gone) o 404 (Not Found), se remueve automáticamente de la base de datos.
 */
export async function sendPushToStudent(studentId: string, payload: PushPayload): Promise<{
  total: number;
  sent: number;
  failed: number;
  pruned: number;
}> {
  if (!configureVapid()) {
    return { total: 0, sent: 0, failed: 0, pruned: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { studentId },
  });

  if (!subscriptions || subscriptions.length === 0) {
    return { total: 0, sent: 0, failed: 0, pruned: 0 };
  }

  let sent = 0;
  let failed = 0;
  let pruned = 0;

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/vulpiare_logo.png',
    badge: payload.badge || '/vulpiare_logo.png',
    url: payload.url || '/',
    tag: payload.tag || 'vulpiare-notification',
    data: payload.data || {},
  });

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, payloadString);
      sent++;
    } catch (err: any) {
      failed++;
      const statusCode = err?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Suscripción caducada o desinstalada: limpiar
        try {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
          pruned++;
        } catch (delErr) {
          console.warn('No se pudo eliminar suscripción expirada:', delErr);
        }
      } else {
        console.error(`Error al enviar push a sub ${sub.id}:`, err?.message || err);
      }
    }
  }

  return {
    total: subscriptions.length,
    sent,
    failed,
    pruned,
  };
}
