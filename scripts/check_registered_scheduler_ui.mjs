// Fixture-only checks. Local Vite :5179 + isolated Edge CDP :9227; external traffic blocked.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let serial = 0;
const pending = new Map(), errors = [];
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
socket.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(new Error(JSON.stringify(m.error))) : p?.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') {
    const description = m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;
    // Managed browser extensions are outside the app and cannot reach the network in this harness.
    if (!description.includes('chrome-extension://')) errors.push(description);
  }
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, path = new URL(request.url).pathname;
  const reply = (body, status = 200) => send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || '*' },
  ], ...(status === 204 ? {} : { body: Buffer.from(JSON.stringify(body)).toString('base64') }) });
  if (request.method === 'OPTIONS') { void reply(null, 204); return; }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText.slice(-3500)') + '\n' + JSON.stringify(errors)); }
const button = text => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
const out = new URL('../artifacts/registered-scheduler-ui/', import.meta.url); await mkdir(out, { recursive: true });
async function shot(name) { const png = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(new URL(name + '.png', out), Buffer.from(png.data, 'base64')); }
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{
    const url=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';
    const {useStore}=await import(url);window.testStore=useStore;window.applies=[];window.failApply=false;
    const reg=shift=>({shift,confirmed:false,registered:true});
    const employees=[{id:'260716001',name:'An · Ca sáng',dept:'A',type:'STPT',isActive:true},{id:'260716002',name:'Bình · Ca chiều',dept:'A',type:'STPT',isActive:true},{id:'260716003',name:'Chưa đăng ký',dept:'A',type:'STFT',isActive:true}];
    const week={'260716001':{T2:reg('6-10'),T3:'off'},'260716002':{T2:reg('14-22')},'260716003':{T2:''}};
    window.fixtureWeek=structuredClone(week);
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},
      applyAiSchedule:async(...args)=>{if(window.failApply)throw new Error('Không lưu được lịch thử nghiệm');window.applies.push(args)},
      employees,stores:[{id:'A',name:'Cửa hàng thử nghiệm',staffing:{weekday:{'6-14':1,'14-22':1,'22-6':1},weekend:{'6-14':1,'14-22':1,'22-6':1}},demand:{weekday:{sales:10000000},weekend:{sales:10000000}}}],
      schedule:{'2026-10-12':week},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/schedule');dispatchEvent(new PopStateEvent('popstate'));
  })()`);
  await waitFor(button('Gợi ý xếp lịch')); await evaluate(`${button('Gợi ý xếp lịch')}.click()`);
  await waitFor("document.querySelector('[aria-labelledby=ai-scheduler-title]')");
  assert.equal(await evaluate("document.querySelector('[aria-labelledby=ai-scheduler-title]').textContent.includes('2 ca đăng ký')"), true);
  assert.equal(await evaluate("document.querySelector('[aria-labelledby=ai-scheduler-title] input[type=checkbox]')"), null);
  assert.equal(await evaluate("document.querySelector('[aria-labelledby=ai-scheduler-title] details').open"), false);
  await shot('desktop-start');
  await evaluate(`${button('Xếp lịch')}.click()`); await waitFor(button('Áp dụng 2 ca'));
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Các ca thiếu người\"]').textContent.includes('10-14')"), true);
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Các ca thiếu người\"]').textContent.includes('22-6')"), true);
  assert.deepEqual(await evaluate("window.testStore.getState().schedule['2026-10-12']"), await evaluate('window.fixtureWeek'));
  await shot('desktop-result');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(200);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await shot('mobile-result');
  // Save failure keeps the preview open; applying again carries only registered shifts.
  await evaluate(`window.failApply=true;${button('Áp dụng 2 ca')}.click()`); await waitFor("document.body.innerText.includes('Không lưu được lịch thử nghiệm')");
  assert.equal(await evaluate('window.applies.length'), 0);
  await evaluate(`window.failApply=false;${button('Áp dụng 2 ca')}.click()`); await waitFor("!document.querySelector('[aria-labelledby=ai-scheduler-title]')");
  const saved = await evaluate('window.applies[0]');
  assert.equal(saved[1]['260716001'].T2, '6-10'); assert.equal(saved[1]['260716002'].T2, '14-22');
  assert.equal(saved[1]['260716003'].T2, ''); assert.equal(saved[1]['260716001'].T3, 'off');
  assert.equal(saved[2], 'A'); assert.deepEqual(saved[3], await evaluate('window.fixtureWeek'));
  // Source edits invalidate results, so a stale preview cannot be applied.
  await evaluate(`${button('Gợi ý xếp lịch')}.click()`); await waitFor(button('Xếp lịch')); await evaluate(`${button('Xếp lịch')}.click()`); await waitFor(button('Áp dụng 2 ca'));
  await evaluate("window.testStore.setState({schedule:{'2026-10-12':{'260716001':{T2:'off'},'260716002':{},'260716003':{T2:''}}}})");
  await waitFor(`!${button('Áp dụng 2 ca')}`);
  await evaluate(`${button('Xếp lịch')}.click()`); await waitFor(button('Áp dụng 0 ca'));
  assert.equal(await evaluate(`${button('Áp dụng 0 ca')}.disabled`), true);
  await shot('mobile-empty');
  // Confirmed surplus and demand provenance remain readable on a narrow screen.
  await evaluate("window.testStore.setState({schedule:{'2026-10-12':{'260716001':{T2:'6-14'},'260716002':{T2:'6-14'},'260716003':{T2:'6-14'}}}})");
  await waitFor(`!${button('Áp dụng 0 ca')}`);
  await evaluate(`${button('Xếp lịch')}.click()`); await waitFor(button('Áp dụng 0 ca'));
  await waitFor("document.querySelector('[aria-label=\"Các ca dư người\"]')");
  await evaluate("document.querySelector('[aria-label=\"Các ca dư người\"]').open=true");
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Các ca dư người\"]').textContent.includes('Dư')"), true);
  assert.equal(await evaluate("document.querySelector('[aria-labelledby=ai-scheduler-title]').textContent.includes('tăng cường (doanh số/lượt khách)')"), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await shot('mobile-surplus');
  // Shared dialog closes on Escape and returns focus to its launch button.
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor("!document.querySelector('[aria-labelledby=ai-scheduler-title]')");
  assert.equal(await evaluate("document.activeElement.textContent.includes('Gợi ý xếp lịch')"), true);
  // The same demand form is used when editing stores, on desktop and mobile.
  await evaluate("history.pushState({},'','/admin/stores');dispatchEvent(new PopStateEvent('popstate'))");
  await waitFor("document.querySelector('button[title=\"Sửa\"]')");
  await evaluate("document.querySelector('button[title=\"Sửa\"]').click()");
  await waitFor("document.querySelector('[aria-label=\"Doanh số (đ) weekday\"]')");
  for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1000]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: device === 'mobile' }); await wait(200);
    await evaluate("document.querySelector('[aria-label=\"Doanh số (đ) weekday\"]').scrollIntoView({block:'center'})");
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await shot(device + '-store-demand');
  }
  assert.deepEqual(errors, []);
  console.log('PASS registered scheduler: desktop/mobile, shortage hours, no OFF/blank assignments, no premature writes, save failure/retry, stale-preview invalidation and no-registration state.');
} finally { socket.close(); await fetch('http://127.0.0.1:9227/json/close/' + target.id); }
