// Local fixture-only browser checks. Vite :5179, isolated Edge CDP :9227.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let serial = 0;
const pending = new Map(), errors = [];
function send(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const detail = message.params.exceptionDetails;
    const description = detail.exception?.description || detail.text;
    // Machine-installed extension failures are outside the application under test.
    if (!description.includes('chrome-extension://')) errors.push(description);
  }
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    const local = request.url.startsWith('http://127.0.0.1:5179/');
    void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
  }
});
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); }
  throw new Error('Timed out: ' + expression);
}
const out = new URL('../artifacts/password-ui/', import.meta.url);
await mkdir(out, { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' });
  await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async () => {
    const storeUrl = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/store/useStore.js')?.name || '/src/store/useStore.js';
    const { useStore } = await import(storeUrl); window.testStore = useStore;
    useStore.setState({ initializeData: async () => {}, initRealtime: () => {}, isInitializing: false,
      appendAdminLog: async () => {}, employees: [], feedbacks: [], shiftSwaps: [],
      stores: [{ id: 'VN0485', name: 'Cửa hàng kiểm thử' }], shelves: [], shelfItems: [], authWarning: null });
  })()`);
  for (const role of ['employee', 'manager', 'admin']) {
    const user = { id: role === 'admin' ? 'admin' : '260512001', role: role === 'admin' ? 'admin' : 'employee',
      name: 'Tài khoản kiểm thử', dept: 'VN0485', isManager: role !== 'employee', mustChangePassword: true,
      mustSetupPassword: role === 'admin', loginAt: Date.now() };
    const expected = role === 'admin' ? '/admin/security/change-password' : '/employee/change-password';
    await evaluate(`testStore.setState({ user: ${JSON.stringify(user)} }); history.pushState({}, '', '/${role === 'employee' ? 'employee/home' : 'admin/dashboard'}'); dispatchEvent(new PopStateEvent('popstate'));`);
    await waitFor(`location.pathname === '${expected}' && document.querySelector('form input')`);
    assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 3);
    assert.equal(await evaluate("!!document.querySelector('button[title=\"GS25 AI Copilot\"]')"), false);
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: name === 'mobile' }); await wait(150);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${role} ${name}: horizontal overflow`);
      assert.equal(await evaluate("document.body.innerText.includes('Đã có lỗi hiển thị giao diện')"), false);
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`${role}-${name}.png`, out), Buffer.from(screenshot.data, 'base64'));
      console.log('PASS', role, name, 'forced route and password form');
    }
    // A URL edit must not bypass the guard; the form stays usable after redirect.
    await evaluate("history.pushState({}, '', '/employee/schedule'); dispatchEvent(new PopStateEvent('popstate'));");
    await waitFor(`location.pathname === '${expected}' && document.querySelector('form')`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS 6 desktop/mobile renders; no external requests allowed');
} finally {
  await fetch(`http://127.0.0.1:9227/json/close/${target.id}`).catch(() => {});
  socket.close();
}
