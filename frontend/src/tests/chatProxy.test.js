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
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: false }), getApiKey: async () => key, fetchImpl });
  expect((await handler(req({ 'x-gemini-api-key': 'attacker-key' }, 'model=untrusted-model&action=streamGenerateContent'))).status).toBe(200);
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`);
  expect(url).not.toContain(key);
  expect(init.headers['x-goog-api-key']).toBe(key);
  expect(JSON.parse(init.body)).toMatchObject({ ...body, generationConfig: { maxOutputTokens: 8192 } });
});
it.each(['configure', 'config_status'])('denies employee and manager access to %s before reading or writing secrets', async action => {
  const getApiKey = vi.fn(), saveApiKey = vi.fn(), fetchImpl = vi.fn();
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: false }), getApiKey, saveApiKey, fetchImpl });
  expect((await handler(req({}, `action=${action}`))).status).toBe(403);
  expect(getApiKey).not.toHaveBeenCalled(); expect(saveApiKey).not.toHaveBeenCalled(); expect(fetchImpl).not.toHaveBeenCalled();
});
it('admin saves a shared key and only receives its configured status', async () => {
  const saveApiKey = vi.fn(), fetchImpl = vi.fn();
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: true }), getApiKey: async () => key, saveApiKey, fetchImpl });
  const request = new Request('https://test?action=configure', { method: 'POST', headers: { Authorization: 'Bearer admin' }, body: JSON.stringify({ apiKey: key }) });
  const response = await handler(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ configured: true });
  expect(saveApiKey).toHaveBeenCalledWith(key);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(await (await handler(req({}, 'action=config_status'))).json()).toEqual({ configured: true });
});
it('invalid configuration and storage failures do not report success or expose the key', async () => {
  const saveApiKey = vi.fn().mockRejectedValue(new Error(key));
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: true }), getApiKey: async () => '', saveApiKey });
  expect((await handler(req({}, 'action=configure'))).status).toBe(400);
  expect(saveApiKey).not.toHaveBeenCalled();
  const response = await handler(new Request('https://test?action=configure', { method: 'POST', headers: { Authorization: 'Bearer admin' }, body: JSON.stringify({ apiKey: key }) }));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain(key);
});
it('supports server key, reports missing config and rejects arbitrary actions', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{}'));
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: false }), getApiKey: async () => key, fetchImpl });
  expect((await handler(req({ 'x-gemini-api-key': '' }))).status).toBe(200);
  expect((await handler(req({}, 'action=deleteModel'))).status).toBe(400);
  const empty = createChatProxyHandler({ authorize: async () => ({ isAdmin: false }), getApiKey: async () => '', fetchImpl });
  expect((await empty(req({ 'x-gemini-api-key': '' }))).status).toBe(503);
});
it('does not leak provider error bodies or permit personal-key CORS', async () => {
  const handler = createChatProxyHandler({ authorize: async () => ({ isAdmin: false }), getApiKey: async () => key, fetchImpl: async () => new Response(key, { status: 403 }) });
  expect(await (await handler(req())).text()).not.toContain(key);
  const preflight = await handler(new Request('https://test', { method: 'OPTIONS' }));
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Headers')).not.toContain('x-gemini-api-key');
});
