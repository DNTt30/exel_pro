import { useState, useEffect } from 'react';

let deferredPrompt = null;
const listeners = new Set();

export function registerServiceWorker() {
  // Vite modules must always come from the running dev server. An old worker
  // can mix two React versions after HMR and cause invalid hook calls.
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const expectedUrl = new URL(`${import.meta.env.BASE_URL || './'}sw.js`, window.location.href).href;
      void navigator.serviceWorker.getRegistrations().then(async registrations => {
        for (const registration of registrations) {
          if ([registration.active, registration.waiting, registration.installing].some(worker => worker?.scriptURL === expectedUrl)) {
            await registration.unregister();
          }
        }
        if ('caches' in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.filter(key => (key.startsWith('dntgs25-') || key.startsWith('lichca-'))).map(key => window.caches.delete(key)));
        }
      }).catch(err => console.warn('[LichCa] Dev worker cleanup:', err?.message));
    }
    return;
  }
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path for SW to work on subpaths (e.g. GitHub Pages /exel_pro/)
      const swUrl = `${import.meta.env.BASE_URL || './'}sw.js`;
      navigator.serviceWorker.register(swUrl)
        .then((reg) => {
          console.log('[LichCa] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[LichCa] Service Worker registration failed:', err);
        });
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt = e;
      listeners.forEach((cb) => cb(true));
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      listeners.forEach((cb) => cb(false));
      console.log('[LichCa] App was successfully installed!');
    });
  }
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://');
      setIsStandalone(!!isStandaloneMode);
    };

    checkStandalone();

    const listener = (available) => {
      setCanInstall(available);
    };

    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // Detect iOS Safari
  const isIOS = typeof window !== 'undefined' && 
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && 
    !window.MSStream;

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[LichCa] User accepted install prompt');
      } else {
        console.log('[LichCa] User dismissed install prompt');
      }
      deferredPrompt = null;
      setCanInstall(false);
      return { outcome: choiceResult.outcome };
    }
    return { outcome: 'manual_ios' };
  };

  return {
    isInstallable: (canInstall || isIOS) && !isStandalone,
    isStandalone,
    isIOS,
    installApp
  };
}
