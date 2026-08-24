import * as XLSX from 'xlsx';

// =====================================================================
// Xuat BANG CONG LUONG chuan C&B — sao chep dung bo cot sheet
// 'fixback cong luong': STT | Ma cham cong | Ma NV | Ho ten | Phong ban |
// Chuc vu | Loai NV | 31 ngay (26->25) | Tong hop | OT | Nghi bu | Training.
// O ngay uu tien CONG THUC TE (attendance/ezHR), khong co thi theo lich xep.
// =====================================================================

/** Doi mot o ngay thanh gia tri dang bang cong: so gio hoac ma chu (AL/OFF...) */
function dayCell(getDayValue, getActualValue, empId, day, isFT) {
  const act = getActualValue ? getActualValue(empId, day) : '';
  if (act !== null && act !== undefined && String(act).trim() !== '') {
    const t = String(act).trim();
    const num = parseFloat(t);
    if (!isNaN(num)) return isFT && num >= 4 && Number.isInteger(num) && num % 8 === 0 ? +(num / 8).toFixed(2) : num;
    return t.toUpperCase(); // AL / PL / NS...
  }
  const sched = getDayValue(empId, day);
  if (!sched || sched === 'OFF' || sched === '-') return 'OFF';
  const num = parseFloat(sched);
  if (!isNaN(num)) return isFT ? +(num / 8).toFixed(2) : num;
  return sched;
}

/**
 * @param {object} p
 * @param {Array}  p.cycleDates  Chu ky 26->25 ({key, shortDisplay, dayKey, fullDateStr})
 * @param {Object} p.groupedEmps { dept: [emp...] }
 * @param {Function} p.getDayValue     gio lich xep
 * @param {Function} [p.getActualValue] cong thuc te override
 */
export function buildPayrollAOA({ cycleDates, groupedEmps, getDayValue, getActualValue }) {
  const head1 = ['STT', 'Mã chấm công', 'Mã nhân viên', 'Họ và Tên', 'Phòng ban', 'Chức vụ', 'Loại NV',
    ...cycleDates.map(d => d.shortDisplay),
    'Working day', 'Công cho PT (h)', 'Công cho FT (ngày)', 'Vắng',
    'Annual Leave', 'Paid Leave/Holiday', 'Unpaid Leave',
    'Come late', 'Leave early', 'Night Shift', 'Tổng công hưởng lương',
    'OT-Ngày thường', 'OT-CN', 'OT-Lễ',
    'OT Đêm-Thường', 'OT Đêm-CN', 'OT Đêm-Lễ',
    'Nghỉ bù-Thường', 'Nghỉ bù-CN/Lễ', 'Training (h)'
  ];
  const rows = [head1];
  let stt = 0;
  Object.keys(groupedEmps).forEach(dept => {
    (groupedEmps[dept] || []).forEach(emp => {
      stt += 1;
      const isFT = emp.type === 'STFT' || (emp.role || '').includes('FT');
      let congPT = 0, congFT = 0, workingDays = 0, alCount = 0, plCount = 0, ulCount = 0, tong = 0;
      const dayVals = cycleDates.map(d => {
        const v = dayCell(getDayValue, getActualValue, emp.id, d.key, isFT);
        if (typeof v === 'number') {
          workingDays += 1;
          if (isFT) { congFT += v; tong += +(v * 8).toFixed(2); }
          else { congPT += v; tong += v; }
        } else if (typeof v === 'string') {
          const u = v.toUpperCase();
          if (u === 'AL') alCount += 1;
          else if (u === 'PL') plCount += 1;
          else if (u === 'UL') ulCount += 1;
        }
        return v;
      });
      rows.push([
        stt, emp.attendanceCode || emp.id, emp.id, emp.name || '', dept,
        isFT ? 'Nhân viên bán hàng - Full time' : 'Nhân viên bán hàng - Part time',
        isFT ? 'STFT' : 'STPT',
        ...dayVals,
        workingDays, +congPT.toFixed(2), +congFT.toFixed(2), '',
        alCount, plCount, ulCount,
        '', '', '', +tong.toFixed(2),
        '', '', '', '', '', '',
        '', '', ''
      ]);
    });
  });
  return rows;
}

export function downloadPayrollXlsx(params, filename) {
  const aoa = buildPayrollAOA(params);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 10 }, { wch: 28 }, { wch: 8 },
    ...(params.cycleDates || []).map(() => ({ wch: 6 })),
    { wch: 11 }, { wch: 13 }, { wch: 14 }, { wch: 7 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 }, { wch: 10 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cong luong');
  XLSX.writeFile(wb, filename);
  return filename;
}
