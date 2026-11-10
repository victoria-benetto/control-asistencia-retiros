// Registro y ciclo de vida de la PWA (Progressive Web App) en VULPIARE

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Registrar el Service Worker al cargar la ventana
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Comprobar actualizaciones al enfocar la pestaña
        window.addEventListener('focus', () => {
          registration.update().catch(() => {});
        });

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✨ VULPIARE PWA actualizada a la última versión en segundo plano.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('⚠️ No se pudo registrar el Service Worker de VULPIARE:', err);
      });
  });
}
