// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import AICopilotDrawer from '../components/ai/AICopilotDrawer';
import { useStore } from '../store/useStore';
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { DEFAULT_GEMINI_MODEL } from '../services/geminiService';
import { getCopilotConfiguration, saveCopilotConfiguration } from '../services/api';
vi.mock('../services/api', async importOriginal => ({ ...await importOriginal(), getCopilotConfiguration: vi.fn(), saveCopilotConfiguration: vi.fn() }));
vi.mock('../utils/aiSchedulerEngine', () => ({ askGeminiCopilot: vi.fn() }));
vi.mock('../utils/assistantAgents', () => ({ assistantAgentPlan: () => null, assistantStoreIds: () => null, runAssistantAgents: async () => null }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
let root, container, log;
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('gemini_model', 'gemini-2.0-flash-thinking-exp-01-21');
  log = vi.fn();
  getCopilotConfiguration.mockResolvedValue({ configured: false });
  saveCopilotConfiguration.mockResolvedValue({ configured: true });
  useStore.setState({ user: { id: 'a', role: 'employee', dept: 'A' }, employees: [], stores: [{ id: 'A' }], schedule: {}, feedbacks: [], shiftSwaps: [], shelves: [], shelfItems: [], logAiTurn: log });
  Element.prototype.scrollIntoView = vi.fn();
  askGeminiCopilot.mockImplementation(async (_q, _context, _history, _key, chunk) => { chunk('Bước 1: Đọc Sổ tay.'); return 'Bước 1: Đọc Sổ tay.'; });
});
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); useStore.setState(initial, true); localStorage.clear(); vi.clearAllMocks(); });
async function mount() {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<AICopilotDrawer isOpen onClose={() => {}} currentWeek="2026-09-28" storeId="A" />));
}
async function send(question) {
  const input = container.querySelector('input[type=text]');
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, question); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
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
it('shows a provider failure without inventing a keyword fallback answer', async () => {
  askGeminiCopilot.mockRejectedValue(new Error('Chưa cấu hình Gemini API Key.'));
  await mount(); await send('Hủy cơm nắm giờ nào?');
  expect(container.textContent).toContain('Chưa cấu hình Gemini API Key.');
  expect(container.textContent).toContain('mở trang Sổ tay');
  expect(container.textContent).not.toContain('19:00');
  expect(log).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-error', error: 'Chưa cấu hình Gemini API Key.' }));
});
