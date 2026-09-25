import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  agentDecisionState, agentOptions, chooseAgentStep, finishAgentTask,
  runAgentWorkflow, startAgentTask, validateAgentState,
} from '../utils/agentArbiter.js';

const revision = 'revision_a';
const task = (id, extra = {}) => ({
  id, role: id, status: 'pending', access: 'read', resources: ['frontend/src'],
  dependsOn: [], attempts: 0, maxAttempts: 1, ...extra,
});
const state = (tasks = [task('analyze')], extra = {}) => ({
  mode: 'assistant', revision, tasks, stepsUsed: 0, maxSteps: 12, maxParallel: 3, ...extra,
});
const success = (id, extra = {}) => task(id, { status: 'succeeded', outputRevision: revision, ...extra });
const evidence = (extra = {}) => ({
  checks: Object.fromEntries(['tests', 'lint', 'build'].map(name => [name, { status: 'passed', revision }])),
  review: { status: 'approved', revision, author: 'coder', reviewer: 'reviewer' }, ...extra,
});
const answers = (choice, extra = {}) => ({
  next_step: { type: 'choice', choice, confidence: 0.98 },
  risk: { type: 'score', score: 0.5 }, proceed: { type: 'noul', noul: 0.99 }, ...extra,
});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => vi.useRealTimers());

describe('agent dependency and resource boundaries', () => {
  it('rejects missing dependencies, duplicate IDs and cycles', () => {
    expect(() => validateAgentState(state([task('a', { dependsOn: ['missing'] })]))).toThrow('UNKNOWN_AGENT_DEPENDENCY');
    expect(() => validateAgentState(state([task('a'), task('a')]))).toThrow('INVALID_AGENT_TASK');
    expect(() => validateAgentState(state([task('a', { dependsOn: ['b'] }), task('b', { dependsOn: ['a'] })]))).toThrow('AGENT_DEPENDENCY_CYCLE');
    expect(() => validateAgentState(state([task('a', { dependsOn: ['a'] })]))).toThrow('AGENT_DEPENDENCY_CYCLE');
  });

  it('requires dependency evidence for the current revision', () => {
    const input = state([success('analyze', { outputRevision: 'old' }), task('review', { dependsOn: ['analyze'] })]);
    expect(agentOptions(input).map(option => option.taskId)).toEqual(['analyze']);
    input.tasks[0].outputRevision = revision;
    expect(agentOptions(input).map(option => option.taskId)).toEqual(['review']);
  });

  it('never gives assistant workflows write access or dispatches unauthorized developers', () => {
    expect(() => validateAgentState(state([task('code', { access: 'write', authorized: true })]))).toThrow('ASSISTANT_WRITE_FORBIDDEN');
    expect(agentOptions(state([task('code', { access: 'write' })], { mode: 'development' }))[0].action).toBe('ESCALATE');
  });

  it('allows only one writer, even when write resources are disjoint', () => {
    const input = state([
      task('first', { access: 'write', authorized: true, resources: ['frontend/src'], status: 'running' }),
      task('second', { access: 'write', authorized: true, resources: ['docs'] }),
      task('read_docs', { resources: ['docs'] }),
      task('read_source', { resources: ['frontend/src/App.jsx'] }),
    ], { mode: 'development' });
    expect(agentOptions(input)[0].action).toBe('WAIT');
  });

  it('blocks a writer overlapping readers, including wildcard resources', () => {
    for (const resources of [['frontend/src'], ['*']]) {
      const input = state([
        task('read', { resources, status: 'running' }),
        task('code', { access: 'write', authorized: true, resources: ['frontend/src/App.jsx'] }),
      ], { mode: 'development' });
      expect(agentOptions(input)[0].action).toBe('WAIT');
    }
  });

  it('permits concurrent readers but obeys the slot limit', () => {
    const input = state([task('a', { status: 'running' }), task('b')], { maxParallel: 2 });
    expect(agentOptions(input)[0].taskId).toBe('b');
    expect(agentOptions({ ...input, maxParallel: 1 })[0].action).toBe('WAIT');
  });

  it('lets the final budgeted task finish before deciding completion', () => {
    let input = state([task('last')], { maxSteps: 1 });
    input = startAgentTask(input, 'last', 'run_1');
    expect(input.stepsUsed).toBe(1);
    expect(agentOptions(input)[0].action).toBe('WAIT');
    input = finishAgentTask(input, { taskId: 'last', runId: 'run_1', revision, ok: true });
    expect(agentOptions(input)[0].action).toBe('DONE');
  });

  it('escalates after an exhausted failed attempt or dispatch budget', () => {
    expect(agentOptions(state([task('a', { status: 'failed', attempts: 1 })]))[0].action).toBe('ESCALATE');
    expect(agentOptions(state([task('a')], { stepsUsed: 1, maxSteps: 1 }))[0].action).toBe('ESCALATE');
  });

  it.each([
    { runId: 'wrong', revision },
    { runId: 'run_1', revision: 'old' },
  ])('rejects results from an outdated run or revision: %j', result => {
    const input = startAgentTask(state(), 'analyze', 'run_1');
    expect(() => finishAgentTask(input, { taskId: 'analyze', ok: true, ...result })).toThrow('STALE_AGENT_RESULT');
    expect(() => finishAgentTask({ ...input, revision: 'new' }, { taskId: 'analyze', runId: 'run_1', revision, ok: true })).toThrow('STALE_AGENT_RESULT');
  });
});

