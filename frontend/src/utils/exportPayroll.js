import * as XLSX from 'xlsx';

// =====================================================================
// Xuat BANG CONG TONG HOP chuan C&B — sao chep dung 1:1 file mau
// 'web-baocaotonghopcongthang-54.xlsx':
//   R1 tieu de merge toan bang | R2 noi dung | R3+R4 header 2 dong
//   (7 cot thong tin + N ngay + 24 cot tong hop gom nhom OT/Nghi bu/Training)
// O ngay uu tien CONG THUC TE (attendance/ezHR), khong co thi theo lich xep.
// =====================================================================

const EN_DOW = { CN: 'Sun', T2: 'Mon', T3: 'Tue', T4: 'Wed', T5: 'Thu', T6: 'Fri', T7: 'Sat' };

/** Doi mot o ngay thanh gia tri dang bang cong: SO GIO hoac ma chu (AL/PL/OFF...) */
function dayCell(getDayValue, getActualValue, empId, day) {
  const act = getActualValue ? getActualValue(empId, day) : '';
  if (act !== null && act !== undefined && String(act).trim() !== '') {
    const t = String(act).trim().replace(',', '.');
    const num = parseFloat(t);
    if (!isNaN(num)) return num;
    return String(act).trim().toUpperCase(); // AL / PL / UL / NS...
  }
  const sched = getDayValue(empId, day);
  if (!sched || sched === 'OFF' || sched === '-') return 'OFF';
  const num = parseFloat(String(sched).replace(',', '.'));
  if (!isNaN(num)) return num;
  return String(sched).toUpperCase();
}

const SUMMARY_HEADS = [
  'Working day', 'Công cho PT', 'Công cho FT', 'Vắng',
  'Annual Leave', 'Paid Leave/ Holiday', 'Unpaid Leave',
  'Come late ', 'Leave early', 'Night Shift', 'Tổng công hưởng lương'
];
const OT_SUBS = ['OT-Ngày thường Normal day', 'OT-Ngày nghỉ Weekly holiday, Sunday', ' OT-Ngày lễ \nPublic holiday'];
const GROUPS = [
  { head: 'OT - Ca ngày\nDay shift (06:00-22:00)', subs: OT_SUBS },
  { head: 'OT - Ca đêm\nNight shift (22:00-06:00)', subs: ['OT-Ngày thường \nNormal day', 'OT-Ngày nghỉ Weekly holiday, Sunday', ' OT-Ngày lễ \nPublic holiday'] },
  { head: 'Nghỉ bù', subs: ['Nghỉ bù -Thường', 'Nghỉ bù -Ngày Nghỉ', 'Nghỉ bù - Lễ'] },
  { head: '30 ngày tranining', subs: ['Công training', 'Night shift (training)'] },
  { head: '7 ngày tranining', subs: ['Công training', 'Night shift (training)'] }
];

/**
 * @returns {{ aoa: Array<Array>, merges: Array<{s:{r:number,c:number}, e:{r:number,c:number}}> }}
 */
export function buildPayrollAOA({ cycleDates, groupedEmps, getDayValue, getActualValue, location = 'Tp Hồ Chí Minh' }) {
  const N = cycleDates.length;
  const W = 7 + N + 24;
  const m = (r1, c1, r2, c2) => ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  const merges = [m(0, 0, 0, W - 1), m(1, 0, 1, W - 1)];

  // ---- Header hai dong, cap phat du cot truoc, gan theo chi so ----
  const row2 = new Array(W).fill('');
  const row3 = new Array(W).fill('');
  ['STT', 'Mã chấm công', 'Mã nhân viên', 'Họ và  Tên', 'Phòng ban', 'Chức vụ', 'Loại NV'].forEach((t, i) => {
    row2[i] = t;
    merges.push(m(2, i, 3, i));
  });
  cycleDates.forEach((d, i) => {
    row3[7 + i] = `${d.fullDateStr ? d.fullDateStr.slice(8, 10) : d.shortDisplay}\n${d.dayKey} ${EN_DOW[d.dayKey] || ''}`;
  });
  row2[7] = 'Ngày công tron';
  merges.push(m(2, 7, 2, 7 + N - 1));
  let ci = 7 + N;
  SUMMARY_HEADS.forEach((label) => {
    row2[ci] = label;
    merges.push(m(2, ci, 3, ci));
    ci += 1;
  });
  GROUPS.forEach(g => {
    row2[ci] = g.head;
    merges.push(m(2, ci, 2, ci + g.subs.length - 1));
    g.subs.forEach((s, k) => { row3[ci + k] = s; });
    ci += g.subs.length;
  });

  const aoa = [['BẢNG CÔNG TỔNG'], [location], row2, row3];
  let stt = 0;
  Object.keys(groupedEmps).forEach(dept => {
    (groupedEmps[dept] || []).forEach(emp => {
      // Chot: xuat C&B theo CH GOC — bo ban sao chi-vien de khong trung dong
      if (emp.isBorrowedTo) return;
      stt += 1;
      const isFT = emp.type === 'STFT' || (emp.role || '').includes('FT');
      let sumH = 0, workingDays = 0, al = 0, pl = 0, ul = 0, night = 0;
      const dayVals = cycleDates.map(d => {
        const v = dayCell(getDayValue, getActualValue, emp.id, d.key);
        if (typeof v === 'number') {
          if (v > 0) { workingDays += 1; sumH += v; }
        } else {
          const u = String(v).trim().toUpperCase();
          if (u === 'AL') al += 1;
          else if (u === 'AL_H') al += 0.5;
          else if (u === 'PL') pl += 1;
          else if (u === 'PL_H') pl += 0.5;
          else if (u === 'UL' || u === 'KL') ul += 1;
          else if (u === 'UL_H' || u === 'KL_H') ul += 0.5;
          else if (u === 'NS') night += 1;
        }
        return v;
      });
      const congPT = isFT ? 0 : +sumH.toFixed(2);
      const congFT = isFT ? +(sumH / 8).toFixed(2) : 0;
      aoa.push([
        stt, emp.attendanceCode || emp.id, emp.id, emp.name || '', dept,
        isFT ? 'Nhân viên bán hàng - Full time' : 'Nhân viên bán hàng - Part time',
        isFT ? 'STFT' : 'STPT',
        ...dayVals,
        workingDays, congPT, congFT, '',
        al, pl, ul,
        '', '', night,
        +sumH.toFixed(2),
        '', '', '', '', '', '',
        '', '', '', '', ''
      ]);
    });
  });
  return { aoa, merges };
}

export function downloadPayrollXlsx(params, filename) {
  const { aoa, merges } = buildPayrollAOA(params);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  const N = (params.cycleDates || []).length;
  ws['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 10 }, { wch: 28 }, { wch: 8 },
    ...Array.from({ length: N }, () => ({ wch: 6 })),
    { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 7 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
    ...Array.from({ length: 12 }, () => ({ wch: 10 }))
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WEB_Baocaotonghopcongthang');
  XLSX.writeFile(wb, filename);
  return filename;
}
