// Local Vite :5179 + isolated Edge :9227; block all external requests.
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
    const description = message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text;
    if (!description.includes('chrome-extension://')) errors.push(description);
  }
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    const local = request.url.startsWith('http://127.0.0.1:5179/');
    void send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId } : { requestId, errorReason: 'BlockedByClient' });
  }
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out: ' + expression);
}
const out = new URL('../artifacts/admin-workflows-ui/', import.meta.url);
await mkdir(out, { recursive: true });
async function go(path, selector) {
  await evaluate(`history.pushState({}, '', ${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'));`);
  await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
}
async function fill(selector, value) {
  await evaluate(`(async () => {const el=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input',{bubbles:true}));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
}
async function click(text) {
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
}
async function screenshot(name) {
  await new Promise(resolve => setTimeout(resolve, 250));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(`${name}.png`, out), Buffer.from(shot.data, 'base64'));
}
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.bringToFront');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' });
  await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async () => {
    const { useStore } = await import('/src/store/useStore.js'); window.testStore=useStore; window.writes=[]; window.loadedWeeks=[];
    const { supabase }=await import('/src/lib/supabase.js');
    supabase.auth.getSession=async()=>({data:{session:{access_token:'fixture'}}});
    supabase.rpc=async()=>({data:[],error:null});
    supabase.from=()=>{const q={then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};
      for(const method of ['select','eq','in','gte','lte','order','limit','maybeSingle'])q[method]=()=>q;return q;};
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,authWarning:null,
      user:{id:'admin',role:'admin',name:'Admin kiểm thử',loginAt:Date.now()},
      employees:[{id:'260000001',name:'Nhân viên kiểm thử',dept:'A',role:'STPT',type:'STPT',isActive:true}],
      stores:[{id:'A',name:'Cửa hàng A',is_active:true},{id:'B',name:'Cửa hàng B',is_active:true}],
      currentWeek:'2026-09-28',schedule:{'2026-09-28':{'260000001':{T2:'6-14',T3:'off'}}},attendance:{},
      feedbacks:[{id:'f1',empId:'260000001',dept:'A',date:'30/09/2026',status:'pending',issue:'Công tháng trước'},
        {id:'f2',empId:'260000001',dept:'A',date:'2026-10-01',status:'approved',issue:'Công đầu tháng'}],
      shiftSwaps:[],shelves:[],shelfItems:[],scheduleWeeks:{},
      ensureWeeksLoaded:async weeks=>{window.loadedWeeks.push(...weeks);},
      setCurrentWeek:async week=>useStore.setState({currentWeek:week}),loadAttendanceRange:async()=>{},
      saveAttendanceCell:async(emp,date,hours,by,note)=>{window.writes.push({emp,date,hours,by,note});useStore.setState(s=>({attendance:{...s.attendance,[emp+'|'+date]:{actualHours:hours,note}}}));}
    });
  })()`);
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await go('/admin/feedback','[aria-label="Bù công từ ngày"]');
    await fill('[aria-label="Bù công từ ngày"]','2026-10-01');
    await fill('[aria-label="Bù công đến ngày"]','2026-10-01');
    await waitFor("!document.body.innerText.includes('Công tháng trước') && document.body.innerText.includes('Công đầu tháng')");
    await screenshot(`${device}-feedback`);
    await click('Bỏ lọc ngày');
    await waitFor("document.body.innerText.includes('Công tháng trước')");
    await evaluate("window.testStore.setState({currentWeek:'2026-09-28'})");
    await go('/admin/timesheet','[aria-label="Sửa công thực tế"]');
    await click('Sửa công thực tế');
    const input='[aria-label="Công thực tế 260000001 ngày T2 28/09"]';
    await waitFor(`document.querySelector(${JSON.stringify(input)})`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(input)}).placeholder`),'8');
    await evaluate(`document.querySelector(${JSON.stringify(input)}).focus()`);
    await waitFor(`document.activeElement===document.querySelector(${JSON.stringify(input)})`);
    await evaluate(`document.querySelector(${JSON.stringify(input)}).select()`);
    await send('Input.insertText',{text:'7,84'});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await waitFor("window.testStore.getState().attendance['260000001|2026-09-28']?.actualHours===7.84");
    await screenshot(`${device}-timesheet`);
    await go('/admin/dashboard','[aria-label="Kỳ công Dashboard"]');
    await fill('[aria-label="Kỳ công Dashboard"]','2026-08');
    await click('Tuần (T2-CN)');
    await waitFor("document.querySelector('[aria-label=\"Tuần Dashboard\"]')?.value==='2026-07-20'");
    assert.ok(await evaluate("window.loadedWeeks.includes('2026-07-20')"));
    await click('Tháng (26-25)');
    await waitFor("document.querySelector('[aria-label=\"Kỳ công Dashboard\"]')?.value==='2026-08'");
    await click('Tuần (T2-CN)');
    await waitFor("document.querySelector('[aria-label=\"Tuần Dashboard\"]') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Tuần (T2-CN)' && b.getAttribute('aria-pressed')==='true')");
    await screenshot(`${device}-dashboard`);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`${device} dashboard must fit viewport`);
  }
  await evaluate("window.testStore.setState({user:{id:'260000001',name:'Nhân viên kiểm thử',role:'employee',type:'STPT',dept:'A',loginAt:Date.now()},currentWeek:'2026-09-28'})");
  await go('/employee/timesheet','[title="In bảng công"]');
  assert.equal(await evaluate("document.querySelectorAll('table input').length"),0);
  await screenshot('mobile-employee-timesheet');
  assert.ok((await evaluate('window.writes')).every(w=>w.date==='2026-09-28' && w.hours===7.84));
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile feedback date filters, actual attendance edits, Dashboard period navigation, and employee read-only timesheet. External requests blocked.');
} catch(error) {
  await screenshot('failure'); console.error(await evaluate('JSON.stringify({writes:window.writes,text:document.body.innerText.slice(-1800)})'),errors); throw error;
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
