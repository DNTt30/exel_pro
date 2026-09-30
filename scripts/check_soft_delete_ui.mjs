// Local fixtures only: Vite :5179 and isolated Edge CDP :9227. No production writes.
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
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100); }
  throw new Error('Timed out: ' + expression);
}
const out = new URL('../artifacts/soft-delete-ui/', import.meta.url);
await mkdir(out, { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();sessionStorage.clear();' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5179/login' });
  await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async () => {
    const { useStore } = await import('/src/store/useStore.js'); window.testStore = useStore; window.writes = [];
    const { supabase } = await import('/src/lib/supabase.js');
    supabase.auth.getSession = async () => ({data:{session:{access_token:'fixture'}}});
    supabase.rpc = () => Promise.resolve({data:[],error:null});
    supabase.from = table => {
      let payload, id;
      const query = {update: value => {payload=value;return query;},eq: (field,value) => {if(field==='id')id=value;return query;},select: () => query,
        then: (resolve,reject) => {if(payload)window.writes.push({table,id,payload});return Promise.resolve({data:id?[{id}]:[],error:null}).then(resolve,reject);},
        delete: () => {throw new Error('Hard delete forbidden');}};
      return query;
    };
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:()=>{},authWarning:null,
      user:{id:'admin',role:'admin',name:'Admin thử',loginAt:Date.now()},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[]});
  })()`);
  for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await evaluate("window.testStore.setState({employees:[{id:'260512001',name:'NV kiểm thử',dept:'VN0485',role:'STFT',type:'STFT',isActive:true}],stores:[{id:'VN0485',name:'Cửa hàng kiểm thử',is_active:true}],schedule:{'2026-09-28':{'260512001':{T2:'6-14'}}},shelves:[{id:'shelf',storeId:'VN0485'}]});");
    for (const [page, collection, activeField, reopen] of [['employees','employees','isActive','Mở lại tài khoản'],['stores','stores','is_active','Mở lại hoạt động']]) {
      await evaluate(`history.pushState({}, '', '/admin/${page}');dispatchEvent(new PopStateEvent('popstate'));`);
      await waitFor(`document.querySelector('[title="${page === 'stores' ? 'Sửa' : 'Sửa thông tin'}"]')`);
      await waitFor("document.querySelector('[title=\"Ngưng hoạt động (giữ lịch sử)\"]')");
      await evaluate("document.querySelector('[title=\"Ngưng hoạt động (giữ lịch sử)\"]').click()");
      await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Xác nhận ngưng')");
      assert.equal(await evaluate("document.body.innerText.includes('xóa vĩnh viễn')"),false);
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Xác nhận ngưng').click()");
      await waitFor(`window.testStore.getState().${collection}[0].${activeField} === false`);
      assert.equal(await evaluate(`window.testStore.getState().${collection}.length`),1);
      assert.equal(await evaluate("window.testStore.getState().schedule['2026-09-28']['260512001'].T2"),'6-14');
      assert.equal(await evaluate('window.testStore.getState().shelves.length'),1);
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(new URL(`${device}-${page}.png`,out),Buffer.from(shot.data,'base64'));
      await evaluate(`document.querySelector('[title="${reopen}"]').click()`);
      await waitFor(`window.testStore.getState().${collection}[0].${activeField} === true`);
    }
  }
  const writes=await evaluate('window.writes');
  assert.equal(writes.length,8);
  assert.ok(writes.every(w=>['employees','stores'].includes(w.table) && Object.keys(w.payload).length===1 && typeof w.payload.is_active==='boolean'));
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile employee/store soft delete and restore; history and references retained; 8 UPDATEs, no DELETE.');
} catch(error) {
  console.error(await evaluate('document.body.innerText.slice(-1200)'),errors); throw error;
} finally { socket.close(); await fetch(`http://127.0.0.1:9227/json/close/${target.id}`); }
