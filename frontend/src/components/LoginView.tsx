import React, { useState } from 'react';
import { LogIn, ArrowRight, Lock, UserCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { loginWithDNI } from '../services/api';
import { LoginResponse } from '../types';

interface LoginViewProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

type Step = 'DNI' | 'DUAL_ROLE' | 'PASSWORD';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('DNI');
  const [roleChoice, setRoleChoice] = useState<'ADMIN' | 'STUDENT' | undefined>(undefined);
  const [adminName, setAdminName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmitDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim()) {
      setError('Por favor ingresá un número de DNI.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await loginWithDNI(dni.trim());
      handleLoginResponse(response);
    } catch (err: any) {
      setError(err.message || 'Error al ingresar. Verificá el DNI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (choice: 'ADMIN' | 'STUDENT') => {
    setRoleChoice(choice);
    setError(null);
    setLoading(true);

    try {
      const response = await loginWithDNI(dni.trim(), undefined, choice);
      handleLoginResponse(response);
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor ingresá tu contraseña.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await loginWithDNI(dni.trim(), password.trim(), roleChoice || 'ADMIN');
      handleLoginResponse(response);
    } catch (err: any) {
      setError(err.message || 'Contraseña incorrecta. Verificá e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginResponse = (response: LoginResponse) => {
    if (response.type === 'DUAL_ROLE_REQUIRED') {
      setAdminName(response.adminName || 'Docente');
      setStudentName(response.studentName || 'Alumna');
      setStep('DUAL_ROLE');
    } else if (response.type === 'PASSWORD_REQUIRED') {
      setAdminName(response.fullName || 'Docente');
      setStep('PASSWORD');
    } else {
      onLoginSuccess(response);
    }
  };

  const resetToStart = () => {
    setStep('DNI');
    setPassword('');
    setRoleChoice(undefined);
    setError(null);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-100 via-pink-50 to-purple-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8">
          {/* Logo Vulpiare */}
          <div className="text-center mb-6">
            <div className="inline-block p-1 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 shadow-xl shadow-purple-200/50 mb-3">
              <img
                src="/vulpiare_logo.png"
                alt="VULPIARE Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover bg-white p-0.5"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              VULPIARE
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              Control de Asistencia & Retiros
            </p>
          </div>

          {/* PASO 1: Ingrese DNI */}
          {step === 'DNI' && (
            <form onSubmit={handleSubmitDni} className="space-y-5">
              <div>
                <label htmlFor="dni" className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  Número de DNI
                </label>
                <div className="relative">
                  <input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Ingresá el DNI..."
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all min-h-[48px]"
                    autoFocus
                  />
                  <LogIn className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-purple-300/50 hover:shadow-purple-400/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] min-h-[50px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PASO DOBLE ROL: Seleccionar si ingresa como Profesora o como Alumna */}
          {step === 'DUAL_ROLE' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Doble Perfil Detectado</p>
                <h2 className="text-lg font-black text-slate-900">¿Cómo deseas ingresar hoy?</h2>
              </div>

              <button
                onClick={() => handleSelectRole('ADMIN')}
                disabled={loading}
                className="w-full p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition-all flex items-center gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-purple-600 text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Como Profesora / Admin</p>
                  <p className="text-xs font-medium text-slate-500">{adminName}</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectRole('STUDENT')}
                disabled={loading}
                className="w-full p-4 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-left transition-all flex items-center gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-pink-600 text-white">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Como Alumna / Portal de Padres</p>
                  <p className="text-xs font-medium text-slate-500">{studentName}</p>
                </div>
              </button>

              <button
                onClick={resetToStart}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver e ingresar otro DNI</span>
              </button>
            </div>
          )}

          {/* PASO CONTRASEÑA: Para Docentes y Super Admin */}
          {step === 'PASSWORD' && (
            <form onSubmit={handleSubmitPassword} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-slate-700">
                    Contraseña de Docente
                  </label>
                  <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    {adminName}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Ingresá tu contraseña..."
                    className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all min-h-[48px]"
                    autoFocus
                  />
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-purple-300/50 hover:shadow-purple-400/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] min-h-[50px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ingresar Panel</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetToStart}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
