import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function WorkspaceBrandingSync() {
  const branding = useStore(s => s.workspaceBranding);
  const load = useStore(s => s.loadWorkspaceBranding);
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [load]);
  useEffect(() => {
    document.title = `${branding.appName} — Xếp lịch & Chấm công`;
    document.documentElement.style.setProperty('--workspace-primary', branding.primaryColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', branding.primaryColor);
  }, [branding]);
  return null;
}
