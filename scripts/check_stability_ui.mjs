// Local UI smoke test with synthetic store data. All non-local requests blocked.
// Start Vite on 5179 and an isolated headless Edge with CDP on 9227 first.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const target = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method:'PUT' }).then(r=>r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open',resolve,{once:true}));
let serial=0;
const pending=new Map();
const errors=[];
socket.addEventListener('message', ({data}) => {
  const message=JSON.parse(data);
  if (message.id) {
    const task=pending.get(message.id); pending.delete(message.id);
    if (message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result);
  }
  if (message.method==='Runtime.exceptionThrown') {
    const detail=message.params.exceptionDetails;
    const description=detail.exception?.description||'';
    // Machine-installed extensions are outside the app under test.
    if (!description.includes('chrome-extension://')) errors.push(detail.text+': '+description);
  }
  if (message.method==='Fetch.requestPaused') {
    const {requestId,request}=message.params;
    const local=/^https?:\/\/127\.0\.0\.1:5179\//.test(request.url);
    void send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId}:{requestId,errorReason:'BlockedByClient'});
  }
});
function send(method,params={}) {
  const id=++serial;
  return new Promise((resolve,reject) => { pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
}
async function evaluate(expression) {
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(expression) {
  for (let i=0;i<150;i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); }
  throw new Error('UI condition timed out: '+expression+'; '+await evaluate('document.body?.innerText?.slice(0,500)'));
}
const out=new URL('../artifacts/stability-ui/',import.meta.url);
await mkdir(out,{recursive:true});
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:5179',storageTypes:'service_workers,cache_storage'});
  await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear();sessionStorage.clear();'});
  await send('Page.navigate',{url:'http://127.0.0.1:5179/login'});
  await waitFor("document.querySelector('input[type=password]')");
  assert.equal(await evaluate('navigator.serviceWorker.getRegistrations().then(rows=>rows.length)'),0);
  for (const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
    await wait(200);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(`login-${name}.png`,out),Buffer.from(shot.data,'base64'));
  }
  await evaluate(`(async()=>{
    // Vite app imports can carry an HMR timestamp; use that exact module instance.
    const storeUrl=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname==='/src/store/useStore.js')?.name || '/src/store/useStore.js';
    const {useStore}=await import(storeUrl); window.testStore=useStore;
    const employee={id:'100000002',name:'Nhân viên kiểm thử',dept:'VN0485',type:'STFT',role:'STFT',isActive:true};
    const {getPayrollCycleDates}=await import('/src/utils/dateHelper.js');
    const dates=getPayrollCycleDates(2026,9), schedule={};
    for(const day of dates) { schedule[day.weekKey]??={}; schedule[day.weekKey][employee.id]??={}; schedule[day.weekKey][employee.id][day.dayKey]=''; }
    schedule['2026-09-21'][employee.id]={T2:'6-14',T3:'off',T4:'',T5:'14-22',T6:'',T7:'',CN:''};
    useStore.setState({user:{id:'admin',role:'admin',name:'Quản trị kiểm thử',loginAt:Date.now()},employees:[employee],
      stores:[{id:'VN0485',name:'Cửa hàng kiểm thử',isActive:true}],schedule,currentWeek:'2026-09-21',
      attendance:{'100000002|2026-09-21':{actualHours:0,note:''}},initializeData:async()=>{},
      ensureWeeksLoaded:async()=>{},loadAttendanceRange:async()=>{},initRealtime:()=>{},appendAdminLog:async()=>{},
      saveAttendanceCell:async(id,date,hours,by,note)=>{const attendance={...useStore.getState().attendance};if(hours==null&&!note)delete attendance[id+'|'+date];else attendance[id+'|'+date]={actualHours:hours??0,note};useStore.setState({attendance});},
      feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],scheduleWeeks:{},isInitializing:false,authWarning:null,realtimeStatus:'connected'});
  })()`);
  for (const role of ['admin','employee']) {
    if(role==='employee') await evaluate("testStore.setState({user:{id:'100000002',role:'employee',name:'Nhân viên kiểm thử',dept:'VN0485',type:'STFT',loginAt:Date.now()}})");
    for(const page of ['schedule','timesheet']) {
      await evaluate(`history.pushState({},'', '/${role}/${page}');window.dispatchEvent(new PopStateEvent('popstate'));`);
      await waitFor("document.body.innerText.includes('Nhân viên kiểm thử') && !document.body.innerText.includes('Đang tải trang...')");
      await wait(350);
      for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'}); await wait(200);
        assert.equal(await evaluate("document.body.innerText.includes('Đã có lỗi hiển thị giao diện')"),false);
        const shot=await send('Page.captureScreenshot',{format:'png'});
        await writeFile(new URL(`${role}-${page}-${name}.png`,out),Buffer.from(shot.data,'base64'));
        console.log('RENDER',role,page,name);
      }
      if(page==='timesheet') {
        assert.ok(await evaluate(`document.querySelectorAll("tbody tr:last-child td").length > 30`));
        assert.ok(await evaluate(`document.querySelectorAll('[title^="Công thực tế: 0h"]').length > 0`));
        assert.ok(await evaluate(`document.querySelectorAll('[title="Lịch xếp: OFF"]').length > 0`));
        assert.ok(await evaluate(`document.querySelectorAll('[title="Chưa xếp ca"]').length > 0`));
        const before=await evaluate('testStore.getState().currentWeek');
        await evaluate("document.querySelector('button[title=\"Tháng sau\"]').click()"); await wait(100);
        assert.equal(await evaluate('testStore.getState().currentWeek'),before);
        console.log('PASS month navigation preserves schedule week:',role);
      }
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS no uncaught browser exceptions. Screenshots:',out.pathname);
} finally {
  await send('Page.close').catch(()=>{});
  socket.close();
}
