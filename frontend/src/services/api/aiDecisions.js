import { jevRequest, jevDecide, readChoice } from './jevClient';
import { rankGapCandidates, assessShiftSwap } from '../../utils/aiDecisionEngine';
import { notifyTelegram, telegramConfigured } from '../../utils/telegram';

export async function suggestGapCandidates(context) {
  const candidates = rankGapCandidates(context);
  if (!candidates.length) return { candidates, source: 'rules' };
  const shortlist = candidates.slice(0, 60);
  const answers = await jevDecide('candidate_ranking', {
    gap: { shift: context.shift, day: context.day },
    candidates: shortlist.map((c, i) => ({ alias: `candidate_${i}`, weeklyHours: c.currentWeeklyHours, local: c.isLocal, registered: c.hasRegisteredThisShift, off: c.availability === 'off', risk: Math.max(0, ...c.issues.map(x => x.risk)) })),
  });
  const alias = readChoice(answers, 'best_candidate');
  const index = shortlist.findIndex((_, i) => alias === `candidate_${i}`);
  if (index < 0) return { candidates, source: 'rules' };
  const chosen = shortlist[index];
  return { candidates: [chosen, ...candidates.filter(c => c.emp.id !== chosen.emp.id)], source: 'jev' };
}
export async function assessSwapDecision(context) {
  const local = assessShiftSwap(context);
  const result = await jevRequest('shift_swap_assessment', { swapId: context.swap.id });
  const a = result?.assessment;
  if (!a || !Number.isFinite(a.risk_level) || a.risk_level < 0 || a.risk_level > 100 || typeof a.auto_approved !== 'boolean' || !Array.isArray(a.issues)) return local;
  return a;
}
export { telegramConfigured };
export async function inviteGapCandidate({ candidate, storeId, week, day, shift }) {
  if (!telegramConfigured()) throw new Error('Chưa cấu hình Telegram cho ứng dụng');
  const result = await notifyTelegram(`[Mời nhận ca · ${storeId}] ${candidate.emp.name}: ${day}, tuần ${week}, ca ${shift}. Vui lòng phản hồi quản lý nếu có thể nhận ca. Lời mời chưa thay đổi lịch.`);
  if (!result.ok) throw new Error('Gửi lời mời Telegram thất bại');
  return result;
}
