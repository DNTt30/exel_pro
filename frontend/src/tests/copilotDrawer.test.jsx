// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import AICopilotDrawer from '../components/ai/AICopilotDrawer';
import { useStore } from '../store/useStore';
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { DEFAULT_GEMINI_MODEL } from '../services/geminiService';
import { getCopilotConfiguration, saveCopilotConfiguration, getEmployees } from '../services/api';
import { getCopilotUsage } from '../services/api/logs';
vi.mock('../services/api', async importOriginal => ({ ...await importOriginal(), getCopilotConfiguration: vi.fn(), saveCopilotConfiguration: vi.fn(), getEmployees: vi.fn() }));
vi.mock('../utils/aiSchedulerEngine', () => ({ askGeminiCopilot: vi.fn() }));
vi.mock('../utils/assistantAgents', () => ({ assistantAgentPlan: () => null, assistantStoreIds: () => null, runAssistantAgents: async () => null }));
vi.mock('../services/api/logs', () => ({ addAdminLog: vi.fn().mockResolvedValue(null), getCopilotUsage: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
let root, container, log;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  localStorage.clear(); localStorage.setItem('gemini_model', 'gemini-2.0-flash-thinking-exp-01-21');
  log = vi.fn();
  getCopilotConfiguration.mockResolvedValue({ configured: false });
  saveCopilotConfiguration.mockResolvedValue({ configured: true });
  useStore.setState({ user: { id: 'a', role: 'employee', dept: 'A' }, employees: [], stores: [{ id: 'A' }], schedule: {}, feedbacks: [], shiftSwaps: [], shelves: [], shelfItems: [], logAiTurn: log });
  Element.prototype.scrollIntoView = vi.fn();
  askGeminiCopilot.mockImplementation(async (_q, _context, _history, _key, chunk) => { chunk('Bước 1: Đọc Sổ tay.'); return 'Bước 1: Đọc Sổ tay.'; });
});
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); useStore.setState(initial, true); localStorage.clear(); vi.clearAllMocks(); vi.useRealTimers(); });
async function mount() {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<AICopilotDrawer isOpen onClose={() => {}} currentWeek="2026-09-28" storeId="A" />));
}
async function send(question) {
  vi.setSystemTime(Date.now() + 3000);
  const input = container.querySelector('input[type=text]');
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, question); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
it('answers usage and its follow-up from actual logs without calling Gemini', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  getCopilotUsage.mockResolvedValue({ total: 12, limit: 200, rows: [{ userMessage: 'Trà cóc xí muội' }] });
  await mount();
  await send('Mọi người thường hỏi gì?');
  await send('cho tôi số lượng và dữ liệu thực tế');
  expect(container.textContent).toContain('12 lượt hỏi');
  expect(getCopilotUsage).toHaveBeenCalledTimes(2);
  expect(askGeminiCopilot).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'local-usage-analytics' }));
});
it('accepts only one submit when double-click and Enter fire before React renders', async () => {
  let finish;
  askGeminiCopilot.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  const input = container.querySelector('input[type=text]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Cách nấu lẩu?');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    for (let i = 0; i < 10; i++) container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(askGeminiCopilot).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button[type=submit]').disabled).toBe(true);
  await act(async () => finish('Đã trả lời.'));
  expect(log).toHaveBeenCalledTimes(1);
  await send('Cách nấu lẩu?'); // Lock was released, the next deliberate request is allowed.
  expect(askGeminiCopilot).toHaveBeenCalledTimes(2);
  await act(async () => finish('Đã trả lời lần nữa.'));
});
it('does not inflate logs when a fast local answer is immediately spammed', async () => {
  await mount();
  await send('hôm nay ngày mấy');
  const input = container.querySelector('input[type=text]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'hôm nay ngày mấy');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(log).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Vui lòng chờ 3 giây');
});
it('honors the server cooldown without repeated API calls or duplicate logs', async () => {
  askGeminiCopilot.mockRejectedValueOnce(Object.assign(new Error('Anh/chị gửi quá nhanh. Vui lòng chờ 12 giây.'), { status: 429, retryAfter: 12 }));
  await mount(); await send('Cách nấu lẩu?');
  await send('Cách nấu lẩu?');
  expect(askGeminiCopilot).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Vui lòng chờ 9 giây');
  vi.setSystemTime(Date.now() + 9000);
  await send('Cách nấu lẩu?');
  expect(askGeminiCopilot).toHaveBeenCalledTimes(2);
});
it('denies staff access to population analytics without querying or calling Gemini', async () => {
  await mount(); await send('Mọi người thường hỏi gì?');
  expect(container.textContent).toContain('không có quyền');
  expect(getCopilotUsage).not.toHaveBeenCalled();
  expect(askGeminiCopilot).not.toHaveBeenCalled();
});
it('keeps a failed usage lookup out of Gemini and does not turn it into zero', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  getCopilotUsage.mockRejectedValue(new Error('network'));
  await mount(); await send('Mọi người thường hỏi gì?');
  expect(container.textContent).toContain('Chưa tải được thống kê lượt hỏi');
  expect(container.textContent).not.toContain('0 lượt hỏi');
  expect(askGeminiCopilot).not.toHaveBeenCalled();
});
it('discards a pending analytics response when the account changes', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  let resolveUsage;
  getCopilotUsage.mockReturnValue(new Promise(resolve => { resolveUsage = resolve; }));
  await mount(); await send('Mọi người thường hỏi gì?');
  await act(async () => useStore.setState({ user: { id: 'staff', role: 'employee', dept: 'A' } }));
  await act(async () => resolveUsage({ total: 350, limit: 200, rows: [{ userMessage: 'Private manager question' }] }));
  expect(container.textContent).not.toContain('Private manager question');
  expect(container.textContent).not.toContain('350 lượt hỏi');
  expect(log).not.toHaveBeenCalled();
});
it('removes model controls and badges even with old saved preferences', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  await mount();
  await act(async () => container.querySelector('[title="Cài đặt AI"]').click());
  expect(container.querySelector('input[type=radio]')).toBeNull();
  expect(container.textContent).not.toMatch(/Thinking|Lite|Mô hình AI|Gemini 2\.0/);
  expect(container.querySelector('input[type=password]')).not.toBeNull();
});
it.each([{ id: 'staff', role: 'employee' }, { id: 'sm', role: 'SM', isManager: true }])('hides settings for $role and removes old browser keys', async user => {
  useStore.setState({ user });
  localStorage.setItem('gemini_api_key', 'old-key');
  await mount();
  expect(container.querySelector('[title="Cài đặt AI"]')).toBeNull();
  expect(container.querySelector('input[type=password]')).toBeNull();
  expect(localStorage.getItem('gemini_api_key')).toBeNull();
  await send('Hướng dẫn nấu lẩu');
  expect(askGeminiCopilot.mock.calls[0][3]).toBe('');
});
it('saves shared configuration for admin, clears the field and never stores the key locally', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' } });
  await mount();
  await act(async () => container.querySelector('[title="Cài đặt AI"]').click());
  const input = container.querySelector('input[type=password]');
  const key = 'AIza' + 'x'.repeat(35);
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, key); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent.includes('Lưu cấu hình')).click());
  expect(saveCopilotConfiguration).toHaveBeenCalledWith(key);
  expect(input.value).toBe('');
  expect(localStorage.getItem('gemini_api_key')).toBeNull();
  expect(container.textContent).toContain('Đã cấu hình cho toàn ứng dụng');
});
it('sends SOP and follow-up questions to Gemini even without a browser key', async () => {
  await mount(); await send('Cách kiểm tra hạn sử dụng?'); await send('Còn bước tiếp theo?');
  expect(askGeminiCopilot).toHaveBeenCalledTimes(2);
  expect(askGeminiCopilot.mock.calls[1][2]).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Bước 1: Đọc Sổ tay.' })]));
  expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ model: DEFAULT_GEMINI_MODEL }));
});
it.each(['employee', 'SM', 'admin'])('answers date/time without Gemini for %s, even with an old selected week', async role => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-18T17:05:00Z'));
  useStore.setState({ user: { id: role === 'admin' ? 'admin' : 'a', role, dept: 'A' } });
  await mount(); await send('hôm nay là ngày bao nhiêu?');
  expect(container.textContent).toContain('19/10/2026');
  await send('bây giờ mấy giờ');
  expect(container.textContent).toContain('00:05');
  expect(askGeminiCopilot).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'local-clock', error: null }));
});
it('shows a provider failure without inventing a keyword fallback answer', async () => {
  askGeminiCopilot.mockRejectedValue(new Error('Chưa cấu hình Gemini API Key.'));
  await mount(); await send('Hủy cơm nắm giờ nào?');
  expect(container.textContent).toContain('Chưa cấu hình Gemini API Key.');
  expect(container.querySelector('a').textContent).toBe('Mở Sổ tay');
  expect(container.textContent).not.toContain('19:00');
  expect(log).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-error', error: 'Chưa cấu hình Gemini API Key.' }));
});

