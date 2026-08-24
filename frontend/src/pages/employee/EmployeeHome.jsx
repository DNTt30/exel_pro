import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ArrowRightLeft, AlertTriangle, ChevronRight, CalendarClock, ShoppingBasket, Send, Coffee } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, SCHEDULE_RULES } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { getStoreLabel, isSupportAssignment, getSwapsForWeek, getSwapBadgeForDay } from '../../utils/scheduleAnnotations';
import { collectExpiryAlerts } from '../../utils/shelfExpiry';
import { useShallow } from 'zustand/react/shallow';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

const SHIFT_LABELS = { '6-14': 'Ca sáng', '14-22': 'Ca chiều', '22-6': 'Ca đêm', '10-18': 'Ca giữa', '6-10': 'Phụ sáng', '10-14': 'Phụ trưa', '14-18': 'Phụ chiều', '18-22': 'Phụ tối' };

function shiftLabel(code) {
  return SHIFT_LABELS[code] || ('Ca ' + code);
}

export default function EmployeeHome() {
  const { user, schedule, currentWeek, shiftSwaps, stores, shelves, shelfItems } = useStore(useShallow((s) => ({ user: s.user, schedule: s.schedule, currentWeek: s.currentWeek, shiftSwaps: s.shiftSwaps, stores: s.stores, shelves: s.shelves, shelfItems: s.shelfItems })));
  const mySched = schedule[currentWeek]?.[user?.id] || EMPTY_SCHED;
  const myDept = user?.dept || '';
  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && String(user.role).includes('PT'));

  const now = new Date();
  const todayKey = WEEK_DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const todayRaw = mySched[todayKey] || '';
  const { shift: todayShift, covering_store } = normalizeShift(todayRaw);
  const todayOff = !todayShift || todayShift === 'off';
  const isSupport = isSupportAssignment(todayRaw, myDept);

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const firstName = String(user?.name || '').trim().split(/\s+/).pop() || '';
  const todayStr = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(now);

  const { totalH, totalShifts } = useMemo(() => {
    let h = 0; let n = 0;
    WEEK_DAYS.forEach((d) => {
      const { shift } = normalizeShift(mySched[d]);
      if (shift && shift !== 'off') { n += 1; h += getShiftHours(shift); }
    });
    return { totalH: h, totalShifts: n };
  }, [mySched]);

  const swapsWeek = getSwapsForWeek(shiftSwaps, user?.id, currentWeek);
  const swapToday = getSwapBadgeForDay(swapsWeek, user?.id, todayKey);
  const pendingForMe = (shiftSwaps || []).filter((s) => s.toEmpId === user?.id && s.status === 'pending_partner');
  const firstPendingPartner = pendingForMe[0]?.fromEmpName || pendingForMe[0]?.fromEmpId || '';

  // Ca làm tiếp theo trong tuần (chỉ khi hôm nay OFF)
  const nextShift = useMemo(() => {
    if (!todayOff) return null;
    const startIdx = WEEK_DAYS.indexOf(todayKey);
    for (let i = 1; i <= 7; i++) {
      const d = WEEK_DAYS[(startIdx + i) % 7];
      if (d === todayKey) break;
      const { shift } = normalizeShift(mySched[d]);
      if (shift && shift !== 'off') return { dayKey: d, shift };
    }
    return null;
  }, [mySched, todayKey, todayOff]);

  const hourNote = isPT
    ? (totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK
      ? `Vượt ${totalH}h / 23h`
      : totalH > 0 && totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK
        ? `Thiếu ${totalH}h / 16h`
        : `${totalH}h / 16–23h`)
    : `${totalH}h / ${totalShifts} ca (chuẩn 48h)`;

  const expiryWarn = useMemo(() => {
    // assigneeId có thể là comma-separated khi kệ giao cho nhiều NV
    const mine = (shelves || []).filter((s) =>
      s.assigneeId && s.assigneeId.split(',').map((id) => id.trim()).includes(user?.id)
    );
    return collectExpiryAlerts(mine, shelfItems);
  }, [shelves, shelfItems, user?.id]);

  const hourWarn = isPT
    ? totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK || (totalH > 0 && totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK)
    : totalH < SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK;

  const target = isPT ? SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK : 48;
  const pct = Math.max(0, Math.min(100, Math.round((totalH / (target || 1)) * 100)));

  return (
    <div className="p-4 sm:p-6 max-w-3xl lg:max-w-6xl mx-auto space-y-4 lg:space-y-0 pb-10">

      {/* ── Header chào hỏi ── */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">{greeting}, {firstName}</p>
        <h1 className="text-xl font-black text-slate-800 leading-tight">{user?.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{todayStr} · {myDept}{isPT ? ' · Part-time' : ''}</p>
      </div>

      {/* ── Cảnh báo hành động: đơn đổi ca chờ MÌNH xác nhận ── */}
      {pendingForMe.length > 0 && (
        <Link to="/employee/schedule" className="flex items-center gap-3 rounded-2xl p-4 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0"><ArrowRightLeft size={17} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-indigo-900">{pendingForMe.length} đơn đổi ca chờ bạn xác nhận</div>
            <div className="text-xs text-indigo-700 truncate">Từ {firstPendingPartner} · nhấn để xem và phản hồi</div>
          </div>
          <ChevronRight size={16} className="text-indigo-400" />
        </Link>
      )}

      {/* ── Khối nội dung: 1 cột mobile, 3 cột desktop ── */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 items-start">

      {/* ── Hero: ca hôm nay ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 lg:col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Ca hôm nay · {todayKey}</span>
          <CalendarClock size={15} className="text-white/50" />
        </div>
        {todayOff ? (
          <div>
            <div className="text-2xl font-black flex items-center gap-2"><Coffee size={24} /> Hôm nay bạn nghỉ</div>
            {nextShift && (
              <p className="mt-1.5 text-xs text-white/80">Ca tiếp theo: <b>{nextShift.dayKey}</b> · {shiftLabel(nextShift.shift)} ({nextShift.shift})</p>
            )}
          </div>
        ) : (
          <div>
            <div className="text-2xl font-black">{shiftLabel(todayShift)} <span className="text-white/70 text-lg font-bold">· {todayShift}</span></div>
            {isSupport && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-100 bg-amber-500/20 border border-amber-300/30 rounded-lg px-2 py-1">
                <MapPin size={12} /> Hỗ trợ {getStoreLabel(stores, covering_store)}
              </div>
            )}
          </div>
        )}
        {swapToday && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold bg-white/15 border border-white/25 rounded-lg px-2 py-1">
            <ArrowRightLeft size={12} /> {swapToday.label}
          </div>
        )}
      </div>

      {/* ── Giờ tuần này + thanh tiến độ ── */}
      <div className={`rounded-2xl p-4 border ${hourWarn ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Giờ tuần này</div>
        <div className={`text-lg font-black ${hourWarn ? 'text-amber-800' : 'text-slate-800'}`}>{hourNote}</div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${hourWarn ? 'bg-gradient-to-r from-amber-400 to-red-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
            style={{ width: pct + '%' }}
          />
        </div>
      </div>

      {/* ── Dải xem nhanh tuần T2→CN ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm lg:col-span-2">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((d) => {
            const raw = mySched[d] || '';
            const { shift } = normalizeShift(raw);
            const working = shift && shift !== 'off';
            const isToday = d === todayKey;
            return (
              <div key={d}
                className={`rounded-xl px-1 py-2.5 text-center border ${working ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'} ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                <div className={`text-[10px] font-bold ${isToday ? 'text-blue-700' : 'text-slate-400'}`}>{d}</div>
                <div className={`text-[11px] font-black mt-0.5 ${working ? 'text-blue-700' : 'text-slate-300'}`}>{working ? shift : '–'}</div>
              </div>
            );
          })}
        </div>
        {swapsWeek.length > 0 && (
          <Link to="/employee/schedule" className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
            <ArrowRightLeft size={12} /> {swapsWeek.length} đổi ca trong tuần này <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* ── Cảnh báo hết hạn kệ hàng ── */}
      {expiryWarn.length > 0 && (
        <Link to="/employee/shelves" className="block rounded-2xl p-4 border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
          <div className="text-sm font-black text-amber-900 flex items-center gap-1">
            <AlertTriangle size={14} /> {expiryWarn.length} món gần hết hạn trên kệ của bạn
          </div>
          <div className="text-xs text-amber-800 mt-1">
            {expiryWarn.slice(0, 3).map((x) => `${x.item.productName} (${x.st.label})`).join(' · ')}
          </div>
        </Link>
      )}

      {/* ── Nút tắt nhanh ── */}
      <div className="grid grid-cols-2 gap-2 lg:col-span-3 lg:grid-cols-4">
        <Link to="/employee/schedule" className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-colors">
          <CalendarDays size={16} /> Lịch ca
        </Link>
        <Link to="/employee/timesheet" className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors">
          <Clock size={16} /> Chấm công
        </Link>
        <Link to="/employee/feedback" className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors">
          <Send size={16} /> Bù công C&B
        </Link>
        <Link to="/employee/shelves" className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors">
          <ShoppingBasket size={16} /> Kệ của tôi
        </Link>
      </div>

      </div>{/* /khối nội dung */}
    </div>
  );
}
