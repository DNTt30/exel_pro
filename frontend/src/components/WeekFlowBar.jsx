import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { canApproveSchedule, isOpsManager } from '../lib/authSession';
import { weekRecordKey, weekStatusMeta, isWeekLocked } from '../utils/scheduleWeek';
import { telegramConfigured } from '../utils/telegram';
import { toast } from '../components/ui/toastStore';
import { Clock, Settings } from 'lucide-react';
import { getStoreDeadlineConfig, calculateWeekDeadline } from '../utils/deadlineHelper';
import RegistrationDeadlineModal from './modals/RegistrationDeadlineModal';

export default function WeekFlowBar({ storeId, weekDate }) {
  const user = useStore(s => s.user);
  const stores = useStore(s => s.stores) || [];
  const scheduleWeeks = useStore(s => s.scheduleWeeks) || {};
  const saveWeekStatus = useStore(s => s.saveWeekStatus);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineVersion, setDeadlineVersion] = useState(0);

  // Lắng nghe thay đổi hạn nộp để re-render tức thì
  const handleDeadlineChanged = useCallback((e) => {
    if (!e.detail || e.detail.storeId === storeId) {
      setDeadlineVersion(v => v + 1);
    }
  }, [storeId]);

  useEffect(() => {
    window.addEventListener('gs25_deadline_changed', handleDeadlineChanged);
    return () => window.removeEventListener('gs25_deadline_changed', handleDeadlineChanged);
  }, [handleDeadlineChanged]);

  const deadlineInfo = useMemo(() => {
    if (!storeId || storeId === 'ALL' || !weekDate) return null;
    const cfg = getStoreDeadlineConfig(storeId, weekDate, stores);
    return calculateWeekDeadline(weekDate, cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, weekDate, stores, deadlineVersion]);

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
    <>
      <div className={`flex flex-wrap items-center gap-2 text-xs border rounded-xl px-3 py-2 ${meta.cls}`}>
        <span className="font-black">{meta.label}</span>
        <span className="text-[11px] opacity-80">{storeId} · {weekDate}{locked ? ' · khóa sửa ô' : ''}</span>
        {rec?.reviewNote && status === 'rejected' && (
          <span className="text-[11px]">Lý do: {rec.reviewNote}</span>
        )}

        {/* Badge Hạn đăng ký lịch */}
        {deadlineInfo?.enabled && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] flex items-center gap-1 shadow-2xs ${
              deadlineInfo.isExpired
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : deadlineInfo.isNearDeadline
                ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                : 'bg-white text-blue-700 border-blue-200'
            }`}>
              <Clock size={11} className={deadlineInfo.isExpired ? 'text-rose-600' : 'text-blue-600'} />
              <span>
                {deadlineInfo.isExpired ? 'Đã hết hạn nộp' : `Hạn: ${deadlineInfo.formattedDeadline}`}
              </span>
              <span className="opacity-70 font-normal">({deadlineInfo.remainingText})</span>
            </span>
          </div>
        )}

        {/* Nút thiết lập hạn chót dành cho SM / Quản lý */}
        {isOpsManager(user) && (
          <button
            type="button"
            onClick={() => setShowDeadlineModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-blue-700 border border-slate-300 font-bold text-[10px] transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Thiết lập hoặc gia hạn thời hạn đăng ký lịch tuần cho nhân viên"
          >
            <Settings size={11} />
            <span>Hạn nộp lịch</span>
          </button>
        )}

        {canSubmit && (
          <button type="button" disabled={busy} onClick={() => run('pending')} className="ml-auto px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold disabled:opacity-50 cursor-pointer">
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
            <button type="button" disabled={busy} onClick={() => run('approved')} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-50 cursor-pointer">Duyệt</button>
            <button type="button" disabled={busy} onClick={() => run('rejected', note || 'Cần chỉnh lại')} className="px-2.5 py-1 rounded-lg bg-white border border-red-300 text-red-700 font-bold disabled:opacity-50 cursor-pointer">Từ chối</button>
          </>
        )}
        {telegramConfigured() && <span className="text-[10px] opacity-70">Telegram bật</span>}
      </div>

      {/* Modal thiết lập hạn nộp */}
      {showDeadlineModal && (
        <RegistrationDeadlineModal
          isOpen={showDeadlineModal}
          onClose={() => setShowDeadlineModal(false)}
          storeId={storeId}
          weekDate={weekDate}
        />
      )}
    </>
  );
}