it('offers explicit retry after 503, preserves the question and never retries automatically', async () => {
  askGeminiCopilot.mockRejectedValueOnce(Object.assign(new Error('Google Gemini đang quá tải (503). Hệ thống đã thử lại 2 lần.'), { status: 503 }));
  await mount(); await send('Hủy cơm nắm giờ nào?');
  expect(askGeminiCopilot).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Gemini tạm thời không khả dụng (503)');
  expect(container.textContent).not.toContain('Hệ thống đã thử lại 2 lần');
  expect(container.querySelector('a').getAttribute('href')).toMatch(/employee\/handbook$/);
  vi.setSystemTime(Date.now() + 3000);
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Thử lại câu hỏi').click());
  expect(askGeminiCopilot).toHaveBeenCalledTimes(2);
  expect(askGeminiCopilot.mock.calls[1][0]).toBe('Hủy cơm nắm giờ nào?');
  expect(askGeminiCopilot.mock.calls[1][2]).toEqual([]);
  expect(container.textContent).toContain('Bước 1: Đọc Sổ tay.');
});

it('does not offer a retry shortcut for denied access', async () => {
  askGeminiCopilot.mockRejectedValueOnce(Object.assign(new Error('Bạn không có quyền tra dữ liệu này qua trợ lý.'), { status: 403 }));
  await mount(); await send('Hủy cơm nắm giờ nào?');
  expect(container.textContent).toContain('không có quyền');
  expect(container.textContent).not.toContain('Thử lại câu hỏi');
});
it('preserves but marks partial answers and excludes them from the next model context', async () => {
  askGeminiCopilot.mockImplementationOnce(async (_q, _c, _h, _k, chunk) => {
    chunk('Bước 1: chuẩn bị.'); throw Object.assign(new Error('Hết thời gian chờ'), { status: 408 });
  });
  await mount(); await send('Cách nấu lẩu?');
  expect(container.textContent).toContain('Bước 1: chuẩn bị.');
  expect(container.textContent).toContain('Câu trả lời chưa hoàn tất');
  await send('Tôi hỏi lại công thức');
  expect(askGeminiCopilot.mock.calls[1][2].some(m => m.text.includes('Bước 1: chuẩn bị.'))).toBe(false);
});
it('passes cancellation to the transport when the drawer is closed', async () => {
  askGeminiCopilot.mockImplementation(async (_q, _c, _h, _k, _chunk, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })));
  await mount(); await send('Cách nấu lẩu?');
  const signal = askGeminiCopilot.mock.calls[0][5].signal;
  await act(async () => root.render(<AICopilotDrawer isOpen={false} onClose={() => {}} currentWeek="2026-09-28" storeId="A" />));
  expect(signal.aborted).toBe(true);
  expect(log).not.toHaveBeenCalled();
});

it('counts named staff from the requested authorized store without invoking Gemini', async () => {
  useStore.setState({ user: { id: 'admin', role: 'admin' }, stores: [{ id: 'A' }, { id: 'VN0485' }] });
  getEmployees.mockResolvedValue([{ id: '1', name: 'Nguyễn Văn Đức', dept: 'VN0485' }, { id: '2', name: 'Trần Minh Đức', dept: 'VN0485' }]);
  await mount(); await send('vn0485 có bao nhiêu đức');
  expect(getEmployees).toHaveBeenCalledWith({ dept: 'VN0485' });
  expect(container.textContent).toContain('VN0485 có 2 nhân viên');
  expect(container.textContent).toContain('Nguyễn Văn Đức');
  expect(askGeminiCopilot).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'local-employee-directory', storeId: 'VN0485' }));
});
