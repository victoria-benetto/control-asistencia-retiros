import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPaymentReminderInfo,
  checkAndTriggerPaymentNotification,
  requestPaymentNotificationPermission,
} from '../utils/paymentNotifications';

describe('Payment Reminder Notifications (Días 9, 10, 15, 20 y 25)', () => {
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

  it('devuelve recordatorio de cuota vencida con recargo para el día 15 si no ha pagado', () => {
    const reminder = getPaymentReminderInfo(15, false);
    expect(reminder).not.toBeNull();
    expect(reminder?.day).toBe(15);
    expect(reminder?.urgency).toBe('overdue');
    expect(reminder?.body).toContain('vencida con el 10% de recargo');
    expect(reminder?.inAppBadge).toContain('Día 15');
  });

  it('devuelve segundo aviso de cuota vencida para el día 20 si no ha pagado', () => {
    const reminder = getPaymentReminderInfo(20, false);
    expect(reminder).not.toBeNull();
    expect(reminder?.day).toBe(20);
    expect(reminder?.urgency).toBe('overdue');
    expect(reminder?.title).toContain('Segundo Aviso');
    expect(reminder?.inAppBadge).toContain('Día 20');
  });

  it('devuelve último aviso del mes para el día 25 si no ha pagado', () => {
    const reminder = getPaymentReminderInfo(25, false);
    expect(reminder).not.toBeNull();
    expect(reminder?.day).toBe(25);
    expect(reminder?.urgency).toBe('overdue');
    expect(reminder?.title).toContain('Último Aviso');
    expect(reminder?.inAppBadge).toContain('Día 25');
  });

  it('no devuelve recordatorio si la cuota ya está paga (isPaid: true) en ninguno de los días', () => {
    expect(getPaymentReminderInfo(9, true)).toBeNull();
    expect(getPaymentReminderInfo(10, true)).toBeNull();
    expect(getPaymentReminderInfo(15, true)).toBeNull();
    expect(getPaymentReminderInfo(20, true)).toBeNull();
    expect(getPaymentReminderInfo(25, true)).toBeNull();
  });

  it('no devuelve recordatorio en días no estipulados (ej. día 8, 11, 14, 16, 21, 26)', () => {
    expect(getPaymentReminderInfo(8, false)).toBeNull();
    expect(getPaymentReminderInfo(11, false)).toBeNull();
    expect(getPaymentReminderInfo(14, false)).toBeNull();
    expect(getPaymentReminderInfo(16, false)).toBeNull();
    expect(getPaymentReminderInfo(21, false)).toBeNull();
    expect(getPaymentReminderInfo(26, false)).toBeNull();
    expect(getPaymentReminderInfo(1, false)).toBeNull();
  });

  it('emite notificación web si los permisos están concedidos y evita duplicados en el mismo día', () => {
    const notificationMock = vi.fn();
    (globalThis as any).Notification = notificationMock;
    (globalThis.Notification as any).permission = 'granted';

    const emitted1 = checkAndTriggerPaymentNotification('student-1', 15, false, '2026-11-15');
    expect(emitted1).toBe(true);
    expect(notificationMock).toHaveBeenCalledTimes(1);

    // Segunda invocación en el mismo día no debe duplicar la notificación
    const emitted2 = checkAndTriggerPaymentNotification('student-1', 15, false, '2026-11-15');
    expect(emitted2).toBe(false);
    expect(notificationMock).toHaveBeenCalledTimes(1);
  });

  it('solicita permisos al usuario con requestPaymentNotificationPermission', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    const notificationMock = vi.fn();
    (globalThis as any).Notification = notificationMock;
    (globalThis.Notification as any).permission = 'granted';
    (globalThis.Notification as any).requestPermission = requestPermissionMock;

    const result = await requestPaymentNotificationPermission('student-1', 20, false, '2026-11-20');
    expect(result).toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    expect(notificationMock).toHaveBeenCalledTimes(1);
  });
});
