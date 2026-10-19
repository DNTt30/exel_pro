// Mocked browser integration: requires Vite :5179 and headless CDP :9227.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let serial = 0, failWrite = false;
const pending = new Map(), errors = [], roles = [];
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
  const reply = (body, responseCode = 200) => send('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || '*' },
  ], ...(responseCode === 204 ? {} : { body: Buffer.from(JSON.stringify(body)).toString('base64') }) });
  if (request.method === 'OPTIONS') { void reply(null, 204); return; }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', organization_name: '', primary_color: '#4338ca', contact_email: '', logo_data_url: '', revision: 1 }); return; }
  if (path === '/rest/v1/workspace_roles') { void reply(roles); return; }
  if (path === '/rest/v1/rpc/save_workspace_role') {
    const b = JSON.parse(request.postData);
    if (failWrite) { void reply({ message: 'offline' }, 503); return; }
    const current = roles.find(r => r.id === b.p_id);
    if (current && current.revision !== b.p_revision) { void reply({ code: '40001', message: 'ROLE_CONFLICT' }, 409); return; }
    if (roles.some(r => r.id !== b.p_id && r.name.toLowerCase() === b.p_name.toLowerCase())) { void reply({ code: '23505' }, 409); return; }
    const saved = { id: current?.id || `role-${roles.length + 1}`, name: b.p_name, permission_group: b.p_group, is_active: b.p_active, revision: (current?.revision || 0) + 1 };
    if (current) Object.assign(current, saved); else roles.push(saved);
    void reply(saved); return;
  }
  if (path === '/rest/v1/rpc/assign_workspace_role') {
    const b = JSON.parse(request.postData), role = roles.find(r => r.id === b.p_role_id);
    const canonical = role?.permission_group === 'sm' ? 'SM' : role?.permission_group === 'am' ? 'OFC' : 'STPT';
    void reply({ id: b.p_emp_id, workspaceRoleId: b.p_role_id, role: canonical, jobTitle: canonical, type: 'STPT', dept: 'A' }); return;
  }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + JSON.stringify(await evaluate('({path:location.pathname,text:document.body.innerText.slice(0,1500),rolesStatus:window.testStore?.getState().rolesStatus,rolesError:window.testStore?.getState().rolesError})')) + '\nErrors: ' + JSON.stringify(errors)); }
