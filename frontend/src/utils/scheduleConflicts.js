// =====================================================================
// SCHEDULE CONFLICT ENGINE — phát hiện xung đột lịch thống nhất (Phase 3)
// Đầu vào thuần dữ liệu, không phụ thuộc store/UI. Output finding:
//   { code, severity, employeeId, date(dayKey), message }
// Severity: BLOCKER > ERROR > WARNING > INFO
// =====================================================================
import { SHIFTS } from '../data/initialData';
import { SCHEDULE_RULES, WEEK_DAYS } from '../data/constants';
import { getShiftCode } from './shiftHelper';

export const SEVERITY = { BLOCKER: 'BLOCKER', ERROR: 'ERROR', WARNING: 'WARNING', INFO: 'INFO' };
const SEV_ORDER = [SEVERITY.BLOCKER, SEVERITY.ERROR, SEVERITY.WARNING, SEVERITY.INFO];

const REST_HOURS_BETWEEN_DAYS = 8; // nghi toi thieu giua 2 ngay lam lien tiep

export function normalizeType(emp) {
  const t = String(emp?.type || '').toUpperCase();
  const r = String(emp?.role || '').toUpperCase();
  return (t.includes('PT') || r.includes('PT')) ? 'STPT' : 'STFT';
}

/** Tach ca tu o lich: ho tro chuoi '6-14', object {shift, covering_store}, legacy '6-14_VN0485'. */
export function parseCell(cell) {
  if (!cell) return { code: '', covering: '' };
  const shift = typeof cell === 'object' ? cell.shift : cell;
  const covering = typeof cell === 'object' ? (cell.covering_store || '') : String(shift).includes('_') ? String(shift).split('_')[1] : '';
  return { code: String(getShiftCode(shift) || '').trim(), covering };
}

function parseRange(code) {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(code);
  if (!m) return null;
  const s = parseInt(m[1], 10), e = parseInt(m[2], 10);
  if (isNaN(s) || isNaN(e) || s === e || Math.max(s, e) > 24) return { invalid: true };
  const overnight = e < s;
  return { start: s, end: overnight ? e + 24 : e, overnight };
}

function knownShift(code) {
  return Object.prototype.hasOwnProperty.call(SHIFTS, code);
}

function hoursOf(code) {
  if (knownShift(code)) return SHIFTS[code].hours;
  const r = parseRange(code);
  if (!r || r.invalid) return 0;
  return r.end - r.start > 16 ? 24 - (r.end - r.start) : r.end - r.start;
}

/**
 * Phan tich 1 nhan vien 1 tuan.
 * @param {object} p
 * @param {string} p.empId @param {object} p.shifts {[dayKey]: cell}
 * @param {string} [p.type] 'STPT'|'STFT' @param {number} [p.maxH]
 */
