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
    if (request.method === 'OPTIONS' && new URL(request.url).pathname.startsWith('/rest/v1/')) {
      void send('Fetch.fulfillRequest', {requestId,responseCode:204,responseHeaders:[
        {name:'Access-Control-Allow-Origin',value:'*'}, {name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'},
        {name:'Access-Control-Allow-Headers',value:request.headers['Access-Control-Request-Headers'] || request.headers['access-control-request-headers'] || '*'}]});
      return;
    }
    if (new URL(request.url).pathname === '/rest/v1/schedules') {
      const weeks = new URL(request.url).searchParams.get('week_date') || '';
      const rows = weeks.includes('2026-09-21') ? [{week_date:'2026-09-21',emp_id:'260512001',shifts:{T2:'6-14',T3:'14-22'},version:1}] : [];
      void send('Fetch.fulfillRequest', {requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(rows)).toString('base64')});
      return;
    }
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
const out = new URL('../artifacts/skills-ui/', import.meta.url);
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
      employees: [{ id:'260512001',name:'Nhân viên cần train',dept:'VN0485',type:'STFT',role:'STFT',maxH:48,createdAt:'2025-01-01',passwordChangedAt:'2026-09-28',skills:[] },
        {id:'260512002',name:'Người kèm ca đêm',dept:'VN0486',type:'STPT',role:'STPT',maxH:16,skills:['NIGHT_READY'],passwordChangedAt:'2026-09-28'}],
      feedbacks:[],shiftSwaps:[],stores:[{id:'VN0485',name:'Cửa hàng đích'},{id:'VN0486',name:'Cửa hàng hỗ trợ'}],
      shelves:[],shelfItems:[],authWarning:null,currentWeek:'2026-09-28',scheduleWeeks:{},
      schedule:{'2026-09-28':{'260512002':{T2:'off',T3:'off',T4:'off',T5:'off',T6:'off',T7:'off',CN:'off'}}},
      user:{id:'admin',role:'admin',name:'Admin kiểm thử',loginAt:Date.now()}});
  })()`);
  await wait(150);
  for (const [device, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:device === 'mobile'});
    await evaluate("history.pushState({}, '', '/admin/employees'); dispatchEvent(new PopStateEvent('popstate'));");
    await waitFor("document.body.textContent.includes('☾ Night Ready')");
    await evaluate("document.querySelectorAll('[title=\"Sửa thông tin\"]')[1].click()");
    await waitFor("document.querySelector('input[type=checkbox]')?.checked");
    await wait(100);
    let shot = await send('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL(`${device}-skills.png`,out),Buffer.from(shot.data,'base64'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await evaluate("history.pushState({}, '', '/admin/schedule'); dispatchEvent(new PopStateEvent('popstate'));");
    await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Kỹ năng & phân bổ ca'))");
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Kỹ năng & phân bổ ca')).click()");
    await waitFor("document.body.textContent.includes('Nhân sự cần Train ca đêm (1)')");
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Kỹ năng & phân bổ ca')).scrollIntoView()");
    await wait(150);
    shot = await send('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL(`${device}-analytics.png`,out),Buffer.from(shot.data,'base64'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'AI xếp ca').click()");
    await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Xếp lịch')");
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Xếp lịch').click()");
    await waitFor("document.body.textContent.includes('Chi viện đề xuất') && document.body.textContent.includes('rủi ro vận hành cao')");
    await evaluate("[...document.querySelectorAll('[role=alert]')].find(e => e.textContent.includes('Night Ready')).scrollIntoView({block:'center'})");
    await wait(100);
    shot = await send('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL(`${device}-ai-preview.png`,out),Buffer.from(shot.data,'base64'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Hủy').click()");
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 6 desktop/mobile screenshots: skill checkbox/badge, history analytics, red night warnings and borrowed shift preview. External requests mocked; no writes.');
} catch (error) {
  console.error(await evaluate('JSON.stringify({path:location.pathname,body:document.body.innerText.slice(-3000)})'), errors);
  throw error;
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
