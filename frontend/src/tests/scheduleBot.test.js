import { describe, expect, it, vi } from 'vitest';
import { createBotDraft, saveBotDraftOnce } from '../utils/scheduleBot';
import { createAgentFixture, NEXT_WEEK } from '../sandbox/fixture';
import { draftSourceMatches } from '../utils/scheduleDraft';
import { withScheduleVersion } from '../utils/scheduleVersion';

function contextFixture() {
  const fixture = createAgentFixture();
  return { store: fixture.stores[0], employees: fixture.employees, weeks: [],
    schedules: Object.entries(fixture.schedule).flatMap(([week_date, rows]) => Object.entries(rows).map(([emp_id, shifts]) => ({ week_date, emp_id, shifts, version: 4 }))) };
}

describe('bot draft with scoped backend data', () => {
  it('preserves source versions for manager review, fills staffing and respects all limits', () => {
    const context = contextFixture();
    const original = structuredClone(context);
    const { payload, summary } = createBotDraft(context, NEXT_WEEK);
    expect(summary.newAssignments).toBe(30);
    expect(summary.shortages).toEqual([]);
    expect(summary.findings).toEqual([]);
    expect(context).toEqual(original);
    const source = Object.fromEntries(context.schedules.filter(r => r.week_date === NEXT_WEEK).map(r => [r.emp_id, withScheduleVersion(r.shifts, r.version)]));
    expect(draftSourceMatches(JSON.parse(JSON.stringify(payload)), source)).toBe(true);
    withScheduleVersion(source[context.employees[0].id], 5);
    expect(draftSourceMatches(payload, source)).toBe(false);
  });

  it('reports missing registrations and never invents shifts', () => {
    const context = contextFixture();
    context.schedules = [];
    const { summary } = createBotDraft(context, NEXT_WEEK);
    expect(summary.newAssignments).toBe(0);
    expect(summary.shortages.length).toBeGreaterThan(0);
  });

  it('reads back a saved draft and preserves manager edits when rerun', async () => {
    let record = null;
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: record })) };
    const client = { from: vi.fn(() => query), rpc: vi.fn(async (name, args) => {
      if (name === 'get_schedule_bot_context') return { data: contextFixture() };
      if (name !== 'save_schedule_draft') throw new Error('Unexpected RPC');
      expect(args.p_revision).toBe(0);
      record = { payload: args.p_payload, revision: 1 };
      return { data: record };
    }) };
    expect(await saveBotDraftOnce(client, 'TEST01', NEXT_WEEK)).toMatchObject({ status: 'draft', newAssignments: 30 });
    record.payload.schedule = { managerEdited: true };
    expect(await saveBotDraftOnce(client, 'TEST01', NEXT_WEEK)).toMatchObject({ status: 'existing-draft', revision: 1 });
    expect(record.payload.schedule).toEqual({ managerEdited: true });
    expect(client.rpc.mock.calls.filter(([name]) => name === 'save_schedule_draft')).toHaveLength(1);
    expect(client.from.mock.calls.every(([table]) => table === 'schedule_drafts')).toBe(true);
  });

  it('does not save when scoped read is denied', async () => {
    const client = { rpc: vi.fn(async () => ({ error: { code: '42501' } })) };
    await expect(saveBotDraftOnce(client, 'VN0500', NEXT_WEEK)).rejects.toThrow('42501');
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });
});
