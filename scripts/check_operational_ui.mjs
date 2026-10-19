// Local Vite :5179 + headless CDP :9227. All external requests are mocked/blocked.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let serial = 0;
const pending = new Map(), errors = [], writes = [];
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(new Error(JSON.stringify(m.error))) : p?.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') {
    const description = m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;
    if (!description.includes('chrome-extension://')) errors.push(description);
  }
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, path = new URL(request.url).pathname;
  const reply = (body, responseCode = 200) => send('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || '*' },
  ], ...(responseCode === 204 ? {} : { body: Buffer.from(JSON.stringify(body)).toString('base64') }) });
  if (request.method === 'OPTIONS') { void reply(null, 204); return; }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path === '/rest/v1/rpc/save_employee_schedule_checked') {
    const b = JSON.parse(request.postData); writes.push(b);
    void reply(b.p_override_reason ? 1 : { message: 'SCHEDULE_RULES', details: JSON.stringify([{ code: 'INSUFFICIENT_REST', employeeId: '260716009', date: '2026-10-13', hours: 8, limit: 11 }]) }, b.p_override_reason ? 200 : 400); return;
  }
  if (path === '/rest/v1/employee_notifications') { void reply([{ id: 'test-notification', week_date: '2026-10-05', title: 'Lịch tuần đã được duyệt', message: 'Lịch tuần trước vừa được duyệt.', updated_at: '2026-10-13T00:00:00Z' }]); return; }
  if (path === '/rest/v1/server_audit_events') { void reply([{ id: 'test-audit', actor_id: 'admin', action: 'schedule.override', resource_type: 'schedules', resource_id: '2026-10-12:260716009', store_id: 'A', metadata: { reason: 'Bổ sung người thay ca đột xuất', source: 'database' }, created_at: '2026-10-13T00:00:00Z' }]); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText.slice(0,2500)') + '\n' + JSON.stringify(errors)); }
const button = label => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})`;
const out = new URL('../artifacts/operational-ui/', import.meta.url); await mkdir(out, { recursive: true });
const edit = "window.editResult=null;void window.testStore.getState().updateShift('2026-10-12','260716009','T3','6-14').then(()=>window.editResult='saved').catch(e=>window.editResult=e.code)";
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const storeUrl=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';const {useStore}=await import(storeUrl);window.testStore=useStore;
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},loadAdminLogs:async()=>{},isInitializing:false,appendAdminLog:async()=>{},
      employees:[{id:'260716009',name:'Nhân viên thử nghiệm',dept:'A',type:'STPT',role:'STPT',maxH:23,isActive:true}],stores:[{id:'A',name:'A'}],schedule:{'2026-10-12':{'260716009':{T2:'14-22',T3:'off'}}},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],
      authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/logs');dispatchEvent(new PopStateEvent('popstate'));})()`);
  await waitFor("document.body.innerText.includes('schedule.override')");
  await evaluate(edit); await waitFor("document.querySelector('textarea') && window.testStore.getState().scheduleOverrideRequest");
  assert.equal(await evaluate(`${button('Lưu ngoại lệ có nhật ký')}.disabled`), true);
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: device === 'mobile' }); await wait(200);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(new URL(device + '.png', out), Buffer.from(shot.data, 'base64'));
  }
  await evaluate(`${button('Quay lại sửa lịch')}.click()`); await waitFor("window.editResult==='SCHEDULE_RULES'");
  assert.equal(await evaluate("window.testStore.getState().schedule['2026-10-12']['260716009'].T3"), 'off');
  assert.equal(writes.length, 0); // Local shared validation runs before a write.
  await evaluate(edit); await waitFor("window.testStore.getState().scheduleOverrideRequest");
  await evaluate("(()=>{const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Bổ sung người thay ca đột xuất');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await waitFor(`!${button('Lưu ngoại lệ có nhật ký')}.disabled`); await evaluate(`${button('Lưu ngoại lệ có nhật ký')}.click()`); await waitFor("window.editResult==='saved'");
  assert.equal(writes.length, 1); assert.equal(writes[0].p_override_reason, 'Bổ sung người thay ca đột xuất');
  assert.equal(writes[0].p_expect_version, 0);
  // SM receives the error without an Admin exception dialog.
  await evaluate("window.testStore.setState({user:{id:'sm',role:'employee',isManager:true,dept:'A',name:'SM',loginAt:Date.now()}})");
  await evaluate(edit); await waitFor("window.editResult==='SCHEDULE_RULES'"); assert.equal(await evaluate('window.testStore.getState().scheduleOverrideRequest'), null);
  // Employee notification points to the week named in the notification.
  await evaluate("window.testStore.setState({user:{id:'260716009',role:'employee',dept:'A',name:'NV',loginAt:Date.now()}});history.pushState({},'','/employee/home');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("document.querySelector('button[title=\"Thông báo hệ thống\"]')");
  await evaluate("document.querySelector('button[title=\"Thông báo hệ thống\"]').click()"); await waitFor("document.body.innerText.includes('Lịch tuần đã được duyệt')");
  await evaluate("[...document.querySelectorAll('h4')].find(b=>b.textContent==='Lịch tuần đã được duyệt').click()");
  await waitFor("location.pathname==='/employee/schedule' && window.testStore.getState().currentWeek==='2026-10-05'");
  assert.deepEqual(errors, []);
  console.log('PASS Admin cancel/rollback and reason retry, same version, SM denied, desktop/mobile, server audit and employee notification week.');
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
