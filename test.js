
// ================================================================
// CONSTANTS
// ================================================================
const GKEY='AIzaSyC-TlDIeNmsDcPLh01B65sqKA60Q8W2E6c';
const DAYS=['T2','T3','T4','T5','T6','T7','CN'];
const DAYF=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const MA_RE=/^\d{9}$/;

// Shifts — enum, no free text
const SHIFTS=[
  {id:'off',   label:'OFF',    cls:'s-off',   h:0, color:'#f3f4f6'},
  {id:'6-14',  label:'6-14',   cls:'s-614',   h:8, color:'#dcfce7'},
  {id:'14-22', label:'14-22',  cls:'s-1422',  h:8, color:'#dbeafe'},
  {id:'22-6',  label:'22-6',   cls:'s-226',   h:8, color:'#f3e8ff'},
  {id:'6-10',  label:'6-10',   cls:'s-610',   h:4, color:'#d1fae5'},
  {id:'10-14', label:'10-14',  cls:'s-1014',  h:4, color:'#fef9c3'},
  {id:'14-18', label:'14-18',  cls:'s-1418',  h:4, color:'#ffedd5'},
  {id:'18-22', label:'18-22',  cls:'s-1822',  h:4, color:'#fee2e2'},
  {id:'6-12',  label:'6h-12h', cls:'s-612',   h:6, color:'#ccfbf1'},
  {id:'12-18', label:'12-18',  cls:'s-1218',  h:6, color:'#e0f2fe'},
];
const AVAIL_OPTS=[
  {id:'6-14', label:'6–14h (Ca sáng)', h:8},
  {id:'14-22',label:'14–22h (Ca chiều)',h:8},
  {id:'22-6', label:'22–6h (Ca đêm)',  h:8},
  {id:'6-10', label:'6–10h (Buổi sáng sớm)', h:4},
  {id:'10-14',label:'10–14h (Trưa)',  h:4},
  {id:'14-18',label:'14–18h (Chiều)', h:4},
  {id:'18-22',label:'18–22h (Tối)',   h:4},
  {id:'off',  label:'Không rảnh hôm này', h:0},
];
const ETYPES={STPT:{bg:'#dbeafe',c:'#1e40af'},FTPT:{bg:'#f3e8ff',c:'#6b21a8'},CSR_NEW:{bg:'#fee2e2',c:'#991b1b'},Support:{bg:'#fef9c3',c:'#854d0e'},Training:{bg:'#d1fae5',c:'#065f46'}};
const DL_HR=12; // Friday noon deadline
function gs(id){return SHIFTS.find(s=>s.id===id)||{id:'unset',label:'Chưa xếp',cls:'s-unset',h:0,color:'#fff'};}

// ================================================================
// STATE
// ================================================================
let S={
  role:null,empId:null,
  employees:[],
  availability:{}, // {empId:{T2:['6-14','14-22'],T3:['off'],...}}
  schedule:{},     // {empId:{T2:'6-14',...}} — final assigned by admin
  requirements:{}, // {dept:{T2:{'6-14':3,'14-22':2},...}}
  transfers:[],    // [{id, empId, fromDept, toDept, days, shId, note}]
  weekOffset:0,
  activeDept:'all',
  published:false, // has admin published this week's schedule?
  auditLog:[],
};

