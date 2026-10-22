import { DEFAULT_STAFFING_MATRIX, SCHEDULE_RULES, WEEK_DAYS } from '../data/constants';
import { getShiftHours, normalizeShift, parseShiftTimeRange } from './shiftHelper';
import { isEmployeeWeekLocked, isNightReady, managedStoreIds } from './employeeSkills';
import { isWeekLocked, weekRecordKey } from './scheduleWeek';
import { scheduleRuleViolations } from './scheduleConflicts';
import { storeWeeklyHours, resolveStoreHoursLimit } from './storeHours';

const fullTime = emp => ['STFT', 'CSR_NEW', 'SM', 'FULLTIME'].includes((emp.type || '').toUpperCase());
const dayName = day => day === 'CN' ? 'Chủ nhật' : `Thứ ${day.slice(1)}`;
const rangesOf = code => (code || '').split('/').map(part => parseShiftTimeRange(part.trim())).filter(Boolean);
const covers = (ranges, slot) => ranges.some(r => r.start <= slot.start && r.end >= slot.end);

export function demandBreakdown(options, day, code, required) {
  const original = Number((options.baseMatrixByDay?.[day] || options.requiredMatrixByDay?.[day] || options.requiredMatrix || DEFAULT_STAFFING_MATRIX.weekday)[code]) || 0;
  const beforeNotes = Number((options.requiredMatrixByDay?.[day] || options.requiredMatrix || DEFAULT_STAFFING_MATRIX.weekday)[code]) || 0;
  const base = Math.min(original, required);
  const revenue = Math.min(Math.max(0, beforeNotes - original), required - base);
  return { base, revenue, notes: required - base - revenue };
}

export function demandLabel({ base, revenue, notes }) {
  return `${base} định biên${revenue ? ` + ${revenue} tăng cường (doanh số/lượt khách)` : ''}${notes ? ` + ${notes} tăng cường (ghi chú)` : ''}`;
}

// Demand codes are additive staffing intervals, not interchangeable headcounts:
// 6-14 x1 + 10-14 x1 means one person before 10h, two people after 10h.
export function schedulerDemandByDay(options = {}) {
  const factor = Number.isFinite(options.demandFactor) ? Math.max(0, options.demandFactor) : 1;
  return Object.fromEntries(WEEK_DAYS.map(day => {
    const base = options.requiredMatrixByDay?.[day] || options.requiredMatrix || DEFAULT_STAFFING_MATRIX.weekday;
    const matrix = Object.fromEntries(Object.entries(base).map(([code, count]) => [code, Math.max(0, Math.round((Number(count) || 0) * factor))]));
    Object.entries(options.smOverrides?.[day] || {}).forEach(([code, rule]) => {
      if (Number.isFinite(rule.min)) matrix[code] = Math.max(0, Math.ceil(rule.min));
    });
    return [day, matrix];
  }));
}

/** Confirm registered shifts only. Missing availability and OFF are never candidates.
 * Existing confirmed/covering/locked cells are retained, including their metadata.
 * No automatic FT top-up, SM office hours, or recruitment from OFF at another store.
 */
