import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { codexEvents, codexFailure } from '../../../scripts/agents/codexDiagnostics.mjs';
import { createRunReport, latestRunReport } from '../../../scripts/agents/runReport.mjs';

const directories = [];
const root = () => { const directory = mkdtempSync(join(tmpdir(), 'jev-reports-')); directories.push(directory); return directory; };
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const failure = message => codexFailure({ code: 1, stdout: JSON.stringify({ type: 'turn.failed', error: { message } }) });
const result = extra => ({ action: 'ESCALATE', reason: 'CODEX_USAGE_LIMIT', outputs: {}, state: { mode: 'development', revision: 'r1', tasks: [{ id: 'code_review', status: 'failed', attempts: 1, failure: { code: 'CODEX_USAGE_LIMIT' } }] }, ...extra });

describe('local workflow diagnostics', () => {
  it('recognizes quota without treating provider text as a retry deadline', () => {
    const error = failure('You have hit your usage limit. Try again at Sep 30th, 2026 1:06 PM.');
    expect(error).toMatchObject({ code: 'CODEX_USAGE_LIMIT', retryable: false, retryAfterHint: 'Sep 30th, 2026 1:06 PM' });
    expect(failure('You have hit your usage limit.').retryAfterHint).toBeNull();
  });
  it('distinguishes login failures from transient unknown exits', () => {
    expect(failure('Not logged in')).toMatchObject({ code: 'CODEX_AUTH_REQUIRED', retryable: false });
    expect(codexFailure({ code: 1, stdout: '', stderr: 'Authentication failed' })).toMatchObject({ code: 'CODEX_AUTH_REQUIRED', retryable: false });
    expect(failure('Connection interrupted')).toMatchObject({ code: 'CODEX_EXIT_1', retryable: true });
    expect(codexEvents('null\ninvalid\n[]\n{"type":"error"}')).toEqual([{ type: 'error' }]);
  });
  it('persists events and readable failure reports without copying arbitrary agent outputs', () => {
    const directory = root();
    const reporter = createRunReport({ root: directory });
    expect(latestRunReport(directory).status).toBe('RUNNING');
    reporter.record({ type: 'decision', decision: { source: 'rules', action: 'DISPATCH' } });
    reporter.finish(result({ outputs: { private_payload: { text: 'sensitive-output' } } }));
    const report = latestRunReport(directory);
    expect(report).toMatchObject({ status: 'ESCALATE', simulation: false, decisions: { rules: 1, jev: 0 } });
    expect(report.nextStep).toContain('quota');
    expect(JSON.stringify(report)).not.toContain('sensitive-output');
    expect(readFileSync(reporter.path.replace('.json', '.md'), 'utf8')).toContain('CODEX_USAGE_LIMIT');
  });
  it('labels simulated DONE and cancellation, and retains review findings', () => {
    const directory = root();
    const reporter = createRunReport({ root: directory, simulation: true });
    const report = reporter.finish(result({ action: 'DONE' }));
    expect(report.nextStep).toContain('giả lập');
    expect(report.simulation).toBe(true);
    const rejected = reporter.finish(result({
      state: { mode: 'development', revision: 'r1', review: { status: 'rejected' }, tasks: [{ id: 'security_review', status: 'running', attempts: 1 }] },
      outputs: { code_review: { findings: ['Fix unsafe action'] } },
    }));
    expect(rejected.tasks[0].status).toBe('cancel_requested');
    expect(rejected.findings).toEqual([{ agent: 'code_review', text: 'Fix unsafe action' }]);
  });
  it('never reports an older DONE when the newest report is unreadable', () => {
    const directory = root();
    const older = createRunReport({ root: directory }); older.finish(result({ action: 'DONE' }));
    utimesSync(older.path, new Date(0), new Date(0));
    const newer = createRunReport({ root: directory }); writeFileSync(newer.path, '{');
    expect(latestRunReport(directory)).toMatchObject({ status: 'UNREADABLE_REPORT', reportPath: newer.path });
    writeFileSync(newer.path, JSON.stringify({ version: 1, status: 'DONE' }));
    expect(latestRunReport(directory).status).toBe('UNREADABLE_REPORT');
    expect(latestRunReport(root())).toBeNull();
  });
});
