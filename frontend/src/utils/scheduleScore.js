// =====================================================================
// PHASE 7 — SCHEDULE SCORING ENGINE (configurable weights)
// AI không quyết định business rule — chỉ chấm điểm ứng viên theo trọng số.
// score = coverage + fairness + preference + compliance - penalties
// =====================================================================
import { SEVERITY } from './scheduleConflicts';

export const DEFAULT_SCORE_WEIGHTS = {
  coverage: 30,
  fairness: 20,
  compliance: 25,
  preference: 10,
  overtimePenalty: 15,
  conflictPenalty: 20,
  understaffPenalty: 25,
};

const SEV_PENALTY = {
  [SEVERITY.BLOCKER]: 40,
  [SEVERITY.ERROR]: 15,
  [SEVERITY.WARNING]: 5,
  [SEVERITY.INFO]: 0,
};

/**
 * @param {Array} findings   kết quả analyzeWeek()
 * @param {Object} opts
 * @param {Record<string, number>} [opts.weights]
 * @param {number} [opts.employeeCount]     để tính coverage trung bình ca/ngày
 * @param {Object} [opts.minStaffPerShift]  {'6-14': 2, ...} nhu cầu tối thiểu
 * @returns {{score:number, breakdown:Object}}
 */
export function scoreSchedule(findings, opts = {}) {
  const w = { ...DEFAULT_SCORE_WEIGHTS, ...(opts.weights || {}) };
  const bySev = { BLOCKER: 0, ERROR: 0, WARNING: 0, INFO: 0 };
  for (const f of findings || []) bySev[f.severity] = (bySev[f.severity] || 0) + 1;

  // Compliance: càng ít vi phạm giờ/ca chuẩn càng tốt
  const compliance = Math.max(0, w.compliance - bySev.ERROR * 4 - bySev.BLOCKER * 10);

  // Fairness: phạt chênh lệch số ngày công giữa các NV (xấp xỉ qua variance cảnh báo)
  const fairness = Math.max(0, w.fairness - bySev.WARNING * 2);

  // Coverage: tạm đo bằng tỉ lệ ngày có người (cần staffing matrix để chính xác hơn)
  let coverage = w.coverage;
  if (opts.minStaffPerShift && opts.employeeCount) {
    const need = Object.values(opts.minStaffPerShift).reduce((a, b) => a + b, 0);
    coverage = Math.max(0, Math.min(w.coverage, w.coverage * (opts.employeeCount / Math.max(1, need * 7))));
  }

  const conflictPenalty = Math.min(
    w.conflictPenalty,
    Object.entries(bySev).reduce((sum, [sev, n]) => sum + n * (SEV_PENALTY[sev] || 0), 0) / 10
  );

  const score = Math.max(
    0,
    Math.round(coverage + fairness + compliance + w.preference - conflictPenalty - w.overtimePenalty * (bySev.ERROR > 0 ? 1 : 0))
  );

  return {
    score,
    breakdown: {
      coverage: Math.round(coverage),
      fairness,
      compliance,
      preference: w.preference,
      conflictPenalty: Math.round(conflictPenalty),
      overtimePenaltyApplied: bySev.ERROR > 0 ? w.overtimePenalty : 0,
      countsBySeverity: bySev,
    },
  };
}
