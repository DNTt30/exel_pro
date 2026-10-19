import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../services/api/client', () => ({ db: () => mocks }));
import { handbookApi } from '../services/api/handbook';
import { handbookDraftSchema } from '../utils/handbookKnowledge';

const draft = { title: 'Trà cóc xí muội', content: 'Size L: trà cóc 250ml, thêm đá đầy cốc.', category: 'recipe', store_id: 'A', images: [] };
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { id: 'change-1', status: 'pending' } }); });
it('requires explicit confirmation before any submit/review RPC', async () => {
  await expect(handbookApi.submit(draft)).rejects.toThrow('xác nhận');
  await expect(handbookApi.review('change', true)).rejects.toThrow('xác nhận');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('submits a proposal with expected revision, never a direct table update', async () => {
  await handbookApi.submit(draft, { id: 'doc', revision: 4 }, { confirmed: true });
  expect(mocks.rpc).toHaveBeenCalledWith('submit_handbook_change', { p_payload: draft, p_entry_id: 'doc', p_revision: 4, p_operation: 'upsert', p_confirmed: true });
  expect(mocks.from).not.toHaveBeenCalled();
});
it('archives only by reviewable proposal with reason', async () => {
  await handbookApi.submit(null, { id: 'doc', revision: 2 }, { confirmed: true, operation: 'archive', reason: 'Đã thay quy trình' });
  expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_operation: 'archive', p_revision: 2, p_payload: { reason: 'Đã thay quy trình' } });
});
it('surfaces conflicts and permission denials', async () => {
  mocks.rpc.mockResolvedValueOnce({ error: { code: '23505' } });
  await expect(handbookApi.submit(draft, null, { confirmed: true })).rejects.toThrow('chờ duyệt');
  mocks.rpc.mockResolvedValueOnce({ error: { code: '42501' } });
  await expect(handbookApi.review('id', true, { confirmed: true })).rejects.toThrow('không có quyền');
});
it('only fetches approved active text for readers and propagates failures', async () => {
  const query = { select: vi.fn(), order: vi.fn(), range: vi.fn(), eq: vi.fn(), not: vi.fn() };
  for (const fn of Object.values(query)) fn.mockReturnValue(query);
  query.not.mockResolvedValue({ data: [draft], error: null });
  mocks.from.mockReturnValue(query);
  expect(await handbookApi.getPublished()).toEqual([draft]);
  expect(query.eq).toHaveBeenCalledWith('is_active', true);
  expect(query.not).toHaveBeenCalledWith('published_at', 'is', null);
  query.not.mockResolvedValue({ error: { code: 'PGRST205' } });
  await expect(handbookApi.getPublished()).rejects.toThrow('migration');
});
it('bounds text and rejects public/external image references', () => {
  expect(handbookDraftSchema.safeParse(draft).success).toBe(true);
  expect(handbookDraftSchema.safeParse({ ...draft, content: 'a'.repeat(4001) }).success).toBe(false);
  expect(handbookDraftSchema.safeParse({ ...draft, images: ['https://example.com/tracker.png'] }).success).toBe(false);
});
