import { expect, it, vi } from 'vitest';
import { createChatProxyHandler } from '../../../supabase/functions/chat-proxy/handler.js';
import { DEFAULT_GEMINI_MODEL } from '../../../supabase/functions/_shared/copilotConfig.js';
const key = 'AIza' + 'x'.repeat(35);
const body = { contents: [{ role: 'user', parts: [{ text: 'Cách nấu lẩu?' }] }], systemInstruction: { parts: [{ text: 'Sổ tay' }] } };
const req = (headers = {}, query = '') => new Request(`https://test/chat-proxy?${query}`, { method: 'POST', headers: { Authorization: 'Bearer session', 'x-gemini-api-key': key, ...headers }, body: JSON.stringify(body) });
it('rejects unauthenticated users before contacting the provider', async () => {
  const fetchImpl = vi.fn();
  const handler = createChatProxyHandler({ authorize: async () => false, fetchImpl });
  expect((await handler(req())).status).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});
it('pins model on the server, uses SSE and sends the key only as a header', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('data: {}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }));
  const handler = createChatProxyHandler({ authorize: async () => true, fetchImpl });
  expect((await handler(req({}, 'model=untrusted-model&action=streamGenerateContent'))).status).toBe(200);
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`);
  expect(url).not.toContain(key);
  expect(init.headers['x-goog-api-key']).toBe(key);
  expect(JSON.parse(init.body)).toMatchObject({ ...body, generationConfig: { maxOutputTokens: 8192 } });
});
it('supports server key, reports missing config and rejects arbitrary actions', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{}'));
  const handler = createChatProxyHandler({ authorize: async () => true, apiKey: key, fetchImpl });
  expect((await handler(req({ 'x-gemini-api-key': '' }))).status).toBe(200);
  expect((await handler(req({}, 'action=deleteModel'))).status).toBe(400);
  const empty = createChatProxyHandler({ authorize: async () => true, fetchImpl });
  expect((await empty(req({ 'x-gemini-api-key': '' }))).status).toBe(503);
});
it('does not leak provider error bodies and handles CORS for personal keys', async () => {
  const handler = createChatProxyHandler({ authorize: async () => true, fetchImpl: async () => new Response(key, { status: 403 }) });
  expect(await (await handler(req())).text()).not.toContain(key);
  const preflight = await handler(new Request('https://test', { method: 'OPTIONS' }));
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('x-gemini-api-key');
});
