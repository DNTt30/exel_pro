// Pure rules shared by the browser and the Edge Function.
import { WEEK_DAYS, SCHEDULE_RULES as RULES, DECISION_RULES as GATES } from '../data/constants.js';
import { normalizeShift, getShiftHours, parseShiftTimeRange, buildSwappedSchedules } from './shiftHelper.js';

const HOUR = 3600000, DAY = 24 * HOUR;
export function addDays(iso, count) {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + count * DAY).toISOString().slice(0, 10);
}
export function mondayOf(iso) {
  const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return addDays(iso, -(weekday === 0 ? 6 : weekday - 1));
}
export function vietnamToday(now = new Date()) {
  return new Date(new Date(now).getTime() + 7 * HOUR).toISOString().slice(0, 10);
}
export function requiredDecisionWeeks(week) {
  const last = addDays(week, 6);
  const lastMonth = new Date(`${last.slice(0, 7)}-01T12:00:00Z`);
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() + 1);
  const end = mondayOf(addDays(lastMonth.toISOString().slice(0, 10), -1));
  const weeks = new Set([addDays(week, -7), week, addDays(week, 7)]);
  for (let w = mondayOf(`${week.slice(0, 7)}-01`); w <= end; w = addDays(w, 7)) weeks.add(w);
  return [...weeks].sort();
}
const works = raw => { const n = normalizeShift(raw); return n.confirmed && n.shift && n.shift !== 'off'; };
const localTo = (emp, store) => String(emp.dept || '').split(',').map(s => s.trim()).includes(store);
export const scheduleTotals = days => WEEK_DAYS.reduce((a, d) => {
  if (works(days?.[d])) { a.hours += getShiftHours(normalizeShift(days[d]).shift); a.shifts++; }
  return a;
}, { hours: 0, shifts: 0 });
function intervals(raw, date) {
  if (!works(raw)) return [];
  const ranges = normalizeShift(raw).shift.split('/').map(part => parseShiftTimeRange(part.trim()));
  if (ranges.some(r => !r || r.start < 0 || r.start >= 24 || r.end > 48)) return null;
  const base = Date.parse(`${date}T00:00:00+07:00`);
  return ranges.map(r => ({ start: base + r.start * HOUR, end: base + r.end * HOUR, date, night: r.end > 24 }));
}

export function employeeScheduleRisk(emp, schedule, week) {
  const issues = [];
  const add = (code, message, risk) => issues.push({ empId: emp.id, code, message, risk });
  const { hours, shifts } = scheduleTotals(schedule[week]?.[emp.id]);
  if (emp.type === 'STPT' && hours > RULES.STPT_MAX_HOURS_PER_WEEK) add('PT_WEEK', `Vượt ${RULES.STPT_MAX_HOURS_PER_WEEK}h/tuần`, 100);
  if (emp.type !== 'STPT' && hours > RULES.STFT_MIN_HOURS_PER_WEEK) add('FT_REVIEW', 'Vượt định mức tuần, cần quản lý xem xét', 70);
  if (Number(emp.maxH) > 0 && hours > Number(emp.maxH)) add('PERSONAL_LIMIT', 'Vượt giờ cấu hình của nhân viên', 80);
  const timeline = [];
  for (const w of [addDays(week, -7), week, addDays(week, 7)]) {
    if (!Object.hasOwn(schedule, w)) add('MISSING_CONTEXT', `Chưa tải lịch tuần ${w}`, 70);
    WEEK_DAYS.forEach((d, i) => {
      const slots = intervals(schedule[w]?.[emp.id]?.[d], addDays(w, i));
      if (slots === null) add('UNKNOWN_SHIFT', 'Không đọc được giờ ca', 100);
      else timeline.push(...slots);
    });
  }
  timeline.sort((a, b) => a.start - b.start);
  const weekEnd = addDays(week, 6);
  let minRestHours = null;
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1], next = timeline[i];
    if ((prev.date < week || prev.date > weekEnd) && (next.date < week || next.date > weekEnd)) continue;
    const rest = (next.start - prev.end) / HOUR;
    if (prev.date !== next.date) minRestHours = minRestHours === null ? rest : Math.min(minRestHours, rest);
    if (rest < 0 || (prev.date !== next.date && rest < GATES.MIN_REST_HOURS)) add('REST', `Nghỉ ${rest}h giữa ca ${prev.date} và ${next.date}`, 100);
  }
  let consecutive = 0, previous = '', maxConsecutiveNights = 0;
  for (const slot of timeline.filter(s => s.night)) {
    if (slot.date === previous) continue;
    consecutive = previous && addDays(previous, 1) === slot.date ? consecutive + 1 : 1;
    previous = slot.date;
    if (slot.date >= week && slot.date <= weekEnd) maxConsecutiveNights = Math.max(maxConsecutiveNights, consecutive);
    if (consecutive >= GATES.CONSECUTIVE_NIGHTS_WARNING && slot.date >= week && slot.date <= weekEnd) add('NIGHTS', `${consecutive} đêm liên tiếp`, 70);
  }
  if (emp.type === 'STPT') {
    if (requiredDecisionWeeks(week).some(w => !Object.hasOwn(schedule, w))) add('MONTH_CONTEXT', 'Chưa đủ lịch tháng để kiểm tra 91h', 70);
    for (const month of new Set([week.slice(0, 7), weekEnd.slice(0, 7)])) {
      let monthlyHours = 0;
      for (const w of requiredDecisionWeeks(week)) WEEK_DAYS.forEach((d, i) => {
        if (addDays(w, i).startsWith(month) && works(schedule[w]?.[emp.id]?.[d])) monthlyHours += getShiftHours(normalizeShift(schedule[w][emp.id][d]).shift);
      });
      if (monthlyHours > RULES.STPT_MAX_HOURS_PER_MONTH) add('PT_MONTH', `Tháng ${month} vượt ${RULES.STPT_MAX_HOURS_PER_MONTH}h`, 100);
    }
  }
  return { hours, shifts, minRestHours, maxConsecutiveNights, issues, risk_level: Math.max(0, ...issues.map(i => i.risk)) };
}

