import { useState } from 'react';
import { useStore } from '../store/useStore';
import { canApproveSchedule, isOpsManager } from '../lib/authSession';
import { weekRecordKey, weekStatusMeta, isWeekLocked } from '../utils/scheduleWeek';
import { telegramConfigured } from '../utils/telegram';
import { toast } from '../components/ui/toastStore';

export default function WeekFlowBar({ storeId, weekDate }) {
  const user = useStore(s => s.user);
  const scheduleWeeks = useStore(s => s.scheduleWeeks) || {};
  const saveWeekStatus = useStore(s => s.saveWeekStatus);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!storeId || storeId === 'ALL' || !weekDate) {
    return (
      <div className="text-[11px] text-slate-500 px-1">Chọn 1 cửa hàng để gửi duyệt lịch tuần.</div>
    );
  }

  const rec = scheduleWeeks[weekRecordKey(storeId, weekDate)];
  const status = rec?.status || 'draft';
  const meta = weekStatusMeta(status);
  const canSubmit = isOpsManager(user) && (status === 'draft' || status === 'rejected');
  const canReview = canApproveSchedule(user) && status === 'pending';
  const locked = isWeekLocked(status);

  const run = async (next, extraNote) => {
    setBusy(true);
    try {
      await saveWeekStatus({ storeId, weekDate, status: next, reviewNote: extraNote || note });
      setNote('');
    } catch (e) {
      toast.error(e.message || 'Không cập nhật được trạng thái tuần. Chạy sql_schedule_weeks.sql trên Supabase.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs border rounded-xl px-3 py-2 ${meta.cls}`}>
      <span className="font-black">{meta.label}</span>
      <span className="text-[11px] opacity-80">{storeId} · {weekDate}{locked ? ' · khóa sửa ô' : ''}</span>
      {rec?.reviewNote && status === 'rejected' && (
        <span className="text-[11px]">Lý do: {rec.reviewNote}</span>
      )}
      {canSubmit && (
        <button type="button" disabled={busy} onClick={() => run('pending')} className="ml-auto px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold disabled:opacity-50">
          Gửi duyệt
        </button>
      )}
      {canReview && (
        <>
          <input
            className="border border-amber-300 rounded-lg px-2 py-1 text-[11px] bg-white min-w-[140px]"
            placeholder="Ghi chú (nếu từ chối)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button type="button" disabled={busy} onClick={() => run('approved')} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-50">Duyệt</button>
          <button type="button" disabled={busy} onClick={() => run('rejected', note || 'Cần chỉnh lại')} className="px-2.5 py-1 rounded-lg bg-white border border-red-300 text-red-700 font-bold disabled:opacity-50">Từ chối</button>
        </>
      )}
      {telegramConfigured() && <span className="text-[10px] opacity-70">Telegram bật</span>}
    </div>
  );
}
