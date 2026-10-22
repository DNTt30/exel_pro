import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { WEEK_DAYS, SCHEDULE_RULES } from '../../data/constants';
import { normalizeShift, employeeWeekProgress } from '../../utils/shiftHelper';
import { weekRecordKey } from '../../utils/scheduleWeek';
import { homeWeek, closestAssignedShift, shiftCompanions } from '../../utils/employeeHome';
import { getStoreLabel } from '../../utils/scheduleAnnotations';
import { collectExpiryAlerts } from '../../utils/shelfExpiry';
import { useRegistrationDeadline } from '../../hooks/useRegistrationDeadline';
import MonthConfirmCard from '../../components/employee/MonthConfirmCard';
import RecipeQuickModal from '../../components/modals/RecipeQuickModal';
import {
  Clock,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Rows3,
  FileText,
  BookOpen,
  MapPin,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

const EMPTY = {};

export default function EmployeeHome() {
  const { user, schedule, stores, shiftSwaps, shelves, shelfItems, ensureWeeksLoaded, setCurrentWeek, scheduleWeeks } = useStore(
    useShallow(s => ({
      user: s.user,
      schedule: s.schedule,
      stores: s.stores,
      shiftSwaps: s.shiftSwaps,
      shelves: s.shelves,
      shelfItems: s.shelfItems,
      ensureWeeksLoaded: s.ensureWeeksLoaded,
      setCurrentWeek: s.setCurrentWeek,
      scheduleWeeks: s.scheduleWeeks
    }))
  );
  const navigate = useNavigate();
  const employees = useStore(s => s.employees);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const thisWeek = homeWeek(now);
  const nextWeek = homeWeek(now, 1);
  const [offset, setOffset] = useState(0);
  const week = offset ? nextWeek : thisWeek;
  const [loadState, setLoadState] = useState({ key: '', error: '' });
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState('');
  const [recipeOpen, setRecipeOpen] = useState(false);
  const key = `${user?.id}:${week}`;

  useEffect(() => {
    let live = true;
    setLoadState({ key: '', error: '' });
    ensureWeeksLoaded([homeWeek(new Date(`${week}T12:00:00`), -1), week, homeWeek(new Date(`${week}T12:00:00`), 1)])
      .then(() => { if (live) setLoadState({ key, error: '' }); })
      .catch(() => { if (live) setLoadState({ key, error: 'Chưa tải được lịch. Hãy thử lại.' }); });
    return () => { live = false; };
  }, [key, week, ensureWeeksLoaded, retry]);

  const ready = loadState.key === key && !loadState.error;
  const shifts = schedule[week]?.[user?.id] || EMPTY;
  const progress = employeeWeekProgress(shifts);
  const closest = closestAssignedShift(shifts, week, now);
  const dept = user?.dept?.split(',')[0]?.trim() || '';
  const companions = useMemo(() => shiftCompanions({ schedule, employees, employeeId: user?.id, store: closest?.covering_store || dept, shift: closest }), [schedule, employees, user?.id, dept, closest?.start?.getTime(), closest?.end?.getTime(), closest?.covering_store]);
  const deadline = useRegistrationDeadline(dept, nextWeek);
  const nextWeekApproved = scheduleWeeks?.[weekRecordKey(dept, nextWeek)]?.status === 'approved';
  const pending = (shiftSwaps || []).filter(s => s.toEmpId === user?.id && s.status === 'pending_partner').length;
  const expiry = useMemo(
    () => collectExpiryAlerts((shelves || []).filter(s => s.assigneeId?.split(',').map(id => id.trim()).includes(user?.id)), shelfItems || []),
    [shelves, shelfItems, user?.id]
  );

  const pt = ['STPT', 'PARTTIME'].includes(user?.type) || String(user?.role || '').includes('PT');
  const target = pt ? SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK : SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK;
  const planned = progress.registeredHours + progress.assignedHours;

  const openSchedule = async (targetWeek, mine = false) => {
    setOpening(true);
    setActionError('');
    try {
      await setCurrentWeek(targetWeek);
      if (useStore.getState().currentWeek !== targetWeek) throw new Error('Không mở được tuần đã chọn. Vui lòng thử lại.');
      navigate(`/employee/schedule${mine ? '?view=mine' : '?view=store'}`);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setOpening(false);
    }
  };

  const cards = [
    ['Giờ đăng ký chờ xếp', progress.registeredHours, 'giờ', 'registered-hours', Clock, 'text-amber-600 bg-amber-50 border-amber-100'],
    ['Ngày đăng ký chờ xếp', progress.registeredDays, 'ngày', 'registered-days', CalendarCheck2, 'text-indigo-600 bg-indigo-50 border-indigo-100'],
    ['Giờ đã xếp', progress.assignedHours, `giờ · ${progress.assignedDays} ngày`, 'assigned-hours', CheckCircle2, 'text-emerald-600 bg-emerald-50 border-emerald-100'],
    ['Ngày còn trống', progress.blankDays, `ngày · ${progress.offDays} ngày OFF`, 'blank-days', CalendarDays, 'text-slate-600 bg-slate-100 border-slate-200'],
  ];

  const assignedPct = Math.min(100, Math.round((progress.assignedHours / Math.max(1, target)) * 100));
  const registeredPct = Math.min(100 - assignedPct, Math.round((progress.registeredHours / Math.max(1, target)) * 100));

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto p-3 sm:p-5 space-y-4" data-testid="employee-home">
      {/* ── Header & Chuyển tuần ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <header className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-sm shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'NV'}
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              Trang chủ · {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin size={13} className="text-blue-600 shrink-0" />
              <span className="truncate">{getStoreLabel(stores, dept) || dept || 'Chưa phân cửa hàng'}</span>
            </p>
          </div>
        </header>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto" aria-label="Tuần theo dõi">
          {['Tuần này', 'Tuần sau'].map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={offset === i}
              onClick={() => setOffset(i)}
              className={`min-h-9 rounded-lg px-3.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                offset === i
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 px-1">
        Tuần bắt đầu <strong className="text-slate-700">{week}</strong> · Số liệu theo lịch, không phải công thực tế.
      </p>
      <Link to="/employee/support" className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm text-blue-800" data-testid="open-employee-support">
        <span>Bắt đầu tại đây · Hướng dẫn & hỗ trợ</span><ChevronRight size={16} className="shrink-0" />
      </Link>

      {/* ── Thống kê & Tiến độ giờ tuần ── */}
      {loadState.key !== key ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-blue-600" />
          <span>Đang tải lịch tuần…</span>
        </div>
      ) : loadState.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{loadState.error}</span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
            onClick={() => setRetry(n => n + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {cards.map(([label, value, unit, id, Icon, badgeCls]) => (
              <section
                key={id}
                className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
                data-testid={id}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xs font-semibold text-slate-600 leading-snug">{label}</h2>
                  <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${badgeCls}`}>
                    <Icon size={14} />
                  </span>
                </div>
                <p className="mt-2.5 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {value} <span className="text-xs font-medium text-slate-500">{unit}</span>
                </p>
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5" aria-label="Tiến độ giờ tuần">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700">
                Đã xếp <strong>{progress.assignedHours} giờ / {progress.assignedDays} ngày</strong>; còn{' '}
                <strong>{progress.registeredHours} giờ / {progress.registeredDays} ngày</strong> đăng ký chờ chọn.
              </p>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {progress.assignedHours}/{target}h
              </span>
            </div>

            {/* Giữ thẻ progress chuẩn cho trình đọc màn hình + thanh tiến độ trực quan */}
            <progress
              className="sr-only"
              aria-label="Giờ đã xếp so với định mức"
              max={target}
              value={Math.min(target, progress.assignedHours)}
            />
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${assignedPct}%` }}
                title={`Đã xếp: ${progress.assignedHours} giờ`}
              />
              {registeredPct > 0 && (
                <div
                  className="h-full bg-amber-400/80 transition-all duration-300"
                  style={{ width: `${registeredPct}%` }}
                  title={`Đăng ký chờ chọn: ${progress.registeredHours} giờ`}
                />
              )}
            </div>

            <p className="text-xs text-slate-600">
              {pt
                ? `Định mức PT: ${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}–${target} giờ/tuần.`
                : `Định mức: tối thiểu ${target} giờ và ${SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK} ca/tuần.`}{' '}
              Tổng đã xếp và chờ chọn: <strong>{planned} giờ</strong>.
            </p>
            {pt && progress.assignedHours > target && (
              <p className="text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                ⚠️ Đã xếp vượt {progress.assignedHours - target} giờ so với mức tối đa PT.
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              Ca được chọn chuyển sang “đã xếp”; chưa đồng nghĩa lịch tuần đã được duyệt. OFF không tính là ngày còn trống.
            </p>
          </section>
        </>
      )}

      {/* ── 2 Nút Thao tác Lịch chính ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={opening}
          onClick={() => openSchedule(nextWeek, true)}
          className="min-h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold px-3 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
        >
          <CalendarCheck2 size={16} />
          <span>Đăng ký tuần sau</span>
        </button>
        <button
          type="button"
          disabled={opening}
          onClick={() => openSchedule(week)}
          className="min-h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold px-3 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
        >
          <CalendarDays size={16} className="text-blue-600" />
          <span>Xem lịch cửa hàng</span>
        </button>
      </div>

      {opening && <p role="status" className="text-xs text-slate-500 text-center">Đang mở lịch…</p>}
      {actionError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{actionError}</p>}

      {/* ── Thẻ Ca gần nhất ── */}
      {ready && (
        <section className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>Ca gần nhất trong tuần đang xem</span>
            </h2>
            {closest && closest.start <= now && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang trong ca
              </span>
            )}
          </div>
          {closest ? (
            <div className="mt-2">
              <p className="text-lg sm:text-xl font-black text-slate-900">
                {closest.day} · {closest.date} · <span className="text-blue-700">{closest.shift}</span>
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {closest.start <= now ? 'Đang trong thời gian ca · ' : ''}
                {getStoreLabel(stores, closest.covering_store || dept)}
              </p>
              <p className="text-xs mt-2">Trạng thái tuần: {scheduleWeeks?.[weekRecordKey(closest.covering_store || dept, week)]?.status === 'approved' ? 'Lịch đã duyệt' : 'Chưa ghi nhận lịch đã duyệt'}.</p>
              <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-blue-800">Ai làm cùng và ai vào ca sau?</summary>
                <p className="mt-2">Cùng giờ: {companions.overlapping.length ? companions.overlapping.map(item => `${item.name} (${item.code})`).join(', ') : 'Chưa thấy ca trùng giờ trong dữ liệu được tải.'}</p>
                <p className="mt-2">Ca bắt đầu sau khi bạn kết thúc: {companions.next.length ? companions.next.map(item => `${item.name} (${item.start.toLocaleDateString('vi-VN')}, ${item.code})`).join(', ') : 'Chưa thấy ca tiếp theo trong các tuần được tải.'}</p>
                <p className="mt-2 text-xs text-slate-500">Chỉ tính ca đã xếp tại đúng cửa hàng; lịch chưa duyệt có thể thay đổi.</p>
              </details>
              <button
                type="button"
                disabled={opening}
                onClick={() => openSchedule(week)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-800 underline cursor-pointer"
              >
                <span>Xem đồng nghiệp và ca tiếp theo</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mt-1.5">Không còn ca đã xếp sắp tới trong tuần này.</p>
          )}
        </section>
      )}

      {/* ── Việc cần làm / Cảnh báo ── */}
      <div className="space-y-2" aria-label="Việc cần làm">
        {!nextWeekApproved && deadline.ready && deadline.info.isNearDeadline && !deadline.info.isExpired && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs sm:text-sm text-amber-900 font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>Sắp hết hạn đăng ký tuần sau: <strong>{deadline.info.formattedDeadline}</strong> ({deadline.info.remainingText}).</span>
          </p>
        )}
        {pending > 0 && (
          <Link
            className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 p-3 text-xs sm:text-sm font-semibold text-indigo-900 transition-colors"
            to="/employee/schedule?openSwaps=true"
          >
            <span className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-indigo-600 shrink-0" />
              <span>{pending} đơn đổi ca chờ bạn phản hồi</span>
            </span>
            <ChevronRight size={16} className="text-indigo-500" />
          </Link>
        )}
        {expiry.length > 0 && (
          <Link
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 p-3 text-xs sm:text-sm font-semibold text-amber-900 transition-colors"
            to="/employee/shelves"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>{expiry.length} cảnh báo hạn dùng trên kệ của bạn</span>
            </span>
            <ChevronRight size={16} className="text-amber-600" />
          </Link>
        )}
        <MonthConfirmCard onlyPending />
      </div>

      {/* ── Chi tiết 7 ngày ── */}
      {ready && (
        <details className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs group">
          <summary className="cursor-pointer text-sm font-bold text-slate-800 flex items-center justify-between list-none">
            <span>Chi tiết 7 ngày trong tuần</span>
            <span className="text-xs font-semibold text-blue-600 group-open:rotate-90 transition-transform">▸</span>
          </summary>
          <ul className="mt-3 divide-y divide-slate-100">
            {WEEK_DAYS.map(day => {
              const cell = normalizeShift(shifts[day]);
              const isOff = cell.shift === 'off';
              const hasShift = Boolean(cell.shift && !isOff);
              return (
                <li key={day} className="py-2.5 text-xs sm:text-sm flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 w-10">{day}</span>
                  <span className="flex-1 text-right font-medium text-slate-800">
                    {isOff ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">Nghỉ (OFF)</span>
                    ) : hasShift ? (
                      <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {cell.shift}
                        </span>
                        {!cell.confirmed && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Đăng ký chờ chọn
                          </span>
                        )}
                        {cell.covering_store && (
                          <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            Hỗ trợ {cell.covering_store}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa xếp</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* ── Lối tắt tiện ích (Quick Action Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <Link
          to="/employee/timesheet"
          className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-700 shadow-2xs transition-all"
        >
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </span>
          <span>Chấm công</span>
        </Link>

        <Link
          to="/employee/feedback"
          className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-rose-300 hover:bg-rose-50/40 text-xs sm:text-sm font-bold text-slate-700 hover:text-rose-700 shadow-2xs transition-all"
        >
          <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FileText size={16} />
          </span>
          <span>Bù công C&B</span>
        </Link>

        <Link
          to="/employee/shelves"
          className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 hover:bg-amber-50/40 text-xs sm:text-sm font-bold text-slate-700 hover:text-amber-700 shadow-2xs transition-all"
        >
          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Rows3 size={16} />
          </span>
          <span>Kệ của tôi</span>
        </Link>

        <button
          type="button"
          onClick={() => setRecipeOpen(true)}
          className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-700 shadow-2xs transition-all cursor-pointer text-left"
        >
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen size={16} />
          </span>
          <span>Công thức nhanh</span>
        </button>
      </div>

      <RecipeQuickModal isOpen={recipeOpen} onClose={() => setRecipeOpen(false)} />
    </div>
  );
}