const DEFAULT_EMP=[
  {id:'260512008',name:'Nguyễn Ngô Việt Hưng', dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260508026',name:'Nguyễn Việt Bách',      dept:'VN0485',type:'STPT',    maxH:48},
  {id:'250729066',name:'Nguyễn Thị Đào',        dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260626006',name:'Nguyễn Thị Tuyết Chinh',dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260715006',name:'Lê Thanh Huyền',        dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260716009',name:'Dương Ngọc Tú',         dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260716010',name:'Nguyễn Phúc Đức',       dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260716026',name:'Trần Thu Hiền',         dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260728021',name:'Đặng Minh Đức',         dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260806011',name:'Vũ Văn Phúc',           dept:'VN0485',type:'STPT',    maxH:48},
  {id:'260806018',name:'Phan Cao Tùng',         dept:'VN0485',type:'CSR_NEW', maxH:48},
  {id:'260808021',name:'Nguyễn Vũ Thanh Bình',  dept:'VN0470',type:'Support', maxH:48},
  {id:'260225006',name:'Vũ Thị Kim Vương',      dept:'VN0497',type:'STPT',    maxH:48},
  {id:'250829022',name:'Nguyễn Thế Vinh',       dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260312011',name:'Trần Hữu Duy',          dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260522010',name:'Trần Hải Anh',          dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260520021',name:'Lê Bùi Nguyễn Hưng',   dept:'VN0497',type:'Training',maxH:48},
  {id:'260714021',name:'Trần Bảo Hoàng',        dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260721012',name:'Nguyễn Công Đô',        dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260721017',name:'Bùi Thị Hà Thư',        dept:'VN0497',type:'STPT',    maxH:48},
  {id:'260723005',name:'Phạm Tiến Minh',        dept:'VN0497',type:'CSR_NEW', maxH:48},
  {id:'260619006',name:'Nguyễn Trà My',         dept:'VN0497',type:'STPT',    maxH:48},
  {id:'250826005',name:'Lê Ngọc Dung',          dept:'VN0500',type:'STPT',    maxH:48},
  {id:'250910016',name:'Mai Thị Phương Thủy',   dept:'VN0500',type:'STPT',    maxH:48},
  {id:'251030015',name:'Lê Vũ Phương Linh',     dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260602010',name:'Quách Thị Phương Linh', dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260603050',name:'Vũ Thị Hằng',           dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260612008',name:'Hoàng Thị Ngọc Diệp',   dept:'VN0500',type:'Training',maxH:48},
  {id:'260415020',name:'Mộng Anh Tú',           dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260421012',name:'Lê Thị Thanh Tuyền',    dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260602009',name:'Trần Thị Sự',           dept:'VN0500',type:'FTPT',    maxH:32},
  {id:'260411011',name:'Trần Tiến Lương',       dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260616013',name:'Lê Thị Linh',           dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260618015',name:'Nguyễn Minh Tâm',       dept:'VN0500',type:'CSR_NEW', maxH:48},
  {id:'260710011',name:'Nguyễn Việt Huy',       dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260710021',name:'Nguyễn Việt Thành',     dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260618023',name:'Đoàn Thanh Ngân',       dept:'VN0500',type:'Support', maxH:48},
  {id:'260730056',name:'Trần Thu Trang',        dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260807061',name:'Bùi An Thùy Tiên',      dept:'VN0500',type:'STPT',    maxH:48},
  {id:'260811014',name:'Phùng Thị Ý Bình',     dept:'VN0500',type:'STPT',    maxH:48},
];

function sv(){try{localStorage.setItem('smvc4',JSON.stringify({employees:S.employees,availability:S.availability,schedule:S.schedule,requirements:S.requirements,transfers:S.transfers,weekOffset:S.weekOffset,published:S.published,auditLog:S.auditLog.slice(-300)}));}catch(e){}}
function ld(){
  try{
    const d=JSON.parse(localStorage.getItem('smvc4')||'{}');
    S.employees=d.employees&&d.employees.length?d.employees:DEFAULT_EMP;
    S.availability=d.availability||{};
    S.schedule=d.schedule||{};
    S.requirements=d.requirements||{};
    S.transfers=d.transfers||[];
    S.weekOffset=d.weekOffset||0;
    S.published=d.published||false;
    S.auditLog=d.auditLog||[];
  }catch(e){S.employees=DEFAULT_EMP;}
}

// ================================================================
// WEEK
// ================================================================
function wkDates(){const n=new Date(),dy=n.getDay(),m=new Date(n);m.setDate(n.getDate()-(dy===0?6:dy-1)+S.weekOffset*7);return DAYS.map((_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d;});}
function fmt(d){return `${d.getDate()}/${d.getMonth()+1}`;}
function fmtF(d){return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}
function isToday(d){return d.toDateString()===new Date().toDateString();}
function wkName(ds){return `Tuần ${fmt(ds[0])} – ${fmt(ds[6])}/${ds[6].getFullYear()}`;}
function cw(delta){S.weekOffset+=delta;sv();renderWkLbl();renderContent();}
function renderWkLbl(){document.getElementById('wklbl').textContent=wkName(wkDates());}

// ================================================================
// TABS
// ================================================================
let activeTab='avail';
const ADMIN_TABS=[
  {id:'avail',label:'📊 Lịch rảnh đăng ký'},
  {id:'schedule',label:'📅 Xếp lịch AI'},
  {id:'requirements',label:'⚙️ Yêu cầu nhân sự'},
];
const EMP_TABS=[
  {id:'my-avail',label:'🟢 Lịch rảnh của tôi'},
  {id:'my-schedule',label:'📅 Lịch làm việc'},
];

function renderTabs(){
  const tabs=S.role==='admin'?ADMIN_TABS:EMP_TABS;
  document.getElementById('main-tabs').innerHTML=tabs.map(t=>`
    <div class="mtab${t.id===activeTab?' active':''}" onclick="setTab('${t.id}')">${t.label}</div>`).join('');
}
function setTab(id){activeTab=id;renderTabs();renderContent();}

function renderContent(){
  const map={
    'avail':renderAvailView,
    'schedule':renderScheduleView,
    'requirements':renderRequirements,
    'my-avail':renderMyAvail,
    'my-schedule':renderMySchedule,
  };
  (map[activeTab]||renderAvailView)();
}

// ================================================================
// TAB: AVAILABILITY OVERVIEW (Admin)
// ================================================================
function renderAvailView(){
  const dates=wkDates();
  let emps=S.activeDept==='all'?S.employees:S.employees.filter(e=>e.dept===S.activeDept);
  const regCount=emps.filter(e=>DAYS.some(d=>(S.availability[e.id]||{})[d]?.length)).length;
  const unregCount=emps.length-regCount;

  document.getElementById('content').innerHTML=`
    <div class="stats">
      <div class="sc"><div class="sc-l">Tổng NV</div><div class="sc-v">${S.employees.length}</div><div class="sc-s">nhân viên</div></div>
      <div class="sc s"><div class="sc-l">Đã đăng ký rảnh</div><div class="sc-v">${regCount}</div><div class="sc-s">người</div></div>
      <div class="sc w"><div class="sc-l">Chưa đăng ký</div><div class="sc-v">${unregCount}</div><div class="sc-s">người</div></div>
      <div class="sc i"><div class="sc-l">Deadline</div><div class="sc-v" style="font-size:13px">${getDLText()}</div><div class="sc-s">Thứ Sáu ${DL_HR}:00</div></div>
    </div>
    <div class="dtabs">${getDepts().map(d=>`<div class="dtab${d===S.activeDept?' active':''}" onclick="S.activeDept='${d}';renderContent()">${d==='all'?'📋 Tất cả':d} <span style="font-size:10px;opacity:.7">(${d==='all'?S.employees.length:S.employees.filter(e=>e.dept===d).length})</span></div>`).join('')}</div>
    ${renderAvailTable(emps,dates,false)}`;
}

function renderAvailTable(emps,dates,myOnly){
  const byDept={};
  emps.forEach(e=>{if(!byDept[e.dept])byDept[e.dept]=[];byDept[e.dept].push(e);});
  return Object.keys(byDept).sort().map(dept=>{
    const de=byDept[dept];
    return `<div class="av-section">
      <div class="av-hdr">
        <h3>📁 ${dept} <span style="opacity:.6;font-weight:400">(${de.length} NV)</span></h3>
        <span class="av-hint">🟢 Rảnh được &nbsp;|&nbsp; Nhấp ô để đăng ký giờ rảnh</span>
      </div>
      <div class="av-table-wrap">
        <table><thead><tr>
          <th class="c0">STT</th><th class="c1">Mã NV</th><th class="c2">Họ và Tên</th><th class="c3">Loại</th>
          ${dates.map((d,i)=>`<th class="cd${isToday(d)?' today':''}"><div>${DAYF[i]}</div><div style="font-size:9px;opacity:.75">${fmtF(d)}</div></th>`).join('')}
          <th style="width:54px">Tổng giờ rảnh</th>
        </tr></thead>
        <tbody>
          ${de.map((e,i)=>renderAvailRow(e,i+1,dates,myOnly)).join('')}
          ${renderAvailSummary(de,dates)}
        </tbody></table>
      </div>
    </div>`;
  }).join('');
}

function etypeBadge(type){const t=ETYPES[type]||{bg:'#f3f4f6',c:'#6b7280'};return `<span class="etype" style="background:${t.bg};color:${t.c}">${(type||'').replace('_',' ')}</span>`;}
function renderTypeCell(emp, isTr) {
  if (S.role === 'admin' && !isTr) {
    const t = ETYPES[emp.type] || {bg:'#f3f4f6',c:'#6b7280'};
    return `<select style="background:${t.bg};color:${t.c};border:1px dashed ${t.c};border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;cursor:pointer;outline:none;appearance:none;text-align:center" onchange="updateEmpType('${emp.id}', this.value)">
      <option value="STPT" ${emp.type==='STPT'?'selected':''}>STPT</option>
      <option value="FTPT" ${emp.type==='FTPT'?'selected':''}>FTPT</option>
      <option value="CSR_NEW" ${emp.type==='CSR_NEW'?'selected':''}>CSR NEW</option>
      <option value="Support" ${emp.type==='Support'?'selected':''}>Support</option>
      <option value="Training" ${emp.type==='Training'?'selected':''}>Training</option>
    </select>`;
  }
  return etypeBadge(emp.type);
}
function updateEmpType(id, type) {
  const e = S.employees.find(x => x.id === id);
  if (e) { e.type = type; sv(); renderContent(); toast(`Đã đổi loại NV: ${e.name} -> ${type}`, 's'); }
}

function renderAvailRow(emp,idx,dates,editOwn){
  const av=S.availability[emp.id]||{};
  const isMe=S.role==='employee'&&S.empId===emp.id;
  const canEdit=S.role==='admin'||isMe;
  let totalH=0;
  const cells=DAYS.map(d=>{
    const slots=av[d]||[];
    const hasOff=slots.includes('off');
    const workSlots=slots.filter(s=>s!=='off');
    workSlots.forEach(s=>{const sh=AVAIL_OPTS.find(a=>a.id===s);if(sh)totalH+=sh.h;});
    const cellClass=slots.length===0?'':(hasOff&&!workSlots.length?'off-avail':'has-avail');
    const tags=workSlots.length?workSlots.map(s=>`<span class="av-tag">${s}</span>`).join(''):(hasOff?`<span class="av-tag t-off">OFF</span>`:'');
    const inner=tags||`<span class="av-add">${canEdit?'+':'—'}</span>`;
    const myMark=isMe&&slots.length?`<div class="av-mymark"></div>`:'';
    return `<td><div class="avcell ${cellClass}${canEdit?'':' locked'}" ${canEdit?`onclick="openAP('${emp.id}','${d}',this)"`:''}>${inner}${myMark}</div></td>`;
  }).join('');
  return `<tr class="${isMe?'myrow':''}" id="avrow-${emp.id}">
    <td style="color:var(--text3);font-size:11px">${idx}</td>
    <td style="font-family:monospace;font-size:10.5px;color:var(--text2)">${emp.id}</td>
    <td class="c2">${emp.name}${isMe?` <span style="background:#e0e7ff;color:var(--primary);border-radius:4px;padding:0 5px;font-size:9px;font-weight:700">✏️ Bạn</span>`:''}</td>
    <td class="c3" style="text-align:center">${renderTypeCell(emp, false)}</td>
    ${cells}
    <td style="font-weight:700;color:var(--primary);font-size:12px">${totalH?totalH+'h':'—'}</td>
  </tr>`;
}

function renderAvailSummary(emps,dates){
  const cells=DAYS.map(d=>{
    const counts={};
    emps.forEach(e=>{(S.availability[e.id]||{})[d]?.filter(s=>s!=='off').forEach(s=>{counts[s]=(counts[s]||0)+1;});});
    const total=Object.values(counts).reduce((a,b)=>a+b,0)||0;
    const chips=Object.entries(counts).slice(0,3).map(([k,v])=>{
      const sh=SHIFTS.find(s=>s.id===k)||{color:'#ccc'};
      return `<div style="display:flex;align-items:center;gap:2px;font-size:10px;font-weight:600"><div style="width:6px;height:6px;border-radius:50%;background:${sh.color||'#ccc'}"></div>${v}</div>`;
    }).join('');
    return `<td style="background:#f0fdf4;font-size:11px;padding:3px 2px"><div style="display:flex;flex-direction:column;gap:1px;align-items:center">${chips||'<span style="color:var(--text3)">—</span>'}<span style="font-size:9px;color:var(--text3)">${total?total+' rảnh':''}</span></div></td>`;
  }).join('');
  return `<tr><td colspan="4" style="text-align:right;padding-right:8px;font-size:11px;font-weight:700;color:var(--text2);background:#f0fdf4">📊 Tổng rảnh:</td>${cells}<td style="background:#f0fdf4"></td></tr>`;
}

// ================================================================
// TAB: SCHEDULE (Admin AI schedule)
// ================================================================
function renderScheduleView(){
  const dates=wkDates();
  let emps=S.activeDept==='all'?S.employees:S.employees.filter(e=>e.dept===S.activeDept);
  const schCount=emps.filter(e=>DAYS.some(d=>(S.schedule[e.id]||{})[d])).length;
  document.getElementById('content').innerHTML=`
    <div class="ai-panel">
      <h3>🤖 Xếp lịch thông minh bằng AI</h3>
      <p>AI sẽ đọc lịch rảnh của nhân viên + yêu cầu nhân sự + dữ liệu doanh thu → tự động xếp lịch tối ưu, đảm bảo đủ người vào giờ cao điểm.</p>
      <div class="ai-actions">
        <div class="ai-step"><div class="step-n">1</div><span>Nhân viên đăng ký lịch rảnh</span></div>
        <div class="ai-step"><div class="step-n">2</div><span>Admin cài yêu cầu nhân sự</span></div>
        <div class="ai-step"><div class="step-n">3</div><span>AI tạo lịch tối ưu</span></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px">
        <button class="generate-btn" id="gen-btn" onclick="generateSchedule()">
          <div class="gen-spinner" id="gen-spin"></div>
          <span id="gen-txt">✨ AI Tạo lịch tự động</span>
        </button>
        ${schCount>0?`<button class="tbtn" onclick="clearSchedule()" style="background:rgba(255,255,255,.15)">🗑 Xóa lịch đã tạo</button>`:''}
      </div>
    </div>
    <div class="publish-bar${S.published?' published':''}">
      <span class="pub-txt">${S.published?'✅ Lịch đã được công bố cho nhân viên xem':'⏳ Lịch chưa công bố — nhân viên chưa thấy lịch làm việc'}</span>
      ${S.role==='admin'?`<button class="btn ${S.published?'btn-d':'btn-s'}" onclick="togglePublish()">${S.published?'↩ Bỏ công bố':'📢 Công bố lịch'}</button>`:''}
    </div>
    <div class="dtabs">${getDepts().map(d=>`<div class="dtab${d===S.activeDept?' active':''}" onclick="S.activeDept='${d}';renderContent()">${d==='all'?'📋 Tất cả':d}</div>`).join('')}</div>
    ${renderScheduleTable(emps,dates)}`;
}

function renderScheduleTable(emps,dates){
  const byDept={};
  emps.forEach(e=>{if(!byDept[e.dept])byDept[e.dept]=[];byDept[e.dept].push(e);});
  
  // Inject transfers
  const trList = S.transfers || [];
  trList.forEach(t => {
    const emp = S.employees.find(e => e.id === t.empId);
    if (!emp) return;
    if (S.activeDept !== 'all' && S.activeDept !== t.toDept) return;
    if (!byDept[t.toDept]) byDept[t.toDept] = [];
    byDept[t.toDept].push({...emp, _trId: t.id, _trFrom: t.fromDept, _trDays: t.days, _origId: emp.id, id: emp.id + '__' + t.id});
  });

  return Object.keys(byDept).sort().map(dept=>{
    const de=byDept[dept];
    const totalH=de.reduce((s,e)=>{
      const eid = e._origId || e.id;
      return s+DAYS.reduce((ss,d)=>{
        if (e._trId && !e._trDays.includes(d)) return ss;
        return ss+(gs((S.schedule[eid]||{})[d]).h||0);
      },0);
    },0);
    
    return `<div class="av-section">
      <div class="av-hdr"><h3>📁 ${dept}</h3><span style="font-size:12px;color:var(--text2)">Tổng: ${totalH}h ${S.role==='admin'?`| <button class="tbtn" style="background:var(--primary);border-color:var(--primary);font-size:11px;padding:3px 8px" onclick="genDept('${dept}')">🤖 AI xếp ${dept}</button>`:''}</span></div>
      <div class="av-table-wrap"><table>
        <thead><tr>
          <th class="c0">STT</th><th class="c1">Mã NV</th><th class="c2">Họ và Tên</th><th class="c3">Loại</th>
          ${dates.map((d,i)=>`<th class="cd${isToday(d)?' today':''}"><div>${DAYF[i]}</div><div style="font-size:9px;opacity:.75">${fmtF(d)}</div></th>`).join('')}
          <th style="width:54px">Giờ/tuần</th>
        </tr></thead>
        <tbody>
          ${de.map((e,i)=>renderSchRow(e,i+1,dates)).join('')}
          ${renderSchSummary(de,dates)}
          ${renderCovRow(de,dates)}
        </tbody>
      </table></div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 13px;border-top:1px solid var(--border);background:#fafafa">
        ${SHIFTS.map(s=>`<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text2)"><div style="width:10px;height:10px;border-radius:3px;background:${s.color}"></div>${s.label}${s.h?' ('+s.h+'h)':''}</div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderSchRow(emp,idx,dates){
  const origId = emp._origId || emp.id;
  const sch = S.schedule[origId] || {};
  const av = S.availability[origId] || {};
  const isTr = !!emp._trId;
  let weekH = 0;
  
  const cells=DAYS.map(d=>{
    if (isTr && !emp._trDays.includes(d)) {
      return `<td><button class="shcell s-off" disabled style="opacity:.3">—</button></td>`;
    }
    
    const shId=sch[d];
    const sh=gs(shId);
    weekH+=sh.h||0;
    const availSlots=(av[d]||[]).filter(s=>s!=='off');
    const isAvailMatch=shId&&availSlots.includes(shId);
    const label=shId?sh.label:'—';
    const cls=shId?sh.cls:'s-unset';
    
    return `<td><button class="shcell ${cls}"
      onclick="S.role==='admin'?openSHP('${origId}','${d}',this):null"
      ${(S.role!=='admin' || isTr) ? 'disabled' : ''}
      title="Rảnh: ${(av[d]||[]).join(', ')||'chưa đăng ký'}"
    >${label}${isAvailMatch?'':shId?'*':''}</button></td>`;
  }).join('');
  
  const maxH=emp.maxH||48;
  const hc=weekH>maxH?'color:var(--danger)':weekH===0?'color:var(--text3)':'color:var(--primary)';
  
  return `<tr id="schrow-${emp.id}" class="${isTr ? 'myrow' : ''}">
    <td style="color:var(--text3);font-size:11px">${idx}</td>
    <td style="font-family:monospace;font-size:10.5px;color:var(--text2)">${origId}</td>
    <td class="c2">
      ${emp.name} 
      ${isTr ? `<span style="background:#f59e0b;color:#fff;border-radius:4px;padding:0 5px;font-size:9px;font-weight:700">HỖ TRỢ</span>` : ''}
      ${(S.role==='admin' && !isTr) ? `<button onclick="openEditEmp('${origId}')" style="background:transparent;border:none;cursor:pointer;color:var(--text3);font-size:11px;margin-left:3px" title="Sửa thông tin">✏️</button>` : ''}
    </td>
    <td class="c3" style="text-align:center">${renderTypeCell(emp, isTr)}</td>
    ${cells}
    <td style="font-weight:700;font-size:12px;${hc}">${weekH||'—'}${weekH?'h':''}</td>
  </tr>`;
}

function renderSchSummary(emps,dates){
  const cells=DAYS.map(d=>{
    const counts={};
    emps.forEach(e=>{const s=(S.schedule[e.id]||{})[d];if(s&&s!=='off')counts[s]=(counts[s]||0)+1;});
    const chips=Object.entries(counts).slice(0,4).map(([k,v])=>{const sh=gs(k);return `<div style="display:flex;align-items:center;gap:2px;font-size:10px;font-weight:700"><div style="width:6px;height:6px;border-radius:50%;background:${sh.color||'#ccc'}"></div>${v}</div>`;}).join('');
    return `<td style="background:#f8f9ff;padding:3px 2px"><div style="display:flex;flex-direction:column;gap:1px;align-items:center">${chips||'<span style="color:var(--text3);font-size:10px">—</span>'}</div></td>`;
  }).join('');
  return `<tr><td colspan="4" style="background:#f8f9ff;text-align:right;padding-right:8px;font-size:11px;font-weight:700;color:var(--text2)">📊 Tổng ca:</td>${cells}<td style="background:#f8f9ff"></td></tr>`;
}

function renderCovRow(emps,dates){
  const req=S.requirements;
  const cells=DAYS.map(d=>{
    const on=emps.filter(e=>{const s=(S.schedule[e.id]||{})[d];return s&&s!=='off';}).length;
    const dept=emps[0]?.dept;
    const allReqs=Object.values((req[dept]||{})[d]||{});
    const maxReq=allReqs.length?Math.max(...allReqs):Math.ceil(emps.length*0.3);
    const ok=on>=maxReq;
    return `<td class="cov-row"><span class="${ok?'cov-ok':'cov-warn'} cov-num">${ok?'✓':'⚠'} ${on}</span><span class="req-tag">/${maxReq}</span></td>`;
  }).join('');
  return `<tr class="cov-row"><td colspan="4" style="text-align:right;padding-right:8px;font-size:10px;font-weight:700;color:var(--text3)">👥 Trực/yêu cầu:</td>${cells}<td></td></tr>`;
}

// ================================================================
// TAB: REQUIREMENTS (Admin)
// ================================================================
function renderRequirements(){
  const depts=[...new Set(S.employees.map(e=>e.dept))].sort();
  const shiftGroups=['6-14','14-22','22-6','Giờ ngắn'];
  document.getElementById('content').innerHTML=`
    <div style="background:#fff;border-radius:10px;box-shadow:var(--shadow);padding:16px;margin-bottom:12px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:6px">⚙️ Yêu cầu nhân sự tối thiểu</h3>
      <p style="font-size:12px;color:var(--text2);margin-bottom:16px">Nhập số nhân viên tối thiểu cần có cho từng ca, từng ngày. AI sẽ dùng dữ liệu này khi xếp lịch.</p>
      ${depts.map(dept=>`
        <div style="margin-bottom:20px">
          <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--primary)">📁 ${dept}</div>
          <table class="req-table">
            <thead><tr><th style="text-align:left;width:100px">Ca làm việc</th>${DAYS.map((d,i)=>`<th>${DAYF[i].replace('Thứ ','T')}</th>`).join('')}</tr></thead>
            <tbody>
              ${['6-14','14-22','22-6','14-18','18-22'].map(sh=>`
                <tr>
                  <td style="text-align:left;font-weight:600">${sh}</td>
                  ${DAYS.map(d=>`<td><input class="req-input" type="number" min="0" max="20" value="${(S.requirements[dept]?.[d]?.[sh])||''}" id="req-${dept}-${d}-${sh}" placeholder="0"/></td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-p" onclick="saveReqs()">💾 Lưu yêu cầu</button>
        <button class="btn btn-s" onclick="aiSuggestReqs()">🤖 AI đề xuất yêu cầu theo doanh thu</button>
      </div>
    </div>
    <div style="background:#fff;border-radius:10px;box-shadow:var(--shadow);padding:16px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:6px">📈 Dữ liệu doanh thu / lưu lượng khách</h3>
      <p style="font-size:12px;color:var(--text2);margin-bottom:16px">Nhập doanh thu trung bình (triệu/ngày) hoặc lưu lượng khách để AI xếp lịch phù hợp giờ cao điểm.</p>
      <table class="req-table">
        <thead><tr><th style="text-align:left">Cửa hàng</th>${DAYS.map((d,i)=>`<th>${DAYF[i].replace('Thứ ','T')}</th>`).join('')}</tr></thead>
        <tbody>${depts.map(dept=>`<tr><td style="text-align:left;font-weight:600">${dept}</td>${DAYS.map(d=>`<td><input class="req-input" type="number" min="0" step="0.5" value="${(S.requirements[dept+'_rev']?.[d])||''}" id="rev-${dept}-${d}" placeholder="0"/></td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:10px"><button class="btn btn-p" onclick="saveRevs()">💾 Lưu doanh thu</button></div>
    </div>`;
}

function saveReqs(){
  const depts=[...new Set(S.employees.map(e=>e.dept))].sort();
  depts.forEach(dept=>{
    if(!S.requirements[dept])S.requirements[dept]={};
    DAYS.forEach(d=>{
      if(!S.requirements[dept][d])S.requirements[dept][d]={};
      ['6-14','14-22','22-6','14-18','18-22'].forEach(sh=>{
        const el=document.getElementById(`req-${dept}-${d}-${sh}`);
        if(el){const v=parseInt(el.value)||0;if(v>0)S.requirements[dept][d][sh]=v;else delete S.requirements[dept][d][sh];}
      });
    });
  });
  sv();toast('Đã lưu yêu cầu nhân sự','s');
}
function saveRevs(){
  const depts=[...new Set(S.employees.map(e=>e.dept))].sort();
  depts.forEach(dept=>{
    if(!S.requirements[dept+'_rev'])S.requirements[dept+'_rev']={};
    DAYS.forEach(d=>{const el=document.getElementById(`rev-${dept}-${d}`);if(el)S.requirements[dept+'_rev'][d]=parseFloat(el.value)||0;});
  });
  sv();toast('Đã lưu doanh thu','s');
}
async function aiSuggestReqs(){
  toast('AI đang phân tích doanh thu...','');
  const depts=[...new Set(S.employees.map(e=>e.dept))].sort();
  const revStr=depts.map(d=>`${d}: ${DAYS.map((day,i)=>`${DAYF[i]}=${S.requirements[d+'_rev']?.[day]||0}tr`).join(', ')}`).join('\n');
  const empStr=depts.map(d=>`${d}: ${S.employees.filter(e=>e.dept===d).length} NV`).join(', ');
  const prompt=`Với dữ liệu doanh thu và nhân viên bán lẻ Việt Nam, đề xuất số NV tối thiểu cần thiết cho từng ca:\n\nDoanh thu trung bình (triệu/ngày):\n${revStr}\n\nSố NV: ${empStr}\n\nCa cần phủ: 6-14, 14-22, 22-6\n\nTrả về JSON format:\n{"VN0485":{"T2":{"6-14":3,"14-22":4},...},...}\nChỉ JSON, không giải thích.`;
  try{
    const res=await callG(prompt);
    const match=res.match(/\{[\s\S]+\}/);
    if(match){
      const parsed=JSON.parse(match[0]);
      Object.assign(S.requirements,parsed);
      sv();renderContent();toast('AI đã đề xuất yêu cầu nhân sự!','s');
    }
  }catch(e){toast('Lỗi AI: '+e.message,'d');}
}

// ================================================================
// TAB: MY AVAILABILITY (Employee)
// ================================================================
function renderMyAvail(){
  const dates=wkDates();
  const emp=S.employees.find(e=>e.id===S.empId);
  if(!emp){document.getElementById('content').innerHTML='<div class="empty-state"><div class="eco">❌</div><p>Không tìm thấy thông tin nhân viên</p></div>';return;}
  const av=S.availability[S.empId]||{};
  const totalH=DAYS.reduce((s,d)=>{return s+(av[d]||[]).filter(x=>x!=='off').reduce((ss,x)=>{const o=AVAIL_OPTS.find(a=>a.id===x);return ss+(o?o.h:0);},0);},0);
  document.getElementById('content').innerHTML=`
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;padding:16px;color:#fff;margin-bottom:12px">
      <h3 style="font-size:14px;font-weight:800;margin-bottom:4px">🟢 Đăng ký lịch rảnh của bạn</h3>
      <p style="font-size:12px;opacity:.85;margin-bottom:8px">Chọn những khung giờ bạn có thể làm việc. Admin sẽ dùng thông tin này để xếp lịch tối ưu.</p>
      <div style="background:rgba(255,255,255,.2);border-radius:8px;padding:8px 12px;font-size:12px">
        ⏰ Hạn đăng ký: <strong>Thứ Sáu ${DL_HR}:00</strong> &nbsp;|&nbsp; ${getDLText()} &nbsp;|&nbsp; Tổng giờ rảnh: <strong>${totalH}h</strong>
      </div>
    </div>
    ${renderAvailTable([emp],dates,true)}`;
}

// ================================================================
// TAB: MY SCHEDULE (Employee)
// ================================================================
function renderMySchedule(){
  const dates=wkDates();
  if(!S.published){
    document.getElementById('content').innerHTML=`
      <div style="text-align:center;padding:50px 20px;background:#fff;border-radius:10px;box-shadow:var(--shadow)">
        <div style="font-size:48px;margin-bottom:12px">⏳</div>
        <h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Lịch chưa được công bố</h3>
        <p style="font-size:13px;color:var(--text2)">Quản lý đang xếp lịch. Bạn sẽ nhận được thông báo khi lịch được công bố.</p>
        <div style="margin-top:16px;font-size:12px;color:var(--text3)">📅 Tuần ${wkName(dates)}</div>
      </div>`;
    return;
  }
  
  let emps=S.activeDept==='all'?S.employees:S.employees.filter(e=>e.dept===S.activeDept);
  
  document.getElementById('content').innerHTML=`
    <div style="background:var(--success-lt);border:1px solid #86efac;border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">✅</span>
      <div><div style="font-weight:700;font-size:13px">Lịch làm việc đã được công bố!</div><div style="font-size:12px;color:var(--success)">Tuần ${wkName(dates)}</div></div>
    </div>
    <div class="dtabs">${getDepts().map(d=>`<div class="dtab${d===S.activeDept?' active':''}" onclick="S.activeDept='${d}';renderContent()">${d==='all'?'📋 Tất cả':d} <span style="font-size:10px;opacity:.7">(${d==='all'?S.employees.length:S.employees.filter(e=>e.dept===d).length})</span></div>`).join('')}</div>
    ${renderScheduleTable(emps,dates)}
  `;
}

// ================================================================
// AVAIL POPUP
// ================================================================
let apTarget={empId:null,day:null};
let apSel=[];
function openAP(empId,day,el){
  apTarget={empId,day};
  apSel=[...((S.availability[empId]||{})[day]||[])];
  const emp=S.employees.find(e=>e.id===empId);
  document.getElementById('ap-ttl').textContent=(emp?emp.name+' – ':'')+day;
  renderAPChecks();
  const r=el.getBoundingClientRect(),p=document.getElementById('av-popup');
  p.style.left=Math.min(r.left,window.innerWidth-272)+'px';
  p.style.top=(r.bottom+4)+'px';
  if(r.bottom+320>window.innerHeight)p.style.top=(r.top-320)+'px';
  p.classList.add('show');
}
function renderAPChecks(){
  document.getElementById('av-checks').innerHTML=AVAIL_OPTS.map(o=>{
    const sel=apSel.includes(o.id);
    const offSel=o.id==='off'&&sel;
    return `<div class="av-check-item${sel?(o.id==='off'?' selected-off':' selected'):''}" onclick="toggleAPOpt('${o.id}')">
      <div class="av-check-dot"></div>
      <span class="av-check-label">${o.id==='off'?'❌':o.h>=8?'🌅':o.h>=6?'🕐':'⏱'} ${o.label}</span>
      ${o.h?`<span class="av-check-hrs">${o.h}h</span>`:''}
    </div>`;
  }).join('');
}
function toggleAPOpt(id){
  if(id==='off'){apSel=apSel.includes('off')?[]:['off'];}
  else{apSel=apSel.filter(s=>s!=='off');if(apSel.includes(id))apSel=apSel.filter(s=>s!==id);else apSel.push(id);}
  renderAPChecks();
}
function saveAvail(){
  const{empId,day}=apTarget;
  if(!S.availability[empId])S.availability[empId]={};
  if(apSel.length)S.availability[empId][day]=apSel;
  else delete S.availability[empId][day];
  sv();closeAP();renderContent();
  toast(`Đã lưu lịch rảnh ${day}`,'s');
  logA(empId,day,'avail',apSel.join(','));
}
function clearAvail(){apSel=[];renderAPChecks();}
function closeAP(){document.getElementById('av-popup').classList.remove('show');}

// ================================================================
// SHIFT POPUP (Admin override)
// ================================================================
let shpTarget={empId:null,day:null};
function openSHP(empId,day,btn){
  shpTarget={empId,day};
  const av=(S.availability[empId]||{})[day]||[];
  const emp=S.employees.find(e=>e.id===empId);
  document.getElementById('shp-ttl').textContent=(emp?emp.name+' – ':'')+day;
  document.getElementById('shp-avail').textContent='Giờ rảnh: '+(av.join(', ')||'Chưa đăng ký');
  document.getElementById('sh-grid').innerHTML=SHIFTS.map(s=>{
    const isMatch=av.filter(x=>x!=='off').includes(s.id);
    const isCur=(S.schedule[empId]||{})[day]===s.id;
    return `<div class="sh-opt${isMatch?' avail-match':''}" style="background:${s.color};${isCur?'outline:2px solid var(--primary);outline-offset:1px':''}" onclick="applySh('${s.id}')">
      <span>${s.label}</span>${s.h?`<span style="font-size:9px;opacity:.65">${s.h}h</span>`:''}
    </div>`;
  }).join('');
  const r=btn.getBoundingClientRect(),p=document.getElementById('sh-popup');
  p.style.left=Math.min(r.left,window.innerWidth-262)+'px';
  p.style.top=(r.bottom+4)+'px';
  if(r.bottom+260>window.innerHeight)p.style.top=(r.top-260)+'px';
  p.classList.add('show');
}
function applySh(id){
  const{empId,day}=shpTarget;
  const old=(S.schedule[empId]||{})[day];
  if(!S.schedule[empId])S.schedule[empId]={};
  S.schedule[empId][day]=id;
  sv();closeSHP();renderContent();
  logA(empId,day,old||'—',id);
}
function closeSHP(){document.getElementById('sh-popup').classList.remove('show');}
document.addEventListener('click',e=>{
  const ap=document.getElementById('av-popup'),shp=document.getElementById('sh-popup');
  if(ap.classList.contains('show')&&!ap.contains(e.target)&&!e.target.classList.contains('avcell'))closeAP();
  if(shp.classList.contains('show')&&!shp.contains(e.target)&&!e.target.classList.contains('shcell'))closeSHP();
});

// ================================================================
// AI SCHEDULE GENERATION
// ================================================================
async function generateSchedule(){
  await genForDepts([...new Set(S.employees.map(e=>e.dept))]);
}
async function genDept(dept){
  await genForDepts([dept]);
}
async function genForDepts(depts){
  const btn=document.getElementById('gen-btn');
  const spin=document.getElementById('gen-spin');
  const txt=document.getElementById('gen-txt');
  if(btn){btn.disabled=true;spin&&spin.classList.add('show');if(txt)txt.textContent='AI đang xếp lịch...';}
  toast('AI đang phân tích và xếp lịch...','');
  const dates=wkDates();
  // Build availability summary
  const empAvailStr=S.employees.filter(e=>depts.includes(e.dept)).map(e=>{
    const av=S.availability[e.id]||{};
    const dayStr=DAYS.map((d,i)=>`${DAYF[i].replace('Thứ ','T')}:[${(av[d]||[]).join(',')||'chưa đk'}]`).join(', ');
    return `${e.id}|${e.name}|${e.dept}|${e.type}|max${e.maxH}h: ${dayStr}`;
  }).join('\n');
  // Build requirements
  const reqStr=depts.map(dept=>{
    const req=S.requirements[dept]||{};
    const rev=S.requirements[dept+'_rev']||{};
    return `${dept}:\n  Yêu cầu NV: ${DAYS.map((d,i)=>{ const r=req[d]||{}; const rv=rev[d]||0; return `${DAYF[i].replace('Thứ ','')}[dt=${rv}tr,${Object.entries(r).map(([k,v])=>`${k}:min${v}`).join(',')}]`; }).join(', ')}\n  Doanh thu: ${DAYS.map((d,i)=>`${DAYF[i].replace('Thứ ','')}=${rev[d]||0}tr`).join(', ')}`;
  }).join('\n\n');
  const prompt=`Bạn là hệ thống xếp lịch thông minh cho chuỗi cửa hàng bán lẻ tại Việt Nam.
Nhiệm vụ: Xếp lịch làm việc tuần ${wkName(dates)} dựa trên lịch rảnh nhân viên và yêu cầu nhân sự.

LỊCH RẢNH NHÂN VIÊN (format: id|tên|cửa hàng|loại|giờ tối đa):
${empAvailStr}

YÊU CẦU VÀ DOANH THU:
${reqStr}

NGUYÊN TẮC:
- Chỉ xếp ca trong giờ nhân viên đã đăng ký rảnh
- Tối đa 48h/tuần (STPT/CSR/Support), 32h/tuần (FTPT)
- Đảm bảo đủ người trực mỗi ca theo yêu cầu
- Ngày doanh thu cao → ưu tiên xếp nhiều nhân viên
- Nếu không đủ người theo yêu cầu: xếp tất cả người rảnh, ghi chú "THIẾU"
- Mỗi người tối đa 1 ca/ngày
- Nếu nhân viên không đăng ký rảnh ngày đó → gán "off"
- Cân bằng số giờ giữa các nhân viên

OUTPUT: Chỉ trả về JSON thuần, không markdown, không giải thích:
{
  "empId": {"T2":"6-14","T3":"off","T4":"14-22","T5":"off","T6":"6-14","T7":"off","CN":"off"},
  ...
}`;
  try{
    const res=await callG(prompt);
    const match=res.match(/\{[\s\S]+\}/);
    if(!match) throw new Error('AI không trả về JSON hợp lệ');
    const parsed=JSON.parse(match[0]);
    let assigned=0;
    Object.entries(parsed).forEach(([empId,schObj])=>{
      const emp=S.employees.find(e=>e.id===empId&&depts.includes(e.dept));
      if(!emp) return;
      if(!S.schedule[empId]) S.schedule[empId]={};
      DAYS.forEach(d=>{
        const val=schObj[d];
        if(val&&SHIFTS.find(s=>s.id===val)) { S.schedule[empId][d]=val; assigned++; }
        else if(val==='off') { S.schedule[empId][d]='off'; }
      });
    });
    sv();toast(`✅ AI đã xếp lịch cho ${Object.keys(parsed).length} NV (${assigned} ô)`,'s');
    logA('AI','all','—',`Xếp lịch tự động ${depts.join(',')} – ${assigned} ô`);
    renderContent();
  }catch(e){
    toast('Lỗi AI: '+e.message,'d');
    console.error(e);
  }finally{
    if(btn){btn.disabled=false;spin&&spin.classList.remove('show');if(txt)txt.textContent='✨ AI Tạo lịch tự động';}
  }
}

function clearSchedule(){
  if(!confirm('Xóa toàn bộ lịch đã xếp?')) return;
  S.schedule={}; S.published=false; sv(); renderContent(); toast('Đã xóa lịch','w');
}
function togglePublish(){
  S.published=!S.published; sv(); renderContent();
  toast(S.published?'📢 Đã công bố lịch cho nhân viên!':'↩ Đã bỏ công bố','s');
}

// ================================================================
// GEMINI API
// ================================================================
async function callG(prompt){
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GKEY}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:4096}})
  });
  const d=await res.json();
  const text=d.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!text) throw new Error('Không có phản hồi từ AI');
  return text;
}

// ================================================================
// TRANSFERS
// ================================================================
function openTR(){
  const depts = getDepts().filter(d=>d!=='all');
  const toOpts = '<option value="">-- Chọn --</option>' + depts.map(d=>`<option value="${d}">${d}</option>`).join('');
  document.getElementById('tr-to').innerHTML = toOpts;
  document.getElementById('tr-from').innerHTML = '<option value="">-- Chọn --</option>';
  document.getElementById('tr-emp').innerHTML = '<option value="">-- Chọn --</option>';
  document.querySelectorAll('#tr-days input').forEach(c=>c.checked=false);
  document.getElementById('tr-note').value='';
  
  const shHTML = SHIFTS.filter(s=>s.id!=='off').map(s=>`
    <label style="border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center;cursor:pointer;font-size:11px;font-weight:700;display:flex;flex-direction:column;gap:2px;background:${s.color}">
      <input type="radio" name="tr-sh" value="${s.id}" style="margin:0 auto"/>
      ${s.label}
    </label>
  `).join('');
  document.getElementById('tr-shifts').innerHTML = shHTML;
  
  renderTRList();
  document.getElementById('modal-tr').classList.add('show');
}

function onTrToChange(){
  const to = document.getElementById('tr-to').value;
  const depts = getDepts().filter(d=>d!=='all' && d!==to);
  document.getElementById('tr-from').innerHTML = '<option value="">-- Chọn --</option>' + depts.map(d=>`<option value="${d}">${d}</option>`).join('');
  document.getElementById('tr-emp').innerHTML = '<option value="">-- Chọn --</option>';
}

function onTrFromChange(){
  const from = document.getElementById('tr-from').value;
  const emps = S.employees.filter(e=>e.dept===from);
  document.getElementById('tr-emp').innerHTML = '<option value="">-- Chọn --</option>' + emps.map(e=>`<option value="${e.id}">${e.name} (${e.type})</option>`).join('');
}

function saveTR(){
  const to = document.getElementById('tr-to').value;
  const from = document.getElementById('tr-from').value;
  const empId = document.getElementById('tr-emp').value;
  const days = [...document.querySelectorAll('#tr-days input:checked')].map(c=>c.value);
  const sh = document.querySelector('input[name="tr-sh"]:checked');
  const note = document.getElementById('tr-note').value.trim();
  
  if(!to || !from || !empId || !days.length || !sh) {
    toast('Vui lòng điền đủ thông tin (cửa hàng, nhân viên, ngày, ca)!', 'w');
    return;
  }
  
  const shId = sh.value;
  const emp = S.employees.find(e=>e.id===empId);
  
  S.transfers = S.transfers || [];
  S.transfers.push({
    id: Date.now().toString(),
    empId,
    fromDept: from,
    toDept: to,
    days,
    shId,
    note
  });
  
  if(!S.schedule[empId]) S.schedule[empId] = {};
  days.forEach(d => {
    S.schedule[empId][d] = shId;
  });
  
  sv();
  renderTRList();
  renderContent();
  toast(`Đã điều chuyển ${emp.name} sang ${to}`, 's');
  
  document.querySelectorAll('#tr-days input').forEach(c=>c.checked=false);
  if(sh) sh.checked = false;
  document.getElementById('tr-note').value = '';
}

function renderTRList(){
  S.transfers = S.transfers || [];
  const list = document.getElementById('tr-list');
  document.getElementById('tr-list-count').textContent = `(${S.transfers.length})`;
  
  if(!S.transfers.length) {
    list.innerHTML = `<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px">Chưa có điều chuyển</div>`;
    return;
  }
  
  list.innerHTML = S.transfers.map(t => {
    const emp = S.employees.find(e=>e.id===t.empId);
    const sh = gs(t.shId);
    return `<div style="padding:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:11px">
      <div style="flex:1">
        <strong style="color:var(--primary)">${emp?emp.name:t.empId}</strong> 
        <br><span style="color:var(--text2)">${t.fromDept} ➔ ${t.toDept}</span>
        <br>Ngày: ${t.days.join(', ')} · Ca: ${sh.label}
        ${t.note ? `<br><em style="color:var(--text3)">${t.note}</em>` : ''}
      </div>
      <button class="tbtn" style="color:var(--danger);border-color:var(--danger-lt);background:var(--danger-lt)" onclick="delTR('${t.id}')">🗑</button>
    </div>`;
  }).join('');
}

function delTR(id){
  const t = S.transfers.find(x=>x.id===id);
  if(!t) return;
  t.days.forEach(d => {
    if(S.schedule[t.empId] && S.schedule[t.empId][d] === t.shId) {
      delete S.schedule[t.empId][d];
    }
  });
  S.transfers = S.transfers.filter(x=>x.id!==id);
  sv();
  renderTRList();
  renderContent();
  toast('Đã xóa điều chuyển', 'w');
}

// ================================================================
// EMP MANAGEMENT
// ================================================================
function vMa(){const v=document.getElementById('f-ma').value;const ok=MA_RE.test(v);document.getElementById('f-ma').classList.toggle('err',v&&!ok);document.getElementById('ferr-ma').classList.toggle('show',v&&!ok);return ok||!v;}
function openAddEmp(){
  document.getElementById('memp-ttl').textContent='➕ Thêm nhân viên';
  document.getElementById('eid').value='';
  ['f-ma','f-ten'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-type').value='STPT';
  document.getElementById('f-maxh').value=48;
  document.getElementById('f-ma').classList.remove('err');
  document.getElementById('ferr-ma').classList.remove('show');
  document.getElementById('btn-del').style.display='none';
  document.getElementById('modal-emp').classList.add('show');
  setTimeout(()=>document.getElementById('f-ma').focus(),100);
}
function openEditEmp(id){
  const e=S.employees.find(x=>x.id===id);if(!e)return;
  document.getElementById('memp-ttl').textContent='✏️ Sửa nhân viên';
  document.getElementById('eid').value=id;
  document.getElementById('f-ma').value=e.id;
  document.getElementById('f-ten').value=e.name;
  document.getElementById('f-dept').value=e.dept;
  document.getElementById('f-type').value=e.type||'STPT';
  document.getElementById('f-maxh').value=e.maxH||48;
  document.getElementById('btn-del').style.display='inline-block';
  document.getElementById('modal-emp').classList.add('show');
}
function saveEmp(){
  const ma=document.getElementById('f-ma').value.trim();
  const ten=document.getElementById('f-ten').value.trim();
  if(!MA_RE.test(ma)){toast('Mã NV phải đúng 9 chữ số!','d');return;}
  if(!ten){toast('Vui lòng nhập họ tên!','d');return;}
  const editId=document.getElementById('eid').value;
  const obj={id:ma,name:ten,dept:document.getElementById('f-dept').value,type:document.getElementById('f-type').value,maxH:parseInt(document.getElementById('f-maxh').value)||48};
  if(editId){const i=S.employees.findIndex(e=>e.id===editId);if(i>=0)S.employees[i]=obj;}
  else{if(S.employees.find(e=>e.id===ma)){toast('Mã NV đã tồn tại!','d');return;}S.employees.push(obj);}
  sv();cm('modal-emp');renderContent();toast(`Đã ${editId?'cập nhật':'thêm'}: ${ten}`,'s');
}
function delEmp(){
  const id=document.getElementById('eid').value;
  if(!id||!confirm('Xóa nhân viên này?'))return;
  S.employees=S.employees.filter(e=>e.id!==id);delete S.schedule[id];delete S.availability[id];
  sv();cm('modal-emp');renderContent();toast('Đã xóa','w');
}

// ================================================================
// AUDIT
// ================================================================
function logA(empId,day,from,to){
  const who=S.role==='admin'?'Admin':(S.employees.find(e=>e.id===S.empId)||{name:S.empId}).name;
  S.auditLog.push({ts:new Date().toISOString(),who,empId,day,from,to});sv();
}
function openAudit(){
  document.getElementById('audit-body').innerHTML=S.auditLog.length?[...S.auditLog].reverse().slice(0,100).map(a=>{
    const emp=S.employees.find(e=>e.id===a.empId);
    return `<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;gap:8px">
      <div style="color:var(--text3);font-size:10px;white-space:nowrap;font-family:monospace">${new Date(a.ts).toLocaleString('vi-VN')}</div>
      <div style="flex:1"><strong>${a.who}</strong>: ${emp?emp.name:a.empId} – ${a.day}: ${a.from} → <strong style="color:var(--primary)">${a.to}</strong></div>
    </div>`;}).join(''):`<p style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Chưa có lịch sử</p>`;
  document.getElementById('modal-audit').classList.add('show');
}
function clearLog(){if(!confirm('Xóa log?'))return;S.auditLog=[];sv();openAudit();toast('Đã xóa log','w');}

// ================================================================
// UTILS
// ================================================================
function getDepts(){return['all',...[...new Set(S.employees.map(e=>e.dept))].sort()];}
function getDLText(){
  if(S.weekOffset!==0)return'--';
  const dl=getDL(),now=new Date(),diff=dl-now;
  if(diff<0)return`Đã qua hạn`;
  const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
  return`Còn ${h}h${m}m`;
}
function getDL(){const d=wkDates(),fri=d[4],dl=new Date(fri);dl.setHours(DL_HR,0,0,0);return dl;}
function cm(id){document.getElementById(id).classList.remove('show');}
document.addEventListener('click',e=>{document.querySelectorAll('.modal-bg.show').forEach(m=>{if(e.target===m)m.classList.remove('show');});});
function toast(msg,type=''){
  const c=document.getElementById('toast-wrap'),ico={s:'✅',d:'❌',w:'⚠️'}[type]||'ℹ️';
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<div style="font-size:16px;flex-shrink:0">${ico}</div><div style="font-size:12px;color:var(--text2);line-height:1.4">${msg}</div>`;
  c.appendChild(t);setTimeout(()=>t.remove(),4500);
}
function exportCSV(){
  const dates=wkDates();
  const hdr=['Mã NV','Họ và Tên','Cửa hàng','Loại',...DAYS.map((d,i)=>`${d} ${fmt(dates[i])} (Rảnh)`),...DAYS.map((d,i)=>`${d} ${fmt(dates[i])} (Lịch làm)`),'Tổng giờ làm'];
  const rows=S.employees.map(e=>{
    const av=S.availability[e.id]||{},sch=S.schedule[e.id]||{};
    const h=DAYS.reduce((s,d)=>s+(gs(sch[d]).h||0),0);
    return [e.id,e.name,e.dept,e.type,...DAYS.map(d=>(av[d]||[]).join('+')),...DAYS.map(d=>sch[d]||''),h];
  });
  const csv=[hdr,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download=`LichLamViec_${wkName(wkDates()).replace(/[\s\–\/]/g,'_')}.csv`;a.click();toast('Đã xuất CSV','s');
}

// ================================================================
// LOGIN
// ================================================================
let ltab='admin';
function swTab(t){
  ltab=t;
  document.getElementById('ltab-a').classList.toggle('active',t==='admin');
  document.getElementById('ltab-e').classList.toggle('active',t==='emp');
  document.getElementById('lf-admin').style.display=t==='admin'?'flex':'none';
  document.getElementById('lf-emp').style.display=t==='emp'?'flex':'none';
  if(t==='emp'){ld();filterEL();document.getElementById('esrch').focus();}
}
function loginAdmin(){
  const pw=document.getElementById('apw').value;
  if(pw!==(localStorage.getItem('smvc_pw')||'admin123')){document.getElementById('apw').classList.add('err');toast('Sai mật khẩu!','d');setTimeout(()=>document.getElementById('apw').classList.remove('err'),1500);return;}
  S.role='admin';S.empId=null;ld();showApp('Admin','👑','Toàn quyền');
  toast('Chào Admin! 👋','s');
}
function filterEL(){
  const q=document.getElementById('esrch').value.toLowerCase();
  const f=S.employees.filter(e=>e.name.toLowerCase().includes(q)||e.id.includes(q));
  document.getElementById('emp-list').innerHTML=f.slice(0,15).map(e=>`
    <div class="eitem" onclick="loginEmp('${e.id}')">
      <div class="eavatar">${e.name.charAt(0)}</div>
      <div><div style="font-weight:600;font-size:13px">${e.name}</div><div style="font-size:11px;color:var(--text2)">${e.id} · ${e.dept} · ${e.type}</div></div>
    </div>`).join('')||`<div style="padding:18px;text-align:center;color:var(--text3);font-size:12px">Không tìm thấy</div>`;
}
function loginEmp(id){
  const emp=S.employees.find(e=>e.id===id);if(!emp)return;
  S.role='employee';S.empId=id;ld();showApp(emp.name,emp.name.charAt(0),'Nhân viên');
  toast(`Xin chào ${emp.name}! Hãy đăng ký lịch rảnh của bạn 📅`,'s');
}
function showApp(nm,av,lb){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app-body').classList.add('show');
  document.getElementById('rav').textContent=av;
  document.getElementById('rnm').textContent=nm;
  document.getElementById('rlb').textContent=lb;
  document.getElementById('adm-btns').style.display=S.role==='admin'?'flex':'none';
  activeTab=S.role==='admin'?'avail':'my-avail';
  renderWkLbl();renderTabs();renderContent();
  setInterval(()=>{if(S.role==='admin')renderContent();},30000);
}
function logout(){S.role=null;S.empId=null;document.getElementById('login-screen').style.display='flex';document.getElementById('app-body').classList.remove('show');document.getElementById('apw').value='';}

// BOOT
ld();filterEL();
document.getElementById('apw').addEventListener('keydown',e=>{if(e.key==='Enter')loginAdmin();});
document.getElementById('esrch').addEventListener('keydown',e=>{if(e.key==='Enter'){const f=S.employees.filter(x=>x.name.toLowerCase().includes(e.target.value.toLowerCase())||x.id.includes(e.target.value));if(f.length===1)loginEmp(f[0].id);}});
