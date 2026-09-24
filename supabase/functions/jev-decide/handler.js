import { JEV_API_URL, questionsFor, validateAnswers } from '../_shared/jevContract.js';
import { assessShiftSwap, requiredDecisionWeeks } from '../../../frontend/src/utils/aiDecisionEngine.js';

export function createJevHandler({ createClient, env, fetch: providerFetch = globalThis.fetch, logger = console }) {
  const URL = env('SUPABASE_URL') ?? '';
  const MODEL = env('JEV_MODEL') ?? 'jev-latest';
  const KEY = env('TYPESAFE_API_KEY') ?? '';
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  let failures = 0, openUntil = 0;
  // Per-instance best-effort limit; not a substitute for project API quotas.
  const callers = new Map();

  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ ok: false, reason: 'METHOD_NOT_ALLOWED' }, 405);
    const started = Date.now();
    const auth = req.headers.get('Authorization') || '';
    const client = createClient(URL, env('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
    const { data: identity, error: authError } = await client.auth.getUser();
    if (authError || !identity.user) return json({ ok: false, reason: 'UNAUTHENTICATED' }, 401);
    const userId = identity.user.id;
    const rate = callers.get(userId);
    if (rate && rate.until > started && rate.count >= 30) return json({ ok: false, reason: 'RATE_LIMITED' }, 429);
    if (callers.size > 1000) callers.clear();
    callers.set(userId, rate && rate.until > started ? { ...rate, count: rate.count + 1 } : { count: 1, until: started + 60000 });
    let body;
    try {
      const raw = await req.text();
      if (raw.length > 32000) return json({ ok: false, reason: 'STATE_TOO_LARGE' }, 413);
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || body.questions) throw new Error('INVALID_BODY');
    } catch { return json({ ok: false, reason: 'BAD_REQUEST' }, 400); }
    const admin = createClient(URL, env('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let state = body.state, assessment = null, snapshot = null, swap = null, settings = null;
    const respond = async (answers, reason = null) => {
      const audit = await admin.from('jev_decisions').insert({ task: body.task, user_id: userId, latency_ms: Date.now() - started, ok: !!answers, fail_reason: reason, model: MODEL, answers, auto_approved: assessment?.auto_approved === true });
      if (audit.error) logger.error('JEV_AUDIT_WRITE_FAILED', audit.error.code);
      return json({ ok: true, answers, assessment, reason, latencyMs: Date.now() - started });
    };
    try {
      if (body.task === 'shift_swap_assessment') {
        // Caller sees only swaps allowed by RLS. Never trust browser hours, IDs or decisions.
        const visible = await client.from('shift_swaps').select('id').eq('id', body.state?.swapId).single();
        if (visible.error || !visible.data) return json({ ok: false, reason: 'FORBIDDEN' }, 403);
        const result = await admin.from('shift_swaps').select('*').eq('id', visible.data.id).single();
        if (result.error) throw result.error;
        const row = result.data;
        swap = { id: row.id, week: row.week_date, store: row.store, fromEmpId: row.from_emp_id, toEmpId: row.to_emp_id, fromDay: row.from_day, toDay: row.to_day, fromShift: row.from_shift, toShift: row.to_shift, status: row.status };
        const ids = [swap.fromEmpId, swap.toEmpId], weeks = requiredDecisionWeeks(swap.week);
        const [staff, schedules, config] = await Promise.all([
          admin.from('employees').select('id,type,dept,max_h,is_active').in('id', ids).order('id'),
          admin.from('schedules').select('week_date,emp_id,shifts,version').in('emp_id', ids).in('week_date', weeks),
          admin.from('jev_auto_approval_settings').select('*').eq('store_id', swap.store).maybeSingle(),
        ]);
        if (staff.error || schedules.error || config.error) throw new Error('CONTEXT_UNAVAILABLE');
        settings = config.data;
        const schedule = Object.fromEntries(weeks.map(w => [w, {}]));
        const versions = Object.fromEntries(weeks.map(w => [w, Object.fromEntries(ids.map(id => [id, 0]))]));
        for (const r of schedules.data) { schedule[r.week_date][r.emp_id] = r.shifts; versions[r.week_date][r.emp_id] = r.version; }
        assessment = assessShiftSwap({ swap, employees: staff.data.map(e => ({ ...e, maxH: e.max_h })), schedule });
        if (staff.data.some(e => !e.is_active)) assessment = { ...assessment, eligible: false, risk_level: 100, issues: [...assessment.issues, { code: 'INACTIVE', message: 'Nhan vien khong hoat dong', risk: 100 }] };
        snapshot = { versions, shifts: schedule, employees: staff.data };
        // No names, employee numbers, free-form swap reasons or schedule keys leave the app.
        state = { eligible: assessment.eligible, issues: assessment.issues.map(({ code, risk }) => ({ code, risk })), risk_level: assessment.risk_level, consent: swap.status === 'pending_manager', employees: assessment.people };
        if (!assessment.eligible) return await respond(null, 'RULE_REVIEW');
      } else if (body.task === 'candidate_ranking') {
        const list = body.state?.candidates;
        if (!Array.isArray(list) || list.length > 60) throw new Error('INVALID_CANDIDATES');
        // Explicit allowlist: no names/employee IDs/free-form instructions sent to provider.
        state = { candidates: list.map((c, i) => ({ alias: `candidate_${i}`, weeklyHours: Number(c.weeklyHours), local: c.local === true, registered: c.registered === true, off: c.off === true, risk: Number(c.risk) })) };
        const gap = body.state?.gap;
        if (gap && /^\d{1,2}-\d{1,2}$/.test(gap.shift) && ['T2','T3','T4','T5','T6','T7','CN'].includes(gap.day)) state.gap = { shift: gap.shift, day: gap.day };
      } else {
        // Legacy advisory tasks: redact identifiers and private text fields.
        state = JSON.parse(JSON.stringify(state ?? {}, (key, value) => /name|emp.?id|phone|email|salary|bank|account|reason|message/i.test(key) ? undefined : value));
      }
      const questions = questionsFor(body.task, state);
      if (!KEY || Date.now() < openUntil) return await respond(null, !KEY ? 'NOT_CONFIGURED' : 'CIRCUIT_OPEN');
      let answers = null, reason = null;
      try {
        const response = await providerFetch(JEV_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, state, questions }), signal: AbortSignal.timeout(1800) });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        answers = validateAnswers((await response.json()).answers, questions);
        if (!answers) throw new Error('INVALID_ANSWERS');
        failures = 0;
      } catch (error) {
        reason = error instanceof Error ? error.message : 'PROVIDER_FAILURE';
        if (++failures >= 5) { openUntil = Date.now() + 60000; failures = 0; }
      }
      if (assessment && answers) {
        const risk = Math.max(assessment.risk_level, Math.round(answers.risk_level.score / 4 * 100));
        assessment = { ...assessment, eligible: assessment.eligible && risk <= 60, risk_level: risk, source: 'jev' };
        if (env('JEV_AUTO_APPROVE') === 'on' && settings?.enabled && settings.model === MODEL && answers.auto_approved.noul >= settings.min_noul && answers.risk_level.confidence >= settings.min_confidence && assessment.risk_level <= 60) {
          const approved = await admin.rpc('jev_approve_swap', { p_swap_id: swap.id, p_snapshot: snapshot, p_risk: assessment.risk_level, p_noul: answers.auto_approved.noul, p_confidence: answers.risk_level.confidence, p_model: MODEL });
          if (!approved.error && approved.data === true) assessment.auto_approved = true;
          else reason = 'CONTEXT_CHANGED_OR_LOCKED';
        }
      }
      return await respond(answers, reason);
    } catch {
      return json({ ok: false, reason: 'INVALID_OR_UNAVAILABLE_CONTEXT', assessment: null }, 400);
    }
  };
}
