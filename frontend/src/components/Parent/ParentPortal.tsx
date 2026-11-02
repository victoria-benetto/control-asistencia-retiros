import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  LogOut,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  AlertCircle,
  CalendarClock,
  Info,
  X,
  CreditCard,
  Banknote,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Student, AttendanceRecord, PaymentRecord, PaymentConcept } from '../../types';
import { getPayments, getPaymentConcepts } from '../../services/api';

interface ParentPortalProps {
  student: Student & {
    attendances: AttendanceRecord[];
  };
  onLogout: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ student, onLogout }) => {
  const [viewMode, setViewMode] = useState<'MAIN' | 'ALL_PAYMENTS' | 'ALL_ATTENDANCES'>('MAIN');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [concepts, setConcepts] = useState<PaymentConcept[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

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

  // Formato YYYY-MM-DD para hoy y YYYY-MM para mes corriente
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDayOfMonth = now.getDate();

  // Cargar pagos y conceptos de la alumna
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingPayments(true);
        const [paymentData, conceptData] = await Promise.all([
          getPayments(undefined, student.id).catch(() => []),
          getPaymentConcepts().catch(() => []),
        ]);
        if (isMounted) {
          setPayments(paymentData || []);
          setConcepts(conceptData || []);
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

  // Formateador de fechas bonitas (YYYY-MM-DD)
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

  // Formateador de mes siguiente para aviso de vencimiento
  const nextMonthFormatted = useMemo(() => {
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const formatted = nextDate.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [now]);

  // Iniciales para el avatar
  const initials = useMemo(() => {
    const fn = (student.firstName || '').trim();
    const ln = (student.lastName || '').trim();
    return `${fn ? fn[0] : ''}${ln ? ln[0] : ''}`.toUpperCase() || 'AL';
  }, [student.firstName, student.lastName]);

  const hasAuthorizedPeople = student.authorizedPeople && student.authorizedPeople.length > 0;

  // Asistencias ordenadas descendentemente por fecha
  const sortedAttendances = useMemo(() => {
    return (student.attendances || [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [student.attendances]);

  // Estado de la clase de hoy o clase más reciente
  const todayRecord = useMemo(() => {
    return sortedAttendances.find((a) => a.date === todayDateStr);
  }, [sortedAttendances, todayDateStr]);

  const mostRecentRecord = useMemo(() => {
    return todayRecord || (sortedAttendances.length > 0 ? sortedAttendances[0] : null);
  }, [todayRecord, sortedAttendances]);

  const isTodayClass = mostRecentRecord && mostRecentRecord.date === todayDateStr;
  const recentPickup = mostRecentRecord?.pickups && mostRecentRecord.pickups.length > 0
    ? mostRecentRecord.pickups[0]
    : null;

  // Monto estándar de la cuota mensual
  const defaultMonthlyFee = useMemo(() => {
    const activeConcept = concepts.find((c) => c.isActive && c.name.toLowerCase().includes('cuota'));
    return activeConcept?.amount || concepts[0]?.amount || 22000;
  }, [concepts]);

  // Pagos del mes en curso
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

  // Estado del período en curso
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

  // Datos para mostrar en la tarjeta de cuota actual
  const currentMonthConcept = currentMonthPayments[0]?.concept || 'Acrobacia y Danza aérea';
  const currentMonthReceipt = currentMonthPayments.find((p) => p.receiptUrl)?.receiptUrl || null;
  const latestCurrentPayment = currentMonthPayments[0] || null;

  // Historial de pagos anteriores (excluyendo el mes en curso o agrupados por mes)
  const pastPayments = useMemo(() => {
    return payments.filter((p) => p.month !== currentMonthStr);
  }, [payments, currentMonthStr]);

  // =========================================================================
  // SUB-PANTALLA: Historial Completo de Cuotas
  // =========================================================================
  if (viewMode === 'ALL_PAYMENTS') {
    return (
      <div className="min-h-[100dvh] bg-surface text-on-surface p-4 sm:p-6 pb-20 max-w-xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setViewMode('MAIN')}
            aria-label="Volver al portal"
            className="p-2.5 rounded-full bg-white shadow-sm hover:bg-slate-100 text-purple-700 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider pr-1">Volver</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Historial de Cuotas</h1>
            <p className="text-xs text-slate-500 font-medium">Registro detallado de pagos de {student.firstName}</p>
          </div>
        </header>

        {pastPayments.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Sin cuotas anteriores</h3>
            <p className="text-xs text-slate-400 mt-1">No hay registros de meses anteriores cargados en el sistema.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastPayments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      {formatMonthNice(p.month)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {p.concept || 'Cuota de actividad'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-purple-700">
                      ${p.amount.toLocaleString('es-AR')}
                    </span>
                    {p.isPartial && (
                      <span className="block text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-0.5 border border-amber-200">
                        Pago parcial
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Abonado el{' '}
                      <strong className="text-slate-700">
                        {p.paidAt ? formatDateNice(p.paidAt.split('T')[0]) : 'Fecha no registrada'}
                      </strong>{' '}
                      vía {p.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo'}
                    </span>
                  </div>

                  {p.receiptUrl && (
                    <button
                      onClick={() => setViewingReceiptUrl(p.receiptUrl || null)}
                      className="text-purple-700 hover:text-purple-900 font-bold text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Comprobante</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Comprobante */}
        {viewingReceiptUrl && (
          <ReceiptModal url={viewingReceiptUrl} onClose={() => setViewingReceiptUrl(null)} />
        )}
      </div>
    );
  }

  // =========================================================================
  // SUB-PANTALLA: Historial Completo de Asistencias
  // =========================================================================
  if (viewMode === 'ALL_ATTENDANCES') {
    return (
      <div className="min-h-[100dvh] bg-surface text-on-surface p-4 sm:p-6 pb-20 max-w-xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setViewMode('MAIN')}
            aria-label="Volver al portal"
            className="p-2.5 rounded-full bg-white shadow-sm hover:bg-slate-100 text-purple-700 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider pr-1">Volver</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Historial de Asistencias</h1>
            <p className="text-xs text-slate-500 font-medium">Todas las clases de {student.firstName}</p>
          </div>
        </header>

        {sortedAttendances.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Sin asistencias registradas</h3>
            <p className="text-xs text-slate-400 mt-1">Aún no hay asistencias tomadas para esta alumna.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAttendances.map((rec) => {
              const pickup = rec.pickups && rec.pickups.length > 0 ? rec.pickups[0] : null;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 block">
                        📅 {formatDateNice(rec.date)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Turno: {rec.makeupShift || rec.shift || student.shift}
                      </span>
                    </div>

                    <span
                      className={`font-extrabold px-3 py-1 rounded-full text-xs shrink-0 ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status === 'PRESENT'
                        ? !hasAuthorizedPeople && !pickup
                          ? 'Presente y listo'
                          : '¡PRESENTE!'
                        : 'AUSENTE'}
                    </span>
                  </div>

                  {rec.isMakeup && (
                    <p className="text-xs text-purple-900 font-bold bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 inline-block w-fit">
                      🔄 Recuperación de clase en turno: {rec.makeupShift || student.shift}
                    </p>
                  )}

                  {rec.status === 'PRESENT' && rec.createdAt && (
                    <p className="text-xs text-slate-500">
                      Hora de registro:{' '}
                      <strong className="text-slate-700">
                        {new Date(rec.createdAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        hs
                      </strong>
                      {rec.recordedBy?.fullName && (
                        <span> | Docente: <strong>{rec.recordedBy.fullName}</strong></span>
                      )}
                    </p>
                  )}

                  {pickup && (
                    <div className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <p className="font-bold text-slate-900">
                        Retirada por: {pickup.authorizedPerson.fullName} ({pickup.authorizedPerson.relationship})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Hora de retiro:{' '}
                        <strong>
                          {new Date(pickup.pickupTime).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          hs
                        </strong>
                        {pickup.recordedBy?.fullName && (
                          <span> | Docente: <strong>{pickup.recordedBy.fullName}</strong></span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VISTA PRINCIPAL DEL PORTAL ALUMNA
  // =========================================================================
  return (
    <div className="min-h-[100dvh] bg-[#fdf7ff] text-slate-900 antialiased pb-20">
      {/* Header Fijo Superior */}
      <header className="sticky top-0 inset-x-0 z-40 bg-white/85 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-purple-100">
        <div className="max-w-xl mx-auto h-20 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-wide text-purple-900 uppercase">
                  Vulpiare
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Portal Alumna
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium truncate capitalize">
                {todayFormatted}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
            type="button"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* 1. CABECERA DE ALUMNA */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(30,27,38,0.06)] border border-purple-50 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-purple-100/50 blur-2xl pointer-events-none"></div>

          <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-extrabold tracking-wide shadow-sm">
            <Clock className="w-3.5 h-3.5 text-purple-700" />
            <span>Turno {student.shift}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                DNI Alumna: <span className="font-mono text-slate-700 font-bold">{student.dni}</span>
              </p>
            </div>

            <div className="w-13 h-13 rounded-full bg-white p-1 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.08)] shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 via-purple-600 to-pink-600 text-white flex items-center justify-center text-base font-black shadow-inner">
                {initials}
              </div>
            </div>
          </div>
        </section>

        {/* 2. ESTADO DE LA CLASE DE HOY */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-700" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Estado de la clase de hoy
              </h2>
            </div>
            <span className="text-xs text-purple-700 font-bold">
              {mostRecentRecord ? formatDateNice(mostRecentRecord.date) : 'Hoy'}
            </span>
          </div>

          <div className="rounded-3xl p-5 bg-white shadow-[0_4px_16px_-2px_rgba(30,27,38,0.05)] border border-purple-50 relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 bottom-0 w-2 ${
                !mostRecentRecord
                  ? 'bg-amber-400'
                  : mostRecentRecord.status === 'PRESENT'
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            ></div>

            <div className="flex flex-col gap-3 pl-2">
              {!mostRecentRecord ? (
                <div className="flex items-center gap-3 text-slate-700">
                  <Clock className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm text-slate-900">
                      Asistencia aún no registrada hoy
                    </p>
                    <p className="text-xs text-slate-500">
                      Apenas la profesora tome la asistencia del turno ({student.shift}), se actualizará acá.
                    </p>
                  </div>
                </div>
              ) : mostRecentRecord.status === 'ABSENT' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-extrabold border border-rose-200">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>AUSENTE en clase</span>
                    </div>
                    {!isTodayClass && (
                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                        Última clase registrada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Registrada como ausente en el turno {mostRecentRecord.makeupShift || student.shift}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>¡PRESENTE en clase!</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isTodayClass && (
                        <span className="text-[10px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full font-bold border border-purple-200">
                          Última clase
                        </span>
                      )}
                      {mostRecentRecord.createdAt && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                          {new Date(mostRecentRecord.createdAt).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          hs
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Horario Asignado
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                        {mostRecentRecord.makeupShift || student.shift}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Docente a Cargo
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                        {mostRecentRecord.recordedBy?.fullName || 'Profesora'}
                      </span>
                    </div>
                  </div>

                  {/* Estado de Retiro */}
                  {recentPickup ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-md space-y-1.5 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-pink-100">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        <span>Retiro Confirmado</span>
                      </div>
                      <p className="text-sm font-black">
                        Retirada por: {recentPickup.authorizedPerson.fullName}
                      </p>
                      <p className="text-xs text-pink-100">
                        Vínculo: <strong>{recentPickup.authorizedPerson.relationship}</strong> (DNI:{' '}
                        {recentPickup.authorizedPerson.dni})
                      </p>
                      <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-semibold text-pink-100">
                        <span>
                          Hora:{' '}
                          <strong>
                            {new Date(recentPickup.pickupTime).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            hs
                          </strong>
                        </span>
                        <span>Docente: <strong>{recentPickup.recordedBy?.fullName || 'A cargo'}</strong></span>
                      </div>
                    </div>
                  ) : hasAuthorizedPeople ? (
                    <div className="flex items-center gap-2.5 pt-1 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900">En la clase (Aún no retirada)</span>
                        <span className="text-[11px] text-slate-500 truncate">
                          Esperando retiro por la persona autorizada.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 pt-1 text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900">Presente y listo</span>
                        <span className="text-[11px] text-slate-500 truncate">
                          No requiere persona a cargo para retiro.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. ESTADO DE CUENTA Y CUOTAS (SOLO LECTURA) */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <CreditCard className="w-4 h-4 text-purple-700" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Estado de Cuenta y Cuotas
            </h2>
          </div>

          {/* Tarjeta Destacada del Período en Curso */}
          <div className="rounded-3xl p-5 sm:p-6 bg-white shadow-[0_6px_20px_-3px_rgba(30,27,38,0.06)] border border-purple-50 relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Período en Curso
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${currentStatusInfo.badgeClass}`}
              >
                <currentStatusInfo.icon className="w-3.5 h-3.5" />
                <span>{currentStatusInfo.label}</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Cuota {formatMonthNice(currentMonthStr)}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{currentMonthConcept}</p>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-purple-700 shrink-0">
                ${(currentMonthPaid >= currentExpectedFee
                  ? currentMonthPaid
                  : currentExpectedFee
                ).toLocaleString('es-AR')}
              </div>
            </div>

            {/* Mensaje de detalle según estado de pago */}
            {currentStatusInfo.status === 'UP_TO_DATE' && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-tight">
                  Registrado por administración
                  {latestCurrentPayment?.paidAt && (
                    <span>
                      {' '}el{' '}
                      <strong>{formatDateNice(latestCurrentPayment.paidAt.split('T')[0])}</strong>
                    </span>
                  )}
                  {latestCurrentPayment?.paymentMethod && (
                    <span>
                      {' '}vía{' '}
                      <strong>
                        {latestCurrentPayment.paymentMethod === 'TRANSFER'
                          ? 'Transferencia Bancaria'
                          : 'Efectivo'}
                      </strong>
                    </span>
                  )}
                  .
                </p>
              </div>
            )}

            {currentStatusInfo.status === 'PARTIAL' && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-tight">
                  Pago parcial computado: <strong>${currentMonthPaid.toLocaleString('es-AR')}</strong> abonados.
                  Resta saldar: <strong>${currentRemainingDebt.toLocaleString('es-AR')}</strong> para completar el período.
                </p>
              </div>
            )}

            {currentStatusInfo.status === 'PENDING' && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-tight">
                  Cuota pendiente de pago. Podés abonar dentro de los primeros 10 días del mes sin recargo.
                </p>
              </div>
            )}

            {currentStatusInfo.status === 'OVERDUE' && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-900 leading-tight">
                  Cuota vencida (pasados los primeros 10 días). Aplica un recargo del 10% sobre el valor regular.
                </p>
              </div>
            )}

            {/* Botón Ver Comprobante si existe */}
            {currentMonthReceipt && (
              <button
                onClick={() => setViewingReceiptUrl(currentMonthReceipt)}
                className="w-full py-2.5 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100 active:scale-98 transition-all flex items-center justify-center gap-2 text-purple-700 font-bold text-xs"
                type="button"
              >
                <FileText className="w-4 h-4" />
                <span>Ver Recibo Oficial</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-purple-400" />
              </button>
            )}
          </div>

          {/* Aviso informativo de vencimiento */}
          <div className="rounded-3xl p-4 bg-purple-50/60 border border-purple-100/80 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <CalendarClock className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-black">Próximo vencimiento:</span>
              <span className="text-xs font-extrabold text-purple-900 ml-auto">
                {nextMonthFormatted} (1 al 10)
              </span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-purple-100">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-tight">
                Información de solo lectura. Para informar pagos o consultas sobre facturación, comunicate con la administración del estudio.
              </p>
            </div>
          </div>
        </section>

        {/* 4. HISTORIAL DE CUOTAS ANTERIORES (MUESTRA ÚLTIMAS 2) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Historial de Cuotas Anteriores
            </h3>
            {pastPayments.length > 2 && (
              <button
                onClick={() => setViewMode('ALL_PAYMENTS')}
                className="text-xs font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
              >
                <span>Ver más</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {pastPayments.length === 0 ? (
            <div className="rounded-3xl p-5 bg-white border border-purple-50 text-center text-xs text-slate-400 shadow-sm">
              No hay cuotas anteriores registradas aún.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pastPayments.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl p-4 bg-white shadow-[0_2px_10px_-2px_rgba(30,27,38,0.04)] border border-purple-50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatMonthNice(p.month)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {p.concept || 'Cuota de actividad'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900">
                        ${p.amount.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="inline-flex items-center gap-1.5 text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Abonado{' '}
                        {p.paidAt ? formatDateNice(p.paidAt.split('T')[0]) : ''}
                      </span>
                    </div>

                    {p.receiptUrl ? (
                      <button
                        onClick={() => setViewingReceiptUrl(p.receiptUrl || null)}
                        className="text-purple-700 hover:text-purple-900 font-bold text-xs inline-flex items-center gap-1 py-1 px-2.5 rounded-full hover:bg-purple-50 transition-colors"
                        type="button"
                      >
                        <span>Ver Comprobante</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {p.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. HISTORIAL DE ASISTENCIAS (MUESTRA ÚLTIMAS 2) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Historial de Asistencias
              </h3>
            </div>
            {sortedAttendances.length > 2 && (
              <button
                onClick={() => setViewMode('ALL_ATTENDANCES')}
                className="text-xs font-extrabold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
              >
                <span>Ver más</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {sortedAttendances.length === 0 ? (
            <div className="rounded-3xl p-5 bg-white border border-purple-50 text-center text-xs text-slate-400 shadow-sm">
              No hay asistencias registradas aún.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedAttendances.slice(0, 2).map((rec) => {
                const pickup = rec.pickups && rec.pickups.length > 0 ? rec.pickups[0] : null;

                return (
                  <div
                    key={rec.id}
                    className="rounded-2xl p-4 bg-white shadow-[0_2px_12px_-2px_rgba(30,27,38,0.04)] border border-purple-50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.status === 'PRESENT' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {formatDateNice(rec.date)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium truncate">
                          {rec.status === 'PRESENT'
                            ? !hasAuthorizedPeople && !pickup
                              ? 'Presente y listo'
                              : pickup
                              ? `Retirada por ${pickup.authorizedPerson.fullName}`
                              : 'Presente en clase'
                            : 'Ausente'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {rec.createdAt ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                          {new Date(rec.createdAt).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          hs
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                          {rec.status === 'PRESENT' ? 'Registrado' : 'Ausente'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Comprobante / Recibo */}
      {viewingReceiptUrl && (
        <ReceiptModal url={viewingReceiptUrl} onClose={() => setViewingReceiptUrl(null)} />
      )}
    </div>
  );
};

// Componente modal para visualizar comprobante
const ReceiptModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-700" />
            <h3 className="text-sm font-black text-slate-900">Comprobante de Pago</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-50">
          <img
            src={url}
            alt="Comprobante de pago"
            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm border border-slate-200"
          />
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
