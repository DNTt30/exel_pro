import { beforeEach, expect, it, vi } from 'vitest';
import { getCopilotUsage, getCopilotActivity } from '../services/api/logs';
import { db } from '../services/api/client';
vi.mock('../services/api/client', () => ({ db: vi.fn() }));
let query, response;
beforeEach(() => {
  response = { data: [{ id: 'q1', user_message: 'Trà cóc', created_at: '2026-10-19' }], count: 350, error: null };
  query = Object.fromEntries(['from', 'select', 'not', 'neq', 'order', 'limit', 'eq', 'overlaps', 'gte', 'lt'].map(name => [name, vi.fn().mockReturnThis()]));
  // Supabase query builders are awaitable; reproduce that contract in this fake.
  // eslint-disable-next-line unicorn/no-thenable
  query.then = (resolve, reject) => Promise.resolve(response).then(resolve, reject);
  db.mockReturnValue(query);
});
it('requests an exact RLS count and only 200 question records, without replies or personal IDs', async () => {
  const result = await getCopilotUsage();
  expect(query.from).toHaveBeenCalledWith('ai_conversation_activity');
  expect(query.select).toHaveBeenCalledWith('id,store_id,user_message,error,created_at', { count: 'exact' });
  expect(query.limit).toHaveBeenCalledWith(200);
  expect(query.eq).not.toHaveBeenCalled();
  expect(result).toMatchObject({ total: 350, rows: [{ userMessage: 'Trà cóc' }] });
});
it('filters own questions, selected store and period on the server before counting', async () => {
  await getCopilotUsage({ storeId: 'A', userId: 'u1', from: 'start', to: 'end' });
  expect(query.eq.mock.calls).toEqual([['user_id', 'u1']]);
  expect(query.overlaps).toHaveBeenCalledWith('store_ids', ['A']);
  expect(query.gte).toHaveBeenCalledWith('created_at', 'start');
  expect(query.lt).toHaveBeenCalledWith('created_at', 'end');
});
it('shares the same multi-store filter and rows between Dashboard and assistant', async () => {
  const usage = await getCopilotUsage({ storeId: 'B, A, A' });
  const rows = await getCopilotActivity('B, A, A');
  expect(rows).toEqual(usage.rows);
  expect(query.overlaps.mock.calls).toEqual([['store_ids', ['B', 'A']], ['store_ids', ['B', 'A']]]);
});
it.each([{ error: { message: 'denied' } }, { count: null }, { data: null }])('does not turn unavailable evidence into a zero count: %j', async override => {
  response = { ...response, ...override };
  await expect(getCopilotUsage()).rejects.toThrow('Chưa tải được');
});
