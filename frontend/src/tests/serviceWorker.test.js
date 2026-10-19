import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
function fixture(network, entries = new Map()) {
  const listeners = {}, cache = {
    match: vi.fn(async req => entries.get(typeof req === 'string' ? req : req.url)?.clone()),
    put: vi.fn(async (req, response) => entries.set(typeof req === 'string' ? req : req.url, response.clone())),
  };
  const caches = { open: vi.fn(async () => cache), keys: async () => ['other-app-cache', 'lichca-v3'], delete: vi.fn() };
  runInNewContext(source, { self: { addEventListener: (name, callback) => { listeners[name] = callback; }, location: { origin: 'https://app.test' }, registration: { scope: 'https://app.test/exel_pro/' }, clients: { claim: async () => {} } }, caches, fetch: network, URL, Response, console });
  return { cache, caches, listeners, async navigate(path = '/exel_pro/') {
    let response; const jobs = [];
    listeners.fetch({ request: new Request('https://app.test' + path, { headers: { Accept: 'text/html' } }), respondWith: p => { response = p; }, waitUntil: p => jobs.push(p) });
    const result = await response; await Promise.all(jobs); return result;
  } };
}
it('updates the subpath shell online and reuses it after a later network failure', async () => {
  const network = vi.fn().mockResolvedValueOnce(new Response('new shell', { headers: { 'Content-Type': 'text/html' } })).mockRejectedValueOnce(new Error('offline'));
  const app = fixture(network, new Map([['https://app.test/exel_pro/index.html', new Response('old shell')]]));
  expect(await (await app.navigate()).text()).toBe('new shell');
  expect(await (await app.navigate('/exel_pro/admin/schedule')).text()).toBe('new shell');
  expect(app.cache.put).toHaveBeenCalledOnce();
});
it('returns a readable offline page if both cache lookups miss', async () => {
  const app = fixture(async () => { throw new Error('offline'); });
  const response = await app.navigate();
  expect(response.status).toBe(503);
  expect(await response.text()).toContain('Vui lòng kết nối mạng');
  expect(app.cache.match).toHaveBeenCalledTimes(2);
});
it('does not cache an error response or erase other applications’ caches', async () => {
  const app = fixture(async () => new Response('gateway error', { status: 502 }));
  expect((await app.navigate()).status).toBe(503);
  expect(app.cache.put).not.toHaveBeenCalled();
  let job; app.listeners.activate({ waitUntil: p => { job = p; } }); await job;
  expect(app.caches.delete.mock.calls).toEqual([['lichca-v3']]);
});
