import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { streamGeminiMultiTurn, generateGeminiMultiTurn } from '../services/geminiService';
import { boundedResponseBody } from '../../../supabase/functions/chat-proxy/responseStream';
vi.mock('../lib/supabase', () => ({ supabaseAnonKey: 'public', supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } } }));
const contents = [{ role: 'user', parts: [{ text: 'Test' }] }];
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('times out a stalled stream, cancels its reader and preserves chunks already delivered', async () => {
  const cancel = vi.fn(), chunks = vi.fn();
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Bước 1"}]}}]}\n\n')); }, cancel });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  const result = streamGeminiMultiTurn(contents, '', '', chunks);
  const rejected = expect(result).rejects.toMatchObject({ status: 408 });
  await vi.advanceTimersByTimeAsync(30001);
  await rejected;
  expect(chunks).toHaveBeenCalledWith('Bước 1');
  expect(cancel).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it('aborts a pending fetch from the caller, without waiting for a timeout', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const caller = new AbortController();
  const result = generateGeminiMultiTurn(contents, '', '', { signal: caller.signal });
  const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(1); caller.abort(); await rejected;
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it('bounds stalled headers even when fetch ignores the signal', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const rejected = expect(generateGeminiMultiTurn(contents)).rejects.toMatchObject({ status: 408 });
  await vi.advanceTimersByTimeAsync(90001); await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
it.each(['timeout', 'disconnect'])('cancels the upstream body on %s after headers', async mode => {
  const cancel = vi.fn(), caller = new AbortController();
  const stream = boundedResponseBody(new ReadableStream({ cancel }), caller.signal);
  const rejected = expect(stream.getReader().read()).rejects.toThrow();
  if (mode === 'timeout') await vi.advanceTimersByTimeAsync(30001);
  else caller.abort();
  await rejected;
  expect(cancel).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
