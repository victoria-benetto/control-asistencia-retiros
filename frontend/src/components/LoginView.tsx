import React, { useState } from 'react';
import { LogIn, ArrowRight } from 'lucide-react';
import { loginWithDNI } from '../services/api';
import { LoginResponse } from '../types';

interface LoginViewProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim()) {
      setError('Por favor ingresá un número de DNI.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await loginWithDNI(dni.trim());
      onLoginSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Error al ingresar. Verificá el DNI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-100 via-pink-50 to-purple-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8">
          {/* Logo Vulpiare */}
          <div className="text-center mb-8">
            <div className="inline-block p-1 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 shadow-xl shadow-purple-200/50 mb-3">
              <img
                src="/vulpiare_logo.png"
                alt="VULPIARE Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover bg-white p-0.5"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              VULPIARE
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              Control de Asistencia & Retiros
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
        </div>
      </div>
    </div>
  );
};
