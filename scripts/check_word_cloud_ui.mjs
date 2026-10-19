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
  if (path === '/rest/v1/admin_logs') {
    assert.equal(request.method, 'GET');
    void reply(Array.from({ length: 12 }, (_, i) => ({ id: String(i), action: 'AI_QUERY', actor_id: '260716009', actor_name: 'Nhân viên thử nghiệm', target: 'A', detail: i < 2 ? 'Lịch làm việc tuần này?' : 'Hủy cơm nắm lúc nào?', created_at: '2026-10-15T01:00:00Z' }))); return;
  }
  if (path === '/rest/v1/workspace_branding') { void reply({ app_name: 'Lịch Ca', primary_color: '#4338ca', revision: 1 }); return; }
  if (path.startsWith('/rest/v1/')) { void reply([]); return; }
  const local = request.url.startsWith('http://127.0.0.1:5179/') || request.url.startsWith('data:') || request.url.startsWith('blob:');
  void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
});
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); } throw new Error('Timed out: ' + expression + '\n' + JSON.stringify(errors)); }
const out = new URL('../artifacts/word-cloud-ui/', import.meta.url); await mkdir(out, { recursive: true });
const canvas = `document.querySelector('canvas[aria-label^="Đám mây"]')`;
const search = `document.querySelector('input[aria-label="Tìm nội dung câu hỏi"]')`;
async function clickAt(point) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.clear();sessionStorage.clear();window.cloudStarts=0;window.cloudStops=0;document.addEventListener('wordcloudstart',()=>window.cloudStarts++,true);document.addEventListener('wordcloudstop',()=>window.cloudStops++,true);` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' }); await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';const {useStore}=await import(url);
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},employees:[],stores:[{id:'A',name:'Cửa hàng thử nghiệm'}],schedule:{'2026-10-12':{}},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/dashboard');dispatchEvent(new PopStateEvent('popstate'));})()`);
  await waitFor("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Quản Trị Trợ Lý AI'))");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Quản Trị Trợ Lý AI')).click()");
  await waitFor(`${canvas} && window.cloudStops>0`);
  for (const [device, width, height] of [['desktop',1440,1000], ['mobile',390,844]]) {
    const stops = await evaluate('window.cloudStops');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: device === 'mobile' ? 2 : 1, mobile: device === 'mobile' });
    if (device === 'mobile') await waitFor(`window.cloudStops>${stops}`);
    await evaluate(`${canvas}.scrollIntoView({block:'center'})`); await wait(1200);
    const point = await evaluate(`(async()=>{const c=${canvas},r=c.getBoundingClientRect();const seen=new Set();for(let y=8;y<r.height;y+=12){for(let x=8;x<r.width;x+=12){c.dispatchEvent(new MouseEvent('mousemove',{clientX:r.left+x,clientY:r.top+y,bubbles:true}));await new Promise(resolve=>setTimeout(resolve,0));seen.add(document.querySelector('[role=tooltip] strong')?.textContent);if(document.querySelector('[role=tooltip] strong')?.textContent==='Lịch làm việc')return {x:r.left+x,y:r.top+y};}}throw new Error('No word hit '+JSON.stringify({seen:[...seen],width:r.width,height:r.height,starts:window.cloudStarts,stops:window.cloudStops}));})()`);
    const before = await evaluate(`({pixels:${canvas}.toDataURL(),top:${canvas}.getBoundingClientRect().top,width:${canvas}.getBoundingClientRect().width,starts:window.cloudStarts})`);
    assert.equal(await evaluate(`document.querySelector('[role=tooltip]').getBoundingClientRect().top >= ${canvas}.getBoundingClientRect().bottom`), true, 'Caption overlaps cloud words');
    await clickAt(point); await waitFor(`${search}.value==='Lịch làm việc'`); await wait(200);
    const after = await evaluate(`({pixels:${canvas}.toDataURL(),top:${canvas}.getBoundingClientRect().top,starts:window.cloudStarts,feed:document.querySelector('[aria-label="Kết quả lọc câu hỏi"]').textContent})`);
    assert.equal(after.pixels, before.pixels, 'Selection redrew/repositioned the cloud');
    assert.equal(after.starts, before.starts); assert.ok(Math.abs(after.top-before.top)<2, 'Scroll position jumped');
    assert.ok(after.feed.includes('Lịch làm việc tuần này?')); assert.ok(!after.feed.includes('Hủy cơm nắm lúc nào?'));
    await clickAt(point); await waitFor(`${search}.value===''`); await wait(150);
    assert.equal(await evaluate(`${canvas}.toDataURL()`), before.pixels);
    assert.ok(await evaluate(`document.querySelector('[aria-label="Kết quả lọc câu hỏi"]').textContent.includes('Hủy cơm nắm lúc nào?')`));
    const png=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(device+'.png',out),Buffer.from(png.data,'base64'));
    // A mobile viewport-height change must not redraw words at the same width.
    await send('Emulation.setDeviceMetricsOverride', { width, height: height-60, deviceScaleFactor: device === 'mobile' ? 2 : 1, mobile: device === 'mobile' }); await wait(200);
    assert.equal(await evaluate('window.cloudStarts'), before.starts);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  }
  assert.deepEqual(errors, []);
  console.log('PASS word cloud: real canvas clicks at DPR 1/2, correct filtering/toggle, unchanged pixels, no scroll jump, no height-only redraw, desktop/mobile.');
} finally { socket.close(); await fetch('http://127.0.0.1:9227/json/close/' + target.id); }
