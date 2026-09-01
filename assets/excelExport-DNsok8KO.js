import{r as e}from"./rolldown-runtime-hePW80VL.js";import{A as t,P as n,S as r,St as i,_ as a,n as o,rt as s}from"./index-TNy2K4Jt.js";import{t as c}from"./createLucideIcon-BWYjYdOS.js";import{t as l}from"./shallow-COFIrpPY.js";var u=c(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),d=e(i(),1);function f(e,n,i,c=null){let{employees:u,user:f,stores:p}=o(l(e=>({employees:e.employees,user:e.user,stores:e.stores}))),m=r(f);return(0,d.useMemo)(()=>{let r=u;if(e){let t=e.toLowerCase();r=r.filter(e=>e.name.toLowerCase().includes(t)||e.id.toLowerCase().includes(t))}i!==`ALL`&&(r=r.filter(e=>(e.role||e.type)===i));let o=new Set(a(f,p)),l=n&&o.has(n)?n:f?.dept,d=m?n:l||`ALL`,h={};if(r.forEach(e=>{if(h[e.dept]||(h[e.dept]=[]),h[e.dept].push({...e,isBorrowedTo:null}),c){let n=c[e.id]||{},r=new Set;s.forEach(i=>{let a=n[i],o=t(a);o&&o!==e.dept&&r.add(o)}),r.forEach(t=>{h[t]||(h[t]=[]),h[t].push({...e,isBorrowedTo:t})})}}),d&&d!==`ALL`){let e={};return h[d]&&(e[d]=h[d]),e}if(!m){let e={};return Object.keys(h).forEach(t=>{o.has(t)&&(e[t]=h[t])}),e}return h},[u,e,n,i,m,f,c,p])}function p({currentWeek:e,deptName:t,groupedEmps:r,weekSchedule:i,userName:a=`OFC`}){let o=e.split(`-`),s=parseInt(o[0],10),c=parseInt(o[1],10),l=parseInt(o[2],10),u=[`T2`,`T3`,`T4`,`T5`,`T6`,`T7`,`CN`],d={T2:`THỨ HAI`,T3:`THỨ BA`,T4:`THỨ TƯ`,T5:`THỨ NĂM`,T6:`THỨ SÁU`,T7:`THỨ BẢY`,CN:`CHỦ NHẬT`},f=new Date(s,c-1,l),p=u.map((e,t)=>{let n=new Date(f);n.setDate(f.getDate()+t);let r=n.getDate().toString(),i=r.padStart(2,`0`),a=(n.getMonth()+1).toString().padStart(2,`0`),o=n.getFullYear();return{dayKey:e,html:`${t===0?`${r}/${n.getMonth()+1}/${o}`:`${i}/${a}`}<br/>${d[e]}`}}),m=(e,t)=>{if(!e)return`background-color: #FFFFFF; color: #000000;`;let{shift:r,covering_store:i}=n(e);if(!r||r.toLowerCase()===`off`)return`background-color: #FFFFFF; color: #000000;`;if(i)return`background-color: #FFFF00; color: #000000; font-weight: bold;`;let a=r.toLowerCase();return[`6-14`,`5-14`,`6-10`,`10-14`,`5-10`,`6-12`,`14-18h`].includes(a)||a.startsWith(`6-`)||a.startsWith(`5-`)||a===`10-14`?`background-color: #00FF00; color: #000000; font-weight: bold;`:[`14-22`,`14-18`,`18-22`,`10-18`,`14-22/22-6`,`14h-18h`].includes(a)||a.startsWith(`14-`)||a.startsWith(`18-`)||a.startsWith(`10-18`)?`background-color: #00FFFF; color: #000000; font-weight: bold;`:[`22-6`,`12-20`].includes(a)||a.startsWith(`22-`)?`background-color: #4169E1; color: #FFFFFF; font-weight: bold;`:t===`CSR_NEW`||t===`CSR NEW`?`background-color: #FF0000; color: #FFFFFF; font-weight: bold;`:`background-color: #FFFFFF; color: #000000; font-weight: bold;`},h=``;Object.entries(r).forEach(([e,t])=>{h+=`
      <tr style="background-color: #92D050; font-weight: bold; text-align: center;">
        <td style="border: 1px solid #000000; width: 100px;">Mã nhân viên</td>
        <td style="border: 1px solid #000000; width: 180px;">Họ và Tên</td>
        <td style="border: 1px solid #000000; width: 80px;">Phòng ban</td>
        <td style="border: 1px solid #000000; width: 80px;">Loại NV</td>
        ${p.map(e=>`<td style="border: 1px solid #000000; width: 80px;">${e.html}</td>`).join(``)}
      </tr>
    `,t.forEach(t=>{let r=i[t.id]||{},a=p.map(e=>{let i=r[e.dayKey]||``,{shift:a,covering_store:o}=n(i),s=a===`off`?`off`:a;return o&&(s+=` ${o}`),`<td style="border: 1px solid #000000; text-align: center; mso-number-format: '\\@'; ${m(i,t.type)}">${s||``}</td>`}).join(``);h+=`
        <tr>
          <td style="border: 1px solid #000000; text-align: left; mso-number-format: '\\@';">${t.id}</td>
          <td style="border: 1px solid #000000; text-align: left; padding-left: 5px;">${t.name}</td>
          <td style="border: 1px solid #000000; text-align: left;">${t.dept||e}</td>
          <td style="border: 1px solid #000000; text-align: left;">${t.role||t.type||`STPT`}</td>
          ${a}
        </tr>
      `}),h+=`
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
    `});let g=`
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; }
        td { white-space: nowrap; vertical-align: middle; }
      </style>
    </head>
    <body>
      <table>
        <!-- Row 1: Title and Legend (ca 1) -->
        <tr>
          <td colspan="4" style="font-weight: bold; font-size: 12pt; text-align: left;">Lịch làm việc SM ${a}</td>
          <td colspan="7"></td>
          <td style="background-color: #00FF00; color: #000000; font-weight: bold; text-align: left; border: 1px solid #000000;">ca 1</td>
        </tr>
        <!-- Row 2: ca 2 -->
        <tr>
          <td colspan="11"></td>
          <td style="background-color: #00FFFF; color: #000000; font-weight: bold; text-align: left; border: 1px solid #000000;">ca 2</td>
        </tr>
        <!-- Row 3: ca 3 -->
        <tr>
          <td colspan="11"></td>
          <td style="background-color: #4169E1; color: #FFFFFF; font-weight: bold; text-align: left; border: 1px solid #000000;">ca 3</td>
        </tr>
        <!-- Row 4: CSR NEW -->
        <tr>
          <td colspan="11"></td>
          <td style="background-color: #FF0000; color: #FFFFFF; font-weight: bold; text-align: left; border: 1px solid #000000;">CSR NEW</td>
        </tr>
        <!-- Row 5: Suport -->
        <tr>
          <td colspan="11"></td>
          <td style="background-color: #FFFF00; color: #000000; font-weight: bold; text-align: left; border: 1px solid #000000;">Suport</td>
        </tr>
        <!-- Row 6: TRANINING -->
        <tr>
          <td colspan="11"></td>
          <td style="background-color: #8A2BE2; color: #FFFFFF; font-weight: bold; text-align: left; border: 1px solid #000000;">TRANINING</td>
        </tr>
        <tr><td colspan="12"></td></tr>
        
        <!-- Main Table Body -->
        ${h}
      </table>
    </body>
    </html>
  `,_=new Blob([`﻿`+g],{type:`application/vnd.ms-excel;charset=utf-8;`}),v=document.createElement(`a`);v.href=URL.createObjectURL(_),v.download=`Lich_Lam_Viec_${t||`OFC`}_${e}.xls`,v.click()}function m({currentWeek:e,deptName:t,groupedEmps:n,getDayValue:r,activeDays:i,filterOnlyMe:a,currentUserId:o}){let s=``,c=1;Object.entries(n).forEach(([e,t])=>{let n=a?t.filter(e=>e.id===o):t;n.length!==0&&(s+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${i.length+8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(t=>{let n=0,a=0,o=0,l=t.type===`PARTTIME`||t.type===`STPT`||t.role&&t.role.includes(`PT`),u=i.map(e=>{let i=r?r(t.id,e):``,s=`color: #94a3b8;`,c=i||`-`;if(i&&i!==`OFF`&&i!==`off`){let e=parseFloat(i),t=0;if(!isNaN(e))t=e;else{let e=String(i).trim().toUpperCase();t=e===`AL`||e===`PL`?8:e===`AL_H`||e===`PL_H`?4:0}n+=t,l?o+=t:a+=t,s=i===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:i===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:i===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:i===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:[`KL`,`UL`].includes(String(i).toUpperCase())?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #e2e8f0; color: #1e293b; font-weight: bold;`}return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${s}">${c}</td>`}).join(``),d=l&&n>91,f=d?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; font-weight: bold;`;s+=`
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
  `,u=new Blob([`﻿`+l],{type:`application/vnd.ms-excel;charset=utf-8;`}),d=document.createElement(`a`);d.href=URL.createObjectURL(u),d.download=`Bang_Cham_Cong_${t||`OFC`}_${e}.xls`,d.click()}export{u as i,m as n,f as r,p as t};