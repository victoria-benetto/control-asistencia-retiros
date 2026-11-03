import React, { useEffect } from 'react';
import { AlertTriangle, X, CheckCircle2, RotateCw } from 'lucide-react';

interface CancelMakeupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftName?: string;
  dateStr?: string;
  isCancelling?: boolean;
}

export const CancelMakeupModal: React.FC<CancelMakeupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  shiftName,
  dateStr,
  isCancelling = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center flex flex-col items-center gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          disabled={isCancelling}
          aria-label="Cerrar"
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icono de advertencia suave */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-inner mt-1">
          <AlertTriangle className="w-7 h-7 text-rose-600" />
        </div>

        {/* Textos */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 leading-tight">
            ¿Cancelar clase de recuperación?
          </h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Estás a punto de cancelar la clase agendada
            {dateStr ? <span> para el <strong>{dateStr}</strong></span> : ''}
            {shiftName ? <span> en el turno <strong>{shiftName}</strong></span> : ''}.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-100 text-[11px] text-purple-900 font-semibold w-full text-left">
          💡 <strong>Nota:</strong> Al cancelar, tu cupo volverá a quedar disponible inmediatamente para que puedas elegir otra fecha u horario en su lugar.
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 w-full pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            {isCancelling ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Cancelando...</span>
              </>
            ) : (
              <span>Sí, cancelar clase</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-extrabold text-xs transition-all min-h-[40px]"
          >
            Volver / Mantener clase
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastNotificationProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs sm:text-sm font-black transition-all animate-in slide-in-from-bottom duration-200 max-w-md w-[92%] sm:w-auto ${
        isSuccess
          ? 'bg-slate-900 text-white border-purple-500/50 shadow-slate-950/30'
          : 'bg-rose-950 text-white border-rose-500/50 shadow-rose-950/30'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