describe('Jev selection is constrained by deterministic eligibility', () => {
  const input = () => state([task('analyze'), task('quality'), task('review', { dependsOn: ['analyze'] })]);

  it('accepts a confident, low-risk eligible choice', () => {
    expect(chooseAgentStep(input(), answers('run_quality'))).toMatchObject({ taskId: 'quality', source: 'jev', risk: 12.5 });
  });

  it.each(['run_unknown', 'run_review', 'done'])('falls back when Jev selects %s', choice => {
    expect(chooseAgentStep(input(), answers(choice))).toMatchObject({ taskId: 'analyze', source: 'rules' });
  });

  it.each([
    { next_step: { type: 'choice', choice: 'run_quality', confidence: 0.5 } },
    { risk: { type: 'score', score: NaN } },
    { risk: { type: 'score', score: 100 } },
    { proceed: { type: 'noul', noul: 2 } },
  ])('falls back for untrusted or malformed provider data: %j', override => {
    expect(chooseAgentStep(input(), answers('run_quality', override)).source).toBe('rules');
  });

  it('lets a valid provider decision request human review, not bypass risk', () => {
    expect(chooseAgentStep(input(), answers('run_quality', { risk: { type: 'score', score: 3 } }))).toMatchObject({ action: 'ESCALATE', source: 'jev' });
    expect(chooseAgentStep(input(), answers('run_quality', { proceed: { type: 'noul', noul: 0.2 } }))).toMatchObject({ action: 'ESCALATE', source: 'jev' });
  });

  it('excludes task prompts, resources and results from model metadata', () => {
    const metadata = agentDecisionState(state([task('analyze', { prompt: 'secret message', output: 'private result', resources: ['private/folder'] })]));
    expect(JSON.stringify(metadata)).not.toMatch(/secret message|private result|private\/folder/);
  });
});

describe('development completion requires verifiable independent evidence', () => {
  const completed = () => state([success('code')], { mode: 'development', ...evidence() });

  it('finishes only after tests, lint, build and independent review are current', () => {
    expect(agentOptions(completed())[0].action).toBe('DONE');
    for (const name of ['tests', 'lint', 'build']) {
      for (const check of [{ status: 'failed', revision }, { status: 'passed', revision: 'old' }, undefined]) {
        const input = completed(); input.checks[name] = check;
        expect(agentOptions(input)[0].action).toBe('ESCALATE');
      }
    }
  });

  it.each([
    null,
    { status: 'approved', revision: 'old', author: 'coder', reviewer: 'reviewer' },
    { status: 'approved', revision, author: 'coder', reviewer: 'coder' },
    { status: 'rejected', revision, author: 'coder', reviewer: 'reviewer' },
  ])('does not accept missing, stale or self-approved review: %j', review => {
    expect(agentOptions({ ...completed(), review })[0].action).toBe('ESCALATE');
  });
});

