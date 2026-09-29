// Local fixture-only browser checks. Vite :5179, isolated Edge CDP :9227.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let serial = 0;
const pending = new Map(), errors = [], requests = [];
const configurations = [];
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
    if (request.url.includes('/functions/v1/chat-proxy')) {
      if (request.method === 'OPTIONS') {
        void send('Fetch.fulfillRequest', {requestId,responseCode:204,responseHeaders:[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Methods',value:'POST,OPTIONS'},{name:'Access-Control-Allow-Headers',value:request.headers['Access-Control-Request-Headers'] || request.headers['access-control-request-headers'] || '*'}]});
        return;
      }
      const action = new URL(request.url).searchParams.get('action');
      if (['configure', 'config_status'].includes(action)) {
        if (action === 'configure') configurations.push(JSON.parse(request.postData));
        void send('Fetch.fulfillRequest', {requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify({configured:configurations.length > 0})).toString('base64')});
        return;
      }
      assert.equal(request.headers['x-gemini-api-key'], undefined);
      requests.push({url:request.url,body:JSON.parse(request.postData)});
      const reply = 'Buoc 1: Doc So tay.\nBuoc 2: Lam theo huong dan.\nBuoc 3: Xac nhan voi quan ly.';
      const data = 'data: ' + JSON.stringify({candidates:[{content:{parts:[{text:reply}]}}]}) + '\n\n';
      void send('Fetch.fulfillRequest', {requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/event-stream'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(data).toString('base64')});
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
const out = new URL('../artifacts/copilot-ui/', import.meta.url);
await mkdir(out, { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.clear();sessionStorage.clear();localStorage.setItem('gemini_model','gemini-2.0-flash-lite');" });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' });
  await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async () => {
    const resources = performance.getEntriesByType('resource');
    const storeUrl = resources.find(e => new URL(e.name).pathname === '/src/store/useStore.js')?.name || '/src/store/useStore.js';
    const { useStore } = await import(storeUrl); window.testStore = useStore;
    const dbUrl = resources.find(e => new URL(e.name).pathname === '/src/lib/supabase.js')?.name || '/src/lib/supabase.js';
    const { supabase } = await import(dbUrl);
    supabase.auth.getSession = async () => ({data:{session:{access_token:'fixture-session'}}});
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},logAiTurn:()=>{},
      employees:[],stores:[{id:'VN0485',name:'Cửa hàng thử'}],schedule:{},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],
      authWarning:null,currentWeek:'2026-09-28',user:{id:'admin',role:'admin',name:'Admin thử',loginAt:Date.now()}});
  })()`);
  await wait(100);
  await evaluate("history.pushState({}, '', '/admin/schedule'); dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Trợ lý AI')");
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Trợ lý AI').click()");
    await waitFor("document.querySelector('[title=\"Cài đặt AI\"]')");
    await evaluate("document.querySelector('[title=\"Cài đặt AI\"]').click()");
    await waitFor("document.querySelector('input[type=password]')");
    assert.equal(await evaluate("document.querySelectorAll('input[type=radio][name=gemini_model]').length"),0);
    assert.equal(await evaluate("/Gemini 2.0|Thinking|Mô hình AI/.test(document.body.innerText)"),false);
    let shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(`${device}-settings.png`,out),Buffer.from(shot.data,'base64'));
    await evaluate(`(() => { const input=document.querySelector('input[type=password]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'AIza'+'x'.repeat(35)); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await wait(100);
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Lưu cấu hình').click()");
    await waitFor("document.body.innerText.includes('Đã cấu hình cho toàn ứng dụng')");
    assert.equal(await evaluate("localStorage.getItem('gemini_api_key')"), null);
    await evaluate("document.querySelector('[title=\"Đóng cài đặt AI\"]').click()");
    await evaluate(`(() => { const input=document.querySelector('input[placeholder^="Hỏi lịch"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Nấu phần lẩu đó từng bước thế nào?'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await wait(100);
    await evaluate("document.querySelector('[title=\"Gửi câu hỏi\"]').click()");
    await waitFor("document.body.innerText.includes('Buoc 3:')");
    await wait(150);
    shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(`${device}-chat.png`,out),Buffer.from(shot.data,'base64'));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    await evaluate("document.querySelector('[title=\"Đóng trợ lý\"]').click()");
  }
  assert.equal(configurations.length,2);
  await evaluate("window.testStore.setState({user:{id:'260512001',role:'employee',dept:'VN0485',name:'NV thử',loginAt:Date.now()}});history.pushState({}, '', '/employee/home');dispatchEvent(new PopStateEvent('popstate'));");
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await waitFor("document.querySelector('[title=\"GS25 AI Copilot\"]')");
    await evaluate("document.querySelector('[title=\"GS25 AI Copilot\"]').click()");
    await waitFor("document.querySelector('input[placeholder^=\"Hỏi công thức\"]')");
    assert.equal(await evaluate("!!document.querySelector('[title=\"Cài đặt AI\"]')"),false);
    assert.equal(await evaluate("!!document.querySelector('input[type=password]')"),false);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(`${device}-employee.png`,out),Buffer.from(shot.data,'base64'));
    await evaluate("document.querySelector('[title=\"Đóng trợ lý\"]').click()");
  }
  assert.equal(requests.length,2);
  const {GS25_HANDBOOK_DATA}=await import('../frontend/src/data/gs25HandbookData.js');
  for (const request of requests) {
    assert.equal(new URL(request.url).searchParams.get('model'),'gemini-3.6-flash');
    assert.deepEqual(JSON.parse(request.body.systemInstruction.parts[0].text.split('SỔ TAY NGHIỆP VỤ GS25 — TOÀN BỘ NỘI DUNG:\n')[1]),GS25_HANDBOOK_DATA);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile admin shared configuration, employee settings hidden, streaming chat, full handbook and fixed model (mock provider).');
} catch (error) {
  console.error(await evaluate('document.body.innerText.slice(-1600)'),errors);
  throw error;
} finally {socket.close();await fetch(`http://127.0.0.1:9227/json/close/${target.id}`);}
