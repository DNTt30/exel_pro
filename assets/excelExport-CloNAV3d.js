import{r as e}from"./rolldown-runtime-hePW80VL.js";import{L as t,N as n,S as r,_ as i,bt as a,k as o,n as s,nt as c}from"./index-BHliEoyf.js";import{t as l}from"./createLucideIcon-ySl3v72b.js";import{t as u}from"./shallow-CqDH_WXt.js";var d=l(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),f=e(a(),1);function p(e,t,n,a=null){let{employees:l,user:d,stores:p}=s(u(e=>({employees:e.employees,user:e.user,stores:e.stores}))),m=r(d);return(0,f.useMemo)(()=>{let r=l;if(e){let t=e.toLowerCase();r=r.filter(e=>e.name.toLowerCase().includes(t)||e.id.toLowerCase().includes(t))}n!==`ALL`&&(r=r.filter(e=>(e.role||e.type)===n));let s=new Set(i(d,p)),u=t&&s.has(t)?t:d?.dept,f=m?t:u||`ALL`,h={};if(r.forEach(e=>{if(h[e.dept]||(h[e.dept]=[]),h[e.dept].push({...e,isBorrowedTo:null}),a){let t=a[e.id]||{},n=new Set;c.forEach(r=>{let i=t[r],a=o(i);a&&a!==e.dept&&n.add(a)}),n.forEach(t=>{h[t]||(h[t]=[]),h[t].push({...e,isBorrowedTo:t})})}}),f&&f!==`ALL`){let e={};return h[f]&&(e[f]=h[f]),e}if(!m){let e={};return Object.keys(h).forEach(t=>{s.has(t)&&(e[t]=h[t])}),e}return h},[l,e,t,n,m,d,a,p])}function m({currentWeek:e,deptName:r,groupedEmps:i,weekSchedule:a}){let o=e.split(`-`),s=parseInt(o[0],10),c=parseInt(o[1],10),l=parseInt(o[2],10),u=[`T2`,`T3`,`T4`,`T5`,`T6`,`T7`,`CN`],d=new Date(s,c-1,l),f=u.map((e,t)=>{let n=new Date(d);n.setDate(d.getDate()+t);let r=n.getDate().toString().padStart(2,`0`),i=(n.getMonth()+1).toString().padStart(2,`0`);return{dayKey:e,dateStr:`${r}/${i}`,header:`${e} (${r}/${i})`}}),p=new Date(d);p.setDate(d.getDate()+6);let m=`${`${d.getDate().toString().padStart(2,`0`)}/${(d.getMonth()+1).toString().padStart(2,`0`)}`} → ${`${p.getDate().toString().padStart(2,`0`)}/${(p.getMonth()+1).toString().padStart(2,`0`)}`}/${s}`,h=e=>{if(!e)return`color: #94a3b8;`;let{shift:t,covering_store:r}=n(e);return!t||t===`off`?`color: #94a3b8;`:r?`background-color: #fef08a; color: #854d0e; font-weight: bold;`:t===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:t===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:t===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:t===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:`background-color: #e2e8f0; color: #334155; font-weight: bold;`},g=``,_=1;Object.entries(i).forEach(([e,r])=>{g+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${f.length+6}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${r.length} nhân sự)
        </td>
      </tr>
    `,r.forEach(r=>{let i=a[r.id]||{},o=0,s=0,c=f.map(e=>{let r=i[e.dayKey]||``,{shift:a,covering_store:c}=n(r);if(a&&a!==`off`){if(s++,t[a])o+=t[a].hours;else{let e=a.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);if(e){let t=parseInt(e[1],10),n=parseInt(e[2],10);n<t&&(n+=24),o+=n-t}}}return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${h(r)}">${c?`${a} ${c}`:a||`-`}</td>`}).join(``),l=(r.type===`PARTTIME`||r.type===`STPT`||r.role&&r.role.includes(`PT`))&&o>23,u=l?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; color: #1e40af; font-weight: bold;`;g+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${_++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${r.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${r.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center;">${r.role||r.type||`STPT`}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #2563eb;">${r.dept||e}</td>
          ${c}
          <td style="border: 1px solid #94a3b8; text-align: center; ${u}">${l?`⚠️ `:``}${o}h</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f8fafc;">${s} ca</td>
        </tr>
      `})});let v=`
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; width: 100%; }
        th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; }
        th { background-color: #cbd5e1; font-weight: bold; color: #0f172a; font-size: 10pt; }
        .main-title { font-size: 14pt; font-weight: bold; background-color: #1e3a8a; color: #ffffff; text-align: center; height: 40px; }
        .sub-info { font-size: 9.5pt; font-style: italic; background-color: #f1f5f9; color: #334155; text-align: left; padding: 6px 12px; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th colspan="${f.length+7}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG PHÂN CÔNG LỊCH LÀM VIỆC - TUẦN: ${m}
            </th>
          </tr>
          <tr>
            <th colspan="${f.length+7}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${r||`Toàn bộ cửa hàng`}</strong> | Ngày xuất file: ${new Date().toLocaleDateString(`vi-VN`)} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 45px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 90px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 180px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 70px; border: 1px solid #94a3b8;">Vị trí</th>
            <th style="width: 80px; border: 1px solid #94a3b8;">Cửa hàng</th>
            ${f.map(e=>`<th style="width: 75px; border: 1px solid #94a3b8; ${e.dayKey===`CN`?`background-color: #fed7aa; color: #9a3412;`:``}">${e.header}</th>`).join(``)}
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Tổng giờ</th>
            <th style="width: 60px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Số ca</th>
          </tr>
        </thead>
        <tbody>
          ${g}
        </tbody>
      </table>
    </body>
    </html>
  `,y=new Blob([`﻿`+v],{type:`application/vnd.ms-excel;charset=utf-8;`}),b=document.createElement(`a`);b.href=URL.createObjectURL(y),b.download=`Lich_Lam_Viec_${r||`OFC`}_${e}.xls`,b.click()}function h({currentWeek:e,deptName:t,groupedEmps:n,getDayValue:r,activeDays:i,filterOnlyMe:a,currentUserId:o}){let s=``,c=1;Object.entries(n).forEach(([e,t])=>{let n=a?t.filter(e=>e.id===o):t;n.length!==0&&(s+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${i.length+8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(t=>{let n=0,a=0,o=0,l=t.type===`PARTTIME`||t.type===`STPT`||t.role&&t.role.includes(`PT`),u=i.map(e=>{let i=r?r(t.id,e):``,s=`color: #94a3b8;`,c=i||`-`;if(i&&i!==`OFF`){let e=parseFloat(i),t=isNaN(e)?8:e;n+=t,l?o+=t:a+=t,s=i===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:i===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:i===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:i===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:`background-color: #e2e8f0; color: #1e293b; font-weight: bold;`}else i===`KL`&&(s=`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`);return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${s}">${c}</td>`}).join(``),d=l&&n>91,f=d?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; font-weight: bold;`;s+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${c++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${t.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${t.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; color: #2563eb; font-weight: bold;">${e}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${t.role||t.type||`STPT`}</td>
          ${u}
          <td style="border: 1px solid #94a3b8; text-align: center; background-color: #f8fafc; font-weight: bold;">${l?`-`:(n/8).toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; ${f}">${l?d?`⚠️ ${n}h`:`${n}h`:`-`}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f1f5f9; color: #1e40af;">${n}h</td>
        </tr>
      `}))});let l=`
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 9.5pt; width: 100%; }
        th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: center; }
        th { background-color: #cbd5e1; font-weight: bold; color: #0f172a; }
        .main-title { font-size: 14pt; font-weight: bold; background-color: #1e3a8a; color: #ffffff; text-align: center; height: 40px; }
        .sub-info { font-size: 9.5pt; font-style: italic; background-color: #f1f5f9; color: #334155; text-align: left; padding: 6px 12px; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th colspan="${i.length+8}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG CHẤM CÔNG CHU KỲ (26 THÁNG TRƯỚC → 25 THÁNG NÀY)
            </th>
          </tr>
          <tr>
            <th colspan="${i.length+8}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${t||`Toàn bộ cửa hàng`}</strong> | Ngày xuất: ${new Date().toLocaleDateString(`vi-VN`)} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 40px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 170px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 75px; border: 1px solid #94a3b8;">Bộ phận</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Vị trí</th>
            ${i.map(e=>`<th style="width: 45px; border: 1px solid #94a3b8;">${e}</th>`).join(``)}
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công FT</th>
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công PT</th>
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #1e3a8a; color: #ffffff;">Tổng cộng</th>
          </tr>
        </thead>
        <tbody>
          ${s}
        </tbody>
      </table>
    </body>
    </html>
  `,u=new Blob([`﻿`+l],{type:`application/vnd.ms-excel;charset=utf-8;`}),d=document.createElement(`a`);d.href=URL.createObjectURL(u),d.download=`Bang_Cham_Cong_${t||`OFC`}_${e}.xls`,d.click()}export{d as i,h as n,p as r,m as t};