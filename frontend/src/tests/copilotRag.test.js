import { beforeEach, expect, it, vi } from 'vitest';
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { tryAnswerWithData } from '../utils/copilotIntents';
import { GS25_HANDBOOK_DATA } from '../../../scripts/data/legacy-handbook/gs25HandbookData.mjs';
import catalog from '../../../scripts/data/handbook-catalog.json';
import { handbookApi } from '../services/api/handbook';
import { getCopilotUsage } from '../services/api/logs';
const entries = catalog.map(c => ({ ...c, is_active: true, published_at: '2026-10-18' }));
const read = (q, history = []) => retrieveHandbook(q, history, { entries });
const sourceId = key => { const c = catalog.find(c => c.key === key); return `${c.category === 'recipe' ? 'recipe.' : ''}knowledge.${c.id}`; };
import { FF_RECIPE_GROUPS } from '../../../scripts/data/legacy-handbook/ffOnsiteRecipes.mjs';
import { stripVi } from '../utils/textSearch';
import { retrieveHandbook, compactChatHistory, RAG_MAX_CHARS, HISTORY_MAX_CHARS } from '../utils/copilotRetrieval';
import { buildCopilotRequest } from '../utils/copilotContext';
import { generateGeminiMultiTurn, streamGeminiMultiTurn } from '../services/geminiService';
vi.mock('../services/geminiService', () => ({ generateGeminiMultiTurn: vi.fn(), streamGeminiMultiTurn: vi.fn() }));
vi.mock('../services/api/handbook', () => ({ handbookApi: { getKnowledge: vi.fn(async () => []) } }));
vi.mock('../services/api/logs', () => ({ getCopilotUsage: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); handbookApi.getKnowledge.mockResolvedValue(entries); generateGeminiMultiTurn.mockResolvedValue('Hủy trước 11:00 và 22:00.'); });
const context = { user: { id: 'sm', role: 'SM', dept: 'A' }, employees: [], storeId: 'A' };
it('answers unavailable usage data honestly, without handbook retrieval or any LLM', async () => {
  getCopilotUsage.mockRejectedValue(new Error('offline'));
  const answer = await askGeminiCopilot('Mọi người thường hỏi gì?', context);
  expect(answer).toContain('Chưa tải được thống kê lượt hỏi');
  expect(handbookApi.getKnowledge).not.toHaveBeenCalled();
  expect(generateGeminiMultiTurn).not.toHaveBeenCalled();
  expect(streamGeminiMultiTurn).not.toHaveBeenCalled();
});
it('never injects operational totals as evidence for usage questions or their follow-ups', () => {
  const history = [{ sender: 'user', text: 'Xem lịch tuần' }, { sender: 'user', text: 'Mọi người thường hỏi gì tuần này?' }];
  const request = buildCopilotRequest('cho tôi số lượng và dữ liệu thực tế', context, history);
  expect(request.systemPrompt).not.toContain('pendingFeedbacks');
  expect(request.systemPrompt).toContain('Không suy ra từ khả năng của trợ lý');
});

it('answers standalone date queries without loading the handbook or calling a provider', async () => {
  const chunk = vi.fn();
  const answer = await askGeminiCopilot('hôm nay là ngày mấy', context, [], '', chunk);
  expect(answer).toContain('giờ Việt Nam');
  expect(chunk).toHaveBeenCalledWith(answer);
  expect(handbookApi.getKnowledge).not.toHaveBeenCalled();
  expect(generateGeminiMultiTurn).not.toHaveBeenCalled();
  expect(streamGeminiMultiTurn).not.toHaveBeenCalled();
});

it.each(['trà cóc xí muội', 'tra coc xi muoi', 'TRÀ CÓC XÍ MUỘI!!!', 'Cách pha trà cóc xí muội?'])('includes the complete existing FF recipe for %s', async question => {
  const recipe = FF_RECIPE_GROUPS.flatMap(group => group.items).find(item => item.id === 'tra-coc');
  const result = read(question);
  expect(result.chunks[0].id).toBe(sourceId('recipe.tra-coc'));
  expect(result.text).toContain(JSON.stringify(recipe.body));
  expect(result.text).not.toContain('Trà lài');
  expect(result.text).not.toContain('Trà me');
  expect(result.text.length).toBeLessThan(1000);
  await askGeminiCopilot(question, context);
  expect(generateGeminiMultiTurn.mock.calls[0][1]).toContain('250ml');
  expect(generateGeminiMultiTurn.mock.calls[0][3].copilotScope).toEqual({ kind: 'handbook', storeIds: [], employeeIds: [] });
});

