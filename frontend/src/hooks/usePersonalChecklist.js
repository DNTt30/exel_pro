import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export function personalChecklistKey(user, now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  return `personal-checklist-v2:${user?.id || 'anonymous'}:${user?.dept || ''}:${date}`;
}
export function usePersonalChecklist() {
  const user = useStore(s => s.user);
  const [now, setNow] = useState(() => new Date());
  const key = personalChecklistKey(user, now);
  const [state, setState] = useState({ key: '', tasks: {} });
  useEffect(() => {
    let tasks = {};
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) tasks = stored;
    } catch { /* Start empty if storage is unavailable. */ }
    setState({ key, tasks });
  }, [key]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  const tasks = state.key === key ? state.tasks : {};
  const update = updater => setState(previous => {
    const next = typeof updater === 'function' ? updater(previous.key === key ? previous.tasks : {}) : updater;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Remains a local convenience, never an operational record. */ }
    return { key, tasks: next };
  });
  return [tasks, update];
}
