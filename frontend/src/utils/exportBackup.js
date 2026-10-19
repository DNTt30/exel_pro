import * as XLSX from 'xlsx';
import * as api from '../services/api';

// =====================================================================
// Scoped Excel export for reconciliation, not a database backup.
// Fetch fresh accessible data; abort on failure rather than export stale state.
// =====================================================================

/** Gom cot tu dong tu cac dong du lieu (chong do schema khong ro). */
function sheetFromRows(rows) {
  const clean = (rows || []).filter(Boolean);
  const cols = [];
  const seen = new Set();
  clean.slice(0, 50).forEach(r => Object.keys(r || {}).forEach(k => {
    if (!seen.has(k)) { seen.add(k); cols.push(k); }
  }));
  const data = [cols.length ? cols : ['(trong)']];
  clean.forEach(r => {
    data.push((cols.length ? cols : ['(trong)']).map(c => {
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

export async function buildBackupData(state) {
  const [emps, fbs, swaps, shelves, items, stores] = await Promise.all([
    api.getEmployees({}), api.getFeedbacks({ limit: 150 }), api.getShiftSwaps({ limit: 150 }),
    api.getShelves({}), api.getShelfItems({}), api.getStores()
  ]);
  // Danh sách tuần cần lấy: mọi tuần state đã biết
  const weekSet = new Set(Object.keys(state.schedule || {}));
  Object.values(state.scheduleWeeks || {}).forEach(w => { if (w && w.weekDate) weekSet.add(w.weekDate); });
  if (state.currentWeek) weekSet.add(state.currentWeek);
  const weeks = [...weekSet].filter(Boolean).sort();
  // Khử N+1 query: lấy toàn bộ các tuần trong 1 query duy nhất qua getSchedulesByWeeks
  let schedule = {};
  if (weeks.length > 0) {
    schedule = await api.getSchedulesByWeeks(weeks);
  }
  return { employees: emps, feedbacks: fbs, shiftSwaps: swaps, shelves, shelfItems: items, stores, schedule, exportedWeeks: weeks };
}

export function buildBackupWorkbook(data) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Phạm vi file xuất', 'Thông tin'],
    ['Thời điểm', new Date().toISOString()],
    ['Quyền truy cập', 'Chỉ dữ liệu tài khoản hiện tại được phép đọc'],
    ['Tuần lịch', (data.exportedWeeks || Object.keys(data.schedule || {})).join(', ')],
    ['Bao gồm', 'Nhân viên, cửa hàng, lịch các tuần nêu trên, phản hồi, đổi ca, kệ và mặt hàng'],
    ['Giới hạn', 'Phản hồi và đổi ca: tối đa 150 bản ghi gần nhất mỗi loại; các bảng khác chịu giới hạn truy vấn của máy chủ'],
    ['Không bao gồm', 'Công thực tế, Auth, cấu hình, tài liệu/ảnh Sổ tay, lịch sử đầy đủ và các tuần chưa tải'],
    ['Mục đích', 'Đối chiếu Excel; không dùng làm bản sao lưu hoặc khôi phục toàn bộ database'],
  ]), 'Pham vi');
  const nameOf = {};
  (data.employees || []).forEach(e => { nameOf[e.id] = e.name || ''; });

  // 1. Nhan vien
  const nv = [['Mã NV', 'Họ tên', 'CH', 'Loại', 'Vai trò', 'Định mức giờ', 'Trạng thái']];
  (data.employees || []).forEach(e => nv.push([e.id, e.name || '', e.dept || '', e.type || '', e.role || '', e.maxH ?? '', e.isActive === false ? 'Đã khóa' : 'Đang làm']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nv), 'Nhan vien');

  // 2. Lịch (dạng dài: mọi tuần lấy được từ DB)
  const weeks = Object.keys(data.schedule || {}).sort();
  const lich = [['Tuần (thứ 2)', 'Mã NV', 'Họ tên', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']];
  weeks.forEach(wk => {
    const weekData = data.schedule[wk] || {};
    Object.keys(weekData).sort().forEach(empId => {
      const days = weekData[empId] || {};
      lich.push([wk, empId, nameOf[empId] || '',
        ...DAY_KEYS.map(d => dayShiftText(days[d]))]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lich), 'Lich');

  // 3-8. Dump tự động các nhóm còn lại
  XLSX.utils.book_append_sheet(wb, sheetFromRows(data.feedbacks), 'Feedbacks');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(data.shiftSwaps), 'Doi ca');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(data.shelves), 'Ke hang');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(data.shelfItems), 'Mon trong ke');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(data.stores), 'Cua hang');
  return wb;
}

/** Tải file OFC_Backup_<thời gian>.xlsx — fetch mới rồi dựng workbook. */
export async function downloadBackupXlsx(state) {
  const data = await buildBackupData(state);
  const wb = buildBackupWorkbook(data);
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  const name = 'LichCa_DuLieu_' + stamp + '.xlsx';
  XLSX.writeFile(wb, name);
  return name;
}