export function assessShiftSwap({ swap, employees, schedule, now = new Date() }) {
  const issues = [];
  const people = [];
  const reject = message => ({ auto_approved: false, eligible: false, risk_level: 100, issues: [{ code: 'INVALID_SWAP', message, risk: 100 }], source: 'rules' });
  if (!swap || !/^\d{4}-\d{2}-\d{2}$/.test(swap.week || '') || !WEEK_DAYS.includes(swap.fromDay) || !WEEK_DAYS.includes(swap.toDay)) return reject('Thông tin đổi ca không hợp lệ');
  const pair = [swap.fromEmpId, swap.toEmpId].map(id => employees.find(e => e.id === id));
  if (pair.some(e => !e) || swap.fromEmpId === swap.toEmpId) return reject('Thiếu thông tin hai nhân viên');
  if (swap.status !== 'pending_manager') issues.push({ code: 'CONSENT', message: 'Chưa có đồng thuận của cả hai nhân viên', risk: 70 });
  const current = schedule[swap.week] || {};
  if (normalizeShift(current[swap.fromEmpId]?.[swap.fromDay]).shift !== swap.fromShift || normalizeShift(current[swap.toEmpId]?.[swap.toDay]).shift !== swap.toShift) return reject('Ca trong yêu cầu đã thay đổi');
  const swapped = buildSwappedSchedules(current[swap.fromEmpId], current[swap.toEmpId], swap);
  const next = { ...schedule, [swap.week]: { ...current, ...swapped } };
  for (const emp of pair) {
    if (!localTo(emp, swap.store)) issues.push({ code: 'CROSS_STORE', message: 'Đổi ca khác cửa hàng cần quản lý xử lý', risk: 70 });
    const summary = employeeScheduleRisk(emp, next, swap.week);
    people.push({ alias: `person_${people.length}`, type: emp.type, weeklyHours: summary.hours, weeklyShifts: summary.shifts, minRestHours: summary.minRestHours, consecutiveNights: summary.maxConsecutiveNights });
    issues.push(...summary.issues);
    const min = emp.type === 'STPT' ? RULES.STPT_MIN_HOURS_PER_WEEK : RULES.STFT_MIN_HOURS_PER_WEEK;
    if (summary.hours < min || (emp.type !== 'STPT' && summary.shifts < RULES.STFT_MIN_SHIFTS_PER_WEEK)) issues.push({ code: 'UNDER_TARGET', message: 'Chưa đủ định mức giờ/ca sau đổi', risk: 70 });
    for (const d of new Set([swap.fromDay, swap.toDay])) {
      const n = normalizeShift(current[emp.id]?.[d]);
      if (n.covering_store || (n.shift && !n.confirmed)) issues.push({ code: 'SPECIAL_SHIFT', message: 'Ca chi viện hoặc chưa xác nhận cần quản lý kiểm tra', risk: 70 });
      const slots = intervals(current[emp.id]?.[d], addDays(swap.week, WEEK_DAYS.indexOf(d)));
      if (slots?.some(s => (s.start - new Date(now).getTime()) / HOUR < GATES.SHORT_NOTICE_HOURS)) issues.push({ code: 'SHORT_NOTICE', message: 'Ca đã bắt đầu hoặc còn dưới 24 giờ', risk: 80 });
    }
  }
  const risk_level = Math.max(0, ...issues.map(i => i.risk));
  return { auto_approved: false, eligible: risk_level <= GATES.AUTO_SWAP_MAX_RISK, risk_level, issues, people, source: 'rules' };
}

