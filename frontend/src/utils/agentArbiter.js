// Runtime-independent scheduler. Jev may select an eligible task; it cannot add tools,
// override dependencies, unlock resources, or declare unverified work complete.
export const AGENT_LIMITS = { maxSteps: 12, maxParallel: 3, minConfidence: 0.85, maxRisk: 60 };
const STATUSES = new Set(['pending', 'running', 'succeeded', 'failed']);

export function validateAgentState(state) {
  if (!state || !['development', 'assistant'].includes(state.mode) || typeof state.revision !== 'string' || !state.revision || !Array.isArray(state.tasks) || !state.tasks.length || state.tasks.length > 32) throw new Error('INVALID_AGENT_STATE');
  const ids = new Set();
  for (const t of state.tasks) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(t.id) || ids.has(t.id) || !STATUSES.has(t.status) || !['read', 'write'].includes(t.access) || !Array.isArray(t.dependsOn) || !Array.isArray(t.resources) || !t.resources.length || t.resources.some(r => typeof r !== 'string' || !r || r.includes('..') || r.includes('\\'))) throw new Error('INVALID_AGENT_TASK');
    if (state.mode === 'assistant' && t.access !== 'read') throw new Error('ASSISTANT_WRITE_FORBIDDEN');
    if (!Number.isInteger(t.attempts) || t.attempts < 0 || !Number.isInteger(t.maxAttempts) || t.maxAttempts < 1 || t.maxAttempts > 5) throw new Error('INVALID_AGENT_ATTEMPTS');
    ids.add(t.id);
  }
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) throw new Error('AGENT_DEPENDENCY_CYCLE');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of state.tasks.find(t => t.id === id).dependsOn) {
      if (!ids.has(dep)) throw new Error('UNKNOWN_AGENT_DEPENDENCY');
      visit(dep);
    }
    visiting.delete(id); visited.add(id);
  };
  for (const id of ids) visit(id);
  if (!Number.isInteger(state.stepsUsed) || state.stepsUsed < 0 || !Number.isInteger(state.maxSteps) || state.maxSteps < 1 || state.maxSteps > AGENT_LIMITS.maxSteps || !Number.isInteger(state.maxParallel) || state.maxParallel < 1 || state.maxParallel > AGENT_LIMITS.maxParallel) throw new Error('INVALID_AGENT_BUDGET');
  return state;
}

const currentSuccess = (task, revision) => task.status === 'succeeded' && task.outputRevision === revision;
export function agentOptions(state) {
  validateAgentState(state);
  if (state.mode === 'development' && state.review?.status === 'rejected' && state.review.revision === state.revision) return [{ id: 'escalate', action: 'ESCALATE', reason: 'Independent review rejected changes; preserve findings before executing further code' }];
  const running = state.tasks.filter(t => t.status === 'running');
  const required = state.tasks.filter(t => t.required !== false);
  const tasksDone = required.every(t => currentSuccess(t, state.revision));
  const verified = state.mode !== 'development' || ['tests', 'lint', 'build'].every(k => state.checks?.[k]?.status === 'passed' && state.checks[k].revision === state.revision);
  const review = state.review;
  const reviewed = state.mode !== 'development' || (review?.status === 'approved' && review.revision === state.revision && typeof review.reviewer === 'string' && review.reviewer && review.author && review.reviewer !== review.author);
  if (!running.length && tasksDone && verified && reviewed) return [{ id: 'done', action: 'DONE', reason: 'All required current-revision evidence is complete' }];
  if (state.stepsUsed >= state.maxSteps) return [{ id: running.length ? 'wait' : 'escalate', action: running.length ? 'WAIT' : 'ESCALATE', reason: 'Step budget exhausted; finish in-flight work and preserve changes' }];
  const ready = state.tasks.filter(t => {
    if (t.status === 'running' || currentSuccess(t, state.revision) || t.attempts >= t.maxAttempts) return false;
    if (t.access === 'write' && t.authorized !== true) return false;
    if (!t.dependsOn.every(id => currentSuccess(state.tasks.find(d => d.id === id), state.revision))) return false;
    // Revisions describe the whole workspace. Writers therefore run exclusively,
    // even when declared paths differ, until per-resource snapshots are supported.
    return !running.some(r => t.access === 'write' || r.access === 'write');
  });
  if (running.length >= state.maxParallel) return [{ id: 'wait', action: 'WAIT', reason: 'All execution slots occupied' }];
  if (!ready.length) return [{ id: running.length ? 'wait' : 'escalate', action: running.length ? 'WAIT' : 'ESCALATE', reason: running.length ? 'Waiting for dependencies or resources' : 'No eligible task; missing evidence or exhausted attempts' }];
  return ready.map(t => ({ id: `run_${t.id}`, action: 'DISPATCH', taskId: t.id, reason: t.description || t.role || t.id }));
}

