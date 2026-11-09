import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPaymentReminderInfo,
  checkAndTriggerPaymentNotification,
  requestPaymentNotificationPermission,
} from '../utils/paymentNotifications';

describe('Payment Reminder Notifications (Día 9 y 10 - Recargo 10% a partir del 11)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('devuelve aviso de "hasta mañana" para el día 9 si la cuota no está paga', () => {
    const reminder = getPaymentReminderInfo(9, false);
    expect(reminder).not.toBeNull();
    expect(reminder?.day).toBe(9);
    expect(reminder?.urgency).toBe('tomorrow');
    expect(reminder?.body).toContain('hasta mañana');
    expect(reminder?.body).toContain('10% de recargo');
    expect(reminder?.inAppBadge).toContain('Vence mañana');
  });

  it('devuelve aviso de "hasta hoy" para el día 10 si la cuota no está paga', () => {
    const reminder = getPaymentReminderInfo(10, false);
    expect(reminder).not.toBeNull();
    expect(reminder?.day).toBe(10);
    expect(reminder?.urgency).toBe('today');
    expect(reminder?.body).toContain('hasta las 23:59 hs');
    expect(reminder?.body).toContain('10% de recargo');
    expect(reminder?.inAppBadge).toContain('Vence hoy');
  });

  it('no devuelve recordatorio si la cuota ya está paga (isPaid: true)', () => {
    expect(getPaymentReminderInfo(9, true)).toBeNull();
    expect(getPaymentReminderInfo(10, true)).toBeNull();
  });

  it('no devuelve recordatorio fuera de los días 9 y 10 (ej. día 8 o día 11)', () => {
    expect(getPaymentReminderInfo(8, false)).toBeNull();
    expect(getPaymentReminderInfo(11, false)).toBeNull();
    expect(getPaymentReminderInfo(1, false)).toBeNull();
  });

  it('emite notificación web si los permisos están concedidos y evita duplicados en el mismo día', () => {
    const notificationMock = vi.fn();
    (globalThis as any).Notification = notificationMock;
    (globalThis.Notification as any).permission = 'granted';

    const emitted1 = checkAndTriggerPaymentNotification('student-1', 9, false, '2026-11-09');
    expect(emitted1).toBe(true);
    expect(notificationMock).toHaveBeenCalledTimes(1);

    // Segunda invocación en el mismo día no debe duplicar la notificación
    const emitted2 = checkAndTriggerPaymentNotification('student-1', 9, false, '2026-11-09');
    expect(emitted2).toBe(false);
    expect(notificationMock).toHaveBeenCalledTimes(1);
  });

  it('solicita permisos al usuario con requestPaymentNotificationPermission', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    const notificationMock = vi.fn();
    (globalThis as any).Notification = notificationMock;
    (globalThis.Notification as any).permission = 'granted';
    (globalThis.Notification as any).requestPermission = requestPermissionMock;

    const result = await requestPaymentNotificationPermission('student-1', 10, false, '2026-11-10');
    expect(result).toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    expect(notificationMock).toHaveBeenCalledTimes(1);
  });
});
