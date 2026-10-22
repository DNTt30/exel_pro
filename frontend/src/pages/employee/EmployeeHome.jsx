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
  HelpCircle,
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
    <div className="w-full min-w-0 max-w-6xl mx-auto p-2.5 sm:p-4 space-y-2.5 sm:space-y-3" data-testid="employee-home">
      {/* ── Header Gọn Gàng (Tích hợp Chuyển tuần + Tuần bắt đầu + Hướng dẫn) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <header className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'NV'}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate leading-tight">
                Trang chủ · {user?.name}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={12} className="text-indigo-600 shrink-0" />
                <span className="truncate">{getStoreLabel(stores, dept) || dept || 'Chưa phân cửa hàng'}</span>
              </p>
            </div>
          </header>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0" aria-label="Tuần theo dõi">
            {['Tuần này', 'Tuần sau'].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={offset === i}
                onClick={() => setOffset(i)}
                className={`min-h-8 rounded-lg px-2.5 sm:px-3 text-xs font-bold transition-all cursor-pointer ${
                  offset === i
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <p className="text-slate-500">
            Tuần bắt đầu <strong className="text-slate-700 font-mono">{week}</strong> · <span className="hidden sm:inline">Số liệu theo lịch, không phải công thực tế.</span><span className="sm:hidden">Số liệu theo lịch.</span>
          </p>
          <Link
            to="/employee/support"
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/80 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors"
            data-testid="open-employee-support"
          >
            <HelpCircle size={13} className="shrink-0" />
            <span>Bắt đầu tại đây · Hướng dẫn & hỗ trợ</span>
            <ChevronRight size={13} className="shrink-0" />
          </Link>
        </div>
      </div>

      {/* ── Việc cần làm / Cảnh báo ưu tiên (chỉ chiếm chỗ khi có thông báo) ── */}
      <div className="space-y-2 empty:hidden" aria-label="Việc cần làm">
        {!nextWeekApproved && deadline.ready && deadline.info.isNearDeadline && !deadline.info.isExpired && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 font-medium flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>Sắp hết hạn đăng ký tuần sau: <strong>{deadline.info.formattedDeadline}</strong> ({deadline.info.remainingText}).</span>
          </p>
        )}
        {pending > 0 && (
          <Link
            className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-2 text-xs font-semibold text-indigo-900 transition-colors"
            to="/employee/schedule?openSwaps=true"
          >
            <span className="flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-indigo-600 shrink-0" />
              <span>{pending} đơn đổi ca chờ bạn phản hồi</span>
            </span>
            <ChevronRight size={15} className="text-indigo-500" />
          </Link>
        )}
        {expiry.length > 0 && (
          <Link
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors"
            to="/employee/shelves"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>{expiry.length} cảnh báo hạn dùng trên kệ của bạn</span>
            </span>
            <ChevronRight size={15} className="text-amber-600" />
          </Link>
        )}
        <MonthConfirmCard onlyPending />
      </div>

      {/* ── 4 Ô Chỉ Số Tuần (Gọn, sát, tối ưu Mobile 2x2 & Desktop 4 cột) ── */}
      {loadState.key !== key ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs sm:text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw size={15} className="animate-spin text-indigo-600" />
          <span>Đang tải lịch tuần…</span>
        </div>
      ) : loadState.error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs sm:text-sm text-rose-800 flex items-center justify-between gap-3">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {cards.map(([label, value, unit, id, Icon, badgeCls]) => (
            <section
              key={id}
              className="rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between"
              data-testid={id}
            >
              <div className="flex items-center justify-between gap-1.5">
                <h2 className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">{label}</h2>
                <span className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${badgeCls}`}>
                  <Icon size={13} />
                </span>
              </div>
              <p className="mt-1.5 text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {value} <span className="text-[11px] font-medium text-slate-500">{unit}</span>
              </p>
            </section>
          ))}
        </div>
      )}

      {/* ── Bố cục 2 Cột trên màn hình lớn / Xếp chồng khít trên Mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-start">
        {/* CỘT TRÁI (7/12): Tiến độ + Nút hành động + Ca gần nhất */}
        <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">
          {ready && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2" aria-label="Tiến độ giờ tuần">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-700">
                  Đã xếp <strong>{progress.assignedHours} giờ / {progress.assignedDays} ngày</strong>; còn{' '}
                  <strong>{progress.registeredHours} giờ / {progress.registeredDays} ngày</strong> đăng ký chờ chọn.
                </p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
                  {progress.assignedHours}/{target}h
                </span>
              </div>

              <progress
                className="sr-only"
                aria-label="Giờ đã xếp so với định mức"
                max={target}
                value={Math.min(target, progress.assignedHours)}
              />
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-300"
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

              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>
                  {pt
                    ? `Định mức PT: ${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}–${target} giờ/tuần.`
                    : `Định mức: tối thiểu ${target} giờ và ${SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK} ca/tuần.`}{' '}
                  Tổng đã xếp và chờ chọn: <strong className="text-slate-700">{planned} giờ</strong>.
                </span>
                <span>OFF không tính là ngày còn trống.</span>
              </div>

              {pt && progress.assignedHours > target && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">
                  ⚠️ Đã xếp vượt {progress.assignedHours - target} giờ so với mức tối đa PT.
                </p>
              )}

              {/* 2 Nút Thao tác Lịch chính tích hợp gọn trong thẻ */}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => openSchedule(nextWeek, true)}
                  className="min-h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs sm:text-sm font-bold px-3 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <CalendarCheck2 size={15} />
                  <span>Đăng ký tuần sau</span>
                </button>
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => openSchedule(week)}
                  className="min-h-10 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold px-3 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <CalendarDays size={15} className="text-indigo-600" />
                  <span>Xem lịch cửa hàng</span>
                </button>
              </div>
            </section>
          )}

          {!ready && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={opening}
                onClick={() => openSchedule(nextWeek, true)}
                className="min-h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs sm:text-sm font-bold px-3 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CalendarCheck2 size={15} />
                <span>Đăng ký tuần sau</span>
              </button>
              <button
                type="button"
                disabled={opening}
                onClick={() => openSchedule(week)}
                className="min-h-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold px-3 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CalendarDays size={15} className="text-indigo-600" />
                <span>Xem lịch cửa hàng</span>
              </button>
            </div>
          )}

          {opening && <p role="status" className="text-xs text-slate-500 text-center">Đang mở lịch…</p>}
          {actionError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{actionError}</p>}

          {/* Thẻ Ca gần nhất */}
          {ready && (
            <section className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-white p-3 sm:p-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-600" />
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
                <div className="mt-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-base sm:text-lg font-black text-slate-900">
                      {closest.day} · {closest.date} · <span className="text-indigo-700">{closest.shift}</span>
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {scheduleWeeks?.[weekRecordKey(closest.covering_store || dept, week)]?.status === 'approved' ? '✓ Lịch đã duyệt' : 'Chưa ghi nhận lịch đã duyệt'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {closest.start <= now ? 'Đang trong thời gian ca · ' : ''}
                    {getStoreLabel(stores, closest.covering_store || dept)}
                  </p>
                  <details className="mt-1.5 text-xs sm:text-sm">
                    <summary className="cursor-pointer font-semibold text-indigo-800">Ai làm cùng và ai vào ca sau?</summary>
                    <p className="mt-1.5 text-xs text-slate-700">Cùng giờ: {companions.overlapping.length ? companions.overlapping.map(item => `${item.name} (${item.code})`).join(', ') : 'Chưa thấy ca trùng giờ trong dữ liệu được tải.'}</p>
                    <p className="mt-1 text-xs text-slate-700">Ca bắt đầu sau khi bạn kết thúc: {companions.next.length ? companions.next.map(item => `${item.name} (${item.start.toLocaleDateString('vi-VN')}, ${item.code})`).join(', ') : 'Chưa thấy ca tiếp theo trong các tuần được tải.'}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Chỉ tính ca đã xếp tại đúng cửa hàng; lịch chưa duyệt có thể thay đổi.</p>
                  </details>
                  <button
                    type="button"
                    disabled={opening}
                    onClick={() => openSchedule(week)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 underline cursor-pointer"
                  >
                    <span>Xem đồng nghiệp và ca tiếp theo</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Không còn ca đã xếp sắp tới trong tuần này.</p>
              )}
            </section>
          )}

          {/* 4 Lối tắt tiện ích (Quick Action Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link
              to="/employee/timesheet"
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 hover:text-indigo-700 shadow-2xs transition-all"
            >
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock size={14} />
              </span>
              <span className="truncate">Chấm công</span>
            </Link>

            <Link
              to="/employee/feedback"
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-rose-300 hover:bg-rose-50/40 text-xs font-bold text-slate-700 hover:text-rose-700 shadow-2xs transition-all"
            >
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <FileText size={14} />
              </span>
              <span className="truncate">Bù công C&B</span>
            </Link>

            <Link
              to="/employee/shelves"
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-amber-300 hover:bg-amber-50/40 text-xs font-bold text-slate-700 hover:text-amber-700 shadow-2xs transition-all"
            >
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Rows3 size={14} />
              </span>
              <span className="truncate">Kệ của tôi</span>
            </Link>

            <button
              type="button"
              onClick={() => setRecipeOpen(true)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 text-xs font-bold text-slate-700 hover:text-emerald-700 shadow-2xs transition-all cursor-pointer text-left"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <BookOpen size={14} />
              </span>
              <span className="truncate">Công thức nhanh</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): Chi tiết 7 ngày mở sẵn trực quan */}
        {ready && (
          <details open className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs group">
            <summary className="cursor-pointer text-xs sm:text-sm font-extrabold text-slate-800 flex items-center justify-between list-none">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} className="text-indigo-600" />
                <span>Chi tiết 7 ngày trong tuần</span>
              </span>
              <span className="text-xs font-semibold text-indigo-600 group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <ul className="mt-2 divide-y divide-slate-100">
              {WEEK_DAYS.map(day => {
                const cell = normalizeShift(shifts[day]);
                const isOff = cell.shift === 'off';
                const hasShift = Boolean(cell.shift && !isOff);
                return (
                  <li key={day} className="py-1.5 text-xs flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700 w-9">{day}</span>
                    <span className="flex-1 text-right font-medium text-slate-800">
                      {isOff ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">Nghỉ (OFF)</span>
                      ) : hasShift ? (
                        <span className="inline-flex flex-wrap items-center justify-end gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold tabular-nums">
                            {cell.shift}
                          </span>
                          {!cell.confirmed && (
                            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                              Đăng ký chờ chọn
                            </span>
                          )}
                          {cell.covering_store && (
                            <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md">
                              Hỗ trợ {cell.covering_store}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa xếp</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>

      <RecipeQuickModal isOpen={recipeOpen} onClose={() => setRecipeOpen(false)} />
    </div>
  );
}
