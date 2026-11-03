import React from 'react';
import { Home, Wallet, Calendar } from 'lucide-react';

export type ParentTab = 'home' | 'payments' | 'attendance';

interface BottomNavProps {
  activeTab: ParentTab;
  onSelectTab: (tab: ParentTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    {
      id: 'home' as const,
      label: 'Inicio',
      icon: Home,
    },
    {
      id: 'payments' as const,
      label: 'Pagos',
      icon: Wallet,
    },
    {
      id: 'attendance' as const,
      label: 'Asistencias',
      icon: Calendar,
    },
  ];

  return (
    <nav
      aria-label="Navegación inferior del portal"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-xl mx-auto h-16 px-4 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-label={`Pestaña ${tab.label}`}
              className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all active:scale-95 ${
                isActive ? 'text-purple-700 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-purple-600 rounded-full" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-purple-700' : ''}`} />
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
