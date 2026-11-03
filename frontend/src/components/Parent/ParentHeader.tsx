import React from 'react';
import { LogOut } from 'lucide-react';

interface ParentHeaderProps {
  todayFormatted: string;
  onLogout: () => void;
}

export const ParentHeader: React.FC<ParentHeaderProps> = ({ todayFormatted, onLogout }) => {
  return (
    <header className="sticky top-0 inset-x-0 z-30 bg-white/85 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-purple-100">
      <div className="max-w-xl mx-auto h-20 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/vulpiare_logo.png"
            alt="Vulpiare Logo"
            className="w-10 h-10 rounded-full object-cover border border-purple-200 shadow-sm shrink-0"
          />
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
  );
};
