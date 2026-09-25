import { describe, expect, it, vi } from 'vitest';
import { assistantAgentPlan, runAssistantAgents } from '../utils/assistantAgents';

const context = () => ({
  user: { id: 'manager', role: 'SM', dept: 'A,B' }, storeId: 'ALL', currentWeek: '2026-09-21',
  stores: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
  employees: [{ id: 'e1', name: 'Allowed employee', dept: 'A', type: 'STFT' }, { id: 'e2', name: 'Private employee', dept: 'C', type: 'STFT' }],
  schedule: { '2026-09-21': { e1: { T2: '6-14' }, e2: { T2: '6-14' } } },
  shelves: [{ id: 'a', storeId: 'A', assigneeId: 'e1' }, { id: 'b', storeId: 'B', assigneeId: 'other' }, { id: 'c', storeId: 'C', assigneeId: 'e1' }],
  shelfItems: ['a', 'b', 'c'].map(shelfId => ({ id: shelfId, shelfId, productName: `Product ${shelfId}`, qty: 1, expiryDate: '2099-01-01' })),
});

describe('assistant agent execution and data scope', () => {
  it('runs both registered readers and synthesizes results without a conversational LLM', async () => {
    const events = [];
    const decide = vi.fn(async () => null);
    const result = await runAssistantAgents('Kiểm tra lịch và hạn sử dụng', context(), { revision: 'v1', decide, onEvent: event => events.push(event) });
    expect(result.action).toBe('DONE');
    expect(events.filter(e => e.decision?.action === 'DISPATCH').map(e => e.decision.taskId)).toEqual(['schedule_review', 'shelf_review', 'synthesis']);
    expect(decide).toHaveBeenCalledOnce();
    expect(result.text).toContain('Lịch tuần');
    expect(result.text).toContain('Ưu tiên kiểm date');
    expect(result.text).toContain('Allowed employee');
    expect(result.text).not.toContain('Private employee');
    expect(result.text).toContain('Product a');
    expect(result.text).toContain('Product b');
    expect(result.text).not.toContain('Product c');
  });

  it('limits staff shelf results to their own assigned shelves and allowed store', async () => {
    const input = context(); input.user = { id: 'e1', role: 'employee', dept: 'A' };
    const result = await runAssistantAgents('Kiểm tra hạn sử dụng', input, { revision: 'v1' });
    expect(result.text).toContain('Product a');
    expect(result.text).not.toMatch(/Product b|Product c/);
    expect(assistantAgentPlan('Kiểm tra lịch tuần', input, 'v1')).toBeNull();
  });

  it('applies selected store even for admin and does not mutate the snapshot', async () => {
    const input = context(); input.user = { id: 'admin', role: 'admin' }; input.storeId = 'B';
    const before = structuredClone(input);
    const result = await runAssistantAgents('Kiểm tra hạn sử dụng', input, { revision: 'v1' });
    expect(result.text).toContain('Product b');
    expect(result.text).not.toMatch(/Product a|Product c/);
    expect(input).toEqual(before);
  });

  it.each(['Tư vấn chính sách kiểm date', 'Kiểm tra lịch và đề xuất tuyển dụng', 'Khi nào hủy hàng hết hạn?'])('preserves complex requests for existing conversational routing: %s', query => {
    expect(assistantAgentPlan(query, context(), 'v1')).toBeNull();
  });

  it('suppresses stale data and respects cancellation', async () => {
    const stale = await runAssistantAgents('Kiểm tra lịch và hạn sử dụng', context(), { revision: 'v1', isCurrent: () => false });
    expect(stale.action).toBe('ESCALATE');
    expect(stale.text).not.toContain('Product');
    const controller = new AbortController(); controller.abort();
    const cancelled = await runAssistantAgents('Kiểm tra hạn sử dụng', context(), { revision: 'v1', signal: controller.signal });
    expect(cancelled.action).toBe('ESCALATE');
    expect(cancelled.outputs).toEqual({});
  });
});
