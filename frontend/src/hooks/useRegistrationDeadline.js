import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { getRegistrationDeadline } from '../services/api';
import { calculateWeekDeadline } from '../utils/deadlineHelper';

export function useRegistrationDeadline(storeId, week, enabled = true) {
  const user = useStore(s => s.user);
  const key = `${user?.id}:${user?.role}:${user?.dept}:${storeId}:${week}:${enabled}`;
  const [state, setState] = useState({ key: '', rows: [], loading: true, error: '' });
  const [tick, setTick] = useState(0);
  const revision = useRef(0);
  useEffect(() => {
    let live = true;
    const ids = [...new Set(String(storeId || '').split(',').map(s => s.trim()).filter(s => s && s !== 'ALL'))];
    setState({ key, rows: [], loading: true, error: '' });
    const load = async () => {
      const run = ++revision.current;
      if (!enabled || !user?.id || !ids.length || !week) {
        if (live) setState({ key, rows: [], loading: false, error: enabled ? 'Chưa xác định cửa hàng để kiểm tra hạn đăng ký.' : '' });
        return;
      }
      try {
        const rows = await Promise.all(ids.map(async id => ({ ...await getRegistrationDeadline(id, week), receivedAt: Date.now() })));
        if (live && run === revision.current) setState({ key, rows, loading: false, error: '' });
      } catch (error) { if (live && run === revision.current) setState({ key, rows: [], loading: false, error: error.message }); }
    };
    load();
    const timer = setInterval(() => { setTick(t => t + 1); load(); }, 30000);
    window.addEventListener('focus', load);
    window.addEventListener('registration-deadline-saved', load);
    return () => { live = false; revision.current++; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('registration-deadline-saved', load); };
  }, [key]);
  const ready = state.key === key && !state.loading && !state.error && state.rows.length > 0;
  // Server clock anchors the countdown; all stores assigned to a multi-store employee
  // must permit registration, matching the backend guard.
  const results = ready ? state.rows.map(row => calculateWeekDeadline(week, row.config,
    new Date(new Date(row.serverNow).getTime() + Date.now() - row.receivedAt))) : [];
  void tick;
  results.sort((a, b) => Number(b.isExpired) - Number(a.isExpired) || (a.deadlineDate?.getTime() ?? Infinity) - (b.deadlineDate?.getTime() ?? Infinity));
  return { ready, error: state.key === key ? state.error : '', snapshot: ready ? state.rows[0] : null,
    info: results[0] || { enabled: true, isExpired: true, status: 'unavailable', formattedDeadline: 'Chưa tải được hạn đăng ký', remainingText: '' } };
}
