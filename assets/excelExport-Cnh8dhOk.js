import{r as e}from"./rolldown-runtime-hePW80VL.js";import{a as t}from"./index-BTpa3R_z.js";import{Bn as n,Cn as r,Dn as i,On as a,Qt as o,en as s,f as c,nn as l,t as u}from"./useStore-B8WuX999.js";import{t as d}from"./createLucideIcon-BanKrUxf.js";import{t as f}from"./shallow-DqdgC9cr.js";var p=d(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),m=e(t(),1);function h(e,t,i,a=null){let{employees:s,user:l,stores:d}=u(f(e=>({employees:e.employees,user:e.user,stores:e.stores}))),p=n(l);return(0,m.useMemo)(()=>{let n=s;if(e){let t=e.toLowerCase();n=n.filter(e=>e.name.toLowerCase().includes(t)||e.id.toLowerCase().includes(t))}i!==`ALL`&&(n=n.filter(e=>(e.role||e.type)===i));let u=new Set(c(l,d,s)),f=t===`ALL`||t&&u.has(t)?t:l?.dept||`ALL`,m=p?t:f||`ALL`,h={};if(n.forEach(e=>{if(h[e.dept]||(h[e.dept]=[]),h[e.dept].push({...e,isBorrowedTo:null}),a&&m&&m!==`ALL`){let t=a[e.id]||{};r.forEach(n=>{let r=t[n];o(r)===m&&e.dept!==m&&(h[m]||(h[m]=[]),h[m].some(t=>t.id===e.id&&t.isBorrowedTo===m)||h[m].push({...e,isBorrowedTo:m}))})}}),m&&m!==`ALL`){let e={};return h[m]&&(e[m]=h[m]),e}if(!p){let e={};return Object.keys(h).forEach(t=>{u.has(t)&&(e[t]=h[t])}),e}return h},[s,e,t,i,p,l,a,d])}function g(e){if(e==null)return``;let t=String(e);if(!t)return``;let n=/^[=+\-@\t\r]/.test(t)||/^[=+\-@]/.test(t.trim()),r=t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`);return n?`'`+r:r}function _({currentWeek:e,deptName:t,groupedEmps:n,weekSchedule:i,userName:a=`OFC`}){let o=e.split(`-`),s=parseInt(o[0],10),c=parseInt(o[1],10),u=parseInt(o[2],10),d={T2:`THỨ HAI`,T3:`THỨ BA`,T4:`THỨ TƯ`,T5:`THỨ NĂM`,T6:`THỨ SÁU`,T7:`THỨ BẢY`,CN:`CHỦ NHẬT`},f=new Date(s,c-1,u),p=r.map((e,t)=>{let n=new Date(f);n.setDate(f.getDate()+t);let r=n.getDate().toString(),i=r.padStart(2,`0`),a=(n.getMonth()+1).toString().padStart(2,`0`),o=n.getFullYear();return{dayKey:e,html:`${t===0?`${r}/${n.getMonth()+1}/${o}`:`${i}/${a}`}<br/>${d[e]}`}}),m=(e,t)=>{if(!e)return`background-color: #FFFFFF; color: #000000;`;let{shift:n,covering_store:r,confirmed:i}=l(e);if(!n||n.toLowerCase()===`off`||i===!1||t?.isBorrowedTo&&r!==t.isBorrowedTo)return`background-color: #FFFFFF; color: #000000;`;if(r)return`background-color: #FFFF00; color: #000000; font-weight: bold;`;let a=n.toLowerCase(),o=t?.type;return[`6-14`,`5-14`,`6-10`,`10-14`,`5-10`,`6-12`,`14-18h`].includes(a)||a.startsWith(`6-`)||a.startsWith(`5-`)||a===`10-14`?`background-color: #00FF00; color: #000000; font-weight: bold;`:[`14-22`,`14-18`,`18-22`,`10-18`,`14-22/22-6`,`14h-18h`].includes(a)||a.startsWith(`14-`)||a.startsWith(`18-`)||a.startsWith(`10-18`)?`background-color: #00FFFF; color: #000000; font-weight: bold;`:[`22-6`,`12-20`].includes(a)||a.startsWith(`22-`)?`background-color: #4169E1; color: #FFFFFF; font-weight: bold;`:o===`CSR_NEW`||o===`CSR NEW`?`background-color: #FF0000; color: #FFFFFF; font-weight: bold;`:`background-color: #FFFFFF; color: #000000; font-weight: bold;`},h=``;Object.entries(n).forEach(([e,t])=>{h+=`
      <tr style="background-color: #92D050; font-weight: bold; text-align: center;">
        <td style="border: 1px solid #000000; width: 100px;">Mã nhân viên</td>
        <td style="border: 1px solid #000000; width: 180px;">Họ và Tên</td>
        <td style="border: 1px solid #000000; width: 80px;">Phòng ban</td>
        <td style="border: 1px solid #000000; width: 80px;">Loại NV</td>
        ${p.map(e=>`<td style="border: 1px solid #000000; width: 80px;">${e.html}</td>`).join(``)}
      </tr>
    `,t.forEach(t=>{let n=i[t.id]||{},r=p.map(e=>{let r=n[e.dayKey]||``,{shift:i,covering_store:a,confirmed:o}=l(r),s=``;return o!==!1&&i&&(t?.isBorrowedTo?a===t.isBorrowedTo&&(s=i===`off`?`off`:i):(s=i===`off`?`off`:i,a&&(s+=` ${a}`))),`<td style="border: 1px solid #000000; text-align: center; mso-number-format: '\\@'; ${m(r,t)}">${g(s)}</td>`}).join(``);h+=`
        <tr>
          <td style="border: 1px solid #000000; text-align: left; mso-number-format: '\\@';">${g(t.id)}</td>
          <td style="border: 1px solid #000000; text-align: left; padding-left: 5px;">${g(t.name)}</td>
          <td style="border: 1px solid #000000; text-align: left;">${g(t.dept||e)}</td>
          <td style="border: 1px solid #000000; text-align: left;">${g(t.role||t.type||`STPT`)}</td>
          ${r}
        </tr>
      `}),h+=`
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
    `});let _=`
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
          <td colspan="4" style="font-weight: bold; font-size: 12pt; text-align: left;">Lịch làm việc SM ${g(a)}</td>
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
  `,v=new Blob([`﻿`+_],{type:`application/vnd.ms-excel;charset=utf-8;`}),y=document.createElement(`a`);y.href=URL.createObjectURL(v),y.download=`Lich_Lam_Viec_${t||`OFC`}_${e}.xls`,y.click()}function v({currentWeek:e,deptName:t,groupedEmps:n,getDayValue:r,activeDays:o,filterOnlyMe:c,currentUserId:u,cycleDates:d}){let f=``,p=1,m=a(e),h=d||i(m.year,m.month),_={};h.forEach(e=>{_[e.key]=e}),Object.entries(n).forEach(([e,t])=>{let n=c?t.filter(e=>e.id===u):t;n.length!==0&&(f+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${o.length+8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(t=>{let n=0,i=0,a=0,c=t.type===`PARTTIME`||t.type===`STPT`||t.role&&t.role.includes(`PT`),u=o.map(e=>{let o=r?r(t.id,e):``,u=`color: #94a3b8;`,d=o||`-`;if(o&&o!==`OFF`&&o!==`off`){let e=0;if(typeof o==`object`){let t=l(o);t.confirmed===!1||!t.shift||t.shift===`off`?d=`-`:(d=t.shift,e=s(t.shift))}else{let t=String(o).trim().replace(`,`,`.`);if(/^\d+(\.\d+)?h?$/i.test(t))e=parseFloat(t);else{let n=l(t);if(n.confirmed===!1)d=`-`,e=0;else{let r=s(n.shift);if(r>0)e=r;else{let n=t.toUpperCase();e=n===`AL`||n===`PL`?8:n===`AL_H`||n===`PL_H`?4:0}}}}n+=e,c?a+=e:i+=e,d===`6-14`?u=`background-color: #bbf7d0; color: #166534; font-weight: bold;`:d===`14-22`?u=`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:d===`10-18`?u=`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:d===`22-6`?u=`background-color: #fecaca; color: #991b1b; font-weight: bold;`:[`KL`,`UL`].includes(String(d).toUpperCase())?u=`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:d!==`-`&&(u=`background-color: #e2e8f0; color: #1e293b; font-weight: bold;`)}return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${u}">${g(d)}</td>`}).join(``);n=Math.round(n*100)/100,a=Math.round(a*100)/100,i=Math.round(i*100)/100;let d=c&&n>91,m=d?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; font-weight: bold;`;f+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${p++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${g(t.id)}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${g(t.name)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; color: #2563eb; font-weight: bold;">${g(e)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${g(t.role||t.type||`STPT`)}</td>
          ${u}
          <td style="border: 1px solid #94a3b8; text-align: center; background-color: #f8fafc; font-weight: bold;">${c?`-`:(n/8).toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; ${m}">${c?d?`⚠️ ${n}h`:`${n}h`:`-`}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f1f5f9; color: #1e40af;">${n}h</td>
        </tr>
      `}))});let v=`
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
            <th colspan="${o.length+8}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG CHẤM CÔNG CHU KỲ (26 THÁNG TRƯỚC → 25 THÁNG NÀY)
            </th>
          </tr>
          <tr>
            <th colspan="${o.length+8}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${g(t||`Toàn bộ cửa hàng`)}</strong> | Ngày xuất: ${new Date().toLocaleDateString(`vi-VN`)} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 40px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 170px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 75px; border: 1px solid #94a3b8;">Bộ phận</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Vị trí</th>
            ${o.map(e=>{let t=_[e],n=t?.dayKey||e,r=t?.display||t?.shortDisplay||``;return`<th style="width: 48px; border: 1px solid #94a3b8; text-align: center;"><div style="font-weight: bold;">${n}</div>${r?`<div style="font-size: 8pt; color: #475569; font-weight: normal;">${r}</div>`:``}</th>`}).join(``)}
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công FT</th>
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công PT</th>
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #1e3a8a; color: #ffffff;">Tổng cộng</th>
          </tr>
        </thead>
        <tbody>
          ${f}
        </tbody>
      </table>
    </body>
    </html>
  `,y=new Blob([`﻿`+v],{type:`application/vnd.ms-excel;charset=utf-8;`}),b=document.createElement(`a`);b.href=URL.createObjectURL(y),b.download=`Bang_Cham_Cong_${t||`OFC`}_${e}.xls`,b.click()}export{p as i,v as n,h as r,_ as t};