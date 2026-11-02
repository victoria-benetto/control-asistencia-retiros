/**
 * Servicio de métricas y telemetría analítica (Soporte nativo y PostHog)
 */

declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties?: Record<string, any>) => void;
      identify?: (userId: string, userProperties?: Record<string, any>) => void;
    };
  }
}

export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  try {
    const payload = {
      ...properties,
      timestamp: new Date().toISOString(),
    };

    // Si PostHog está inicializado en window, enviar evento
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, payload);
    }

    // Registro seguro local para auditoría y desarrollo
    if (process.env.NODE_ENV !== 'production') {
      // console.debug(`[Analytics:PostHog] ${eventName}:`, payload);
    }
  } catch (err) {
    console.warn(`[Analytics Error] Fallo al capturar evento ${eventName}:`, err);
  }
}

export function trackFinancialReportViewed(data: {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  paidCount: number;
  pendingCount: number;
}) {
  trackEvent('financial_report_viewed', data);
}

export function trackExpenseCreated(data: {
  title: string;
  amount: number;
  category?: string | null;
  month: string;
  isRecurring?: boolean;
}) {
  trackEvent('expense_created', data);
}

export function trackExpenseReplicated(data: {
  expenseId: string;
  title: string;
  amount: number;
  targetMonth: string;
}) {
  trackEvent('expense_replicated', data);
}

export function trackReportExported(data: {
  format: 'excel' | 'pdf';
  period: string;
  totalRevenue: number;
}) {
  trackEvent('financial_report_exported', data);
}
