import React from 'react';
import { X, Receipt, Download } from 'lucide-react';

interface ReceiptModalProps {
  receiptUrl: string | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receiptUrl, onClose }) => {
  if (!receiptUrl) return null;

  const isPdf =
    receiptUrl.startsWith('data:application/pdf') ||
    receiptUrl.toLowerCase().endsWith('.pdf');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Comprobante de Pago
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Documento respaldatorio cargado en el sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Visual */}
        <div className="mt-4 flex-1 overflow-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center min-h-[260px]">
          {isPdf ? (
            <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center p-4 text-center">
              <iframe
                src={receiptUrl}
                title="Comprobante PDF"
                className="w-full h-[350px] rounded-xl border border-slate-200"
              />
              <a
                href={receiptUrl}
                download="comprobante_vulpiare.pdf"
                className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </a>
            </div>
          ) : (
            <img
              src={receiptUrl}
              alt="Comprobante de Pago"
              className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-xs"
            />
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
