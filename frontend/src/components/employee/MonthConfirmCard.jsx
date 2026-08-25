import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { getPayrollCycle } from '../../utils/payrollCycle';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';

const pad = n => String(n).padStart(2, '0');
const DAY_KEYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Thong bao ngay 25 hang thang: NV xac nhan bang cong chu ky 26->25 vua chot.
 * Luu duoi bang feedbacks: shift='XAC_NHAN_CONG', date=cycleKey ('YYYY-MM').
 */
export default function MonthConfirmCard() {
  const { user, schedule } = useStore(st => ({ user: st.user, schedule: st.schedule }));
  const attendance = useStore(st => st.attendance);
  const loadAttendanceRange = useStore(st => st.loadAttendanceRange);
  
  const cycle = useMemo(() => getPayrollCycle(new Date()), []);
  const isWindow = new Date().getDate() >= 25;
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(null);   // row xac nhan neu da co
  const [busy, setBusy] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  // Tai cong thuc te ezHR cho chu ky
  useEffect(() => {
    if (!user?.id) return;
    loadAttendanceRange(cycle.from, cycle.to).catch(() => {});
  }, [user?.id, cycle.from, cycle.to, loadAttendanceRange]);

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
      const { shift } = normalizeShift(raw);
      let h = 0;
      const att = attendance[user?.id + '|' + d.dateStr];
      if (att && att.actualHours > 0) h = Number(att.actualHours);
      else if (shift && shift !== 'off') h = getShiftHours(shift);
      total += h;
      rows.push({ label: d.label, h });
    });
    return { total: Math.round(total * 100) / 100, rows };
  }, [schedule, attendance, user?.id, cycle]);

  useEffect(() => {
    if (!isWindow || !user?.id) return;
    let alive = true;
    api.getFeedbacks({ empId: user.id, limit: 300 }).then(rows => {
      if (!alive) return;
      setMine((rows || []).find(r => r.shift === 'XAC_NHAN_CONG' && r.date === cycle.key) || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [isWindow, user?.id, cycle.key]);

  if (!isWindow) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await api.addFeedback({
        empId: user.id, empName: user.name, dept: user.dept,
        empRole: user.role || user.type, empType: user.type,
        date: cycle.key, shift: 'XAC_NHAN_CONG', hours: monthHours.total,
        reason: '', note: 'NV xac nhan du/dung cong chu ky ' + cycle.label,
        status: 'confirmed'
      });
      setMine({ date: cycle.key, status: 'confirmed' });
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const dispute = async () => {
    setBusy(true);
    try {
      await api.addFeedback({
        empId: user.id, empName: user.name, dept: user.dept,
        empRole: user.role || user.type, empType: user.type,
        date: cycle.key, shift: 'XAC_NHAN_CONG', hours: monthHours.total,
        reason: disputeText || 'Cong thieu/chenh lech', note: 'NV bao chenh lech chu ky ' + cycle.label,
        status: 'pending'
      });
      setMine({ date: cycle.key, status: 'pending' });
    } catch (e) { console.error(e); }
    setBusy(false);
    setShowDispute(false);
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${mine ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300 animate-pulse'}`}>
      <button type="button" className="w-full flex items-center gap-3 text-left cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${mine ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {mine ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-black ${mine ? 'text-emerald-900' : 'text-amber-900'}`}>
            {mine ? `Bạn đã xác nhận công chu kỳ ${cycle.label} ✓` : `Bảng công chu kỳ ${cycle.label} đã chốt — xác nhận nhé!`}
          </div>
          <div className={`text-xs mt-0.5 ${mine ? 'text-emerald-700' : 'text-amber-700'}`}>
            {mine ? (mine.status === 'confirmed' ? 'Cảm ơn bạn. SM sẽ tổng hợp gửi C&B.' : 'Yêu cầu chênh lệch đã gửi — SM sẽ kiểm tra.') : 'Kiểm tra tổng giờ của bạn rồi bấm xác nhận đúng/đủ công'}
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && !mine && (
        <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
          <p className="text-xs text-slate-600">
            Tổng giờ ghi nhận chu kỳ này: <b>{monthHours.total}h</b>.
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
              <textarea value={disputeText} onChange={e => setDisputeText(e.target.value)} rows={2}
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