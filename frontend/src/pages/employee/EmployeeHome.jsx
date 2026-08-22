import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, SCHEDULE_RULES } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';
import { getStoreLabel, isSupportAssignment, getSwapsForWeek, getSwapBadgeForDay } from '../../utils/scheduleAnnotations';
import { collectExpiryAlerts } from '../../utils/shelfExpiry';

export default function EmployeeHome() {
  const { user, schedule, currentWeek, shiftSwaps, stores, shelves, shelfItems } = useStore();
  const mySched = schedule[currentWeek]?.[user?.id] || {};
  const myDept = user?.dept || '';

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && String(user.role).includes('PT'));

  const todayKey = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayRaw = mySched[todayKey] || '';
  const { shift: todayShift, covering_store } = normalizeShift(todayRaw);
  const todayOff = !todayShift || todayShift === 'off';
  const isSupport = isSupportAssignment(todayRaw, myDept);

  const { totalH, totalShifts } = useMemo(() => {
    let h = 0;
    let n = 0;
    WEEK_DAYS.forEach(d => {
      const { shift } = normalizeShift(mySched[d]);
      if (shift && shift !== 'off') {
        n += 1;
        h += getShiftHours(shift);
      }
    });
    return { totalH: h, totalShifts: n };
  }, [mySched]);

  const swapToday = getSwapBadgeForDay(getSwapsForWeek(shiftSwaps, user?.id, currentWeek), user?.id, todayKey);

  const hourNote = isPT
    ? (totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK
      ? `Vượt ${totalH}h / 23h`
      : totalH > 0 && totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK
        ? `Thiếu ${totalH}h / 16h`
        : `${totalH}h / 16–23h`)
    : `${totalH}h / ${totalShifts} ca (chuẩn 48h)`;

  const expiryWarn = useMemo(() => {
    const mine = (shelves || []).filter(s => s.assigneeId === user?.id);
    return collectExpiryAlerts(mine, shelfItems);
  }, [shelves, shelfItems, user?.id]);

  const hourWarn = isPT
    ? totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK || (totalH > 0 && totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK)
    : totalH < SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800">{user?.name}</h1>
        <p className="text-xs text-slate-500">{user?.id} · {myDept}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Ca hôm nay ({todayKey})</div>
        <div className="text-2xl font-black text-blue-700">{todayOff ? 'OFF' : todayShift}</div>
        {isSupport && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <MapPin size={12} /> Hỗ trợ {getStoreLabel(stores, covering_store)}
          </div>
        )}
        {swapToday && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
            <ArrowRightLeft size={12} /> {swapToday.label}
          </div>
        )}
      </div>

      <div className={`rounded-2xl p-4 border ${hourWarn ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Giờ tuần này</div>
        <div className={`text-lg font-black ${hourWarn ? 'text-amber-800' : 'text-slate-800'}`}>{hourNote}</div>
      </div>

      {expiryWarn.length > 0 && (
        <Link to="/employee/shelves" className="block rounded-2xl p-4 border border-amber-200 bg-amber-50">
          <div className="text-sm font-black text-amber-900 flex items-center gap-1">
            <AlertTriangle size={14} /> {expiryWarn.length} món gần hết hạn trên kệ của bạn
          </div>
          <div className="text-xs text-amber-800 mt-1">
            {expiryWarn.slice(0, 3).map(x => `${x.item.productName} (${x.st.label})`).join(' · ')}
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/employee/schedule" className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold">
          <CalendarDays size={16} /> Lịch ca
        </Link>
        <Link to="/employee/timesheet" className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold">
          <Clock size={16} /> Chấm công
        </Link>
      </div>
    </div>
  );
}