export function analyzeEmployeeWeek(p) {
  const findings = [];
  const type = p.type || normalizeType(p);
  const isFT = type !== 'STPT';
  const workedDays = [];

  for (const day of WEEK_DAYS) {
    const { code, covering } = parseCell(p.shifts?.[day]);
    if (!code || code === 'off') continue;

    const rng0 = parseRange(code);
    if (rng0 === null && !knownShift(code)) {
      findings.push({ code: 'UNSUPPORTED_SHIFT', severity: SEVERITY.BLOCKER, employeeId: p.empId, date: day, message: 'Mã ca không hợp lệ: ' + code });
      continue;
    }
    const rng = rng0 && !rng0.invalid ? rng0 : (knownShift(code) ? parseRange(code) : rng0);
    if (!rng || rng.invalid) {
      findings.push({ code: 'INVALID_TIME_RANGE', severity: SEVERITY.BLOCKER, employeeId: p.empId, date: day, message: 'Khoảng giờ ca không hợp lệ (' + code + ')' });
      continue;
    }
    if (covering) {
      findings.push({ code: 'COVERING_SHIFT', severity: SEVERITY.INFO, employeeId: p.empId, date: day, message: 'Chi viện tại ' + covering + ' (' + code + ')', storeId: covering });
    }
    workedDays.push({ day, code, rng, endAbs: rng.end });
  }

  // Nghỉ giữa 2 ngày không đủ (so ngày liền trước)
  for (let i = 1; i < workedDays.length; i++) {
    const prev = workedDays[i - 1], cur = workedDays[i];
    const prevIdx = WEEK_DAYS.indexOf(prev.day), curIdx = WEEK_DAYS.indexOf(cur.day);
    if (curIdx !== prevIdx + 1) continue;
    const restH = (((cur.rng.start - prev.endAbs) % 24) + 24) % 24;
    if (restH < REST_HOURS_BETWEEN_DAYS) {
      findings.push({ code: 'INSUFFICIENT_REST', severity: SEVERITY.ERROR, employeeId: p.empId, date: cur.day, message: 'Thời gian nghỉ giữa ' + prev.day + ' (' + prev.code + ') và ' + cur.day + ' (' + cur.code + ') chỉ còn ' + restH + 'h (< ' + REST_HOURS_BETWEEN_DAYS + 'h)' });
    }
  }

  const totalH = workedDays.reduce((s, w) => s + hoursOf(w.code), 0);
  const shiftCount = workedDays.length;

  const hardCap = Math.min(Number(p.maxH) || Infinity, isFT ? SCHEDULE_RULES.STFT_MAX_HOURS_PER_WEEK : SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK);
  if (Number.isFinite(hardCap) && totalH > hardCap) {
    findings.push({ code: 'OVER_MAX_HOURS', severity: SEVERITY.ERROR, employeeId: p.empId, date: WEEK_DAYS[6], message: type + ' vượt định mức tuần: ' + totalH + 'h > ' + hardCap + 'h' });
  }
  const minH = isFT ? SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK : SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK;
  if (shiftCount > 0 && totalH < minH) {
    findings.push({ code: 'UNDER_MIN_HOURS', severity: SEVERITY.WARNING, employeeId: p.empId, date: WEEK_DAYS[6], message: type + ' thiếu giờ tuần: ' + totalH + 'h < ' + minH + 'h' });
  }
  if (isFT && shiftCount > 0 && shiftCount < SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK) {
    findings.push({ code: 'UNDER_MIN_SHIFTS', severity: SEVERITY.WARNING, employeeId: p.empId, date: WEEK_DAYS[6], message: 'STFT cần ≥ ' + SCHEDULE_RULES.STFT_MIN_SHIFTS_PER_WEEK + ' ca/tuần, đang có ' + shiftCount });
  }

  return sortFindings(findings);
}

/** Qua nhieu grid cua hang cung luc → phát hiện NV bị xếp ở 2 CH cùng ngày. */
export function analyzeCrossStore(grids) {
  const findings = [];
  const seen = {}; // empId -> day -> [storeId]
  for (const g of grids || []) {
    for (const [empId, shifts] of Object.entries(g.scheduleByEmp || {})) {
      seen[empId] = seen[empId] || {};
      for (const day of WEEK_DAYS) {
        const { code } = parseCell(shifts?.[day]);
        if (!code || code === 'off') continue;
        (seen[empId][day] = seen[empId][day] || []).push(g.storeId);
      }
    }
  }
  for (const [empId, days] of Object.entries(seen)) {
    for (const [day, list] of Object.entries(days)) {
      const uniq = [...new Set(list)];
      if (uniq.length > 1) {
        findings.push({ code: 'CROSS_STORE_DAY', severity: SEVERITY.WARNING, employeeId: empId, date: day, message: 'Xếp tại nhiều cửa hàng cùng ngày: ' + uniq.join(', ') });
      }
    }
  }
  return sortFindings(findings);
}

export function analyzeWeek(employees, scheduleByEmp, grids) {
  const out = [];
  for (const emp of employees || []) {
    const shifts = scheduleByEmp?.[emp.id];
    if (!shifts) continue;
    out.push(...analyzeEmployeeWeek({ empId: emp.id, shifts, type: emp.type || emp.role, maxH: emp.maxH }));
  }
  if (grids) out.push(...analyzeCrossStore(grids));
  return sortFindings(out);
}

function sortFindings(list) {
  return [...list].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
}
