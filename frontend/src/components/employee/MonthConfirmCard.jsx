import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { getPayrollCycle } from '../../utils/payrollCycle';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { homeWeek } from '../../utils/employeeHome';

const pad = n => String(n).padStart(2, '0');
const DAY_KEYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Thong bao ngay 25 hang thang: NV xac nhan bang cong chu ky 26->25 vua chot.
 * Luu duoi bang feedbacks: shift='XAC_NHAN_CONG', date=cycleKey ('YYYY-MM').
 */
export default function MonthConfirmCard({ onlyPending = false }) {
  const user = useStore(st => st.user);
  const schedule = useStore(st => st.schedule);
  const attendance = useStore(st => st.attendance);
  const loadAttendanceRange = useStore(st => st.loadAttendanceRange);
  const ensureWeeksLoaded = useStore(st => st.ensureWeeksLoaded);
  
  const cycle = useMemo(() => getPayrollCycle(new Date()), []);
  const isWindow = new Date().getDate() >= 25;
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(null);   // row xac nhan neu da co
  const [busy, setBusy] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);

  // Tong cong thang: uu tien attendance (ezHR), khong co thi theo lich xep
  const monthHours = useMemo(() => {
    let total = 0;
    const rows = [];
    cycle.days.forEach(d => {
      const dt = new Date(d.dateStr + 'T00:00:00');
      const dowMon0 = (dt.getDay() + 6) % 7;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - dowMon0);
      const wk = monday.getFullYear() + '-' + pad(monday.getMonth() + 1) + '-' + pad(monday.getDate());
      const raw = schedule[wk]?.[user?.id]?.[DAY_KEYS[dowMon0]] || '';
      const { shift, confirmed } = normalizeShift(raw);
      let h = 0;
      const att = attendance[user?.id + '|' + d.dateStr];
      if (att && att.actualHours != null && Number.isFinite(Number(att.actualHours))) h = Number(att.actualHours);
      else if (confirmed && shift && shift !== 'off') h = getShiftHours(shift);
      total += h;
      rows.push({ label: d.label, h });
    });
    return { total: Math.round(total * 100) / 100, rows };
  }, [schedule, attendance, user?.id, cycle]);

  useEffect(() => {
    if (!isWindow || !user?.id) return;
    let alive = true;
    setReady(false); setError(''); setMine(null);
    const weeks = [...new Set(cycle.days.map(day => homeWeek(new Date(`${day.dateStr}T12:00:00`))))];
    Promise.all([api.getMonthConfirmations(cycle.key, user.id), loadAttendanceRange(cycle.from, cycle.to), ensureWeeksLoaded(weeks)]).then(([rows]) => {
      if (!alive) return;
      setMine(rows[0] || null); setReady(true);
    }).catch(() => { if (alive) setError('Chưa tải đủ bảng công hoặc trạng thái xác nhận. Vui lòng thử lại trước khi xác nhận.'); });
    return () => { alive = false; };
  }, [isWindow, user?.id, cycle, retry, loadAttendanceRange, ensureWeeksLoaded]);

  if (!isWindow || (onlyPending && mine?.status === 'confirmed')) return null;

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await api.addFeedback({
        empId: user.id, empName: user.name, dept: user.dept,
        empRole: user.role || user.type, empType: user.type,
        date: cycle.key, shift: 'XAC_NHAN_CONG', hours: monthHours.total,
        reason: '', note: 'NV xac nhan du/dung cong chu ky ' + cycle.label,
        status: 'confirmed'
      });
      setMine({ date: cycle.key, status: 'confirmed' });
    } catch { setError('Chưa lưu được xác nhận. Hãy thử lại.'); }
    setBusy(false);
  };

  const dispute = async () => {
    setBusy(true); setError('');
    try {
      await api.addFeedback({
        empId: user.id, empName: user.name, dept: user.dept,
        empRole: user.role || user.type, empType: user.type,
        date: cycle.key, shift: 'XAC_NHAN_CONG', hours: monthHours.total,
        reason: disputeText || 'Cong thieu/chenh lech', note: 'NV bao chenh lech chu ky ' + cycle.label,
        status: 'pending'
      });
      setMine({ date: cycle.key, status: 'pending' });
      setShowDispute(false);
    } catch { setError('Chưa gửi được báo chênh lệch. Nội dung vẫn được giữ để thử lại.'); }
    setBusy(false);
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${mine?.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
      {!ready && !error && <p role="status">Đang tải trạng thái xác nhận công…</p>}
      {error && <p role="alert" className="text-red-700">{error} {!ready && <button type="button" className="min-h-11 underline" onClick={() => setRetry(v => v + 1)}>Tải lại trạng thái</button>}</p>}
      <button type="button" className="w-full flex items-center gap-3 text-left cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${mine?.status === 'confirmed' ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {mine?.status === 'confirmed' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-black ${mine?.status === 'confirmed' ? 'text-emerald-900' : 'text-amber-900'}`}>
            {mine?.status === 'confirmed' ? `Bạn đã xác nhận công chu kỳ ${cycle.label} ✓` : mine ? `Bạn đã gửi phản hồi công chu kỳ ${cycle.label}` : `Kiểm tra và xác nhận công chu kỳ ${cycle.label}`}
          </div>
          <div className={`text-xs mt-0.5 ${mine?.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {mine ? (mine.status === 'confirmed' ? 'Cảm ơn bạn. SM sẽ tổng hợp gửi C&B.' : 'Yêu cầu chênh lệch đã gửi — SM sẽ kiểm tra.') : 'Kiểm tra tổng giờ của bạn rồi bấm xác nhận đúng/đủ công'}
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && ready && !mine && (
        <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
          <p className="text-xs text-slate-600">
            Tổng giờ tham khảo: <b>{monthHours.total}h</b>. Ngày chưa có công thực tế dùng lịch đã tải; hãy đối chiếu trang Chấm công trước khi xác nhận.
          </p>
          {!showDispute ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={confirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors">
                <CheckCircle2 size={14} /> Tôi xác nhận đúng & đủ công
              </button>
              <button type="button" onClick={() => setShowDispute(true)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors">
                Báo chênh lệch
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea aria-label="Nội dung chênh lệch công" value={disputeText} onChange={e => setDisputeText(e.target.value)} rows={2}
                placeholder="Mô tả ngày/thiếu công cần SM kiểm tra..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={dispute}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors">
                  Gửi báo cáo
                </button>
                <button type="button" onClick={() => setShowDispute(false)}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
