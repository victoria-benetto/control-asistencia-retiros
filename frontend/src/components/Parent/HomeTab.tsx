import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCw,
  Wallet,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Student, AttendanceRecord } from '../../types';
import { PaymentReminderInfo } from '../../utils/paymentNotifications';
import { ParentTab } from './BottomNav';

interface HomeTabProps {
  student: Student & {
    attendances: AttendanceRecord[];
  };
  mostRecentRecord: AttendanceRecord | null;
  isTodayClass: boolean;
  formatDateNice: (dateStr: string) => string;
  onSelectTab: (tab: ParentTab) => void;
  onOpenMakeupModal: () => void;
  onCancelMakeup?: (id: string) => void;
  reminderInfo?: PaymentReminderInfo | null;
  notificationPermission?: string;
  onRequestNotification?: () => void;
  currentStatusInfo?: {
    status: 'UP_TO_DATE' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
    label: string;
    badgeClass: string;
  };
  onOpenTerms?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  student,
  mostRecentRecord,
  isTodayClass,
  formatDateNice,
  onSelectTab,
  onOpenMakeupModal,
  onCancelMakeup,
  reminderInfo,
  notificationPermission,
  onRequestNotification,
  currentStatusInfo,
  onOpenTerms,
}) => {
  // Iniciales para el avatar
  const initials = useMemo(() => {
    const fn = (student.firstName || '').trim();
    const ln = (student.lastName || '').trim();
    return `${fn ? fn[0] : ''}${ln ? ln[0] : ''}`.toUpperCase() || 'AL';
  }, [student.firstName, student.lastName]);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Métricas del mes en curso (Regla: ausencias a partir de noviembre no acumulativas)
  const monthlyMetrics = useMemo(() => {
    const eligibleAbsencesThisMonth = (student.attendances || []).filter(
      (a) => a.status === 'ABSENT' && !a.isMakeup && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
    const completedMakeupsThisMonth = (student.attendances || []).filter(
      (a) => a.isMakeup && a.status === 'PRESENT' && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
    const pendingMakeup = (student.attendances || []).find((a) => a.isMakeup && a.status === 'PENDING');

    const attendancesThisMonth = (student.attendances || []).filter((a) =>
      a.date.startsWith(currentMonthStr)
    );

    const attendedCount = attendancesThisMonth.filter((a) => a.status === 'PRESENT').length;
    const absentCount = attendancesThisMonth.filter((a) => a.status === 'ABSENT' && !a.isMakeup).length;

    // Solo se puede recuperar tantas clases como ausencias tenga en el mes menos las ya recuperadas o pendientes
    const remainingToRecover = Math.max(0, eligibleAbsencesThisMonth.length - completedMakeupsThisMonth.length - (pendingMakeup ? 1 : 0));

    // Calcular el total estimado de clases del mes según el plan y cronograma
    let daysPerWeek = 2;
    if (student.plan === 'PASE_LIBRE') {
      daysPerWeek = 5;
    } else if (Array.isArray(student.schedule) && student.schedule.length > 0) {
      daysPerWeek = student.schedule.length;
    } else {
      const shiftLower = (student.shift || '').toLowerCase();
      daysPerWeek = shiftLower.includes('viernes') ? 3 : 2;
    }
    const totalMonthClasses = daysPerWeek * 4;

    return {
      totalClasses: totalMonthClasses,
      attendedClasses: attendedCount,
      toRecoverClasses: remainingToRecover,
      hasPendingMakeup: Boolean(pendingMakeup),
      pendingMakeupRecord: pendingMakeup || null,
      absentCount,
    };
  }, [student.attendances, student.shift, currentMonthStr]);

  // Formatear cronograma detallado por día y turno
  const scheduleFormatted = useMemo(() => {
    if (!Array.isArray(student.schedule) || student.schedule.length === 0) return [];

    const dayLabels: Record<string, string> = {
      LUNES: 'Lunes',
      MARTES: 'Martes',
      MIERCOLES: 'Miércoles',
      JUEVES: 'Jueves',
      VIERNES: 'Viernes',
    };

    const dayOrder = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const sorted = [...student.schedule].sort((a, b) => {
      const idxA = dayOrder.indexOf((a.day || '').toUpperCase());
      const idxB = dayOrder.indexOf((b.day || '').toUpperCase());
      return idxA - idxB;
    });

    return sorted.map((s) => ({
      day: dayLabels[(s.day || '').toUpperCase()] || s.day,
      shift: s.shift,
    }));
  }, [student.schedule]);

  const recentPickup = mostRecentRecord?.pickups && mostRecentRecord.pickups.length > 0
    ? mostRecentRecord.pickups[0]
    : null;

  const hasAuthorizedPeople = student.authorizedPeople && student.authorizedPeople.length > 0;

  return (
    <div className="space-y-6">
      {/* Banner de Recordatorio de Vencimiento de Cuota (Día 9 y 10) */}
      {reminderInfo && (
        <section
          aria-label="Aviso de vencimiento de cuota"
          className={`rounded-3xl p-4 sm:p-5 border shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 ${
            reminderInfo.day === 10
              ? 'bg-rose-50/90 border-rose-200 text-rose-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                reminderInfo.day === 10 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {reminderInfo.day === 10 ? (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    reminderInfo.day === 10
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {reminderInfo.inAppBadge}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Cuota Mensual
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-1">
                {reminderInfo.title}
              </h3>
              <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                {reminderInfo.inAppMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => onSelectTab('payments')}
              className="text-xs font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver medios de pago y aranceles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {notificationPermission !== 'granted' && onRequestNotification && (
              <button
                type="button"
                onClick={onRequestNotification}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-extrabold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>🔔 Activar avisos en mi celular</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 1. TARJETA PRINCIPAL DE PERFIL DE LA ALUMNA */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(30,27,38,0.06)] border border-purple-50 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-purple-100/50 blur-2xl pointer-events-none"></div>

        {/* Badge Turno y Plan */}
        <div className="flex flex-col gap-2 self-start w-full">
          <div className="flex flex-wrap items-center gap-2">
            {student.plan === 'PASE_LIBRE' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-700 text-white text-xs font-black tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>Pase Libre (Todos los turnos)</span>
              </span>
            ) : student.plan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-extrabold tracking-wide shadow-xs">
                <Clock className="w-3.5 h-3.5 text-purple-700" />
                <span>{student.plan === 'DOS_VECES' ? '2 veces por semana' : student.plan === 'TRES_VECES' ? '3 veces por semana' : student.plan === 'UNA_VEZ' ? '1 vez por semana' : student.shift}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-extrabold tracking-wide shadow-xs">
                <Clock className="w-3.5 h-3.5 text-purple-700" />
                <span>Turno {student.shift}</span>
              </span>
            )}
          </div>

          {/* Días y Horarios asignados del cronograma */}
          {scheduleFormatted.length > 0 && (
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-2.5 text-xs text-purple-950 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                Días y horarios asignados:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {scheduleFormatted.map((item, idx) => (
                  <div key={idx} className="bg-white/90 border border-purple-100/80 rounded-xl px-2.5 py-1 text-[11px] font-medium flex items-center justify-between shadow-2xs">
                    <span className="font-bold text-purple-900">{item.day}</span>
                    <span className="text-slate-600 truncate ml-2 text-right">{item.shift}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nombre y Avatar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              DNI Alumna: <span className="font-mono text-slate-700 font-bold">{student.dni}</span>
            </p>
          </div>

          <div className="w-14 h-14 rounded-full bg-white p-1 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.08)] shrink-0">
            <div className="w-12 h-12 rounded-full bg-purple-700 text-white flex items-center justify-center text-base font-black shadow-inner">
              {initials}
            </div>
          </div>
        </div>

        {/* Grilla de Métricas Mensuales (3 tarjetas con fondos suaves y bordes redondeados) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* 1. Clases del mes */}
          <div className="bg-purple-50/80 border border-purple-100/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-lg sm:text-2xl font-black text-purple-900 leading-tight">
              {monthlyMetrics.totalClasses}
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-purple-700 mt-0.5">
              Clases del mes
            </span>
          </div>

          {/* 2. Clases asistidas */}
          <div className="bg-emerald-50/80 border border-emerald-100/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-lg sm:text-2xl font-black text-emerald-800 leading-tight">
              {monthlyMetrics.attendedClasses}
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mt-0.5">
              Asistidas
            </span>
          </div>

          {/* 3. Para recuperar */}
          <div className="bg-rose-50/80 border border-rose-100/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-lg sm:text-2xl font-black text-rose-800 leading-tight">
              {monthlyMetrics.toRecoverClasses}
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 mt-0.5">
              Para recuperar
            </span>
          </div>
        </div>

        {/* Aviso de vencimiento de recuperatorios */}
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Las clases ausentes se pueden recuperar dentro del mismo mes en curso; de lo contrario, se vencen al finalizar el período y no son acumulables.
          </p>
        </div>

        {/* Botón o Estado de "Recuperar una clase" */}
        {monthlyMetrics.hasPendingMakeup ? (
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-200/80 text-purple-900 text-xs font-black">
                <RotateCw className="w-3.5 h-3.5 text-purple-700" />
                Recuperatorio Agendado
              </span>
              {onCancelMakeup && monthlyMetrics.pendingMakeupRecord && (
                <button
                  type="button"
                  onClick={() => onCancelMakeup(monthlyMetrics.pendingMakeupRecord!.id)}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black transition-all shadow-2xs active:scale-95"
                >
                  Cancelar / Cambiar
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-slate-800">
              📅 Fecha: {formatDateNice(monthlyMetrics.pendingMakeupRecord!.date)}
              <br />
              ⏰ Turno: {monthlyMetrics.pendingMakeupRecord!.makeupShift || monthlyMetrics.pendingMakeupRecord!.shift}
            </p>
            <p className="text-[11px] text-purple-700 font-medium">
              ⏳ Estado: Agendado. La profesora registrará si asististe el día de la clase.
            </p>
          </div>
        ) : monthlyMetrics.toRecoverClasses > 0 ? (
          <button
            type="button"
            onClick={onOpenMakeupModal}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-200 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Recuperar una clase ({monthlyMetrics.toRecoverClasses} disponible{monthlyMetrics.toRecoverClasses > 1 ? 's' : ''})</span>
          </button>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-bold">
            No tenés clases pendientes para recuperar en este momento.
          </div>
        )}
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
                : mostRecentRecord.status === 'PENDING'
                ? 'bg-purple-500'
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
                <div className="flex flex-wrap items-center justify-between gap-2">
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
            ) : mostRecentRecord.status === 'PENDING' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>RECUPERATORIO AGENDADO (PENDIENTE)</span>
                  </div>
                  {onCancelMakeup && (
                    <button
                      type="button"
                      onClick={() => onCancelMakeup(mostRecentRecord.id)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black transition-all shadow-2xs active:scale-95"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Clase de recuperación agendada en el turno: <strong>{mostRecentRecord.makeupShift || mostRecentRecord.shift}</strong>.
                  <br />
                  <span className="text-purple-700 font-medium">⏳ La profesora registrará si asististe el día de la clase.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>¡PRESENTE en clase!</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Horario Asignado
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">
                      {mostRecentRecord.makeupShift || student.shift}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Docente a Cargo
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 truncate leading-snug">
                      {mostRecentRecord.recordedBy?.fullName || 'Profesora'}
                    </span>
                  </div>
                </div>

                {/* Estado de Retiro */}
                {recentPickup ? (
                  <div className="p-3.5 rounded-2xl bg-purple-900 border border-purple-800/80 text-white shadow-md space-y-1.5 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-pink-100">
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Retiro Confirmado</span>
                    </div>
                    <p className="text-sm font-black">
                      Retirada por: {recentPickup.authorizedPerson?.fullName || recentPickup.notes || 'Adulto autorizado'}
                    </p>
                    {recentPickup.authorizedPerson && (
                      <p className="text-xs text-pink-100">
                        Vínculo: <strong>{recentPickup.authorizedPerson.relationship}</strong> (DNI:{' '}
                        {recentPickup.authorizedPerson.dni})
                      </p>
                    )}
                    <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-pink-100">
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
                      <p className="font-extrabold text-xs text-slate-900">
                        Pendiente de retiro
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Autorizados: {student.authorizedPeople.map((p) => p.fullName).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 pt-1 text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold">
                      Presente y listo. No requiere persona a cargo para retiro.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. ACCESOS DIRECTOS RÁPIDOS HACIA PAGOS Y ASISTENCIAS */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
          Accesos Rápidos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Acceso a Pagos */}
          <button
            type="button"
            onClick={() => onSelectTab('payments')}
            className="p-4 rounded-3xl bg-white border border-purple-100 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.04)] hover:border-purple-300 transition-all text-left flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 truncate">
                    Estado de Cuenta y Cuotas
                  </h3>
                  {currentStatusInfo && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${currentStatusInfo.badgeClass}`}>
                      {currentStatusInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ver aranceles, pagos e historial
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Acceso a Asistencias */}
          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className="p-4 rounded-3xl bg-white border border-purple-100 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.04)] hover:border-purple-300 transition-all text-left flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-900 truncate">
                  Historial de Asistencias
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Revisar todas las clases y retiros
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Acceso a Reglamento y Términos */}
          {onOpenTerms && (
            <button
              type="button"
              onClick={onOpenTerms}
              className="p-4 rounded-3xl bg-white border border-purple-100 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.04)] hover:border-purple-300 transition-all text-left flex items-center justify-between group active:scale-98 sm:col-span-2 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 truncate">
                      Reglamento Interno y Términos
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                      Normativa Oficial
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Seguro obligatorio, apto médico, retiro de menores y aranceles
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