export function agentDecisionState(state) {
  const options = agentOptions(state);
  // Keep source code, prompts, tool output, secrets and user messages out of arbitration.
  return {
    mode: state.mode, stepsRemaining: state.maxSteps - state.stepsUsed,
    tasks: state.tasks.map(t => ({ id: t.id, role: t.role, status: t.status, access: t.access, dependsOn: t.dependsOn, attempts: t.attempts, currentEvidence: currentSuccess(t, state.revision) })),
    options: options.map(o => ({ id: o.id, action: o.action, taskId: o.taskId })),
  };
}

export function chooseAgentStep(state, answers = null) {
  const options = agentOptions(state);
  const fallback = { ...options[0], source: 'rules', confidence: null, risk: null };
  if (options.length === 1 || !answers) return fallback;
  const choice = answers.next_step, risk = answers.risk, proceed = answers.proceed;
  if (choice?.type !== 'choice' || !Number.isFinite(choice.confidence) || choice.confidence < AGENT_LIMITS.minConfidence || choice.confidence > 1 || risk?.type !== 'score' || !Number.isFinite(risk.score) || risk.score < 0 || risk.score > 4 || proceed?.type !== 'noul' || !Number.isFinite(proceed.noul) || proceed.noul < 0 || proceed.noul > 1) return fallback;
  const selected = options.find(o => o.id === choice.choice);
  if (!selected) return fallback;
  if (risk.score / 4 * 100 > AGENT_LIMITS.maxRisk || proceed.noul < AGENT_LIMITS.minConfidence) return { action: 'ESCALATE', id: 'escalate', source: 'jev', reason: 'Arbiter requests closer review', risk: risk.score / 4 * 100, confidence: choice.confidence };
  return { ...selected, source: 'jev', risk: risk.score / 4 * 100, confidence: choice.confidence };
}

export function startAgentTask(state, taskId, runId) {
  if (!runId || !agentOptions(state).some(o => o.taskId === taskId)) throw new Error('AGENT_TASK_NOT_ELIGIBLE');
  return { ...state, stepsUsed: state.stepsUsed + 1, tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'running', attempts: t.attempts + 1, runId, startedRevision: state.revision } : t) };
}

export function finishAgentTask(state, { taskId, runId, revision, ok, failure = null }) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || task.status !== 'running' || task.runId !== runId || task.startedRevision !== revision || state.revision !== revision) throw new Error('STALE_AGENT_RESULT');
  return { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: ok === true ? 'succeeded' : 'failed', outputRevision: ok === true ? revision : null, failure: ok === true ? null : failure } : t) };
}

