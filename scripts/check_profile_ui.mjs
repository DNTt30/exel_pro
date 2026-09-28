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
    if (new URL(request.url).pathname.startsWith('/rest/v1/rpc/')) {
      const body = request.postData ? JSON.parse(request.postData) : {};
      const rows = [{ id: '260512001', name: 'Nhân viên kiểm thử', dept: 'VN0485', role: 'STPT', type: 'STPT',
        recovery_email: 'fixture@example.com', dob: '2004-02-29', university: 'Đại học kiểm thử', major: 'Công nghệ thông tin',
        work_plan_until: `${new Date().getMonth() + 1}/${new Date().getFullYear()}` }];
      const payload = request.url.includes('get_employee_profiles') ? rows.filter(r => !body.p_emp_id || r.id === body.p_emp_id) : null;
      void send('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'OPTIONS' ? 204 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
          { name: 'Access-Control-Allow-Methods', value: 'POST,OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || request.headers['access-control-request-headers'] || '*' }],
        ...(request.method === 'OPTIONS' ? {} : { body: Buffer.from(JSON.stringify(payload)).toString('base64') }) });
      return;
    }
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
const out = new URL('../artifacts/profile-ui/', import.meta.url);
await mkdir(out, { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' });
  await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async () => {
    const storeUrl = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/store/useStore.js')?.name || '/src/store/useStore.js';
    const { useStore } = await import(storeUrl); window.testStore = useStore;
    useStore.setState({ initializeData: async () => {}, initRealtime: () => {}, isInitializing: false, appendAdminLog: async () => {},
      employees: [{ id: '260512001', name: 'Nhân viên kiểm thử', dept: 'VN0485', type: 'STPT', role: 'STPT', maxH: 23, passwordChangedAt: '2026-09-28', recoveryEmail: 'fixture@example.com' }],
      feedbacks: [], shiftSwaps: [], stores: [{ id: 'VN0485', name: 'Cửa hàng kiểm thử' }], shelves: [], shelfItems: [], authWarning: null });
  })()`);
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: device === 'mobile' });
    await evaluate(`testStore.setState({ user: { id: '260512001', role: 'employee', name: 'Nhân viên kiểm thử', dept: 'VN0485', loginAt: Date.now() } });`);
    await wait(100);
    await evaluate("history.pushState({}, '', '/employee/profile'); dispatchEvent(new PopStateEvent('popstate'));");
    await waitFor("document.querySelector('input[type=email]')?.value === 'fixture@example.com'");
    for (const state of ['profile', 'confirm']) {
      if (state === 'confirm') await evaluate(`(() => {
        const input = document.querySelector('input[type=email]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'new@example.com'); input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      if (state === 'confirm') {
        await wait(100);
        await evaluate("document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))");
        await waitFor("document.querySelector('input[type=password]')");
      }
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${device} overflow`);
      await wait(200);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`${device}-${state}.png`, out), Buffer.from(shot.data, 'base64'));
    }
    await evaluate(`testStore.setState({ user: { id: 'admin', role: 'admin', name: 'Admin', loginAt: Date.now() } });`);
    await wait(100);
    await evaluate("history.pushState({}, '', '/admin/employees'); dispatchEvent(new PopStateEvent('popstate'));");
    await waitFor("document.body.textContent.includes('Dự định nghỉ tháng này')");
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(`${device}-employees.png`, out), Buffer.from(shot.data, 'base64'));
    await evaluate(`document.querySelector('[title="Xem hồ sơ Nhân viên kiểm thử"]').click()`);
    await waitFor("document.body.textContent.includes('Đại học kiểm thử')");
    shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(`${device}-details.png`, out), Buffer.from(shot.data, 'base64'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  }
  assert.deepEqual(errors, []);
  console.log('PASS 8 desktop/mobile profile, password confirmation, manager reminder/detail screenshots; no runtime errors; all external requests blocked/mocked.');
} catch (error) {
  console.error(await evaluate('JSON.stringify({path:location.pathname,body:document.body.innerText.slice(0,1800)})'), errors);
  throw error;
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
