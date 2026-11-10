export interface PaymentReminderInfo {
  day: number;
  urgency: 'tomorrow' | 'today' | 'overdue';
  title: string;
  body: string;
  inAppBadge: string;
  inAppMessage: string;
}

/**
 * Determina si corresponde emitir recordatorio de cuota:
 * - Días 9 y 10: aviso previo al vencimiento (antes del recargo del 10% del día 11).
 * - Días 15, 20 y 25: avisos de cuota vencida e impaga si la alumna aún no abonó.
 */
export function getPaymentReminderInfo(currentDay: number, isPaid: boolean): PaymentReminderInfo | null {
  if (isPaid) return null;

  if (currentDay === 9) {
    return {
      day: 9,
      urgency: 'tomorrow',
      title: '💜 Recordatorio de Cuota - Vulpiare',
      body: 'Recordá que tenés hasta mañana para pagar tu cuota con el precio base. A partir del día 11 se aplicará un 10% de recargo.',
      inAppBadge: 'Vence mañana (10)',
      inAppMessage: 'Tenés hasta mañana (día 10 a las 23:59 hs) para abonar tu cuota al precio base. A partir del día 11 se aplicará un recargo del 10%.',
    };
  }

  if (currentDay === 10) {
    return {
      day: 10,
      urgency: 'today',
      title: '🚨 Vencimiento de Cuota - Vulpiare',
      body: '¡Hoy es el último día! Tenés hasta las 23:59 hs para pagar tu cuota con el precio base. A partir de mañana se aplicará un 10% de recargo.',
      inAppBadge: 'Vence hoy (23:59 hs)',
      inAppMessage: '¡Tenés hasta hoy a las 23:59 hs para abonar tu cuota al precio base! A partir de mañana (día 11) se aplicará un recargo del 10%.',
    };
  }

  if (currentDay === 15) {
    return {
      day: 15,
      urgency: 'overdue',
      title: '⚠️ Aviso de Cuota Vencida - Vulpiare',
      body: 'Tu cuota mensual se encuentra vencida con el 10% de recargo. Por favor regularizá tu pago a la brevedad.',
      inAppBadge: 'Cuota adeudada',
      inAppMessage: 'Recordá que tu cuota de este mes está vencida con recargo administrativo. Por favor regularizá tu pago a la brevedad.',
    };
  }

  if (currentDay === 20) {
    return {
      day: 20,
      urgency: 'overdue',
      title: '📢 Segundo Aviso: Cuota Vencida - Vulpiare',
      body: 'Recordá que tenés tu cuota mensual pendiente de pago. Por favor regularizá tu situación para mantener tu cuenta al día.',
      inAppBadge: 'Cuota adeudada',
      inAppMessage: 'Segundo recordatorio: tu cuota aún figura impaga. Te pedimos regularizar tu saldo para mantener tu cuenta al día.',
    };
  }

  if (currentDay === 25) {
    return {
      day: 25,
      urgency: 'overdue',
      title: '🚨 Último Aviso de Cuota - Vulpiare',
      body: 'Último aviso del mes: tu cuota continúa pendiente. Por favor regularizá tu pago antes del cierre del período.',
      inAppBadge: 'Cuota adeudada',
      inAppMessage: 'Último aviso del mes: tu cuota aún continúa pendiente. Por favor regularizá tu situación antes del cierre del período.',
    };
  }

  return null;
}

/**
 * Emite la notificación nativa web en el dispositivo de la alumna si otorgó permisos
 * y no fue notificada previamente en el día de hoy.
 */
export function checkAndTriggerPaymentNotification(
  studentId: string,
  currentDay: number,
  isPaid: boolean,
  todayISO: string
): boolean {
  const reminder = getPaymentReminderInfo(currentDay, isPaid);
  if (!reminder) return false;

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const storageKey = `vulpiare_fee_notif_${studentId}_${todayISO}`;
  try {
    if (localStorage.getItem(storageKey)) {
      return false;
    }

    new Notification(reminder.title, {
      body: reminder.body,
      icon: '/vulpiare_logo.png',
      badge: '/vulpiare_logo.png',
    });

    localStorage.setItem(storageKey, 'true');
    return true;
  } catch (err) {
    console.error('Error al emitir notificación de vencimiento de cuota:', err);
    return false;
  }
}

/**
 * Solicita permisos de notificación al navegador y dispara la notificación del día
 * si fueron concedidos.
 */
export async function requestPaymentNotificationPermission(
  studentId: string,
  currentDay: number,
  isPaid: boolean,
  todayISO: string
): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      checkAndTriggerPaymentNotification(studentId, currentDay, isPaid, todayISO);
    }
    return permission;
  } catch (err) {
    console.error('Error al solicitar permiso de notificaciones:', err);
    return 'denied';
  }
}
