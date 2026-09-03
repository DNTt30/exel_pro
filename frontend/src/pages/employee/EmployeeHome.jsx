import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ArrowRightLeft, ChevronRight, ShoppingBasket, Send, Coffee } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, SCHEDULE_RULES } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { getStoreLabel, isSupportAssignment, getSwapsForWeek, getSwapBadgeForDay } from '../../utils/scheduleAnnotations';
import { collectExpiryAlerts } from '../../utils/shelfExpiry';
import { useShallow } from 'zustand/react/shallow';
import MonthConfirmCard from '../../components/employee/MonthConfirmCard';

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

  const weekDayDates = useMemo(() => {
    if (!currentWeek) return {};
    const parts = currentWeek.split('-').map(Number);
    if (parts.length !== 3) return {};
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const map = {};
    WEEK_DAYS.forEach((d, idx) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + idx);
      map[d] = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    });
    return map;
  }, [currentWeek]);
  const swapToday = getSwapBadgeForDay(swapsWeek, user?.id, todayKey);
  const pendingForMe = (shiftSwaps || []).filter((s) => s.toEmpId === user?.id && s.status === 'pending_partner');

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


  const pendingCount = pendingForMe.length;
  const expiryCount = expiryWarn.length;

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-4 pb-8">

      {/* ── Header chào hỏi + chip tuần ── */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">{greeting}, {firstName} 👋</p>
          <h1 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{user?.name}</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{todayStr} · {myDept || '—'}{isPT ? ' · Part-time' : ' · Full-time'}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 whitespace-nowrap">
          <CalendarDays size={12} /> Tuần {currentWeek}
        </span>
      </div>

      <MonthConfirmCard />

      {/* ── Hero: ca hôm nay ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Hôm nay · {todayKey}</span>
            {todayOff ? (
              <div className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-0.5"><Coffee size={22} /> Nghỉ</div>
            ) : (
              <div className="text-xl sm:text-2xl font-black truncate mt-0.5">{shiftLabel(todayShift)} <span className="text-white/70 text-base font-bold">· {todayShift}</span></div>
            )}
            {!todayOff && isSupport && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-100 bg-amber-500/20 border border-amber-300/30 rounded-lg px-2 py-0.5">
                <MapPin size={11} /> Hỗ trợ {getStoreLabel(stores, covering_store)}
              </div>
            )}
            {todayOff && nextShift && (
              <p className="mt-1 text-[11px] text-white/80">Tiếp theo: <b>{nextShift.dayKey}</b> · {shiftLabel(nextShift.shift)} ({nextShift.shift})</p>
            )}
          </div>
          {/* Đồng hồ giờ trong ca */}
          <div className="flex-shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Tuần này</div>
            <div className="text-2xl font-black leading-none mt-1">{totalH}<span className="text-sm text-white/70">h</span></div>
            <div className="w-24 h-1.5 rounded-full bg-white/20 overflow-hidden mt-1.5">
              <div className={`h-full rounded-full ${hourWarn ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: pct + '%' }} />
            </div>
            <div className={`text-[10px] font-semibold mt-1 ${hourWarn ? 'text-amber-200' : 'text-white/70'}`}>{hourNote}</div>
          </div>
        </div>
        {swapToday && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 border border-white/25 rounded-lg px-2 py-0.5">
            <ArrowRightLeft size={11} /> {swapToday.label}
          </div>
        )}
      </div>

      {/* ── Hàng 4 ô thống kê — luôn hiện, hết trạng thái trống ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link to="/employee/schedule" className="rounded-xl p-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Số ca tuần</div>
          <div className="text-lg font-black text-slate-800 leading-tight">{totalShifts}<span className="text-xs font-bold text-slate-400"> / {isPT ? 'tuần' : '6 ca'}</span></div>
        </Link>
        <Link to="/employee/schedule" className="rounded-xl p-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Giờ định mức</div>
          <div className={`text-lg font-black leading-tight ${hourWarn ? 'text-amber-600' : 'text-emerald-600'}`}>{isPT ? `${totalH}/23h` : `${totalH}/48h`}</div>
        </Link>
        <Link to="/employee/schedule" className={`rounded-xl p-3 border transition-colors shadow-sm ${pendingCount > 0 ? 'bg-indigo-50 border-indigo-300 animate-pulse' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Đổi ca chờ</div>
          <div className={`text-lg font-black leading-tight ${pendingCount > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>{pendingCount > 0 ? pendingCount : '—'}</div>
        </Link>
        <Link to="/employee/shelves" className={`rounded-xl p-3 border transition-colors shadow-sm ${expiryCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kệ sắp hạn</div>
          <div className={`text-lg font-black leading-tight ${expiryCount > 0 ? 'text-amber-700' : 'text-slate-300'}`}>{expiryCount > 0 ? expiryCount : '—'}</div>
        </Link>
      </div>

      {/* ── Dải tuần T2→CN — tile giàu thông tin hơn ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((d) => {
            const raw = mySched[d] || '';
            const { shift, covering_store } = normalizeShift(raw);
            const working = shift && shift !== 'off';
            const isToday = d === todayKey;
            return (
              <div key={d}
                className={`rounded-lg px-0.5 py-1.5 text-center border ${working ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'} ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                <div className={`text-[9px] font-black ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>{d}</div>
                {weekDayDates[d] && (
                  <div className="text-[7.5px] font-mono text-slate-400 font-medium leading-none -mt-0.5">{weekDayDates[d]}</div>
                )}
                <div className={`text-[11px] font-black mt-0.5 ${working ? 'text-blue-700' : 'text-slate-300'}`}>{working ? shift : 'Nghỉ'}</div>
                <div className="text-[8px] font-medium text-slate-400 truncate">{working ? (covering_store ? '→ ' + covering_store : shiftLabel(shift).replace('Ca ', '')) : ''}</div>
              </div>
            );
          })}
        </div>
        {swapsWeek.length > 0 && (
          <Link to="/employee/schedule" className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
            <ArrowRightLeft size={12} /> {swapsWeek.length} đổi ca trong tuần này <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* ── Nút tắt nhanh ── */}
      <div className="grid grid-cols-4 gap-2">
        <Link to="/employee/schedule" className="flex flex-col items-center justify-center gap-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold shadow-md shadow-blue-500/20 transition-colors">
          <CalendarDays size={15} /> Lịch ca
        </Link>
        <Link to="/employee/timesheet" className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-bold transition-colors">
          <Clock size={15} /> Chấm công
        </Link>
        <Link to="/employee/feedback" className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-bold transition-colors">
          <Send size={15} /> Bù công
        </Link>
        <Link to="/employee/shelves" className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-bold transition-colors">
          <ShoppingBasket size={15} /> Kệ hàng
        </Link>
      </div>
    </div>
  );
}