import { useState, useEffect } from 'react';

let deferredPrompt = null;
const listeners = new Set();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path for SW to work on subpaths (e.g. GitHub Pages /exel_pro/)
      const swUrl = `${import.meta.env.BASE_URL || './'}sw.js`;
      navigator.serviceWorker.register(swUrl)
        .then((reg) => {
          console.log('[DNTgs25] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[DNTgs25] Service Worker registration failed:', err);
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
      console.log('[DNTgs25] App was successfully installed!');
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
        console.log('[DNTgs25] User accepted install prompt');
      } else {
        console.log('[DNTgs25] User dismissed install prompt');
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
