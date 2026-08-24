// Xuất báo cáo Part-time dạng CSV (BOM UTF-8 để Excel mở tiếng Việt đúng).
// Tách thuần khỏi Dashboard để kiểm thử unit.

/**
 * Dựng nội dung CSV.
 * @param {object} p
 * @param {Array}  p.list        Danh sách nhân sự đã tổng hợp (mỗi bản ghi có shiftsMap)
 * @param {Array}  p.dayKeys     ['T2'...] hoặc key ngày của chu kỳ
 * @param {string} p.dateHeaders Tiêu đề cột ngày đã join bằng ','
 */
export function buildOFCReportCSV({ list, dayKeys, dateHeaders }) {
  let csv = 'STT,Cửa Hàng,Mã nhân Viên,Mã Điểm Danh,Vị Trí,Họ và Tên,' + dateHeaders + ',Tổng giờ làm\n';
  list.forEach((emp, idx) => {
    const shiftsMap = emp.shiftsMap || {};
    const shiftsStr = dayKeys.map((k) => shiftsMap[k] || '').join(',');
    csv += [
      idx + 1,
      emp.dept || '',
      emp.id || '',
      emp.attendanceCode || '',
      emp.role || emp.type || '',
      '"' + (emp.name || '') + '"',
      shiftsStr,
      emp.activeTotalHours
    ].join(',') + '\n';
  });
  return '\uFEFF' + csv;
}

/** Tạo blob CSV và kích hoạt tải xuống (tách riêng để dễ mock khi test). */
export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// =====================================================================
// Ban xuat .xlsx thay CSV — khong lo delimiter, mo truc tiep bang Excel.
// =====================================================================
import * as XLSX from 'xlsx';

/** Chuyen mot o ca (string hoac object {shift, covering_store}) thanh chuoi hien thi. */
export function shiftCellText(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'object') {
    return String(v.shift || '') + (v.covering_store ? ' (' + v.covering_store + ')' : '');
  }
  return String(v);
}

export function buildOFCReportAOA({ list, dayKeys, dateLabels }) {
  const rows = [['STT', 'Cửa Hàng', 'Mã nhân Viên', 'Mã Điểm Danh', 'Vị Trí', 'Họ và Tên', ...dateLabels, 'Tổng giờ làm']];
  list.forEach((emp, idx) => {
    const m = emp.shiftsMap || {};
    rows.push([
      idx + 1, emp.dept || '', emp.id || '', emp.attendanceCode || '',
      emp.role || emp.type || '', emp.name || '',
      ...dayKeys.map(k => shiftCellText(m[k])),
      emp.activeTotalHours ?? ''
    ]);
  });
  return rows;
}

export function downloadOFCReportXlsx(params, filename) {
  const ws = XLSX.utils.aoa_to_sheet(buildOFCReportAOA(params));
  ws['!cols'] = [
    { wch: 5 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 26 },
    ...(params.dateLabels || []).map(() => ({ wch: 13 })),
    { wch: 11 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bao cao');
  const out = String(filename || 'BaoCao.xlsx').replace(/\.csv$/i, '') + (String(filename).toLowerCase().endsWith('.xlsx') ? '' : '.xlsx');
  XLSX.writeFile(wb, out);
  return out;
}
