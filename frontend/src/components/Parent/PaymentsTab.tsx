import React from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarClock,
  Info,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Student, PaymentRecord } from '../../types';

export interface MonthSummary {
  month: string;
  totalPaid: number;
  expectedFee: number;
  isCurrent: boolean;
  isFuture: boolean;
  isSurplusFromPrevious: boolean;
  generatedChild: any;
  payments: PaymentRecord[];
  latestPayment: PaymentRecord | undefined;
  receiptUrls: string[];
  methodLabel: string;
}

interface PaymentsTabProps {
  student: Student;
  payments: PaymentRecord[];
  monthSummaries: MonthSummary[];
  currentStatusInfo: {
    status: 'UP_TO_DATE' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
    label: string;
    badgeClass: string;
    icon: any;
  };
  currentExpectedFee: number;
  currentMonthPaid: number;
  currentRemainingDebt: number;
  currentMonthSurplusChild: any;
  currentMonthConcept: string;
  currentMonthReceipt: string | null;
  latestCurrentPayment: PaymentRecord | null;
  nextMonthFormatted: string;
  onViewReceipt: (url: string) => void;
  formatMonthNice: (monthStr: string) => string;
  formatDateNice: (dateStr: string) => string;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  student,
  payments,
  monthSummaries,
  currentStatusInfo,
  currentExpectedFee,
  currentMonthPaid,
  currentRemainingDebt,
  currentMonthSurplusChild,
  currentMonthConcept,
  currentMonthReceipt,
  latestCurrentPayment,
  nextMonthFormatted,
  onViewReceipt,
  formatMonthNice,
  formatDateNice,
}) => {
  const StatusIcon = currentStatusInfo.icon;

  return (
    <div className="space-y-6">
      {/* 1. SECCIÓN: ESTADO DE CUENTA Y CUOTAS */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Wallet className="w-4 h-4 text-purple-700" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Estado de Cuenta y Cuotas
          </h2>
        </div>

        {/* Tarjeta Destacada de Cuota del Período en Curso */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(30,27,38,0.06)] border border-purple-50 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Período en curso
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {currentMonthConcept}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cuota Mensual Regular: <strong>${currentExpectedFee.toLocaleString('es-AR')}</strong>
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs shrink-0 ${currentStatusInfo.badgeClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{currentStatusInfo.label}</span>
            </div>
          </div>

          {/* Montos y Detalles del Pago del Mes */}
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Monto Abonado
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                ${currentMonthPaid.toLocaleString('es-AR')}
              </p>
              {latestCurrentPayment && (
                <p className="text-[11px] text-slate-500 font-medium">
                  {latestCurrentPayment.paymentMethod === 'TRANSFER'
                    ? 'Transferencia bancaria'
                    : 'Efectivo en caja'}{' '}
                  • {formatDateNice(latestCurrentPayment.paidAt.slice(0, 10))}
                </p>
              )}
            </div>

            {currentRemainingDebt > 0 && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Resta Abonar
                </span>
                <p className="text-xl font-black text-amber-700 mt-0.5">
                  ${currentRemainingDebt.toLocaleString('es-AR')}
                </p>
              </div>
            )}
          </div>

          {/* Banner si generó un excedente hacia el próximo mes */}
          {currentMonthSurplusChild && (
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <p className="font-black text-purple-950">
                  ¡Tenés saldo a favor para el próximo mes!
                </p>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  Al abonar con excedente, se acreditaron{' '}
                  <strong>${currentMonthSurplusChild.amount.toLocaleString('es-AR')}</strong> para{' '}
                  <strong>{formatMonthNice(currentMonthSurplusChild.month)}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Botón Ver Comprobante si existe en el mes actual */}
          {currentMonthReceipt && (
            <button
              type="button"
              onClick={() => onViewReceipt(currentMonthReceipt)}
              className="w-full py-2.5 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-black border border-purple-200 flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <FileText className="w-4 h-4 text-purple-700" />
              <span>Ver Recibo Oficial de este mes</span>
            </button>
          )}

          {/* Tarjeta Informativa de Próximo Vencimiento */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5">
            <CalendarClock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-extrabold text-slate-900">
                Próximo vencimiento: 1 al 10 de {nextMonthFormatted}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Para informar pagos o consultas sobre facturación, comunicate con la profesora Victoria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN: HISTORIAL COMPLETO DE CUOTAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-purple-700" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Historial de Cuotas ({monthSummaries.length})
            </h2>
          </div>
        </div>

        {monthSummaries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-purple-50 shadow-xs">
            <p className="text-xs font-bold text-slate-500">
              Aún no hay registros de cuotas cargadas en el sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthSummaries.map((summary) => {
              const isPaidInFull = summary.totalPaid >= summary.expectedFee;

              return (
                <div
                  key={summary.month}
                  className="p-4 rounded-3xl bg-white border border-purple-50 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.04)] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base">
                        {formatMonthNice(summary.month)}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {summary.methodLabel}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900">
                        ${summary.totalPaid.toLocaleString('es-AR')}
                      </span>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {summary.isSurplusFromPrevious ? (
                          <span className="text-[10px] font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                            Saldo a favor
                          </span>
                        ) : isPaidInFull ? (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Al día
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Parcial
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalle si este mes generó saldo a favor para el siguiente */}
                  {summary.generatedChild && (
                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>
                        Generó <strong>${summary.generatedChild.amount.toLocaleString('es-AR')}</strong> de saldo a favor para {formatMonthNice(summary.generatedChild.month)}.
                      </span>
                    </div>
                  )}

                  {/* Botones de Comprobantes si existen */}
                  {summary.receiptUrls.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      {summary.receiptUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onViewReceipt(url)}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-purple-800 text-[11px] font-extrabold border border-slate-200 hover:border-purple-200 flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Ver comprobante {summary.receiptUrls.length > 1 ? `#${idx + 1}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