it('indexes every quick-reference recipe without losing quantities or safety notes', () => {
  for (const item of FF_RECIPE_GROUPS.flatMap(group => group.items)) {
    const result = read(item.name);
    expect(result.chunks.map(chunk => chunk.id), item.name).toContain(sourceId(`recipe.${item.id}`));
    expect(result.text, item.name).toContain(JSON.stringify(item.body));
    expect(result.text.length).toBeLessThanOrEqual(RAG_MAX_CHARS);
  }
});

it('keeps similar drinks separate, and does not infer an unsupported size', () => {
  expect(read('trà lài tắc xí muội').chunks.map(c => c.id)).toEqual([sourceId('recipe.tra-lai')]);
  expect(read('trà me muối ớt').chunks.map(c => c.id)).toEqual([sourceId('recipe.tra-me')]);
  const result = read('Trà cóc xí muội size XL');
  expect(result.text).toContain('Size L');
  expect(result.text).not.toContain('280ml');
  expect(result.text).not.toContain('Size XL');
});

it('resolves recipe quantity/size follow-ups from the latest user topic only', () => {
  const history = [{ sender: 'user', text: 'Trà me muối ớt' }, { sender: 'user', text: 'Trà cóc xí muội' }, { sender: 'ai', text: 'Dùng 9999ml' }];
  for (const question of ['bao nhiêu ml?', 'còn size XL thì sao?']) {
    const result = read(question, history);
    expect(result.chunks[0].id).toBe(sourceId('recipe.tra-coc'));
    expect(result.text).not.toMatch(/9999ml|Trà me|280ml/);
  }
});

it.each([
  ['Mấy giờ hủy sandwich có rau?', 'expiry.ff.0', '11:00'],
  ['Burger hủy lúc mấy giờ?', 'expiry.ff.0', '22:00'],
  ['Gimbap hủy lúc nào?', 'expiry.ff.0', '11:00'],
  ['Cơm nắm Onigiri hủy lúc nào?', 'expiry.ff.1', '19:00'],
  ['Sushi hủy khi nào?', 'expiry.ff.1', '19:00'],
  ['Bento hủy lúc mấy giờ?', 'expiry.ff.1', '19:00'],
  ['Sandwich không rau hủy lúc nào?', 'expiry.ff.1', '19:00'],
  ['Hàng GM hủy khi nào?', 'expiry.gm', 'Hủy trước 1 tháng'],
  ['Lò vi sóng ly chả cá bấm số mấy?', 'hotpot.serving.0', 'BẤM SỐ 3'],
  ['Công thức nấu súp chả cá cay', 'hotpot.recipe.0', '2000 ml'],
  ['Hoa chat Saraya 6 ma mau', 'chemicals.0', 'SARAYA'],
  ['Cách kiểm tra hạn sử dụng?', 'expiry.rules', 'toàn bộ'],
  ['Lịch vệ sinh ca đêm Thứ 3', 'cleaning.ca3', 'THAY DẦU'],
  ['Quy trình rửa tay', 'handHygiene', '60s'],
  ['Cách gửi báo cáo ca cuối ngày', 'reports.ca3', 'Group Gapo'],
])('retrieves bounded, grounded sources for %s', async (question, source, fact) => {
  const retrieval = read(question);
  expect(retrieval.chunks.map(c => c.id)).toContain(sourceId(source));
  expect(retrieval.text).toContain(fact);
  expect(retrieval.text.length).toBeLessThanOrEqual(RAG_MAX_CHARS);
  expect(retrieval.chunks.length).toBeLessThanOrEqual(4);
  expect(retrieval.text).not.toMatch(/badgeColor|colorClass|originalScans|bg-amber/);
  expect(tryAnswerWithData({ q: question, qn: stripVi(question.toLowerCase()) })).toBeNull();
  await askGeminiCopilot(question, context);
  expect(generateGeminiMultiTurn).toHaveBeenCalledOnce();
  const [contents, prompt, , options] = generateGeminiMultiTurn.mock.calls[0];
  expect(contents.at(-1).parts[0].text).toBe(question);
  expect(prompt).toContain('1–3 câu');
  expect(prompt).toContain('không có thông tin hoặc có mâu thuẫn');
  expect(prompt).not.toContain('Trả lời thật DÀI');
  expect(prompt).not.toContain(JSON.stringify(GS25_HANDBOOK_DATA, null, 2));
  expect(options.maxOutputTokens).toBe(1024);
});

