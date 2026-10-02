import React from 'react';
import { Calendar, CheckSquare, UserCheck, Users, Shield, History, LogOut } from 'lucide-react';
import { AdminUser } from '../types';

interface NavbarProps {
  user: AdminUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const permissions = user.permissions || {};

  // Formato de fecha actual en español automático
  const todayFormatted = new Date().toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo y Marca VULPIARE */}
            <div className="flex items-center gap-3">
              <img
                src="/vulpiare_logo.png"
                alt="Vulpiare Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-purple-200 shadow-sm"
              />
              <div>
                <h1 className="font-black text-slate-900 leading-none text-lg sm:text-xl tracking-wider">
                  VULPIARE
                </h1>
                <div className="flex items-center gap-1 text-[11px] text-purple-700 font-bold capitalize mt-0.5">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <span>{todayFormatted}</span>
                </div>
              </div>
            </div>

            {/* Perfil & Botón Cerrar Sesión */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-tight">{user.fullName}</p>
                <span
                  className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isSuperAdmin ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900'
                  }`}
                >
                  {isSuperAdmin ? 'Super Admin' : 'Profe'}
                </span>
              </div>

              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-2.5 rounded-2xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors active:scale-95 flex items-center gap-1.5 font-bold text-xs"
              >
                <LogOut className="w-5 h-5 text-rose-500" />
                <span className="hidden xs:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Pestañas de Navegación Versión Desktop */}
          <nav className="hidden md:flex space-x-1 py-2 border-t border-slate-100 overflow-x-auto">
            {(permissions.canAttendance !== false || isSuperAdmin) && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tomar Asistencia</span>
              </button>
            )}

            {(permissions.canPickups !== false || isSuperAdmin) && (
              <button
                onClick={() => setActiveTab('pickups')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'pickups'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Control de Retiros</span>
              </button>
            )}

            {(permissions.canHistory !== false || isSuperAdmin) && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Historial</span>
              </button>
            )}

            {/* ABM ALUMNAS: EXCLUSIVO SUPER ADMIN */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                    : 'text-amber-900 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ABM Alumnas</span>
              </button>
            )}

            {/* ABM PROFESORES: EXCLUSIVO SUPER ADMIN */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('teachers')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'teachers'
                    ? 'bg-purple-800 text-white shadow-md shadow-purple-300'
                    : 'text-purple-900 bg-purple-50 hover:bg-purple-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Gestión Profesores</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Menú de Navegación Inferior (Barra de Aplicación Móvil para Celulares) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg pb-safe">
        {(permissions.canAttendance !== false || isSuperAdmin) && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'attendance' ? 'text-purple-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Asistencia</span>
          </button>
        )}

        {(permissions.canPickups !== false || isSuperAdmin) && (
          <button
            onClick={() => setActiveTab('pickups')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'pickups' ? 'text-purple-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Retiros</span>
          </button>
        )}

        {(permissions.canHistory !== false || isSuperAdmin) && (
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'history' ? 'text-purple-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Historial</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('students')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'students' ? 'text-amber-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Alumnas</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'teachers' ? 'text-purple-800 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Profes</span>
          </button>
        )}
      </div>
    </>
  );
};
