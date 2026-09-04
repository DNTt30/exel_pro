import{r as e}from"./rolldown-runtime-hePW80VL.js";import{N as t,O as n,at as r,ct as i,d as a,n as o,s,st as c,wt as l}from"./index-CK_dLZAF.js";import{t as u}from"./createLucideIcon-DVT-94Jc.js";import{t as d}from"./shallow-BZnxz5uk.js";var f=u(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),p=e(l(),1);function m(e,i,a,c=null){let{employees:l,user:u,stores:f}=o(d(e=>({employees:e.employees,user:e.user,stores:e.stores}))),m=t(u);return(0,p.useMemo)(()=>{let t=l;if(e){let n=e.toLowerCase();t=t.filter(e=>e.name.toLowerCase().includes(n)||e.id.toLowerCase().includes(n))}a!==`ALL`&&(t=t.filter(e=>(e.role||e.type)===a));let o=new Set(n(u,f)),d=i&&o.has(i)?i:u?.dept,p=m?i:d||`ALL`,h={};if(t.forEach(e=>{if(h[e.dept]||(h[e.dept]=[]),h[e.dept].push({...e,isBorrowedTo:null}),c){let t=c[e.id]||{},n=new Set;r.forEach(r=>{let i=t[r],a=s(i);a&&a!==e.dept&&n.add(a)}),n.forEach(t=>{h[t]||(h[t]=[]),h[t].push({...e,isBorrowedTo:t})})}}),p&&p!==`ALL`){let e={};return h[p]&&(e[p]=h[p]),e}if(!m){let e={};return Object.keys(h).forEach(t=>{o.has(t)&&(e[t]=h[t])}),e}return h},[l,e,i,a,m,u,c,f])}function h({currentWeek:e,deptName:t,groupedEmps:n,weekSchedule:i,userName:o=`OFC`}){let s=e.split(`-`),c=parseInt(s[0],10),l=parseInt(s[1],10),u=parseInt(s[2],10),d={T2:`THỨ HAI`,T3:`THỨ BA`,T4:`THỨ TƯ`,T5:`THỨ NĂM`,T6:`THỨ SÁU`,T7:`THỨ BẢY`,CN:`CHỦ NHẬT`},f=new Date(c,l-1,u),p=r.map((e,t)=>{let n=new Date(f);n.setDate(f.getDate()+t);let r=n.getDate().toString(),i=r.padStart(2,`0`),a=(n.getMonth()+1).toString().padStart(2,`0`),o=n.getFullYear();return{dayKey:e,html:`${t===0?`${r}/${n.getMonth()+1}/${o}`:`${i}/${a}`}<br/>${d[e]}`}}),m=(e,t)=>{if(!e)return`background-color: #FFFFFF; color: #000000;`;let{shift:n,covering_store:r}=a(e);if(!n||n.toLowerCase()===`off`)return`background-color: #FFFFFF; color: #000000;`;if(r)return`background-color: #FFFF00; color: #000000; font-weight: bold;`;let i=n.toLowerCase();return[`6-14`,`5-14`,`6-10`,`10-14`,`5-10`,`6-12`,`14-18h`].includes(i)||i.startsWith(`6-`)||i.startsWith(`5-`)||i===`10-14`?`background-color: #00FF00; color: #000000; font-weight: bold;`:[`14-22`,`14-18`,`18-22`,`10-18`,`14-22/22-6`,`14h-18h`].includes(i)||i.startsWith(`14-`)||i.startsWith(`18-`)||i.startsWith(`10-18`)?`background-color: #00FFFF; color: #000000; font-weight: bold;`:[`22-6`,`12-20`].includes(i)||i.startsWith(`22-`)?`background-color: #4169E1; color: #FFFFFF; font-weight: bold;`:t===`CSR_NEW`||t===`CSR NEW`?`background-color: #FF0000; color: #FFFFFF; font-weight: bold;`:`background-color: #FFFFFF; color: #000000; font-weight: bold;`},h=``;Object.entries(n).forEach(([e,t])=>{h+=`
      <tr style="background-color: #92D050; font-weight: bold; text-align: center;">
        <td style="border: 1px solid #000000; width: 100px;">Mã nhân viên</td>
        <td style="border: 1px solid #000000; width: 180px;">Họ và Tên</td>
        <td style="border: 1px solid #000000; width: 80px;">Phòng ban</td>
        <td style="border: 1px solid #000000; width: 80px;">Loại NV</td>
        ${p.map(e=>`<td style="border: 1px solid #000000; width: 80px;">${e.html}</td>`).join(``)}
      </tr>
    `,t.forEach(t=>{let n=i[t.id]||{},r=p.map(e=>{let r=n[e.dayKey]||``,{shift:i,covering_store:o}=a(r),s=i===`off`?`off`:i;return o&&(s+=` ${o}`),`<td style="border: 1px solid #000000; text-align: center; mso-number-format: '\\@'; ${m(r,t.type)}">${s||``}</td>`}).join(``);h+=`
        <tr>
          <td style="border: 1px solid #000000; text-align: left; mso-number-format: '\\@';">${t.id}</td>
          <td style="border: 1px solid #000000; text-align: left; padding-left: 5px;">${t.name}</td>
          <td style="border: 1px solid #000000; text-align: left;">${t.dept||e}</td>
          <td style="border: 1px solid #000000; text-align: left;">${t.role||t.type||`STPT`}</td>
          ${r}
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
          <td colspan="4" style="font-weight: bold; font-size: 12pt; text-align: left;">Lịch làm việc SM ${o}</td>
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
  `,_=new Blob([`﻿`+g],{type:`application/vnd.ms-excel;charset=utf-8;`}),v=document.createElement(`a`);v.href=URL.createObjectURL(_),v.download=`Lich_Lam_Viec_${t||`OFC`}_${e}.xls`,v.click()}function g({currentWeek:e,deptName:t,groupedEmps:n,getDayValue:r,activeDays:a,filterOnlyMe:o,currentUserId:s,cycleDates:l}){let u=``,d=1,f=i(e),p=l||c(f.year,f.month),m={};p.forEach(e=>{m[e.key]=e}),Object.entries(n).forEach(([e,t])=>{let n=o?t.filter(e=>e.id===s):t;n.length!==0&&(u+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${a.length+8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(t=>{let n=0,i=0,o=0,s=t.type===`PARTTIME`||t.type===`STPT`||t.role&&t.role.includes(`PT`),c=a.map(e=>{let a=r?r(t.id,e):``,c=`color: #94a3b8;`,l=a||`-`;if(a&&a!==`OFF`&&a!==`off`){let e=parseFloat(a),t=0;if(!isNaN(e))t=e;else{let e=String(a).trim().toUpperCase();t=e===`AL`||e===`PL`?8:e===`AL_H`||e===`PL_H`?4:0}n+=t,s?o+=t:i+=t,c=a===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:a===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:a===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:a===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:[`KL`,`UL`].includes(String(a).toUpperCase())?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #e2e8f0; color: #1e293b; font-weight: bold;`}return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${c}">${l}</td>`}).join(``),l=s&&n>91,f=l?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; font-weight: bold;`;u+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${d++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${t.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${t.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; color: #2563eb; font-weight: bold;">${e}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${t.role||t.type||`STPT`}</td>
          ${c}
          <td style="border: 1px solid #94a3b8; text-align: center; background-color: #f8fafc; font-weight: bold;">${s?`-`:(n/8).toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; ${f}">${s?l?`⚠️ ${n}h`:`${n}h`:`-`}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f1f5f9; color: #1e40af;">${n}h</td>
        </tr>
      `}))});let h=`
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
            <th colspan="${a.length+8}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG CHẤM CÔNG CHU KỲ (26 THÁNG TRƯỚC → 25 THÁNG NÀY)
            </th>
          </tr>
          <tr>
            <th colspan="${a.length+8}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${t||`Toàn bộ cửa hàng`}</strong> | Ngày xuất: ${new Date().toLocaleDateString(`vi-VN`)} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 40px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 170px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 75px; border: 1px solid #94a3b8;">Bộ phận</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Vị trí</th>
            ${a.map(e=>{let t=m[e],n=t?.dayKey||e,r=t?.display||t?.shortDisplay||``;return`<th style="width: 48px; border: 1px solid #94a3b8; text-align: center;"><div style="font-weight: bold;">${n}</div>${r?`<div style="font-size: 8pt; color: #475569; font-weight: normal;">${r}</div>`:``}</th>`}).join(``)}
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công FT</th>
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công PT</th>
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #1e3a8a; color: #ffffff;">Tổng cộng</th>
          </tr>
        </thead>
        <tbody>
          ${u}
        </tbody>
      </table>
    </body>
    </html>
  `,g=new Blob([`﻿`+h],{type:`application/vnd.ms-excel;charset=utf-8;`}),_=document.createElement(`a`);_.href=URL.createObjectURL(g),_.download=`Bang_Cham_Cong_${t||`OFC`}_${e}.xls`,_.click()}export{f as i,g as n,m as r,h as t};