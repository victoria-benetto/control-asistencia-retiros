import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, X, RotateCw } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  note?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'purple' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  note,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'purple',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className={`bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border ${isDanger ? 'border-rose-100' : 'border-purple-100'} text-center flex flex-col items-center gap-3 relative animate-in zoom-in-95 duration-150`}>
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Cerrar"
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icono */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner mt-1 ${
          isDanger
            ? 'bg-rose-50 border border-rose-200/80 text-rose-600'
            : 'bg-purple-50 border border-purple-200/80 text-purple-700'
        }`}>
          {isDanger ? (
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          ) : (
            <Info className="w-7 h-7 text-purple-700" />
          )}
        </div>

        {/* Textos */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 leading-tight">
            {title}
          </h3>
          <div className="text-xs text-slate-600 font-medium leading-relaxed">
            {message}
          </div>
        </div>

        {note && (
          <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-100 text-[11px] text-purple-900 font-semibold w-full text-left">
            {note}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2 w-full pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-2xl text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] active:scale-98 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-purple-700 hover:bg-purple-800 shadow-purple-200'
            }`}
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-extrabold text-xs transition-all min-h-[40px]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ToastNotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
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
  const isError = type === 'error';

  return (
    <aside
      aria-label="Notificación del sistema"
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-950/95 border-emerald-500/30 text-white shadow-emerald-900/30'
            : isError
            ? 'bg-rose-950/95 border-rose-500/30 text-white shadow-rose-900/30'
            : 'bg-purple-950/95 border-purple-500/30 text-white shadow-purple-900/30'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isError ? (
            <XCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <Info className="w-5 h-5 text-purple-400" />
          )}
        </div>
        <div className="flex-1 text-xs font-bold leading-snug">
          {message}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="text-white/60 hover:text-white shrink-0 -mr-1 -mt-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
