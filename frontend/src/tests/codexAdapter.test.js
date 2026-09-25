import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexAdapter, runProcess } from '../../../scripts/agents/codexAdapter.mjs';

const directories = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
const task = (id, access = 'read') => ({ id, access, authorized: true, attempts: 1, dependsOn: [] });
const ctx = () => ({ revision: 'rev', signal: new AbortController().signal, outputs: {} });
function fixture({ verdict = 'approved', thread = null, code = 0, report = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jev-codex-adapter-')); directories.push(root);
  const runner = vi.fn(async (_command, args) => {
    if (args.includes('--output-last-message')) {
      const role = args[args.indexOf('--output-last-message') + 1].split(/[\\/]/).at(-1);
      writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ summary: 'reviewed', verdict, findings: verdict === 'approved' ? [] : ['actionable issue'] }));
      return { code, stdout: [JSON.stringify({ type: 'thread.started', thread_id: thread || role }), JSON.stringify({ type: 'turn.completed' })].join('\n'), stderr: '' };
    }
    return { code, stdout: 'JEV_AUDIT_RESULT=' + JSON.stringify(report || { passed: true, revision: 'rev', results: Object.fromEntries(['unitTests', 'lintClean', 'build', 'archIntegrity', 'guardrails'].map(k => [k, { passed: true }])) }), stderr: '' };
  });
  const adapter = createCodexAdapter({ root, objective: 'Review current code; $(never execute as shell)', revisionOf: () => 'rev', codex: { command: 'codex-fixture', args: [] }, processRunner: runner });
  return { adapter, runner, root };
}

describe('Codex CLI adapter boundaries', () => {
  it('uses read-only reviewers, stdin prompts, host checks and separate thread evidence', async () => {
    const { adapter, runner } = fixture();
    await adapter.execute(task('code_review'), ctx());
    expect(adapter.collectEvidence({ revision: 'rev' }).review.status).toBe('pending');
    await adapter.execute(task('security_review'), ctx());
    await adapter.execute(task('verify'), ctx());
    const evidence = adapter.collectEvidence({ revision: 'rev' });
    expect(evidence.review.status).toBe('approved');
    expect(evidence.checks.build.status).toBe('passed');
    expect(adapter.collectEvidence({ revision: 'different' }).review.status).toBe('pending');
    const [, args, options] = runner.mock.calls[0];
    expect(args[args.indexOf('--sandbox') + 1]).toBe('read-only');
    expect(args.join(' ')).not.toContain('never execute');
    expect(options.input).toContain('never execute');
    expect(options.env.TYPESAFE_API_KEY).toBeUndefined();
  });
  it('never turns model claims, rejected reviews or duplicated thread IDs into approval', async () => {
    for (const options of [{ verdict: 'changes_requested' }, { thread: 'same-thread' }]) {
      const { adapter } = fixture(options);
      await adapter.execute(task('code_review'), ctx());
      await adapter.execute(task('security_review'), ctx());
      expect(adapter.collectEvidence({ revision: 'rev' }).review.status).toBe(options.verdict === 'changes_requested' ? 'rejected' : 'pending');
      expect(adapter.collectEvidence({ revision: 'rev' }).checks).toEqual({});
    }
  });
  it.each([{ code: 1 }, { report: { passed: true, revision: 'stale' } }, { report: { passed: false, revision: 'rev' } }, { report: { passed: true, revision: 'rev' } }])('rejects failed or stale machine evidence: %j', async options => {
    const { adapter } = fixture(options);
    await expect(adapter.execute(task('verify'), ctx())).rejects.toThrow('MACHINE_VERIFICATION_FAILED');
    expect(adapter.collectEvidence({ revision: 'rev' }).checks).toEqual({});
  });
  it('refuses changed verification configuration even when revision adapter is fooled', async () => {
    const { adapter, runner, root } = fixture();
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { test: 'echo passed' } }));
    await expect(adapter.execute(task('verify'), ctx())).rejects.toThrow('VERIFICATION_TOOLING_CHANGED');
    expect(runner).not.toHaveBeenCalled();
  });
  it('rejects unknown capabilities, read-only writer and stale input before invoking Codex', async () => {
    const { adapter, runner } = fixture();
    await expect(adapter.execute(task('shell'), ctx())).rejects.toThrow('UNKNOWN_CODEX_AGENT');
    await expect(adapter.execute(task('implement'), ctx())).rejects.toThrow('CODEX_CAPABILITY_MISMATCH');
    await expect(adapter.execute(task('code_review'), { ...ctx(), revision: 'old' })).rejects.toThrow('CODEX_STALE_WORKSPACE');
    expect(runner).not.toHaveBeenCalled();
  });
  it('runs process arguments literally without a shell and terminates on cancellation', async () => {
    const result = await runProcess(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], { input: '$(secret) & literal', timeoutMs: 5000 });
    expect(result).toMatchObject({ code: 0, stdout: '$(secret) & literal' });
    const controller = new AbortController();
    const promise = runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { signal: controller.signal, timeoutMs: 5000 });
    const rejected = expect(promise).rejects.toThrow('CANCELLED');
    controller.abort();
    await rejected;
  });
});
