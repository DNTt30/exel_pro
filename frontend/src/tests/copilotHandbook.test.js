import { beforeEach, expect, it, vi } from 'vitest';
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { tryAnswerWithData } from '../utils/copilotIntents';
import { assistantAgentPlan } from '../utils/assistantAgents';
import { GS25_HANDBOOK_DATA } from '../data/gs25HandbookData';
import { stripVi } from '../data/ffOnsiteRecipes';
import { generateGeminiMultiTurn, streamGeminiMultiTurn } from '../services/geminiService';
vi.mock('../services/geminiService', () => ({ generateGeminiMultiTurn: vi.fn(), streamGeminiMultiTurn: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); generateGeminiMultiTurn.mockResolvedValue('Bước 1: Đọc đúng mục Sổ tay.\nBước 2: Làm theo hướng dẫn.'); });
const context = { user: { id: 'sm', role: 'SM', dept: 'A' }, employees: [], storeId: 'A' };

it.each([
  'Mấy giờ hủy sandwich có rau?', 'Burger hủy lúc mấy giờ?', 'Gimbap hủy lúc nào?',
  'Cơm nắm Onigiri hủy lúc nào?', 'Sushi hủy khi nào?', 'Bento hủy lúc mấy giờ?',
  'Sandwich không rau hủy lúc nào?', 'Mì hộp hủy lúc mấy giờ?', 'Khi nào hủy hàng tươi?',
  'Hàng GM hủy khi nào?', 'Lò vi sóng ly chả cá bấm số mấy?', 'Công thức nấu súp',
  '🍲 Công thức nấu súp chả cá cay', 'Hóa chất Saraya 6 mã màu', 'Cách kiểm tra hạn sử dụng?',
  'Kiểm tra date thế nào cho đúng?', 'Lịch vệ sinh ca đêm kiểm tra những gì?', 'Còn bước tiếp theo thì sao?',
  'Nấu phần đó lâu hơn một chút được không?', 'Cách gửi báo cáo ca cuối ngày',
])('forwards natural SOP wording to Gemini with the complete handbook: %s', async question => {
  expect(tryAnswerWithData({ q: question, qn: stripVi(question.toLowerCase()) })).toBeNull();
  expect(assistantAgentPlan(question, context, 'revision')).toBeNull();
  await askGeminiCopilot(question, context);
  expect(generateGeminiMultiTurn).toHaveBeenCalledOnce();
  const [contents, prompt] = generateGeminiMultiTurn.mock.calls[0];
  expect(contents.at(-1).parts[0].text).toBe(question);
  expect(prompt).toContain('Trả lời thật DÀI, CHI TIẾT TỪNG BƯỚC (Bước 1, Bước 2...)');
  expect(prompt).toContain('không có thông tin hoặc có mâu thuẫn');
  expect(JSON.parse(prompt.split('SỔ TAY NGHIỆP VỤ GS25 — TOÀN BỘ NỘI DUNG:\n')[1])).toEqual(GS25_HANDBOOK_DATA);
});
it('streams long answers with the same complete handbook and keeps employee private fields out', async () => {
  const long = 'Bước 1: Đọc Sổ tay.\n'.repeat(150);
  streamGeminiMultiTurn.mockImplementation(async (_contents, _prompt, _key, chunk) => { chunk(long); return long; });
  const onChunk = vi.fn();
  const result = await askGeminiCopilot('Giải thích quy trình đầy đủ', { ...context, employees: [{ id: 'e', name: 'NV', dept: 'A', dob: '1999-12-31', recoveryEmail: 'private@example.com', password: 'Secret!' }] }, [], '', onChunk);
  expect(result).toBe(long);
  expect(onChunk).toHaveBeenCalledWith(long);
  const prompt = streamGeminiMultiTurn.mock.calls[0][1];
  expect(prompt).toContain(JSON.stringify(GS25_HANDBOOK_DATA, null, 2));
  expect(prompt).not.toMatch(/private@example.com|1999-12-31|Secret!/);
});
