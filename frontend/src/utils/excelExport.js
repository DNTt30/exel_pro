import { SHIFTS } from '../data/initialData';
import { normalizeShift } from './shiftHelper';

/**
 * Xuất lịch làm việc ra file Excel (.xls) có đầy đủ định dạng bảng biểu, màu sắc ca làm việc,
 * header ngày tháng chi tiết và KHÔNG bị lỗi Excel tự động chuyển 6-14 thành ngày tháng (14-Jun).
 */
export function exportScheduleToExcel({ currentWeek, deptName, groupedEmps, weekSchedule, viewMode = 'week' }) {
  const parts = currentWeek.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const weekStartDate = new Date(y, m - 1, d);

  // Tạo danh sách 7 ngày kèm ngày/tháng cụ thể
  const dayColumns = WEEK_DAYS.map((dayKey, idx) => {
    const dateObj = new Date(weekStartDate);
    dateObj.setDate(weekStartDate.getDate() + idx);
    const dNum = dateObj.getDate().toString().padStart(2, '0');
    const mNum = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    return {
      dayKey,
      dateStr: `${dNum}/${mNum}`,
      header: `${dayKey} (${dNum}/${mNum})`
    };
  });

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const startStr = `${weekStartDate.getDate().toString().padStart(2, '0')}/${(weekStartDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const endStr = `${weekEndDate.getDate().toString().padStart(2, '0')}/${(weekEndDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const weekRangeLabel = `${startStr} → ${endStr}/${y}`;

  // Helper lấy class/style màu cho ca làm việc
  const getShiftStyle = (rawVal) => {
    if (!rawVal) return 'color: #94a3b8;';
    const { shift, covering_store } = normalizeShift(rawVal);
    if (!shift || shift === 'off') return 'color: #94a3b8;';
    if (covering_store) return 'background-color: #fef08a; color: #854d0e; font-weight: bold;'; // Chi viện
    if (shift === '6-14') return 'background-color: #bbf7d0; color: #166534; font-weight: bold;';
    if (shift === '14-22') return 'background-color: #bfdbfe; color: #1e40af; font-weight: bold;';
    if (shift === '10-18') return 'background-color: #fed7aa; color: #9a3412; font-weight: bold;';
    if (shift === '22-6') return 'background-color: #fecaca; color: #991b1b; font-weight: bold;';
    return 'background-color: #e2e8f0; color: #334155; font-weight: bold;';
  };

  let rowsHtml = '';
  let globalIndex = 1;

  Object.entries(groupedEmps).forEach(([dept, emps]) => {
    // Header Cửa Hàng
    rowsHtml += `
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${dayColumns.length + 6}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${dept} (${emps.length} nhân sự)
        </td>
      </tr>
    `;

    emps.forEach((emp) => {
      const empSched = weekSchedule[emp.id] || {};
      let totalH = 0;
      let shiftCount = 0;

      const dayCells = dayColumns.map(col => {
        const rawVal = empSched[col.dayKey] || '';
        const { shift, covering_store } = normalizeShift(rawVal);
        
        if (shift && shift !== 'off') {
          shiftCount++;
          if (SHIFTS[shift]) totalH += SHIFTS[shift].hours;
          else {
            const match = shift.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
            if (match) {
              let sH = parseInt(match[1], 10);
              let eH = parseInt(match[2], 10);
              if (eH < sH) eH += 24;
              totalH += (eH - sH);
            }
          }
        }
        const style = getShiftStyle(rawVal);
        const display = covering_store ? `${shift} ${covering_store}` : (shift || '-');
        // mso-number-format: "\@" đảm bảo Excel đọc đúng dạng Text, không biến 6-14 thành 14-Jun
        return `<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${style}">${display}</td>`;
      }).join('');

      const isPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));
      const isOver = isPT && totalH > 23;
      const totalStyle = isOver 
        ? 'background-color: #fee2e2; color: #b91c1c; font-weight: bold;' 
        : 'background-color: #f8fafc; color: #1e40af; font-weight: bold;';

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${globalIndex++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${emp.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${emp.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center;">${emp.role || emp.type || 'STPT'}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; color: #2563eb;">${emp.dept || dept}</td>
          ${dayCells}
          <td style="border: 1px solid #94a3b8; text-align: center; ${totalStyle}">${isOver ? '⚠️ ' : ''}${totalH}h</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f8fafc;">${shiftCount} ca</td>
        </tr>
      `;
    });
  });

  const html = `
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
            <th colspan="${dayColumns.length + 7}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG PHÂN CÔNG LỊCH LÀM VIỆC - TUẦN: ${weekRangeLabel}
            </th>
          </tr>
          <tr>
            <th colspan="${dayColumns.length + 7}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${deptName || 'Toàn bộ cửa hàng'}</strong> | Ngày xuất file: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 45px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 90px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 180px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 70px; border: 1px solid #94a3b8;">Vị trí</th>
            <th style="width: 80px; border: 1px solid #94a3b8;">Cửa hàng</th>
            ${dayColumns.map(col => `<th style="width: 75px; border: 1px solid #94a3b8; ${col.dayKey === 'CN' ? 'background-color: #fed7aa; color: #9a3412;' : ''}">${col.header}</th>`).join('')}
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Tổng giờ</th>
            <th style="width: 60px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Số ca</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Lich_Lam_Viec_${deptName || 'OFC'}_${currentWeek}.xls`;
  link.click();
}

/**
 * Xuất bảng chấm công (31 ngày chu kỳ 26-25) ra file Excel (.xls) có kẻ bảng, màu sắc và bảo vệ text.
 */
export function exportTimesheetToExcel({ currentWeek, deptName, groupedEmps, getDayValue, activeDays, filterOnlyMe, currentUserId }) {
  let rowsHtml = '';
  let globalIndex = 1;

  Object.entries(groupedEmps).forEach(([dept, emps]) => {
    const filtered = filterOnlyMe ? emps.filter(e => e.id === currentUserId) : emps;
    if (filtered.length === 0) return;

    rowsHtml += `
      <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e3a8a;">
        <td colspan="${activeDays.length + 8}" style="text-align: left; padding: 8px 12px; font-size: 11pt; border: 1px solid #94a3b8;">
          🏬 CỬA HÀNG: ${dept} (${filtered.length} nhân sự)
        </td>
      </tr>
    `;

    filtered.forEach((emp) => {
      let total = 0;
      let ftTotal = 0;
      let ptTotal = 0;
      let klCount = 0;

      const isPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));

      const dayCells = activeDays.map(day => {
        const val = getDayValue ? getDayValue(emp.id, day) : '';
        let cellStyle = 'color: #94a3b8;';
        let displayVal = val || '-';

        if (val && val !== 'OFF') {
          const num = parseFloat(val);
          const hrs = isNaN(num) ? 8 : num;
          total += hrs;
          if (isPT) ptTotal += hrs;
          else ftTotal += hrs;

          if (val === '6-14') cellStyle = 'background-color: #bbf7d0; color: #166534; font-weight: bold;';
          else if (val === '14-22') cellStyle = 'background-color: #bfdbfe; color: #1e40af; font-weight: bold;';
          else if (val === '10-18') cellStyle = 'background-color: #fed7aa; color: #9a3412; font-weight: bold;';
          else if (val === '22-6') cellStyle = 'background-color: #fecaca; color: #991b1b; font-weight: bold;';
          else cellStyle = 'background-color: #e2e8f0; color: #1e293b; font-weight: bold;';
        } else if (val === 'KL') {
          klCount++;
          cellStyle = 'background-color: #fee2e2; color: #b91c1c; font-weight: bold;';
        }

        return `<td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@'; ${cellStyle}">${displayVal}</td>`;
      }).join('');

      const isOver91 = isPT && total > 91;
      const ptStyle = isOver91 ? 'background-color: #fee2e2; color: #b91c1c; font-weight: bold;' : 'background-color: #f8fafc; font-weight: bold;';

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #94a3b8; text-align: center; mso-number-format: '\\@';">${globalIndex++}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; mso-number-format: '\\@';">${emp.id}</td>
          <td style="border: 1px solid #94a3b8; text-align: left; font-weight: bold; padding-left: 8px;">${emp.name}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; color: #2563eb; font-weight: bold;">${dept}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${emp.role || emp.type || 'STPT'}</td>
          ${dayCells}
          <td style="border: 1px solid #94a3b8; text-align: center; background-color: #f8fafc; font-weight: bold;">${!isPT ? (total / 8).toFixed(1) : '-'}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; ${ptStyle}">${isPT ? (isOver91 ? `⚠️ ${total}h` : `${total}h`) : '-'}</td>
          <td style="border: 1px solid #94a3b8; text-align: center; font-weight: bold; background-color: #f1f5f9; color: #1e40af;">${total}h</td>
        </tr>
      `;
    });
  });

  const html = `
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
            <th colspan="${activeDays.length + 8}" class="main-title" style="border: 1px solid #1e3a8a;">
              BẢNG CHẤM CÔNG CHU KỲ (26 THÁNG TRƯỚC → 25 THÁNG NÀY)
            </th>
          </tr>
          <tr>
            <th colspan="${activeDays.length + 8}" class="sub-info" style="border: 1px solid #cbd5e1;">
              Cửa hàng: <strong>${deptName || 'Toàn bộ cửa hàng'}</strong> | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị: Chuỗi Cửa Hàng OFC
            </th>
          </tr>
          <tr style="background-color: #cbd5e1;">
            <th style="width: 40px; border: 1px solid #94a3b8;">STT</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Mã NV</th>
            <th style="width: 170px; text-align: left; padding-left: 8px; border: 1px solid #94a3b8;">Họ và Tên</th>
            <th style="width: 75px; border: 1px solid #94a3b8;">Bộ phận</th>
            <th style="width: 85px; border: 1px solid #94a3b8;">Vị trí</th>
            ${activeDays.map(day => `<th style="width: 45px; border: 1px solid #94a3b8;">${day}</th>`).join('')}
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công FT</th>
            <th style="width: 65px; border: 1px solid #94a3b8; background-color: #94a3b8; color: #ffffff;">Công PT</th>
            <th style="width: 75px; border: 1px solid #94a3b8; background-color: #1e3a8a; color: #ffffff;">Tổng cộng</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Bang_Cham_Cong_${deptName || 'OFC'}_${currentWeek}.xls`;
  link.click();
}