export function scheduleRegisteredShifts(employees, storeId, options, rules) {
  const locals = employees.filter(emp => emp.dept === storeId && emp.isActive !== false);
  if (!locals.length) throw new Error(`Không tìm thấy nhân viên nào thuộc cửa hàng ${storeId}`);
  if (isWeekLocked(options.scheduleWeeks?.[weekRecordKey(storeId, options.currentWeek)]?.status)) {
    throw new Error('Tuần đang chờ duyệt hoặc đã duyệt, không thể xếp lại lịch.');
  }
  const source = options.existingSchedule || {};
  const weeklyHoursLimit = resolveStoreHoursLimit(storeId, options);
  const fixedStoreHours = storeWeeklyHours(employees, source, storeId);
  const result = Object.fromEntries(locals.map(emp => [emp.id, { ...source[emp.id] }]));
  const locked = new Set(employees.filter(emp => isEmployeeWeekLocked(emp, source[emp.id], options.scheduleWeeks, options.currentWeek)).map(emp => emp.id));
  const matrix = schedulerDemandByDay(options);
  const ids = locals.map(e => String(e.id)).sort();
  const rotation = Math.floor((Date.parse(`${options.currentWeek || '1970-01-05'}T00:00:00Z`) || 0) / 604800000) % ids.length;
  const rank = new Map(ids.map((id, i) => [id, (i - rotation + ids.length) % ids.length]));
  const hours = {};
  const counts = {};
  const candidates = [];
  const notices = [];
  const fixed = [];
  let registeredCount = 0;
  const registeredEmployees = new Set();
  const absoluteRanges = (code, index) => rangesOf(code).map(range => ({ start: range.start + index * 24, end: range.end + index * 24 }));

  employees.filter(emp => emp.isActive !== false).forEach(emp => {
    hours[emp.id] = 0;
    counts[emp.id] = 0;
    WEEK_DAYS.forEach((day, index) => {
      const raw = source[emp.id]?.[day];
      const cell = normalizeShift(raw);
      const h = getShiftHours(cell.shift);
      if (cell.confirmed && h > 0) {
        hours[emp.id] += h;
        counts[emp.id]++;
        if ((cell.covering_store || emp.dept) === storeId) fixed.push({ emp, day, code: cell.shift, ranges: absoluteRanges(cell.shift, index), hours: h });
      }
      if (emp.dept !== storeId || !cell.registered || cell.confirmed || h <= 0) return;
      registeredCount++;
      registeredEmployees.add(emp.id);
      const ranges = absoluteRanges(cell.shift, index);
      if (locked.has(emp.id) || cell.covering_store || !ranges.length) return;
      const override = options.employeeOverrides?.[emp.id]?.[day];
      if (override === 'off') return; // Exclude this registration; do not erase it.
      candidates.push({ emp, day, index, code: cell.shift, hours: h, ranges, preferred: override === cell.shift });
    });
  });
  // Natural-language instructions cannot bypass employee consent.
  locals.forEach(emp => Object.entries(options.employeeOverrides?.[emp.id] || {}).forEach(([day, code]) => {
    const cell = normalizeShift(source[emp.id]?.[day]);
    if (cell.confirmed && getShiftHours(cell.shift) > 0 && code !== cell.shift) notices.push(`${emp.name} · ${dayName(day)}: giữ nguyên ca đã chốt ${cell.shift}; không áp dụng chỉ đạo đổi ca.`);
    else if (code !== 'off' && (!cell.registered || cell.shift !== code)) notices.push(`${emp.name} · ${dayName(day)}: không xếp ca ${code} vì nhân viên chưa đăng ký ca này.`);
  }));

  const requirements = WEEK_DAYS.flatMap((day, index) => Object.entries(matrix[day]).flatMap(([code, required]) => required > 0
    ? absoluteRanges(code, index).map(range => ({ ...range, day, index, required, code, ...demandBreakdown(options, day, code, required) })) : []));
  // Split at all demand/shift boundaries so complementary short shifts count correctly.
  const boundaries = [...new Set([...requirements, ...candidates.flatMap(c => c.ranges), ...fixed.flatMap(c => c.ranges)]
    .flatMap(range => [range.start, range.end]))].sort((a, b) => a - b);
  const slots = boundaries.slice(0, -1).flatMap((start, i) => {
    const end = boundaries[i + 1];
    const active = requirements.filter(r => r.start <= start && r.end >= end);
    const working = [...fixed, ...candidates].filter(c => covers(c.ranges, { start, end }));
    if (!active.length && !working.length) return [];
    const index = active[0]?.index ?? WEEK_DAYS.indexOf(working[0].day);
    const slot = { start, end, day: WEEK_DAYS[index], index, demandKey: active.map(r => `${r.day}:${r.code}`).join('|') || `outside:${index}`, required: active.reduce((sum, r) => sum + r.required, 0),
      ...Object.fromEntries(['base', 'revenue', 'notes'].map(key => [key, active.reduce((sum, r) => sum + r[key], 0)])) };
    // Count people, not segments (a split shift must not double-count one employee).
    return [{ ...slot, actual: new Set(fixed.filter(c => covers(c.ranges, slot)).map(c => c.emp.id)).size }];
  });
  const selected = [];
  const used = new Set();
  const blockedReason = c => {
    if (used.has(c)) return 'đã chọn';
    if (weeklyHoursLimit != null && fixedStoreHours + selected.reduce((sum, item) => sum + item.hours, 0) + c.hours > weeklyHoursLimit) return `vượt quỹ giờ cửa hàng ${weeklyHoursLimit}h/tuần`;
    const emp = c.emp;
    if (counts[emp.id] >= (options.maxShiftsPerEmployee ?? SCHEDULE_RULES.MAX_CONFIGURABLE_SHIFTS_PER_WEEK)) return `đạt giới hạn ${options.maxShiftsPerEmployee ?? SCHEDULE_RULES.MAX_CONFIGURABLE_SHIFTS_PER_WEEK} ca/nhân viên/tuần`;
    if (options.reviewOnly) return 'đăng ký chưa được chọn trong bản nháp';
    const violations = scheduleRuleViolations(emp, { ...(result[emp.id] || source[emp.id]), [c.day]: c.code }, options.previousWeekSchedule?.[emp.id], options.nextWeekSchedule?.[emp.id]);
    if (violations.length) return violations[0].code === 'OVER_MAX_HOURS' ? `vượt giới hạn giờ tuần: ${violations[0].message}` : violations[0].message;
    if (c.code === '22-6' && options.nightShiftVolunteers?.length && !options.nightShiftVolunteers.includes(emp.id)) return 'không thuộc nhóm ca đêm được chọn';
    return '';
  };
  const gain = c => slots.reduce((sum, slot) => sum + (slot.actual < slot.required && covers(c.ranges, slot) ? (slot.end - slot.start) / (slot.actual + 1) : 0), 0);

  // Fill the least-covered intervals first, then those with the fewest candidates.
  // Stop once demand is covered; hours targets never create unnecessary shifts.
  const fill = (excluded = null) => { while (true) {
    const eligible = candidates.filter(c => c !== excluded && !blockedReason(c));
    const gaps = slots.filter(slot => slot.actual < slot.required).map(slot => ({ slot, eligible: eligible.filter(c => covers(c.ranges, slot)) })).filter(item => item.eligible.length);
    gaps.sort((a, b) => (a.slot.actual / a.slot.required - b.slot.actual / b.slot.required)
      || (a.eligible.length - b.eligible.length) || a.slot.start - b.slot.start);
    if (!gaps.length) break;
    const { slot, eligible: choices } = gaps[0];
    const night = slot.start % 24 >= 22 || slot.start % 24 < 6;
    const needsMentor = night && ![...fixed, ...selected].some(c => isNightReady(c.emp) && covers(c.ranges, slot));
    choices.sort((a, b) => (needsMentor ? Number(isNightReady(b.emp)) - Number(isNightReady(a.emp)) : 0)
      || Number(b.preferred) - Number(a.preferred) || gain(b) - gain(a)
      || hours[a.emp.id] - hours[b.emp.id] || rank.get(String(a.emp.id)) - rank.get(String(b.emp.id)) || String(a.emp.id).localeCompare(String(b.emp.id)));
    const chosen = choices[0];
    used.add(chosen);
    selected.push(chosen);
    result[chosen.emp.id][chosen.day] = chosen.code;
    hours[chosen.emp.id] += chosen.hours;
    counts[chosen.emp.id]++;
    slots.forEach(s => { if (covers(chosen.ranges, s)) s.actual++; });
  } };
  fill();

  // Bounded local repair: reconsider one proposed registration at a time.
  // Keep a change only if missing staff-hours decrease without adding surplus.
  const cost = () => slots.reduce((s, slot) => ({ missing: s.missing + Math.max(0, slot.required - slot.actual) * (slot.end - slot.start), excess: s.excess + Math.max(0, slot.actual - slot.required) * (slot.end - slot.start) }), { missing: 0, excess: 0 });
  const rebuild = choices => {
    selected.length = 0; used.clear();
    locals.forEach(emp => { result[emp.id] = { ...source[emp.id] }; });
    employees.forEach(emp => {
      hours[emp.id] = WEEK_DAYS.reduce((s, day) => s + (normalizeShift(source[emp.id]?.[day]).confirmed ? getShiftHours(source[emp.id]?.[day]) : 0), 0);
      counts[emp.id] = WEEK_DAYS.filter(day => normalizeShift(source[emp.id]?.[day]).confirmed && getShiftHours(source[emp.id]?.[day]) > 0).length;
    });
    slots.forEach(slot => { slot.actual = new Set(fixed.filter(c => covers(c.ranges, slot)).map(c => c.emp.id)).size; });
    choices.forEach(c => {
      selected.push(c); used.add(c); result[c.emp.id][c.day] = c.code;
      hours[c.emp.id] += c.hours; counts[c.emp.id]++;
      slots.forEach(slot => { if (covers(c.ranges, slot)) slot.actual++; });
    });
  };
  let repairs = 0;
  if (cost().missing > 0 && !options.disableLocalRepair) {
    for (const removed of [...selected].slice(0, 32)) {
      if (!used.has(removed)) continue;
      const before = [...selected], beforeCost = cost();
      rebuild(before.filter(c => c !== removed));
      fill(removed);
      const afterCost = cost();
      if (afterCost.missing < beforeCost.missing && afterCost.excess <= beforeCost.excess) repairs++;
      else rebuild(before);
      if (!cost().missing) break;
    }
  }

  const shortages = [];
  slots.filter(s => s.actual < s.required).forEach(slot => {
    const matching = candidates.filter(c => covers(c.ranges, slot));
    const reasons = [...new Set(matching.filter(c => !used.has(c)).map(blockedReason).filter(Boolean))];
    const reason = !matching.length ? 'Không có đăng ký phù hợp còn có thể chọn.'
      : reasons.length ? `Đăng ký còn lại: ${reasons.join(', ')}.` : 'Số người đăng ký phù hợp chưa đủ.';
    const last = shortages.at(-1);
    if (last && last.demandKey === slot.demandKey && last.end === slot.start && last.required === slot.required && last.actual === slot.actual && last.reason === reason) last.end = slot.end;
    else shortages.push({ ...slot, missing: slot.required - slot.actual, reason });
  });
  const surpluses = [];
  slots.filter(s => s.actual > s.required).forEach(slot => {
    const last = surpluses.at(-1);
    if (last && last.day === slot.day && last.demandKey === slot.demandKey && last.end === slot.start && last.required === slot.required && last.actual === slot.actual) last.end = slot.end;
    else surpluses.push({ ...slot, excess: slot.actual - slot.required });
  });
  [...shortages, ...surpluses].forEach(gap => {
    gap.shift = `${gap.start % 24}-${gap.end % 24}`;
    if (options.currentWeek) {
      const date = new Date(`${options.currentWeek}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + gap.index);
      gap.date = date.toISOString().slice(0, 10);
    }
  });
  const allowed = new Set(options.user ? managedStoreIds(options.user, options.stores || []) : []);
  const supportSuggestions = allowed.has(storeId) ? shortages.flatMap(gap => {
    const available = employees.filter(emp => emp.isActive !== false && emp.dept !== storeId && allowed.has(emp.dept) && !locked.has(emp.id)).flatMap(emp => {
      const cell = normalizeShift(source[emp.id]?.[gap.day]);
      if (!cell.registered || cell.confirmed || cell.covering_store || getShiftHours(cell.shift) <= 0) return [];
      if (!covers(absoluteRanges(cell.shift, gap.index), gap)) return [];
      if (scheduleRuleViolations(emp, { ...source[emp.id], [gap.day]: cell.shift }, options.previousWeekSchedule?.[emp.id], options.nextWeekSchedule?.[emp.id]).length) return [];
      return [{ employeeId: emp.id, name: emp.name, storeId: emp.dept, shift: cell.shift, nightReady: isNightReady(emp) }];
    }).sort((a, b) => Number(b.nightReady) - Number(a.nightReady) || String(a.employeeId).localeCompare(String(b.employeeId))).slice(0, 2);
    return available.length ? [{ day: gap.day, shift: gap.shift, candidates: available }] : [];
  }) : [];
  const criticalInsights = [];
  WEEK_DAYS.forEach(day => {
    const night = [...fixed, ...selected].filter(c => c.day === day && c.code === '22-6');
    if (((matrix[day]['22-6'] || 0) > 0 || night.length) && !night.some(c => isNightReady(c.emp))) {
      criticalInsights.push(`⚠️ Cảnh báo: Ca đêm ${dayName(day)} đang thiếu người cứng (Night Ready), rủi ro vận hành cao!`);
    }
  });
  const assigned = [...fixed, ...selected];
  const ft = locals.filter(fullTime);
  const pt = locals.filter(emp => !fullTime(emp));
  const compliantFT = ft.filter(emp => hours[emp.id] >= SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK && counts[emp.id] >= SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK).length;
  const compliantPT = pt.filter(emp => hours[emp.id] >= SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK && hours[emp.id] <= SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK).length;
  const warnings = shortages.map(gap => `${dayName(gap.day)}${gap.date ? ` (${gap.date})` : ''} · ca ${gap.shift}: thiếu ${gap.missing} người (cần ${gap.required}, có ${gap.actual}). ${gap.reason}`);
  return {
    schedule: Object.fromEntries(Object.entries(result).filter(([id]) => !locked.has(id))),
    employeeHours: hours, employeeShiftsCount: counts,
    borrowedAssignments: [], criticalInsights, shortages, surpluses, supportSuggestions, notices, warnings,
    newAssignments: selected.length,
    stats: {
      repairs, totalEmployees: locals.length, totalFT: ft.length, totalPT: pt.length,
      totalSenior: locals.filter(rules.isSeniorStaff).length, totalNew: locals.filter(rules.isNewStaff).length,
      totalHours: assigned.reduce((sum, c) => sum + c.hours, 0), totalShifts: assigned.length,
      mentorPairsCount: WEEK_DAYS.reduce((sum, day) => sum + (assigned.some(c => c.day === day && c.code === '22-6' && isNightReady(c.emp)) && assigned.some(c => c.day === day && c.code === '22-6' && !isNightReady(c.emp)) ? 1 : 0), 0),
      compliantFTPercent: ft.length ? Math.round(compliantFT / ft.length * 100) : 100,
      compliantPTPercent: pt.length ? Math.round(compliantPT / pt.length * 100) : 100,
    },
    insights: [
      `Đã chọn ${selected.length}/${registeredCount} ca đăng ký từ ${registeredEmployees.size} nhân viên. Giữ ${fixed.length} ca đã chốt tại cửa hàng.`,
      'Chỉ chọn đúng ca đăng ký; giữ ngày OFF, ngày trống và các đăng ký chưa được chọn. Không tự thêm ca để bù đủ giờ.',
      ...(shortages.length ? [`Còn ${shortages.length} khung giờ thiếu người. Quản lý cần trao đổi và bổ sung đăng ký phù hợp.`] : ['Các khung giờ theo định biên đã đủ người.']),
      'Giới hạn giờ tuần và thời gian nghỉ giữa ca vẫn được kiểm tra khi chọn ca.',
      ...(options.smNotes ? [`💬 Lệnh SM: "${options.smNotes}"`] : []),
      ...(Object.keys(options.smOverrides || {}).length ? ['📌 Override theo lệnh SM: đã cập nhật nhu cầu nhân sự, không vượt lịch đăng ký.'] : []),
      ...criticalInsights,
    ],
  };
}
