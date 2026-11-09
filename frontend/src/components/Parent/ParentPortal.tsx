import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Student, AttendanceRecord, PaymentRecord, PaymentConcept } from '../../types';
import { getPayments, getPaymentConcepts, cancelMakeupClass, getStudentAttendances } from '../../services/api';
import { ParentHeader } from './ParentHeader';
import { BottomNav, ParentTab } from './BottomNav';
import { HomeTab } from './HomeTab';
import { PaymentsTab, MonthSummary } from './PaymentsTab';
import { AttendanceTab } from './AttendanceTab';
import { MakeupClassModal } from './MakeupClassModal';
import { ReceiptModal } from './ReceiptModal';
import { CancelMakeupModal, ToastNotification } from './CancelMakeupModal';

const SESSION_STORAGE_KEY = 'vulpiare_session_active';

interface ParentPortalProps {
  student: Student & {
    attendances: AttendanceRecord[];
  };
  onLogout: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ student, onLogout }) => {
  const [activeTab, setActiveTab] = useState<ParentTab>('home');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [concepts, setConcepts] = useState<PaymentConcept[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [makeupModalOpen, setMakeupModalOpen] = useState<boolean>(false);
  const [localAttendances, setLocalAttendances] = useState<AttendanceRecord[]>(student.attendances || []);
  const [recordToCancel, setRecordToCancel] = useState<AttendanceRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const updatePersistentSessionAttendances = useCallback((updatedAttendances: AttendanceRecord[]) => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'PARENT' && parsed.student) {
          parsed.student.attendances = updatedAttendances;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error('Error al sincronizar sesión persistente:', err);
    }
  }, []);

  useEffect(() => {
    setLocalAttendances(student.attendances || []);
  }, [student.attendances]);

  // Fecha actual formateada
  const todayFormatted = useMemo(() => {
    const formatted = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDayOfMonth = now.getDate();

  // Cargar pagos y conceptos
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingPayments(true);
        const [paymentData, conceptData, attendanceData] = await Promise.all([
          getPayments(undefined, student.id).catch(() => []),
          getPaymentConcepts().catch(() => []),
          getStudentAttendances(student.id).catch(() => null),
        ]);
        if (isMounted) {
          setPayments(paymentData || []);
          setConcepts(conceptData || []);
          if (Array.isArray(attendanceData)) {
            setLocalAttendances(attendanceData);
            updatePersistentSessionAttendances(attendanceData);
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del portal de alumna:', err);
      } finally {
        if (isMounted) setLoadingPayments(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [student.id]);

  // Formateador de fechas (YYYY-MM-DD)
  const formatDateNice = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Formateador de meses (YYYY-MM a "Noviembre 2026")
  const formatMonthNice = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    if (!y || !m) return monthStr;
    const dateObj = new Date(y, m - 1, 1);
    const formatted = dateObj.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Mes siguiente formateado para vencimiento
  const nextMonthFormatted = useMemo(() => {
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const formatted = nextDate.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [now]);

  // Asistencias ordenadas descendentemente
  const sortedAttendances = useMemo(() => {
    return (localAttendances || [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [localAttendances]);

  // Registro de hoy o más reciente
  const todayRecord = useMemo(() => {
    return sortedAttendances.find((a) => a.date === todayDateStr);
  }, [sortedAttendances, todayDateStr]);

  const pastOrTodayAttendances = useMemo(() => {
    return sortedAttendances.filter((a) => a.date <= todayDateStr);
  }, [sortedAttendances, todayDateStr]);

  const mostRecentRecord = useMemo(() => {
    return todayRecord || (pastOrTodayAttendances.length > 0 ? pastOrTodayAttendances[0] : null);
  }, [todayRecord, pastOrTodayAttendances]);

  const isTodayClass = mostRecentRecord && mostRecentRecord.date === todayDateStr;

  // Cálculos financieros
  const defaultMonthlyFee = useMemo(() => {
    const activeConcept = concepts.find((c) => c.isActive && c.name.toLowerCase().includes('cuota'));
    return activeConcept?.amount || concepts[0]?.amount || 22000;
  }, [concepts]);

  const currentMonthPayments = useMemo(() => {
    return payments.filter((p) => p.month === currentMonthStr);
  }, [payments, currentMonthStr]);

  const currentMonthPaid = useMemo(() => {
    return currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [currentMonthPayments]);

  const currentExpectedFee = useMemo(() => {
    if (currentMonthPayments.length > 0 && currentMonthPayments[0].expectedAmount) {
      return currentMonthPayments[0].expectedAmount;
    }
    return defaultMonthlyFee;
  }, [currentMonthPayments, defaultMonthlyFee]);

  const currentRemainingDebt = Math.max(0, currentExpectedFee - currentMonthPaid);

  const currentMonthSurplusChild = useMemo(() => {
    const parentIds = currentMonthPayments.map((p) => p.id);
    return payments.find(
      (p) =>
        p.month > currentMonthStr &&
        parentIds.some(
          (pid) =>
            p.notes?.includes(`[ORIGIN:${pid}]`) || p.operationNumber === `SURPLUS:${pid}`
        )
    );
  }, [currentMonthPayments, payments, currentMonthStr]);

  const currentStatusInfo = useMemo(() => {
    if (currentMonthPaid >= currentExpectedFee) {
      return {
        status: 'UP_TO_DATE' as const,
        label: 'Cuota al día',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle2,
      };
    }
    if (currentMonthPaid > 0) {
      return {
        status: 'PARTIAL' as const,
        label: 'Pago Parcial',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
      };
    }
    if (currentDayOfMonth <= 10) {
      return {
        status: 'PENDING' as const,
        label: 'Pendiente',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
      };
    }
    return {
      status: 'OVERDUE' as const,
      label: 'Vencida (+10% recargo)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: AlertCircle,
    };
  }, [currentMonthPaid, currentExpectedFee, currentDayOfMonth]);

  const currentMonthConcept = currentMonthPayments[0]?.concept || 'Acrobacia y Danza aérea';
  const currentMonthReceipt = currentMonthPayments.find((p) => p.receiptUrl)?.receiptUrl || null;
  const latestCurrentPayment = currentMonthPayments[0] || null;

  // Historial de cuotas agrupadas por mes
  const monthSummaries = useMemo<MonthSummary[]>(() => {
    const monthsSet = new Set<string>();
    payments.forEach((p) => {
      if (p.month) monthsSet.add(p.month);
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

    return sortedMonths.map((m) => {
      const monthPayments = payments.filter((p) => p.month === m);
      const totalPaid = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const expectedFee = monthPayments[0]?.expectedAmount || defaultMonthlyFee;
      const isCurrent = m === currentMonthStr;
      const isFuture = m > currentMonthStr;

      const isSurplusFromPrevious = monthPayments.some(
        (p) =>
          p.notes?.includes('[ORIGIN:') ||
          p.notes?.toLowerCase().includes('excedente acreditado')
      );

      const parentIds = monthPayments.map((p) => p.id);
      const generatedChild = payments.find(
        (p) =>
          p.month > m &&
          parentIds.some(
            (pid) =>
              p.notes?.includes(`[ORIGIN:${pid}]`) || p.operationNumber === `SURPLUS:${pid}`
          )
      );

      const receiptUrls = monthPayments
        .map((p) => p.receiptUrl)
        .filter(Boolean) as string[];

      const methods = Array.from(new Set(monthPayments.map((p) => p.paymentMethod)));
      const methodLabel =
        methods.length > 1
          ? 'Transferencia y Efectivo'
          : methods[0] === 'TRANSFER'
          ? 'Transferencia Bancaria'
          : 'Efectivo';

      const latestPayment = monthPayments[0];

      return {
        month: m,
        totalPaid,
        expectedFee,
        isCurrent,
        isFuture,
        isSurplusFromPrevious,
        generatedChild,
        payments: monthPayments,
        latestPayment,
        receiptUrls,
        methodLabel,
      };
    });
  }, [payments, currentMonthStr, defaultMonthlyFee]);

  const monthlyMetrics = useMemo(() => {
    // 🔒 REGLA: Las ausencias rigen a partir de noviembre y se renuevan mes a mes (no acumulativas)
    const eligibleAbsencesThisMonth = localAttendances.filter((a) =>
      a.status === 'ABSENT' && !a.isMakeup && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
    const completedMakeupsThisMonth = localAttendances.filter((a) =>
      a.isMakeup && a.status === 'PRESENT' && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
    const pendingMakeup = localAttendances.find((a) => a.isMakeup && a.status === 'PENDING');
    const remainingToRecover = Math.max(0, eligibleAbsencesThisMonth.length - completedMakeupsThisMonth.length - (pendingMakeup ? 1 : 0));
    return {
      toRecoverClasses: remainingToRecover,
      hasPendingMakeup: Boolean(pendingMakeup),
      pendingMakeupRecord: pendingMakeup || null,
    };
  }, [localAttendances, currentMonthStr]);

  const handleMakeupSuccess = (newRecord: AttendanceRecord) => {
    setLocalAttendances((prev) => {
      const updated = [newRecord, ...prev.filter((a) => a.id !== newRecord.id)];
      updatePersistentSessionAttendances(updated);
      return updated;
    });
    setToast({
      message: '¡Clase de recuperación agendada exitosamente!',
      type: 'success',
    });
    getStudentAttendances(student.id).then((fresh) => {
      if (Array.isArray(fresh)) {
        setLocalAttendances(fresh);
        updatePersistentSessionAttendances(fresh);
      }
    }).catch(() => {});
  };

  const handleCancelMakeup = (recordId: string) => {
    const target = localAttendances.find((a) => a.id === recordId) || ({ id: recordId } as AttendanceRecord);
    setRecordToCancel(target);
  };

  const executeCancelMakeup = async () => {
    if (!recordToCancel) return;
    setIsCancelling(true);
    try {
      await cancelMakeupClass(recordToCancel.id);
      const updated = localAttendances.filter((a) => a.id !== recordToCancel.id);
      setLocalAttendances(updated);
      updatePersistentSessionAttendances(updated);
      setRecordToCancel(null);
      setToast({
        message: 'Clase de recuperación cancelada exitosamente. Tu cupo ya está disponible nuevamente.',
        type: 'success',
      });
      getStudentAttendances(student.id).then((fresh) => {
        if (Array.isArray(fresh)) {
          setLocalAttendances(fresh);
          updatePersistentSessionAttendances(fresh);
        }
      }).catch(() => {});
    } catch (err: any) {
      setToast({
        message: err.message || 'Error al cancelar la clase de recuperación.',
        type: 'error',
      });
      setRecordToCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fdf7ff] text-slate-900 antialiased pb-28">
      {/* Header fijo superior modular */}
      <ParentHeader todayFormatted={todayFormatted} onLogout={onLogout} />

      {/* Contenedor Principal con las pestañas */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5">
        {activeTab === 'home' && (
          <HomeTab
            student={{ ...student, attendances: localAttendances }}
            mostRecentRecord={mostRecentRecord}
            isTodayClass={Boolean(isTodayClass)}
            formatDateNice={formatDateNice}
            onSelectTab={setActiveTab}
            onOpenMakeupModal={() => setMakeupModalOpen(true)}
            onCancelMakeup={handleCancelMakeup}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            student={student}
            payments={payments}
            monthSummaries={monthSummaries}
            currentStatusInfo={currentStatusInfo}
            currentExpectedFee={currentExpectedFee}
            currentMonthPaid={currentMonthPaid}
            currentRemainingDebt={currentRemainingDebt}
            currentMonthSurplusChild={currentMonthSurplusChild}
            currentMonthConcept={currentMonthConcept}
            currentMonthReceipt={currentMonthReceipt}
            latestCurrentPayment={latestCurrentPayment}
            nextMonthFormatted={nextMonthFormatted}
            onViewReceipt={setViewingReceiptUrl}
            formatMonthNice={formatMonthNice}
            formatDateNice={formatDateNice}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab
            student={student}
            sortedAttendances={sortedAttendances}
            formatDateNice={formatDateNice}
            onOpenMakeupModal={() => setMakeupModalOpen(true)}
            onCancelMakeup={handleCancelMakeup}
            toRecoverClasses={monthlyMetrics.toRecoverClasses}
            hasPendingMakeup={monthlyMetrics.hasPendingMakeup}
          />
        )}
      </main>

      {/* Barra de navegación inferior */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Modal de Recuperatorio */}
      <MakeupClassModal
        isOpen={makeupModalOpen}
        onClose={() => setMakeupModalOpen(false)}
        student={{ ...student, attendances: localAttendances }}
        onSuccess={handleMakeupSuccess}
      />

      {/* Modal de Comprobante */}
      <ReceiptModal
        receiptUrl={viewingReceiptUrl}
        onClose={() => setViewingReceiptUrl(null)}
      />

      {/* Modal personalizado de Cancelación */}
      <CancelMakeupModal
        isOpen={Boolean(recordToCancel)}
        onClose={() => setRecordToCancel(null)}
        onConfirm={executeCancelMakeup}
        shiftName={recordToCancel?.makeupShift || recordToCancel?.shift}
        dateStr={recordToCancel?.date ? formatDateNice(recordToCancel.date) : undefined}
        isCancelling={isCancelling}
      />

      {/* Notificación Toast flotante personalizada */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
