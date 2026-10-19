// Fixture-only browser check: Vite :5179, isolated headless Edge CDP :9227.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const target=await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let serial=0,writeCount=0,failWrite=false;const pending=new Map(),errors=[];
let profile={id:1,app_name:'Lịch Ca',organization_name:'',primary_color:'#4338ca',contact_email:'',logo_data_url:'',revision:1};
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
socket.addEventListener('message',({data})=>{
  const m=JSON.parse(data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(new Error(JSON.stringify(m.error))):p?.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown'){
    const detail=m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text;
    if(!detail.includes('chrome-extension://'))errors.push(detail);
  }
  if(m.method==='Fetch.requestPaused'){
    const {requestId,request}=m.params;const path=new URL(request.url).pathname;
    const reply=(body,responseCode=200)=>send('Fetch.fulfillRequest',{requestId,responseCode,responseHeaders:[
      {name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},
      {name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'},
      {name:'Access-Control-Allow-Headers',value:request.headers['Access-Control-Request-Headers']||request.headers['access-control-request-headers']||'*'},
    ],...(responseCode===204?{}:{body:Buffer.from(JSON.stringify(body)).toString('base64')})});
    if(request.method==='OPTIONS'){void reply(null,204);return;}
    if(path==='/rest/v1/workspace_branding'){void reply(profile);return;}
    if(path==='/rest/v1/rpc/save_workspace_branding'){
      writeCount++;const b=JSON.parse(request.postData);
      if(failWrite){void reply({message:'offline'},503);return;}
      if(b.p_revision!==profile.revision){void reply({message:'BRANDING_CONFLICT',code:'40001'},409);return;}
      profile={...profile,app_name:b.p_app_name,organization_name:b.p_organization_name,primary_color:b.p_primary_color,contact_email:b.p_contact_email,logo_data_url:b.p_logo_data_url,revision:profile.revision+1};
      void reply(profile);return;
    }
    if(path.startsWith('/rest/v1/')){void reply([]);return;}
    const local=request.url.startsWith('http://127.0.0.1:5179/')||request.url.startsWith('data:')||request.url.startsWith('blob:');
    void send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId}:{requestId,errorReason:'BlockedByClient'});
  }
});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(expression){for(let i=0;i<120;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw new Error('Timed out: '+expression);}
const button=label=>`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})`;
const field=label=>`[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('input,select')`;
async function setField(label,value){await evaluate(`(()=>{const e=${field(label)};const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await wait(50);}
const out=new URL('../artifacts/workspace-ui/',import.meta.url);await mkdir(out,{recursive:true});
try{
  await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear();sessionStorage.clear();'});
  await send('Page.navigate',{url:'http://127.0.0.1:5179/login'});await waitFor("document.querySelector('input[type=password]')");
  await evaluate(`(async()=>{
    const storeUrl=performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/store/useStore.js').at(-1)?.name || '/src/store/useStore.js';
    const {useStore}=await import(storeUrl);window.testStore=useStore;
    useStore.setState({initializeData:async()=>{},initRealtime:()=>{},isInitializing:false,appendAdminLog:async()=>{},
      employees:[],stores:[],schedule:{},scheduleWeeks:{},feedbacks:[],shiftSwaps:[],shelves:[],shelfItems:[],
      authWarning:null,currentWeek:'2026-10-12',user:{id:'admin',role:'admin',name:'Admin test',loginAt:Date.now()}});
    history.pushState({},'','/admin/settings');dispatchEvent(new PopStateEvent('popstate'));
  })()`);
  await waitFor("document.querySelector('h1')?.textContent==='Cài đặt đơn vị' && !document.querySelector('fieldset').disabled");
  assert.equal(await evaluate("document.querySelector('main').clientWidth-document.querySelector('[data-workspace-settings]').getBoundingClientRect().width<2"),true,'Settings should fill the content area');
  await evaluate(`${button('Cách sử dụng')}.click()`);await waitFor("document.querySelector('#workspace-guide')?.textContent.includes('Thiết lập theo 3 bước')");
  await evaluate(`${button('Đóng hướng dẫn')}.click()`);
  await setField('Tên ứng dụng','Cửa hàng thử nghiệm');await setField('Tên đơn vị','Đơn vị kiểm thử');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-settings-save-bar]')).position"),'sticky');
  assert.equal(await evaluate("(()=>{const r=document.querySelector('[data-settings-save-bar]').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0;})()"),true,'Unsaved save bar must be visible');
  await evaluate("document.querySelector('input[name=\"brand-color\"][value=\"#047857\"]').click()");await setField('Email liên hệ công khai','help@example.com');
  const doc=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type=file]'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[fileURLToPath(new URL('../frontend/public/icon-192.png',import.meta.url))]});
  await waitFor("document.querySelector('img[alt=\"Logo xem trước\"]') && !document.querySelector('fieldset').disabled");
  assert.equal(await evaluate('window.testStore.getState().workspaceBranding.appName'),'Lịch Ca');
  await evaluate(`${button('Trang đăng nhập')}.click()`);await waitFor("document.querySelector('[aria-label=\"Xem trước nhận diện\"]')?.textContent.includes('help@example.com')");
  await evaluate(`${button('Trong ứng dụng')}.click()`);
  await evaluate(`${button('Lưu cài đặt')}.click()`);await waitFor("document.body.innerText.includes('Đã lưu cài đặt đơn vị.')");
  assert.equal(writeCount,1);assert.equal(profile.revision,2);assert.ok(profile.logo_data_url.startsWith('data:image/png;base64,'));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-settings-save-bar]')).position"),'static');
  assert.equal(await evaluate('document.title'),'Cửa hàng thử nghiệm — Xếp lịch & Chấm công');
  for(const[device,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});await wait(200);
    await evaluate("document.querySelector('main').scrollTop=0");
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    if(device==='mobile'){
      await evaluate("document.querySelector('button[aria-label=\"Xem trước nhận diện\"]').click()");
      assert.equal(await evaluate("document.querySelector('button[aria-label=\"Xem trước nhận diện\"]').getAttribute('aria-expanded')"),'true');
      await evaluate("document.querySelector('button[aria-label=\"Xem trước nhận diện\"]').click()");
    }
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(new URL(device+'-settings.png',out),Buffer.from(shot.data,'base64'));
    if(device==='mobile'){
      await evaluate("document.querySelectorAll('details')[0].open=true;document.querySelector('#workspace-contact').scrollIntoView({block:'center'})");
      const details=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('mobile-settings-help.png',out),Buffer.from(details.data,'base64'));
    }
  }
  // Intermediate widths must not squeeze the form/preview or overflow the tabs.
  for(const width of [1920,1280,1024,768,640]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await wait(100);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`No horizontal overflow at ${width}`);
    assert.equal(await evaluate("document.querySelector('main').clientWidth-document.querySelector('[data-workspace-settings]').getBoundingClientRect().width<2"),true);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(100);
  // Server conflict must retain unsaved input and committed shared identity.
  profile={...profile,revision:3};await setField('Tên ứng dụng','Bản chưa lưu');await evaluate(`${button('Lưu cài đặt')}.click()`);
  await waitFor("document.body.innerText.includes('Cài đặt đã được thay đổi ở nơi khác')");
  assert.equal(await evaluate(`${field('Tên ứng dụng')}.value`),'Bản chưa lưu');
  assert.equal(await evaluate('window.testStore.getState().workspaceBranding.appName'),'Cửa hàng thử nghiệm');
  await evaluate(`${button('Bỏ thay đổi và tải lại')}.click()`);await waitFor("window.testStore.getState().workspaceBranding.revision===3");
  failWrite=true;await setField('Tên ứng dụng','Thử mất mạng');await evaluate(`${button('Lưu cài đặt')}.click()`);
  await waitFor("document.body.innerText.includes('Không lưu được cài đặt')");assert.equal(await evaluate('window.testStore.getState().workspaceBranding.appName'),'Cửa hàng thử nghiệm');
  assert.equal(await evaluate("document.querySelector('[data-settings-save-bar]').getBoundingClientRect().bottom<=innerHeight-64"),true,'Mobile save bar clears bottom navigation');
  // Reverting a field to its saved value clears the unsaved state.
  await setField('Tên ứng dụng','Cửa hàng thử nghiệm');assert.equal(await evaluate(`${button('Lưu cài đặt')}.disabled`),true);
  // Role switch: settings link absent, direct route denied, no extra write.
  const beforeWrites=writeCount;
  await evaluate("window.testStore.setState({user:{id:'nv',role:'employee',dept:'A',name:'NV test',loginAt:Date.now()}});history.pushState({},'','/admin/settings');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("location.pathname==='/employee/home'");assert.equal(await evaluate("!!document.querySelector('a[href$=\"/admin/settings\"]')"),false);assert.equal(writeCount,beforeWrites);
  await evaluate("window.testStore.setState({user:null});history.pushState({},'','/login');dispatchEvent(new PopStateEvent('popstate'));");
  await waitFor("document.querySelector('a[href=\"mailto:help@example.com\"]')");
  assert.ok(await evaluate("document.body.innerText.includes('Đơn vị kiểm thử')"));
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('mobile-login.png',out),Buffer.from(shot.data,'base64'));
  assert.deepEqual(errors,[]);console.log('PASS workspace settings: desktop/mobile, logo, preview/commit, conflict, failure, staff route guard and login branding.');
}finally{socket.close();await fetch(`http://127.0.0.1:9227/json/close/${target.id}`);}
