import * as XLSX from 'xlsx';

// =====================================================================
// Sao luu du lieu day du ra .xlsx nhieu sheet (SM/OFC/admin).
// Du lieu lay tu snapshot Zustand da tai — khong goi them API.
// =====================================================================

/** Gom cot tu dong tu cac dong du lieu (chong do schema khong ro). */
function sheetFromRows(rows) {
  const clean = (rows || []).filter(Boolean);
  const cols = [];
  const seen = new Set();
  clean.slice(0, 50).forEach(r => Object.keys(r || {}).forEach(k => {
    if (!seen.has(k)) { seen.add(k); cols.push(k); }
  }));
  const data = [cols];
  clean.forEach(r => {
    data.push(cols.map(c => {
      const v = r[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    }));
  });
  return XLSX.utils.aoa_to_sheet(data);
}

function dayShiftText(val) {
  if (val === '' || val === null || val === undefined) return '';
  if (val === 'off') return 'Nghỉ';
  if (typeof val === 'object' && val !== null) {
    const cs = val.covering_store ? ' (' + val.covering_store + ')' : '';
    return String(val.shift || '') + cs;
  }
  return String(val);
}

const DAY_KEYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function buildBackupWorkbook(state) {
  const wb = XLSX.utils.book_new();
  const nameOf = {};
  (state.employees || []).forEach(e => { nameOf[e.id] = e.name || ''; });

  // 1. Nhan vien
  const nv = [['Mã NV', 'Họ tên', 'CH', 'Loại', 'Vai trò', 'Định mức giờ', 'Trạng thái']];
  (state.employees || []).forEach(e => nv.push([e.id, e.name || '', e.dept || '', e.type || '', e.role || '', e.maxH ?? '', e.isActive === false ? 'Đã khóa' : 'Đang làm']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nv), 'Nhan vien');

  // 2. Lịch (định dạng dài: mọi tuần đã tải về máy)
  const weeks = Object.keys(state.schedule || {}).sort();
  const lich = [['Tuần (thứ 2)', 'Mã NV', 'Họ tên', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']];
  weeks.forEach(wk => {
    const weekData = state.schedule[wk] || {};
    Object.keys(weekData).sort().forEach(empId => {
      const days = weekData[empId] || {};
      lich.push([wk, empId, nameOf[empId] || '',
        ...DAY_KEYS.map(d => dayShiftText(days[d]))]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lich), 'Lich');

  // 3-6. Các nhóm còn lại: dump tự động
  XLSX.utils.book_append_sheet(wb, sheetFromRows(state.feedbacks), 'Feedbacks');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(state.shiftSwaps), 'Doi ca');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(state.shelves), 'Ke hang');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(state.shelfItems), 'Mon trong ke');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(state.stores), 'Cua hang');
  XLSX.utils.book_append_sheet(wb, sheetFromRows((state.scheduleWeeks ? Object.values(state.scheduleWeeks) : [])), 'Trang thai tuan');
  return wb;
}

/** Tải workbook xuống máy với tên OFC_Backup_<thời gian>.xlsx */
export function downloadBackupXlsx(state) {
  const wb = buildBackupWorkbook(state);
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  XLSX.writeFile(wb, 'OFC_Backup_' + stamp + '.xlsx');
  return 'OFC_Backup_' + stamp + '.xlsx';
}
