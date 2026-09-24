// Jev scores are expected level indices, not percentages. See docs.typesafe.ai/api.
export const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
export function questionsFor(task, state) {
  if (task === 'candidate_ranking') {
    const candidates = state?.candidates;
    if (!Array.isArray(candidates) || !candidates.length || candidates.length > 60 || candidates.some((c, i) => c.alias !== `candidate_${i}`)) throw new Error('INVALID_CANDIDATES');
    return { best_candidate: { type: 'choice', instructions: 'Choose the best candidate alias to INVITE for this gap. Prefer sufficient rest, lower weekly hours, local store and explicit registration. OFF is not consent. Use only provided facts; never infer skills or likelihood of acceptance.', criteria: Object.fromEntries(candidates.map(c => [c.alias, `Candidate ${c.alias} in state`])) } };
  }
  if (task === 'shift_swap_assessment') return {
    auto_approved: { type: 'noul', instructions: 'Is this swap low-risk for automatic approval? Answer false if any rule issue, uncertainty, missing context, fatigue, cross-store work or short notice exists. Both people must have consented.' },
    risk_level: { type: 'score', instructions: 'Assess operational fatigue and scheduling risk using only the supplied facts.', criteria: ['No detected risk', 'Low risk', 'Moderate risk', 'Manager review needed', 'Unsafe or insufficient evidence'] },
  };
  if (task === 'notification_routing') return {
    channel: { type: 'choice', instructions: 'Choose the notification channel for this store event.', criteria: { in_app: 'In-app only', telegram: 'Urgent Telegram', both: 'Both channels', digest: 'Morning digest' } },
    priority: { type: 'score', instructions: 'How urgent is this event?', criteria: ['Ignore', 'Later', 'This week', 'Today', 'Immediately'] },
    can_wait: { type: 'noul', instructions: 'Can this event wait until 8am tomorrow?' },
  };
  if (task === 'staffing_gap_triage') return {
    urgency: { type: 'score', instructions: 'How urgent is the staffing gap?', criteria: ['Low', 'Monitor', 'This week', 'Today', 'Immediately'] },
    action: { type: 'choice', instructions: 'Suggest an action for this gap.', criteria: { borrow_store: 'Borrow staff', call_pt: 'Invite PT', internal_ot: 'Ask manager about overtime', shift_move: 'Propose swap', accept: 'Monitor' } },
    unlikely_filled: { type: 'noul', instructions: 'Is this gap unlikely to be filled before the deadline?' },
  };
  if (task === 'lock_readiness') return {
    readiness: { type: 'score', instructions: 'Is the schedule ready to lock?', criteria: ['Many issues', 'Review', 'Ready with notes', 'Ready'] },
    night_unfair: { type: 'noul', instructions: 'Are night shifts unfairly distributed?' },
    against_registration: { type: 'noul', instructions: 'Does the schedule contradict registrations?' },
    likely_rework: { type: 'noul', instructions: 'Will this schedule likely need rework?' },
  };
  throw new Error('UNKNOWN_TASK');
}
export function validateAnswers(answers, questions) {
  if (!answers || typeof answers !== 'object') return null;
  const clean = {};
  for (const [key, question] of Object.entries(questions)) {
    const a = answers[key];
    if (!a || a.type !== question.type) return null;
    if (a.type === 'noul') {
      if (!Number.isFinite(a.noul) || a.noul < 0 || a.noul > 1) return null;
      clean[key] = { type: 'noul', noul: a.noul };
    } else {
      if (!Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1) return null;
      if (a.type === 'choice' && (typeof a.choice !== 'string' || !Object.hasOwn(question.criteria, a.choice))) return null;
      if (a.type === 'score' && (!Number.isFinite(a.score) || a.score < 0 || a.score > question.criteria.length - 1)) return null;
      clean[key] = a.type === 'choice' ? { type: a.type, choice: a.choice, confidence: a.confidence } : { type: a.type, score: a.score, confidence: a.confidence };
    }
  }
  return clean;
}
