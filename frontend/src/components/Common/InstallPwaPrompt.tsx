import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detectar si ya está corriendo en modo Standalone (App instalada)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // 2. Detectar si es iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIPhoneOrIPad);

    // Si es iOS y no fue descartado en esta sesión, mostramos el prompt guiado tras 2 segundos
    const dismissedIOS = sessionStorage.getItem('vulpiare_pwa_ios_dismissed');
    if (isIPhoneOrIPad && !dismissedIOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // 3. Capturar evento de instalación nativo en Chrome / Android / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Si no fue descartado en esta sesión, mostramos el banner
      const dismissed = sessionStorage.getItem('vulpiare_pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('Error al invocar prompt PWA:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    if (isIOS) {
      sessionStorage.setItem('vulpiare_pwa_ios_dismissed', 'true');
    } else {
      sessionStorage.setItem('vulpiare_pwa_prompt_dismissed', 'true');
    }
  };

  // Si ya está instalada a pantalla completa o no hay prompt activo, no mostrar nada
  if (isStandalone || (!showPrompt && !installedSuccess)) {
    return null;
  }

  // Notificación de éxito al instalar
  if (installedSuccess) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span className="text-xs font-bold">¡VULPIARE se instaló correctamente en tu celular!</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md w-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border border-purple-200 text-slate-800 flex flex-col gap-3 relative overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

        {/* Botón cerrar */}
        <button
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          title="Cerrar"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header con Logo */}
        <div className="flex items-center gap-3 pr-6">
          <img
            src="/vulpiare_logo.png"
            alt="Logo Vulpiare"
            className="w-12 h-12 rounded-2xl object-cover bg-purple-900 border border-purple-300/40 p-1 shrink-0 shadow-sm"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                App Oficial
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" />
                Pantalla Completa
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
              Instalá VULPIARE en tu celular
            </h4>
          </div>
        </div>

        {/* Explicación según plataforma */}
        {!isIOS ? (
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Instalá la aplicación para ingresar directo desde tu pantalla de inicio, sin barras del navegador y con actualización instantánea.
          </p>
        ) : !showIOSGuide ? (
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Agregá VULPIARE a tu pantalla de inicio en iPhone para abrirla a pantalla completa como una app nativa.
          </p>
        ) : (
          /* Guía paso a paso para iPhone / Safari */
          <div className="bg-purple-50/80 rounded-2xl p-3 border border-purple-100 text-xs text-purple-950 space-y-2">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-purple-700 block">
              Cómo instalar en iPhone (Safari):
            </span>
            <div className="flex items-center gap-2 font-medium">
              <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <span>Tocá el botón <strong>Compartir</strong> (<Share2 className="w-3.5 h-3.5 inline text-purple-700" /> en la barra inferior).</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <span>Deslizá hacia abajo y elegí <strong>"Agregar a pantalla de inicio"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-purple-700" />).</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <span>Tocá <strong>"Agregar"</strong> arriba a la derecha. ¡Listo!</span>
            </div>
          </div>
        )}

        {/* Botonera de Acción */}
        <div className="flex items-center gap-2 pt-1">
          {!isIOS ? (
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md shadow-purple-200 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicación</span>
            </button>
          ) : !showIOSGuide ? (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md shadow-purple-200 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Cómo instalar en mi iPhone</span>
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md shadow-purple-200 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>¡Entendido!</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