/** A runtime supplies real agent adapters; the scheduler does not execute model text. */
export async function runAgentWorkflow(initial, { decide, execute, getRevision, collectEvidence, onEvent = () => {}, signal, timeoutMs = 30000 }) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('INVALID_AGENT_TIMEOUT');
  let state = structuredClone(validateAgentState(initial));
  if (state.mode === 'development' && (typeof getRevision !== 'function' || typeof collectEvidence !== 'function')) throw new Error('DEVELOPMENT_EVIDENCE_ADAPTER_REQUIRED');
  // A JSON state file is not proof that this host ran checks or verified reviews.
  if (state.mode === 'development') state = { ...state, checks: {}, review: null };
  if (state.tasks.some(t => t.status === 'running')) throw new Error('CANNOT_RESUME_UNOWNED_AGENTS');
  const outputs = {}, pending = new Map(), workerTimers = new Set();
  const stop = new AbortController();
  const combined = signal ? AbortSignal.any([signal, stop.signal]) : stop.signal;
  const cancelled = new Promise(resolve => combined.addEventListener('abort', () => resolve({ cancelled: true }), { once: true }));
  const bounded = async operation => {
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => operation(combined)).then(value => ({ value })), cancelled,
        new Promise(resolve => { timer = setTimeout(() => resolve({ timeout: true }), timeoutMs); }),
      ]);
      if (result.cancelled || result.timeout) throw new Error(result.cancelled ? 'Cancelled' : 'Evidence adapter timeout');
      return result.value;
    } finally { clearTimeout(timer); }
  };
  try {
    while (true) {
      if (combined.aborted) return { state, outputs, action: 'ESCALATE', reason: 'Cancelled' };
      if (getRevision && !pending.size && await bounded(getRevision) !== state.revision) return { state, outputs, action: 'ESCALATE', reason: 'Workspace or application context changed' };
      const options = agentOptions(state);
      let answers = null;
      if (options.length > 1 && decide) {
        let timer;
        try { answers = await Promise.race([decide(structuredClone(state), combined), cancelled, new Promise(resolve => { timer = setTimeout(() => resolve(null), Math.min(timeoutMs, 2000)); })]); }
        catch { /* Deterministic routing remains available. */ }
        finally { clearTimeout(timer); }
      }
      if (combined.aborted) return { state, outputs, action: 'ESCALATE', reason: 'Cancelled' };
      const decision = chooseAgentStep(state, answers);
      onEvent({ type: 'decision', decision, revision: state.revision });
      if (['DONE', 'ESCALATE'].includes(decision.action)) return { state, outputs, ...decision };
      if (decision.action === 'DISPATCH') {
        // Arbitration may await a provider. Recheck the snapshot before starting
        // another adapter; an unrelated edit must not be attributed to its writer.
        if (getRevision && await bounded(getRevision) !== state.revision) return { state, outputs, action: 'ESCALATE', reason: 'Context changed before agent dispatch' };
        const taskId = decision.taskId, runId = `${state.stepsUsed + 1}:${taskId}`;
        state = startAgentTask(state, taskId, runId);
        const task = state.tasks.find(t => t.id === taskId), revision = state.revision;
        // Timeout aborts the entire run: never start a new writer while a timed-out
        // adapter may still be running. Adapters must honor their abort signal.
        let timer;
        const promise = Promise.race([
          Promise.resolve().then(() => execute(task, { revision, runId, outputs: structuredClone(outputs), signal: combined })).then(output => ({ taskId, runId, revision, ok: true, output }), error => ({ taskId, runId, revision, ok: false, error: error instanceof Error ? error.message : 'Adapter failure', failure: { code: typeof error?.code === 'string' ? error.code : 'ADAPTER_FAILURE', message: error instanceof Error ? error.message : 'Adapter failure', retryable: error?.retryable !== false, retryAfterHint: typeof error?.retryAfterHint === 'string' ? error.retryAfterHint : null } })),
          new Promise(resolve => { timer = setTimeout(() => resolve({ timeout: true, taskId }), timeoutMs); workerTimers.add(timer); }),
        ]).finally(() => { clearTimeout(timer); workerTimers.delete(timer); });
        pending.set(taskId, promise);
      } else {
        if (!pending.size) return { state, outputs, action: 'ESCALATE', reason: 'Running tasks belong to another runtime' };
        const result = await Promise.race([...pending.values(), cancelled]);
        if (combined.aborted || result.cancelled) return { state, outputs, action: 'ESCALATE', reason: 'Cancelled' };
        if (result.timeout) return { state, outputs, action: 'ESCALATE', reason: `Agent timeout: ${result.taskId}` };
        const task = state.tasks.find(t => t.id === result.taskId);
        const observed = getRevision ? await bounded(getRevision) : state.revision;
        if (observed !== state.revision) {
          if (task.access !== 'write' || !result.ok) return { state, outputs, action: 'ESCALATE', reason: 'Context changed during agent execution' };
          state = { ...state, revision: observed, checks: {}, review: null, tasks: state.tasks.map(t => {
            if (t.id === task.id || t.status === 'succeeded' && (t.role === 'analysis' || t.access === 'write')) return { ...t, status: 'succeeded', outputRevision: observed };
            delete outputs[t.id];
            return { ...t, status: 'pending', outputRevision: null, attempts: 0 };
          }) };
        } else state = finishAgentTask(state, result);
        pending.delete(result.taskId);
        if (result.ok) outputs[result.taskId] = result.output;
        if (collectEvidence && result.ok) {
          const evidence = await bounded(signal => collectEvidence({ taskId: result.taskId, revision: state.revision, signal }));
          state = { ...state, checks: evidence?.checks || state.checks, review: evidence?.review || state.review };
        }
        onEvent({ type: 'result', taskId: result.taskId, ok: result.ok, revision: state.revision, error: result.error });
        if (result.failure?.retryable === false) return { state, outputs, action: 'ESCALATE', reason: result.failure.code };
      }
    }
  } catch (error) {
    return { state, outputs, action: 'ESCALATE', reason: error instanceof Error ? error.message : 'Adapter failure' };
  } finally { stop.abort(); for (const timer of workerTimers) clearTimeout(timer); }
}