export function rankGapCandidates({ employees, schedule, week, day, shift, storeId }) {
  if (!WEEK_DAYS.includes(day) || !parseShiftTimeRange(shift)) return [];
  return employees.flatMap(emp => {
    if (emp.isActive === false || emp.is_active === false) return [];
    const raw = schedule[week]?.[emp.id]?.[day], n = normalizeShift(raw);
    if (works(raw) || n.covering_store) return [];
    const days = { ...schedule[week]?.[emp.id], [day]: shift };
    const result = employeeScheduleRisk(emp, { ...schedule, [week]: { ...schedule[week], [emp.id]: days } }, week);
    if (result.issues.some(i => i.risk === 100 || i.code === 'PERSONAL_LIMIT')) return [];
    const currentWeeklyHours = scheduleTotals(schedule[week]?.[emp.id]).hours;
    const isLocal = localTo(emp, storeId), hasRegisteredThisShift = n.registered && n.shift === shift;
    const target = emp.type === 'STPT' ? RULES.STPT_MIN_HOURS_PER_WEEK : RULES.STFT_MIN_HOURS_PER_WEEK;
    const cashier = Array.isArray(emp.skills) && emp.skills.includes('cashier');
    const score = (isLocal ? 30 : 0) + Math.max(0, target - currentWeeklyHours) + (hasRegisteredThisShift ? 20 : 0) + (cashier ? 5 : 0) - result.risk_level / 2;
    return [{ emp, currentWeeklyHours, hoursAfterAssign: result.hours, isLocal, hasRegisteredThisShift, score, availability: n.shift === 'off' ? 'off' : n.registered ? 'registered' : 'unassigned', issues: result.issues, badge: n.shift === 'off' ? 'Đang OFF · cần đồng ý' : 'Chưa xếp ca · cần xác nhận' }];
  }).sort((a, b) => b.score - a.score || String(a.emp.id).localeCompare(String(b.emp.id)));
}

export function scheduleQuality({ employees, schedule, week, holidays = [] }) {
  const issues = [], loads = new Map();
  let assigned = 0, total = 0;
  for (const emp of employees) {
    const days = schedule[week]?.[emp.id] || {}, summary = employeeScheduleRisk(emp, schedule, week);
    issues.push(...summary.issues);
    const minimum = emp.type === 'STPT' ? RULES.STPT_MIN_HOURS_PER_WEEK : RULES.STFT_MIN_HOURS_PER_WEEK;
    if (summary.hours < minimum || (emp.type !== 'STPT' && summary.shifts < RULES.STFT_MIN_SHIFTS_PER_WEEK)) issues.push({ empId: emp.id, code: 'UNDER_TARGET', message: 'Chưa đủ định mức giờ/ca tuần', risk: 30 });
    let burden = 0;
    WEEK_DAYS.forEach((d, i) => {
      total++;
      const n = normalizeShift(days[d]);
      if (n.confirmed && n.shift) assigned++;
      if (works(days[d]) && (i >= 5 || holidays.includes(addDays(week, i)))) burden += getShiftHours(n.shift);
    });
    const group = loads.get(emp.type) || [];
    group.push(burden / minimum); loads.set(emp.type, group);
  }
  const spreads = [...loads.values()].map(v => Math.max(...v) - Math.min(...v));
  const fairness_score = Math.max(0, Math.round(100 - Math.max(0, ...spreads) * 100));
  const realIssues = issues.filter(i => !['MISSING_CONTEXT', 'MONTH_CONTEXT'].includes(i.code));
  const burnout_risk = Math.max(0, ...realIssues.filter(i => i.code !== 'UNDER_TARGET').map(i => i.risk));
  const underTarget = realIssues.filter(i => i.code === 'UNDER_TARGET').length;
  const score = assigned ? Math.max(0, Math.round(fairness_score * 0.5 + (100 - burnout_risk) * 0.3 + assigned / total * 20 - underTarget / Math.max(1, employees.length) * 50)) : null;
  return { score, fairness_score, burnout_risk, coverage: total ? Math.round(assigned / total * 100) : 0, issues, provisional: issues.some(i => ['MISSING_CONTEXT', 'MONTH_CONTEXT'].includes(i.code)), holidayDataProvided: holidays.length > 0 };
}
