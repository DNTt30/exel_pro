import{F as e,T as t,X as n,Z as r,_ as i,f as a,n as o,x as s}from"./index-BwWVLqQt.js";import{t as c}from"./createLucideIcon-BxOkk4Fl.js";var l=c(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),u=r(n(),1);function d(t,n,r,s=null){let{employees:c,user:l}=o(),d=a(l);return(0,u.useMemo)(()=>{let a=c;if(t){let e=t.toLowerCase();a=a.filter(t=>t.name.toLowerCase().includes(e)||t.id.toLowerCase().includes(e))}r!==`ALL`&&(a=a.filter(e=>(e.role||e.type)===r));let o=d?n:l?.dept,u={};if(a.forEach(t=>{if(u[t.dept]||(u[t.dept]=[]),u[t.dept].push({...t,isBorrowedTo:null}),s){let n=s[t.id]||{},r=new Set;e.forEach(e=>{let a=n[e],o=i(a);o&&o!==t.dept&&r.add(o)}),r.forEach(e=>{u[e]||(u[e]=[]),u[e].push({...t,isBorrowedTo:e})})}}),o&&o!==`ALL`){let e={};return u[o]&&(e[o]=u[o]),e}return u},[c,t,n,r,d,l?.dept,s])}function f({currentWeek:e,deptName:n,groupedEmps:r,weekSchedule:i,viewMode:a=`week`}){let o=e.split(`-`),c=parseInt(o[0],10),l=parseInt(o[1],10),u=parseInt(o[2],10),d=[`T2`,`T3`,`T4`,`T5`,`T6`,`T7`,`CN`],f=new Date(c,l-1,u),p=d.map((e,t)=>{let n=new Date(f);n.setDate(f.getDate()+t);let r=n.getDate().toString().padStart(2,`0`),i=(n.getMonth()+1).toString().padStart(2,`0`);return{dayKey:e,dateStr:`${r}/${i}`,header:`${e} (${r}/${i})`}}),m=new Date(f);m.setDate(f.getDate()+6);let h=`${`${f.getDate().toString().padStart(2,`0`)}/${(f.getMonth()+1).toString().padStart(2,`0`)}`} → ${`${m.getDate().toString().padStart(2,`0`)}/${(m.getMonth()+1).toString().padStart(2,`0`)}`}/${c}`,g=e=>{if(!e)return`color: #94a3b8;`;let{shift:t,covering_store:n}=s(e);return!t||t===`off`?`color: #94a3b8;`:n?`background-color: #fef08a; color: #854d0e; font-weight: bold;`:t===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:t===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:t===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:t===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:`background-color: #e2e8f0; color: #334155; font-weight: bold;`},_=``,v=1;Object.entries(r).forEach(([e,n])=>{_+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${p.length+6}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(n=>{let r=i[n.id]||{},a=0,o=0,c=p.map(e=>{let n=r[e.dayKey]||``,{shift:i,covering_store:c}=s(n);if(i&&i!==`off`){if(o++,t[i])a+=t[i].hours;else{let e=i.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);if(e){let t=parseInt(e[1],10),n=parseInt(e[2],10);n<t&&(n+=24),a+=n-t}}}return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${g(n)}">${c?`${i} ${c}`:i||`-`}</td>`}).join(``),l=(n.type===`PARTTIME`||n.type===`STPT`||n.role&&n.role.includes(`PT`))&&a>23,u=l?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; color: #1e40af; font-weight: bold;`;_+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${v++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${n.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${n.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center;">${n.role||n.type||`STPT`}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #2563eb;">${n.dept||e}</td>
          ${c}
          <td style="border: 1px solid #94a3b8; text-align: center; ${u}">${l?`⚠️ `:``}${a}h</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f8fafc;">${o} ca</td>
        </tr>
      `})});let y=`
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
            <th colspan="${p.length+7}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG PHÂN CÔNG LỊCH LÀM VIỆC - TUẦN: ${h}
            </th>
          </tr>
          <tr>
            <th colspan="${p.length+7}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${n||`Toàn bộ cửa hàng`}</strong> | Ngày xuất file: ${new Date().toLocaleDateString(`vi-VN`)} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 45px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 90px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 180px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 70px; border: 1px solid #94a3b8;">Vị trí</th>
            <th style="width: 80px; border: 1px solid #94a3b8;">Cửa hàng</th>
            ${p.map(e=>`<th style="width: 75px; border: 1px solid #94a3b8; ${e.dayKey===`CN`?`background-color: #fed7aa; color: #9a3412;`:``}">${e.header}</th>`).join(``)}
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Tổng giờ</th>
            <th style="width: 60px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Số ca</th>
          </tr>
        </thead>
        <tbody>
          ${_}
        </tbody>
      </table>
    </body>
    </html>
  `,b=new Blob([`﻿`+y],{type:`application/vnd.ms-excel;charset=utf-8;`}),x=document.createElement(`a`);x.href=URL.createObjectURL(b),x.download=`Lich_Lam_Viec_${n||`OFC`}_${e}.xls`,x.click()}function p({currentWeek:e,deptName:t,groupedEmps:n,getDayValue:r,activeDays:i,filterOnlyMe:a,currentUserId:o}){let s=``,c=1;Object.entries(n).forEach(([e,t])=>{let n=a?t.filter(e=>e.id===o):t;n.length!==0&&(s+=`
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${i.length+8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${e} (${n.length} nhân sự)
        </td>
      </tr>
    `,n.forEach(t=>{let n=0,a=0,o=0,l=0,u=t.type===`PARTTIME`||t.type===`STPT`||t.role&&t.role.includes(`PT`),d=i.map(e=>{let i=r?r(t.id,e):``,s=`color: #94a3b8;`,c=i||`-`;if(i&&i!==`OFF`){let e=parseFloat(i),t=isNaN(e)?8:e;n+=t,u?o+=t:a+=t,s=i===`6-14`?`background-color: #bbf7d0; color: #166534; font-weight: bold;`:i===`14-22`?`background-color: #bfdbfe; color: #1e40af; font-weight: bold;`:i===`10-18`?`background-color: #fed7aa; color: #9a3412; font-weight: bold;`:i===`22-6`?`background-color: #fecaca; color: #991b1b; font-weight: bold;`:`background-color: #e2e8f0; color: #1e293b; font-weight: bold;`}else i===`KL`&&(l++,s=`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`);return`<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${s}">${c}</td>`}).join(``),f=u&&n>91,p=f?`background-color: #fee2e2; color: #b91c1c; font-weight: bold;`:`background-color: #f8fafc; font-weight: bold;`;s+=`
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${c++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${t.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${t.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; color: #2563eb; font-weight: bold;">${e}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${t.role||t.type||`STPT`}</td>
          ${d}
          <td style="border: 1px solid #94a3b8; text-align: center; background-color: #f8fafc; font-weight: bold;">${u?`-`:(n/8).toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; ${p}">${u?f?`⚠️ ${n}h`:`${n}h`:`-`}</td>
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
  `,u=new Blob([`﻿`+l],{type:`application/vnd.ms-excel;charset=utf-8;`}),d=document.createElement(`a`);d.href=URL.createObjectURL(u),d.download=`Bang_Cham_Cong_${t||`OFC`}_${e}.xls`,d.click()}export{l as i,p as n,d as r,f as t};