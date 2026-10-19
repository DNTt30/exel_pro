import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../services/api/handbook', () => ({ handbookApi: { getKnowledge: vi.fn() } }));
vi.mock('../services/geminiService', () => ({ generateGeminiMultiTurn: vi.fn(async () => 'ok'), streamGeminiMultiTurn: vi.fn() }));
import { handbookApi } from '../services/api/handbook';
import { generateGeminiMultiTurn } from '../services/geminiService';
import { buildCopilotRequest } from '../utils/copilotContext';
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { retrieveHandbook, RAG_MAX_CHARS } from '../utils/copilotRetrieval';
const published = { id: '1', title: 'Trà cóc xí muội', content: 'Công thức được duyệt: 220ml cho size L.', category: 'recipe', store_id: 'A', is_active: true, published_at: '2026-10-17', revision: 2, images: ['private/path.jpg'] };
const context = { user: { id: 'staff', role: 'STFT', dept: 'A' }, stores: [{ id: 'A' }], storeId: 'A' };
beforeEach(() => { vi.clearAllMocks(); });
it('prefers the newly approved exact recipe and keeps scope/source without sending attachments', () => {
  const result = retrieveHandbook('trà cóc xí muội', [], { entries: [published], storeIds: ['A'] });
  expect(result.text).toContain('220ml');
  expect(result.text).toContain('Cửa hàng A');
  expect(result.text).not.toContain('250ml');
  expect(result.text).not.toContain('private/path');
  expect(result.text.length).toBeLessThan(RAG_MAX_CHARS);
});
it('excludes drafts, archived publications and other stores even if callers supply them', () => {
  const handbookEntries = [
    { ...published, published_at: null, content: 'SECRET_DRAFT' },
    { ...published, store_id: 'B', content: 'SECRET_OTHER_STORE' },
    { ...published, is_active: false, content: 'SECRET_ARCHIVED' },
  ];
  const request = buildCopilotRequest('trà cóc xí muội', { ...context, handbookEntries });
  expect(request.systemPrompt).not.toContain('SECRET_');
  expect(request.systemPrompt).not.toContain('[recipe.tra-coc]');
});
it('keeps conflicting global/local approved recipes explicitly scoped rather than merging them', () => {
  const result = retrieveHandbook('trà cóc xí muội', [], { entries: [published, { ...published, id: '2', store_id: null, content: 'Size L: 200ml.' }], storeIds: ['A'] });
  expect(result.chunks).toHaveLength(2);
  expect(result.text).toContain('Toàn đơn vị');
  expect(result.text).toContain('Cửa hàng A');
});
it('does not resurrect a bundled recipe after its approved replacement is archived', () => {
  const result = retrieveHandbook('cách pha trà cóc xí muội', [], { entries: [{ ...published, is_active: false, content: '' }], storeIds: ['A'] });
  expect(result.chunks).toEqual([]);
  expect(result.text).toContain('đã được Admin gỡ');
});
it('refreshes approved knowledge on each question and never silently falls back on a fetch failure', async () => {
  handbookApi.getKnowledge.mockResolvedValueOnce([published]).mockResolvedValueOnce([{ ...published, content: 'Bản mới: 230ml.' }]).mockRejectedValueOnce(new Error('Offline knowledge'));
  await askGeminiCopilot('trà cóc xí muội', context);
  expect(generateGeminiMultiTurn.mock.calls[0][1]).toContain('220ml');
  await askGeminiCopilot('trà cóc xí muội', context);
  expect(generateGeminiMultiTurn.mock.calls[1][1]).toContain('230ml');
  await expect(askGeminiCopilot('trà cóc xí muội', context)).rejects.toThrow('Offline knowledge');
  expect(generateGeminiMultiTurn).toHaveBeenCalledTimes(2);
});