describe('real adapter execution', () => {
  it('dispatches concurrent readers within maxParallel and forwards completed dependency outputs', async () => {
    const gates = { a: deferred(), b: deferred() };
    const dispatched = [], contexts = {};
    let active = 0, peak = 0;
    const execute = vi.fn(async (job, context) => {
      dispatched.push(job.id); contexts[job.id] = context; peak = Math.max(peak, ++active);
      if (gates[job.id]) await gates[job.id].promise;
      active--;
      return { from: job.id };
    });
    const promise = runAgentWorkflow(state([task('a'), task('b'), task('c', { dependsOn: ['a', 'b'] })], { maxParallel: 2 }), { execute });
    await vi.waitFor(() => expect(dispatched).toEqual(['a', 'b']));
    gates.a.resolve(); gates.b.resolve();
    const result = await promise;
    expect(result.action).toBe('DONE');
    expect(dispatched).toEqual(['a', 'b', 'c']);
    expect(peak).toBe(2);
    expect(contexts.c.outputs).toEqual({ a: { from: 'a' }, b: { from: 'b' } });
    expect(result.outputs.c).toEqual({ from: 'c' });
  });

  it('falls back after provider failure and still runs the actual adapters', async () => {
    const execute = vi.fn(async job => job.id);
    const result = await runAgentWorkflow(state([task('a'), task('b')]), { execute, decide: async () => { throw new Error('provider down'); } });
    expect(result.action).toBe('DONE');
    expect(execute).toHaveBeenCalledTimes(2);
    expect(result.outputs).toEqual({ a: 'a', b: 'b' });
  });

  it('records thrown adapter failures without marking their dependent tasks successful', async () => {
    const execute = vi.fn(() => { throw new Error('agent failed'); });
    const result = await runAgentWorkflow(state([task('a'), task('b', { dependsOn: ['a'] })]), { execute });
    expect(result.action).toBe('ESCALATE');
    expect(result.state.tasks.map(job => job.status)).toEqual(['failed', 'pending']);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.outputs).toEqual({});
  });

  it('finishes the last allowed real dispatch even when no dispatch budget remains', async () => {
    const result = await runAgentWorkflow(state([task('last')], { maxSteps: 1 }), { execute: async () => 'finished' });
    expect(result).toMatchObject({ action: 'DONE', outputs: { last: 'finished' } });
  });

  it('aborts on timeout and never starts the blocked writer', async () => {
    vi.useFakeTimers();
    const signals = [];
    const execute = vi.fn((_job, context) => { signals.push(context.signal); return new Promise(() => {}); });
    const input = state([
      task('a', { access: 'write', authorized: true }),
      task('b', { access: 'write', authorized: true }),
    ], { mode: 'development' });
    const promise = runAgentWorkflow(input, { execute, getRevision: async () => revision, collectEvidence: async () => ({}), timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);
    const result = await promise;
    expect(result.action).toBe('ESCALATE');
    expect(result.reason).toContain('timeout');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(true);
  });

  it('returns promptly when cancelled even if an adapter does not settle', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const execute = vi.fn(() => new Promise(() => {}));
    let result;
    const promise = runAgentWorkflow(state([task('a'), task('b')], { maxParallel: 1 }), { execute, signal: controller.signal, timeoutMs: 1000 }).then(value => { result = value; });
    await vi.advanceTimersByTimeAsync(0);
    expect(execute).toHaveBeenCalledTimes(1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toMatchObject({ action: 'ESCALATE', reason: 'Cancelled' });
    await promise;
    expect(execute).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['getRevision', 'collectEvidence'])('bounds a hung %s adapter', async adapterName => {
    vi.useFakeTimers();
    const adapters = { execute: async () => 'ok', getRevision: () => revision, collectEvidence: () => evidence(), timeoutMs: 50 };
    adapters[adapterName] = () => new Promise(() => {});
    const promise = runAgentWorkflow(state([task('verify')], { mode: 'development' }), adapters);
    await vi.advanceTimersByTimeAsync(50);
    expect(await promise).toMatchObject({ action: 'ESCALATE', reason: 'Evidence adapter timeout' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('carries completed analysis after a writer changes files and requires fresh review evidence', async () => {
    let current = revision;
    const seen = [];
    const result = await runAgentWorkflow(state([
      task('analyze', { role: 'analysis' }),
      task('implement', { access: 'write', authorized: true, dependsOn: ['analyze'] }),
      task('review', { dependsOn: ['implement'] }),
    ], { mode: 'development', ...evidence() }), {
      execute: async job => { seen.push(job.id); if (job.id === 'implement') current = 'revision_b'; return job.id; },
      getRevision: () => current,
      collectEvidence: ({ taskId }) => taskId === 'review' ? {
        checks: Object.fromEntries(['tests', 'lint', 'build'].map(k => [k, { status: 'passed', revision: current }])),
        review: { status: 'approved', revision: current, author: 'coder', reviewer: 'reviewer' },
      } : {},
    });
    expect(result.action).toBe('DONE');
    expect(seen).toEqual(['analyze', 'implement', 'review']);
    expect(result.state.revision).toBe('revision_b');
    expect(result.state.tasks.every(t => t.outputRevision === 'revision_b')).toBe(true);
  });

  it('rejects development execution without evidence adapters and unowned running tasks', async () => {
    await expect(runAgentWorkflow(state(undefined, { mode: 'development' }), { execute: vi.fn() })).rejects.toThrow('DEVELOPMENT_EVIDENCE_ADAPTER_REQUIRED');
    await expect(runAgentWorkflow(state([task('a', { status: 'running' })]), { execute: vi.fn() })).rejects.toThrow('CANNOT_RESUME_UNOWNED_AGENTS');
  });

  it('refuses stale context before dispatch and after a reader completes', async () => {
    const execute = vi.fn(async () => 'read result');
    const result = await runAgentWorkflow(state(), { execute, getRevision: async () => 'new' });
    expect(result.action).toBe('ESCALATE');
    expect(execute).not.toHaveBeenCalled();
    const getRevision = vi.fn().mockResolvedValueOnce(revision).mockResolvedValue('new');
    const changed = await runAgentWorkflow(state(), { execute, getRevision });
    expect(changed.action).toBe('ESCALATE');
    expect(changed.outputs).toEqual({});
  });

  it('collects evidence from the host after real completion before reporting DONE', async () => {
    const collectEvidence = vi.fn(async () => evidence());
    const result = await runAgentWorkflow(state([task('verify')], { mode: 'development' }), {
      execute: async () => ({ completed: true }), getRevision: async () => revision, collectEvidence,
    });
    expect(collectEvidence).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'verify', revision }));
    expect(result.action).toBe('DONE');
    const missing = await runAgentWorkflow(state([task('verify')], { mode: 'development' }), {
      execute: async () => ({ completed: true }), getRevision: async () => revision, collectEvidence: async () => ({}),
    });
    expect(missing.action).toBe('ESCALATE');
  });

  it('does not attribute an external edit during arbitration to a writer', async () => {
    let current = revision;
    const execute = vi.fn();
    const result = await runAgentWorkflow(state([
      task('code', { access: 'write', authorized: true }), task('analyze'),
    ], { mode: 'development' }), {
      execute, getRevision: () => current, collectEvidence: () => evidence(),
      decide: async () => { current = 'external_change'; return null; },
    });
    expect(result.action).toBe('ESCALATE');
    expect(execute).not.toHaveBeenCalled();
  });

  it('stops on rejected review before dispatching verification and retains findings', async () => {
    const execute = vi.fn(async () => ({ findings: ['unsafe change'] }));
    const result = await runAgentWorkflow(state([task('review'), task('verify', { dependsOn: ['review'] })], { mode: 'development' }), {
      execute, getRevision: () => revision,
      collectEvidence: () => ({ review: { status: 'rejected', revision } }),
    });
    expect(result.action).toBe('ESCALATE');
    expect(execute).toHaveBeenCalledOnce();
    expect(result.outputs.review.findings).toEqual(['unsafe change']);
  });

  it('does not accept prefilled development evidence as proof of real execution', async () => {
    const result = await runAgentWorkflow(state([success('review')], { mode: 'development', ...evidence() }), {
      execute: vi.fn(), getRevision: () => revision, collectEvidence: () => ({}),
    });
    expect(result.action).toBe('ESCALATE');
    expect(result.state.checks).toEqual({});
  });
});
