// Real browser/layout, fake data only. All external requests intercepted or blocked.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let serial = 0;
const pending = new Map(), errors = [], writes = [];
const doc = { id: '11111111-1111-4111-8111-111111111111', title: 'Trà cóc xí muội', content: 'Size L: trà cóc 250ml, thêm đá đầy cốc.', category: 'recipe', store_id: 'A', revision: 1, images: [], is_active: true, published_at: '2026-10-17' };
const changes = [];
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(new Error(JSON.stringify(m.error))) : p?.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') {
    const detail = m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;
    if (!detail.includes('chrome-extension://')) errors.push(detail);
  }
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, path = new URL(request.url).pathname;
  const reply = body => send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || '*' },
  ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  if (request.method === 'OPTIONS') { void reply({}); return; }
  if (path.endsWith('/rpc/submit_handbook_change')) {
    const body = JSON.parse(request.postData); writes.push(body);
    const change = { id: `change-${changes.length}`, entry_id: body.p_entry_id, base_revision: body.p_revision, payload: body.p_payload, status: 'pending', operation: body.p_operation, submitted_by: 'sm', submitted_at: '2026-10-17' };
    changes.push(change); void reply(change); return;
  }
  if (path.endsWith('/rpc/review_handbook_change')) {
    const body = JSON.parse(request.postData); writes.push(body);
    const change = changes.find(c => c.id === body.p_id); change.status = body.p_approve ? 'approved' : 'rejected';
    if (body.p_approve) Object.assign(doc, change.payload, { revision: doc.revision + 1, is_active: change.operation !== 'archive' });
    void reply(change); return;
  }
  if (path.endsWith('/rpc/get_handbook_knowledge')) { void reply([doc]); return; }
  if (path === '/rest/v1/handbook_entries') { void reply([doc]); return; }
  if (path === '/rest/v1/handbook_changes') { void reply(changes); return; }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + JSON.stringify(errors) + '\n' + await evaluate('document.body.innerText.slice(0,1500)')); }
async function click(text) { const expression = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`; await waitFor(expression); await evaluate(`${expression}.click()`); await wait(100); }
async function navigate(path) { await evaluate(`history.pushState({},'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'));`); }
async function fill(selector, text) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).select()`); await wait(100); await send('Input.insertText', { text }); await wait(100); }
async function screenshot(name) { const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`artifacts/handbook-${name}.png`, Buffer.from(shot.data, 'base64')); }
try {
  await mkdir('artifacts', { recursive: true });
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const resources=performance.getEntriesByType('resource');const storeUrl=resources.find(e=>new URL(e.name).pathname==='/src/store/useStore.js')?.name || '/src/store/useStore.js';const {useStore}=await import(storeUrl);window.fixtureStore=useStore;
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},logAiTurn:()=>{},employees:[],stores:[{id:'A',name:'Cửa hàng A'}],schedule:{},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],authWarning:null,user:{id:'sm',role:'SM',dept:'A',name:'SM test',loginAt:Date.now()}});})()`);
  await wait(300); await navigate('/admin/handbook'); await waitFor("document.body.innerText.includes('Quản lý kiến thức')");
  assert.equal(await evaluate("(()=>{const main=document.querySelector('main');const library=main.querySelector('section');return main.clientWidth-library.getBoundingClientRect().width<=48;})()"), true, 'Admin handbook should fill available desktop width');
  await screenshot('desktop-wide');
  await waitFor("document.querySelector('details summary')"); await evaluate("document.querySelector('details summary').click()"); await click('Sửa');
  await fill('textarea', 'Size L: trà cóc 220ml, thêm đá đầy cốc.'); await click('Kiểm tra trước khi gửi');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Gửi Admin duyệt').disabled"), true);
  await screenshot('desktop-confirm');
  await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()"); await click('Gửi Admin duyệt');
  await waitFor("!document.querySelector('[role=dialog]')");
  assert.equal(writes.length, 1); assert.equal(doc.content.includes('250ml'), true);
  assert.equal(await evaluate("document.body.innerText.includes('Xem và duyệt')"), false);
  await evaluate("window.fixtureStore.setState({user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}})"); await wait(300); await navigate('/admin/handbook');
  await click('Chờ duyệt (1)'); await click('Duyệt toàn bộ (1)');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Xác nhận duyệt 1 tài liệu').disabled"), true);
  await screenshot('desktop-bulk-review');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(200);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  assert.equal(await evaluate("document.querySelector('[role=dialog]').getBoundingClientRect().right<=innerWidth"), true);
  await screenshot('mobile-review');
  await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()"); await click('Xác nhận duyệt 1 tài liệu');
  await waitFor("document.querySelector('[role=dialog]').innerText.includes('Đã duyệt 1/1')"); await click('Đóng'); await waitFor("!document.querySelector('[role=dialog]')");
  assert.equal(writes.length, 2); assert.equal(doc.content.includes('220ml'), true);
  await evaluate("window.fixtureStore.setState({user:{id:'staff',role:'STFT',dept:'A',name:'Staff test',loginAt:Date.now()}})"); await wait(300); await navigate('/employee/handbook');
  await waitFor("document.body.innerText.includes('Tra cứu Sổ tay')"); await waitFor("document.querySelector('details summary')"); await evaluate("document.querySelector('details summary').click()");
  await waitFor("document.body.innerText.includes('220ml')");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Thêm tài liệu')"), false);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await screenshot('mobile-reader');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await wait(200);
  assert.equal(await evaluate("(()=>{const main=document.querySelector('main');return main.clientWidth-main.querySelector('section').getBoundingClientRect().width<=48;})()"), true, 'Employee handbook should fill available desktop width');
  await screenshot('desktop-reader-wide');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(200);
  assert.equal(await evaluate("document.body.innerText.includes('250ml')"), false);
  await evaluate("window.fixtureStore.setState({user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}})"); await wait(300); await navigate('/admin/handbook');
  await waitFor("document.querySelector('h2')?.textContent==='Quản lý kiến thức'");
  await waitFor("document.querySelector('details summary')"); await evaluate("document.querySelector('details summary').click()");
  await click('Đề nghị gỡ'); await fill('[role=dialog] textarea', 'Ngừng áp dụng công thức này');
  await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()"); await click('Gửi đề nghị gỡ');
  await waitFor("document.body.innerText.includes('Admin kiểm tra trước khi duyệt')");
  await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()"); await click('Xác nhận duyệt');
  await waitFor("!document.querySelector('[role=dialog]')");
  await evaluate("window.fixtureStore.setState({user:{id:'staff',role:'STFT',dept:'A',name:'Staff test',loginAt:Date.now()}})"); await wait(300); await navigate('/employee/handbook');
  await waitFor("document.body.innerText.includes('Chưa có tài liệu đã công bố')");
  assert.equal(await evaluate("document.body.innerText.includes('220ml') || document.body.innerText.includes('250ml')"), false);
  await screenshot('mobile-archived'); assert.deepEqual(errors, []);
  console.log('PASS desktop/mobile: full-width Admin and staff pages, confirmed bulk approval, staff reads new quantity, archive, no overflow. All writes mocked.');
} finally { socket.close(); await fetch('http://127.0.0.1:9227/json/close/' + target.id); }
