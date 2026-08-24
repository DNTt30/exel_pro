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
