// Local fixture only: network writes and external requests are blocked.
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
    if (!description.includes('chrome-extension://')) errors.push(description);
  }
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, path = new URL(request.url).pathname;
  const reply = body => send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] || '*' },
  ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  if (request.method === 'OPTIONS') { void reply({}); return; }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + JSON.stringify(errors)+'\n'+await evaluate('location.pathname+document.body.innerText.slice(0,2000)')); }
const out = new URL('../artifacts/timesheet-ui/', import.meta.url); await mkdir(out, { recursive: true });
const region = `document.querySelector('[aria-label="Bảng chấm công theo ngày"]')`;
const edit = `document.querySelector('button[aria-label="Sửa công thực tế"]')`;
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';const {useStore}=await import(url);window.testStore=useStore;window.saved=[];
    const employees=Array.from({length:20},(_,i)=>({id:String(260716009+i),name:['Nguyễn Minh Anh','Trần Ngọc Bình','Lê Hoàng Nam'][i%3]+' '+(i+1),dept:'A',type:'STPT',role:'STPT',isActive:true}));
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},ensureWeeksLoaded:async()=>{},loadAttendanceRange:async()=>{},
      saveAttendanceCell:async(...args)=>{window.saved.push(args);useStore.setState(s=>({attendance:{...s.attendance,[args[0]+'|'+args[1]]:{actualHours:args[2],note:args[4]}}}));},
      employees,stores:[{id:'A',name:'Cửa hàng thử nghiệm'}],schedule:{'2026-10-12':Object.fromEntries(employees.map(e=>[e.id,{T2:'6-14',T3:'off',T4:'14-22',T5:'6-14',T6:'off',T7:'6-14',CN:'14-22'}]))},
      attendance:{'260716009|2026-10-12':{actualHours:7.84},'260716010|2026-10-12':{actualHours:0}},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/timesheet');dispatchEvent(new PopStateEvent('popstate'));})()`);
  await waitFor(region);
  assert.equal(await evaluate("document.querySelector('thead').textContent.includes('Lương')"), false);
  assert.equal(await evaluate("document.querySelector('summary').parentElement.open"), false);
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'}); await wait(250);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Page overflows horizontally');
    // Scroll within the month to the days with fixture schedules; keep names visible.
    await evaluate(`${region}.scrollLeft=1152;${region}.scrollTop=0`); await wait(100);
    const geometry=await evaluate(`(()=>{const r=${region}.getBoundingClientRect(),n=document.querySelector('tbody th[scope=row]').getBoundingClientRect();return {left:n.left,container:r.left,height:r.height,width:r.width};})()`);
    assert.ok(Math.abs(geometry.left-geometry.container)<2,'Employee name is not sticky');
    assert.ok(geometry.height>180,'Table viewport too short');
    let png=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(device+'.png',out),Buffer.from(png.data,'base64'));
    await evaluate(`${edit}.click()`);await waitFor("document.querySelector('input[aria-label^="+'"Công thực tế"'+"]')");
    const input=`document.querySelector('input[aria-label="Công thực tế 260716009 ngày T2 12/10"]')`;
    assert.equal(await evaluate(`${input}.value`),'7.84');
    await evaluate(`${region}.scrollLeft=1152`);await wait(100);
    png=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(device+'-edit.png',out),Buffer.from(png.data,'base64'));
    await evaluate(`${edit}.click()`); await wait(100);
  }
  // Exact-date save remains intact, with a local fake action only.
  await evaluate(`${edit}.click()`);await waitFor("document.querySelector('input[aria-label^="+'"Công thực tế"'+"]')");
  await evaluate(`document.querySelector('input[aria-label="Công thực tế 260716009 ngày T2 12/10"]').focus()`);await wait(100);
  await evaluate('document.activeElement.select()');await send('Input.insertText',{text:'6,5'});await wait(100);
  await evaluate('document.activeElement.blur()');await waitFor('window.saved.length===1');
  assert.deepEqual(await evaluate('window.saved[0]'),['260716009','2026-10-12',6.5,'admin','']);
  await evaluate("window.testStore.setState({user:{id:'260716009',name:'Nguyễn Minh Anh 1',dept:'A',type:'STPT',role:'employee',loginAt:Date.now()}});");
  await waitFor("location.pathname==='/employee/home'");
  await evaluate("history.pushState({},'','/employee/timesheet');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor(region);
  assert.equal(await evaluate("document.querySelectorAll('tbody th[scope=row]').length"),1,'Employee view leaks other employees');
  assert.equal(await evaluate(edit),null);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  assert.deepEqual(errors,[]);
  console.log('PASS timesheet desktop/mobile: compact columns, sticky names, usable viewport, edit dates/values, exact-date save, employee scope.');
} finally {socket.close();await fetch('http://127.0.0.1:9227/json/close/'+target.id);}
