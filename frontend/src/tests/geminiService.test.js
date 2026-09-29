import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { generateGeminiMultiTurn, streamGeminiMultiTurn, DEFAULT_GEMINI_MODEL } from '../services/geminiService';
import { supabase } from '../lib/supabase';
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } }, supabaseAnonKey: 'public-project-key' }));
const contents = [{ role: 'user', parts: [{ text: 'Quy trình?' }] }];
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } } });
  vi.stubGlobal('localStorage', { getItem: () => 'gemini-2.0-flash-thinking-exp-01-21' });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('ignores saved models and legacy personal keys, sending only session authentication', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: 'internal' }, { text: 'Bước 1' }, { text: ': đọc Sổ tay' }] } }] })));
  vi.stubGlobal('fetch', fetchMock);
  expect(await generateGeminiMultiTurn(contents, 'Sổ tay đầy đủ', 'personal-key', 'other-model')).toBe('Bước 1: đọc Sổ tay');
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toContain(`model=${DEFAULT_GEMINI_MODEL}`);
  expect(url).not.toContain('personal-key');
  expect(request.headers).toMatchObject({ Authorization: 'Bearer session-token' });
  expect(request.headers).not.toHaveProperty('x-gemini-api-key');
  expect(request.body).not.toContain('personal-key');
  expect(JSON.parse(request.body).generationConfig.maxOutputTokens).toBe(8192);
});
it('handles split UTF-8 streaming chunks and a final event without newline', async () => {
  const event = text => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}`;
  const bytes = new TextEncoder().encode(event('Bước 1: ') + '\n\n' + event('Nấu lẩu.'));
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3)); controller.close(); } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));
  const chunks = [];
  expect(await streamGeminiMultiTurn(contents, 'Sổ tay', '', text => chunks.push(text))).toBe('Bước 1: Nấu lẩu.');
  expect(chunks.join('')).toBe('Bước 1: Nấu lẩu.');
});
it('does not call the proxy without an authenticated session', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  vi.stubGlobal('fetch', vi.fn());
  await expect(generateGeminiMultiTurn(contents, 'Sổ tay', '')).rejects.toThrow('đăng nhập lại');
  expect(fetch).not.toHaveBeenCalled();
});
