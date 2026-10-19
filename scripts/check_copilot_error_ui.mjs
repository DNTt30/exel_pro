// Local fixture only: network writes and external requests are blocked.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let serial = 0, calls = 0;
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
  if (path === '/functions/v1/chat-proxy') {
    calls++;
    const failed = calls % 2 === 1;
    const data = failed ? JSON.stringify({error:'Google Gemini unavailable (503)'}) : 'data: '+JSON.stringify({candidates:[{content:{parts:[{text:'Fixture response recovered.'}]}}]})+'\n\n';
    void send('Fetch.fulfillRequest', {requestId,responseCode:failed?503:200,responseHeaders:[{name:'Access-Control-Allow-Origin',value:'*'},{name:'Content-Type',value:failed?'application/json':'text/event-stream'}],body:Buffer.from(data).toString('base64')});return;
  }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + JSON.stringify(errors)+'\n'+await evaluate('location.pathname+document.body.innerText.slice(0,2000)')); }
const out = new URL('../artifacts/copilot-error-ui/', import.meta.url); await mkdir(out,{recursive:true});
try {
  await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear();sessionStorage.clear();'});
  await send('Page.navigate',{url:'http://127.0.0.1:5179/login'});await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const resources=performance.getEntriesByType('resource');const storeUrl=resources.find(e=>new URL(e.name).pathname==='/src/store/useStore.js')?.name || '/src/store/useStore.js';const {useStore}=await import(storeUrl);
    const dbUrl=resources.find(e=>new URL(e.name).pathname==='/src/lib/supabase.js')?.name || '/src/lib/supabase.js';const {supabase}=await import(dbUrl);supabase.auth.getSession=async()=>({data:{session:{access_token:'fixture-session'}}});
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},logAiTurn:()=>{},employees:[],stores:[{id:'A',name:'A'}],schedule:{},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});})()`);
  await wait(100);await evaluate("history.pushState({},'','/admin/schedule');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("document.querySelector('button[title=\"Mở Trợ lý ảo TÚ mini AI\"]')");
  await evaluate("document.querySelector('button[title=\"Mở Trợ lý ảo TÚ mini AI\"]').click()");
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await wait(3100); // Respect the local send cooldown between deliberate questions.
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await waitFor("document.querySelector('input[placeholder^=\"Hỏi\"]')");
    await evaluate("document.querySelector('input[placeholder^=\"Hỏi\"]').focus()");await wait(100);
    await send('Input.insertText',{text:'Công thức nấu súp chả cá cay?'});await wait(100);
    await evaluate("document.querySelector('[title=\"Gửi câu hỏi\"]').click()");
    await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent==='Thử lại câu hỏi')");
    const count=calls;await wait(500);assert.equal(calls,count,'Unexpected automatic retry');
    assert.equal(await evaluate("document.body.innerText.includes('Gemini tạm thời không khả dụng (503)')"),true);
    assert.equal(await evaluate("document.querySelector('a[href$=\"employee/handbook\"]').textContent"),'Mở Sổ tay');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(device+'.png',out),Buffer.from(shot.data,'base64'));
    await wait(3100);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Thử lại câu hỏi').click()");
    // The previous successful answer can still be visible; wait for this request.
    for (let i=0;i<120 && calls<count+1;i++) await wait(100);
    await waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent==='Thử lại câu hỏi') && document.body.innerText.includes('Fixture response recovered.')");
    assert.equal(calls,count+1);
  }
  assert.equal(calls,4);assert.deepEqual(errors,[]);
  console.log('PASS copilot 503 desktop/mobile: concise error, explicit retry recovers, handbook link, no extra automatic calls.');
} finally {socket.close();await fetch('http://127.0.0.1:9227/json/close/'+target.id);}