it('resolves follow-ups without using previous model answers as evidence or polluting new topics', () => {
  const history = [{ sender: 'user', text: 'Công thức nấu súp chả cá cay' }, { sender: 'ai', text: 'Dùng 9999g thuốc tím' }];
  const followUp = read('Còn công suất?', history);
  expect(followUp.chunks.map(c => c.id)).toContain(sourceId('hotpot.recipe.0'));
  expect(followUp.text).toContain('2000W');
  expect(followUp.text).not.toContain('9999g');
  expect(read('Sushi hủy khi nào?', history).chunks.map(c => c.id)).not.toContain(sourceId('hotpot.recipe.0'));
});

it('handles missing sources explicitly', () => {
  for (const question of ['Xin chào', 'quantum xyzzy', 'Bitcoin']) {
    expect(read(question).chunks).toEqual([]);
    expect(buildCopilotRequest(question).systemPrompt).toContain('Chưa tìm thấy trích đoạn phù hợp');
  }
});

it('streams with only relevant sources and allows a larger budget on explicit detail requests', async () => {
  streamGeminiMultiTurn.mockImplementation(async (_contents, _prompt, _key, chunk) => { chunk('Dùng 2000 ml nước.'); return 'Dùng 2000 ml nước.'; });
  const onChunk = vi.fn();
  const result = await askGeminiCopilot('Hướng dẫn chi tiết nấu súp chả cá cay', { ...context,
    employees: [{ id: 'e', name: 'PRIVATE_NAME', dept: 'A', dob: '1999-12-31', recoveryEmail: 'private@example.com', password: 'Secret!' }],
  }, [], '', onChunk);
  expect(onChunk).toHaveBeenCalledWith(result);
  const [, prompt, , , options] = streamGeminiMultiTurn.mock.calls[0];
  expect(prompt).toContain('2000 ml');
  expect(prompt).not.toMatch(/PRIVATE_NAME|private@example.com|1999-12-31|Secret!/);
  expect(options.maxOutputTokens).toBe(2048);
});

it('bounds history, excludes errors and masks pasted secrets in prior turns', () => {
  const history = Array.from({ length: 10 }, (_, i) => ({ sender: i % 2 ? 'ai' : 'user', text: 'abc '.repeat(500) }));
  history.push({ sender: 'ai', text: 'Google quota error', isError: true });
  const compact = compactChatHistory(history);
  expect(compact.length).toBeLessThanOrEqual(4);
  expect(compact.reduce((sum, m) => sum + m.text.length, 0)).toBeLessThanOrEqual(HISTORY_MAX_CHARS);
  expect(compact[0].sender).toBe('user');
  expect(JSON.stringify(compact)).not.toContain('Google quota error');
  const secret = 'AIza' + 'x'.repeat(35);
  expect(JSON.stringify(buildCopilotRequest('Burger hủy lúc mấy giờ?', context, [{ sender: 'user', text: secret }]))).not.toContain(secret);
});

it('keeps scoped schedule facts and distinguishes blank, off and covering store', () => {
  const request = buildCopilotRequest('Xem lịch tuần này', { ...context,
    employees: [{ id: 'e', name: 'NV', dept: 'A', password: 'Secret!' }, { id: 'other', name: 'HIDDEN', dept: 'B' }],
    weekSchedule: { e: { T2: '', T3: 'off', T4: { shift: '6-14', covering_store: 'B' } } },
  });
  expect(request.systemPrompt).toContain('"T2":""');
  expect(request.systemPrompt).toContain('"T3":"off"');
  expect(request.systemPrompt).toContain('"covering_store":"B"');
  expect(request.systemPrompt).toContain('"totalHours":8');
  expect(request.systemPrompt).not.toMatch(/HIDDEN|Secret!/);
});

it('cuts retrieved handbook characters by at least 75% on representative questions', () => {
  const full = JSON.stringify(GS25_HANDBOOK_DATA, null, 2).length;
  for (const question of ['Burger hủy lúc mấy giờ?', 'Công thức nấu súp chả cá cay', 'Lịch vệ sinh ca đêm']) {
    expect(read(question).text.length).toBeLessThan(full * 0.25);
  }
});
