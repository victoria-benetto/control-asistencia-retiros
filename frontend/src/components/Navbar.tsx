import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  UserCheck,
  Users,
  Shield,
  History,
  LogOut,
  CreditCard,
  FolderKanban,
  X,
  ChevronRight,
  Tag,
  BarChart3,
  DollarSign,
} from 'lucide-react';
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

  // Estado para el modal selector de "Gestiones" (Alumnas / Profesores / ABM Pagos)
  const [gestionesModalOpen, setGestionesModalOpen] = useState(false);

  // Formato de fecha actual en español automático
  const todayFormatted = new Date().toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleSelectGestion = (
    tab: 'students' | 'teachers' | 'payment-concepts' | 'reports' | 'expenses'
  ) => {
    setActiveTab(tab);
    setGestionesModalOpen(false);
  };

  const isGestionesActive =
    activeTab === 'students' ||
    activeTab === 'teachers' ||
    activeTab === 'payment-concepts' ||
    activeTab === 'reports' ||
    activeTab === 'expenses';

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
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

            {/* PESTAÑA CONTROL DE PAGOS (SUPER ADMIN) */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === 'payments' || activeTab === 'register-payment'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Control de Pagos</span>
              </button>
            )}

            {/* PESTAÑA UNIFICADA GESTIONES (SUPER ADMIN): ALUMNAS, PROFESORES Y ABM PAGOS */}
            {isSuperAdmin && (
              <button
                onClick={() => setGestionesModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition-all whitespace-nowrap ${
                  isGestionesActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span>
                  Gestiones{' '}
                  {activeTab === 'students'
                    ? '(Alumnas)'
                    : activeTab === 'teachers'
                    ? '(Profes)'
                    : activeTab === 'payment-concepts'
                    ? '(Aranceles)'
                    : activeTab === 'reports'
                    ? '(Reportes)'
                    : activeTab === 'expenses'
                    ? '(Gastos Fijos)'
                    : ''}
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Menú de Navegación Inferior (Barra Móvil) */}
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

        {/* Pestaña Pagos en Barra Móvil */}
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'payments' || activeTab === 'register-payment'
                ? 'text-purple-600 font-extrabold scale-105'
                : 'text-slate-400 font-medium'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Pagos</span>
          </button>
        )}

        {/* Pestaña Gestiones en Barra Móvil (Abre Selector) */}
        {isSuperAdmin && (
          <button
            onClick={() => setGestionesModalOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isGestionesActive ? 'text-amber-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Gestiones</span>
          </button>
        )}
      </div>

      {/* MINI MODAL SELECTOR DE GESTIONES (Estilo selector de doble rol alumno/profesor) */}
      {gestionesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block">
                  Panel de Administración
                </span>
                <h3 className="text-lg font-black text-slate-900">¿Qué deseas gestionar hoy?</h3>
              </div>
              <button
                onClick={() => setGestionesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col space-y-2.5 pt-1">
              {/* Opción 1: Alumnas */}
              <button
                onClick={() => handleSelectGestion('students')}
                className="w-full p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-left transition-all flex items-center gap-3.5 group active:scale-98"
              >
                <div className="p-2.5 rounded-2xl bg-amber-600 text-white shadow-sm shadow-amber-300">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm group-hover:text-amber-900 transition-colors">
                    Gestión de Alumnas
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    Altas, edición, turnos y tutores autorizados
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-600/70 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opción 2: Profesores */}
              <button
                onClick={() => handleSelectGestion('teachers')}
                className="w-full p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-left transition-all flex items-center gap-3.5 group active:scale-98"
              >
                <div className="p-2.5 rounded-2xl bg-purple-700 text-white shadow-sm shadow-purple-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm group-hover:text-purple-900 transition-colors">
                    Gestión de Profesores
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    Equipo docente, contraseñas y permisos
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-600/70 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opción 3: ABM Conceptos de Pago */}
              <button
                onClick={() => handleSelectGestion('payment-concepts')}
                className="w-full p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left transition-all flex items-center gap-3.5 group active:scale-98"
              >
                <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-300">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-900 transition-colors">
                    Gestión de Conceptos de Pago (ABM)
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    Aranceles, cuotas, matrículas y clases sueltas
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-600/70 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opción 4: Reportes de Ingresos */}
              <button
                onClick={() => handleSelectGestion('reports')}
                className="w-full p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-left transition-all flex items-center gap-3.5 group active:scale-98"
              >
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-900 transition-colors">
                    Reportes de Ingresos y Balance
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    Módulo financiero, balance mensual, métricas y analítica
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-600/70 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opción 5: Gastos Fijos */}
              <button
                onClick={() => handleSelectGestion('expenses')}
                className="w-full p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-left transition-all flex items-center gap-3.5 group active:scale-98"
              >
                <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-sm shadow-rose-300">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm group-hover:text-rose-900 transition-colors">
                    Gastos Fijos del Estudio
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    Alquiler, servicios, comprobantes y gastos recurrentes
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-600/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button
              onClick={() => setGestionesModalOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs transition-colors mt-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