const button = label => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})`;
const field = label => `document.querySelector('[aria-label="${label}"]')`;
async function setField(label, value) { await evaluate(`(()=>{const e=${field(label)};const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); await wait(80); }
const out = new URL('../artifacts/workspace-roles-ui/', import.meta.url); await mkdir(out, { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width:1440,height:1000,deviceScaleFactor:1,mobile:false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const storeUrl=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';const {useStore}=await import(storeUrl);window.testStore=useStore;
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},
      employees:[{id:'260716009',name:'Nhân viên thử nghiệm',dept:'A',type:'STPT',role:'STPT',jobTitle:'',maxH:23,isActive:true}],stores:[{id:'A',name:'A'}],schedule:{},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],
      authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/roles');dispatchEvent(new PopStateEvent('popstate'));})()`);
  await waitFor("document.querySelector('h1')?.textContent==='Vai trò & quyền truy cập' && !document.querySelector('fieldset').disabled");
  await evaluate(`${button('Cách sử dụng')}.click()`);await waitFor("document.querySelector('#workspace-guide')?.textContent.includes('Gán cho nhân viên')");
  await evaluate(`${button('Đóng hướng dẫn')}.click()`);
  await setField('Nhóm quyền', 'am');assert.equal(await evaluate("document.body.innerText.includes('chưa giới hạn theo từng khu vực')"),true);
  await setField('Tên vai trò', 'Trưởng ca'); await setField('Nhóm quyền', 'sm');
  await evaluate(`${button('Lưu vai trò')}.click()`); await waitFor('window.testStore.getState().workspaceRoles.length===1');
  await setField('Nhân viên', '260716009'); await setField('Vai trò mới', 'role-1');
  await evaluate(`${button('Áp dụng vai trò')}.click()`); await waitFor("window.testStore.getState().employees[0].role==='SM'");
  assert.equal(await evaluate('window.testStore.getState().employees[0].maxH'), 23);
  await evaluate(`${button('Đổi tên')}.click()`); assert.equal(await evaluate(`${field('Nhóm quyền')}.disabled`), true);
  await setField('Tên vai trò', 'Đội trưởng vận hành'); await evaluate(`${button('Lưu vai trò')}.click()`);
  await waitFor("window.testStore.getState().workspaceRoles[0].name==='Đội trưởng vận hành'");
  assert.equal(await evaluate('window.testStore.getState().employees[0].role'), 'SM');
  // Duplicate and offline failures keep committed state unchanged.
  await setField('Tên vai trò', 'Đội trưởng vận hành'); await evaluate(`${button('Lưu vai trò')}.click()`);
  await waitFor("document.body.innerText.includes('Tên vai trò đã tồn tại')");
  failWrite = true; await setField('Tên vai trò', 'Chưa lưu'); await evaluate(`${button('Lưu vai trò')}.click()`);
  await waitFor("document.body.innerText.includes('Không cập nhật được vai trò')"); assert.equal(roles.length, 1); failWrite = false;
  // Server-side conflict preserves the draft for deliberate reload.
  await evaluate(`${button('Đổi tên')}.click()`); roles[0].revision++;
  await setField('Tên vai trò', 'Bản sửa cũ'); await evaluate(`${button('Lưu vai trò')}.click()`);
  await waitFor("document.body.innerText.includes('Dữ liệu đã thay đổi')");
  await evaluate(`${button('Hủy sửa')}.click()`); await evaluate(`${button('Tải lại danh sách')}.click()`);
  await waitFor('window.testStore.getState().workspaceRoles[0].revision===3');
  await evaluate(`${button('Ngưng gán mới')}.click()`); await waitFor('!window.testStore.getState().workspaceRoles[0].isActive');
  assert.equal(await evaluate('window.testStore.getState().employees[0].role'), 'SM');
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: device === 'mobile' }); await wait(200);
    await evaluate("document.querySelector('main').scrollTop=0");
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    assert.equal(await evaluate("document.querySelector('main').clientWidth-document.querySelector('[data-workspace-settings]').getBoundingClientRect().width<2"),true);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(new URL(device + '.png', out), Buffer.from(shot.data, 'base64'));
    if(device==='mobile'){
      await evaluate(`${button('Cách sử dụng')}.click()`);
      const guide=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('mobile-guide.png',out),Buffer.from(guide.data,'base64'));
      await evaluate(`${button('Đóng hướng dẫn')}.click()`);
      await evaluate("document.querySelector('select[aria-label=\"Vai trò mới\"]').scrollIntoView({block:'center'})");
      const assign=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('mobile-assign.png',out),Buffer.from(assign.data,'base64'));
    }
  }
  await evaluate("history.pushState({},'','/admin/employees');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("[...document.querySelectorAll('tr')].some(row=>row.innerText.includes('260716009') && row.innerText.includes('Đội trưởng vận hành'))");
  await evaluate("history.pushState({},'','/admin/roles');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("document.querySelector('[aria-label=\"Nhân viên\"]')");
  await setField('Nhân viên', '260716009');
  await setField('Vai trò mới', ''); await evaluate(`${button('Áp dụng vai trò')}.click()`); await waitFor("window.testStore.getState().employees[0].role==='STPT'");
  // Employee sessions cannot access role management.
  await evaluate("window.testStore.setState({user:{id:'260716009',role:'employee',dept:'A',name:'NV test',loginAt:Date.now()}});history.pushState({},'','/admin/roles');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("location.pathname==='/employee/home'");
  assert.equal(await evaluate("!!document.querySelector('a[href$=\"/admin/settings\"]')"), false);
  assert.deepEqual(errors, []);
  console.log('PASS role UI: create/rename/assign/remove/archive, duplicate/offline/conflict, desktop/mobile and employee route guard.');
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
