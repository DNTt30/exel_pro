import { normalizeShift } from './shiftHelper';
import { WEEK_DAYS } from '../data/constants';

/**
 * Xuất lịch làm việc ra file Excel (.xls) có đầy đủ định dạng bảng biểu, màu sắc ca làm việc,
 * header ngày tháng chi tiết và KHÔNG bị lỗi Excel tự động chuyển 6-14 thành ngày tháng.
 */
export function exportScheduleToExcel({ currentWeek, deptName, groupedEmps, weekSchedule, userName = 'OFC' }) {
  const parts = currentWeek.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  const dayNameMap = {'T2':'THỨ HAI', 'T3':'THỨ BA', 'T4':'THỨ TƯ', 'T5':'THỨ NĂM', 'T6':'THỨ SÁU', 'T7':'THỨ BẢY', 'CN':'CHỦ NHẬT'};
  
  const weekStartDate = new Date(y, m - 1, d);

  // Tạo header 7 ngày
  const dayColumns = WEEK_DAYS.map((dayKey, idx) => {
    const dateObj = new Date(weekStartDate);
    dateObj.setDate(weekStartDate.getDate() + idx);
    const dNum = dateObj.getDate().toString();
    const dPad = dNum.padStart(2, '0');
    const mNum = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const yNum = dateObj.getFullYear();
    
    // Ngày đầu tuần hiển thị full năm: 24/8/2026, các ngày sau hiển thị 25/08
    const dateStr = idx === 0 ? `${dNum}/${dateObj.getMonth() + 1}/${yNum}` : `${dPad}/${mNum}`;
    
    return {
      dayKey,
      html: `${dateStr}<br/>${dayNameMap[dayKey]}`
    };
  });

  // Khớp màu ca theo đúng Excel Template
  const getShiftStyle = (rawVal, empType) => {
    if (!rawVal) return 'background-color: #FFFFFF; color: #000000;';
    const { shift, covering_store } = normalizeShift(rawVal);
    if (!shift || shift.toLowerCase() === 'off') return 'background-color: #FFFFFF; color: #000000;';
    
    if (covering_store) return 'background-color: #FFFF00; color: #000000; font-weight: bold;'; // Hỗ trợ (Vàng)
    
    const s = shift.toLowerCase();
    
    // Ca 1 (Sáng): Xanh lá #00FF00
    if (['6-14', '5-14', '6-10', '10-14', '5-10', '6-12', '14-18h'].includes(s) || s.startsWith('6-') || s.startsWith('5-') || s === '10-14') {
      return 'background-color: #00FF00; color: #000000; font-weight: bold;';
    }
    // Ca 2 (Chiều): Xanh lơ #00FFFF
    if (['14-22', '14-18', '18-22', '10-18', '14-22/22-6', '14h-18h'].includes(s) || s.startsWith('14-') || s.startsWith('18-') || s.startsWith('10-18')) {
      return 'background-color: #00FFFF; color: #000000; font-weight: bold;';
    }
    // Ca 3 (Đêm): Xanh dương đậm #4169E1
    if (['22-6', '12-20'].includes(s) || s.startsWith('22-')) {
      return 'background-color: #4169E1; color: #FFFFFF; font-weight: bold;';
    }
    
    // CSR NEW (Đỏ) - nếu có vai trò đặc biệt
    if (empType === 'CSR_NEW' || empType === 'CSR NEW') {
      return 'background-color: #FF0000; color: #FFFFFF; font-weight: bold;';
    }

    return 'background-color: #FFFFFF; color: #000000; font-weight: bold;';
  };

  let rowsHtml = '';

  Object.entries(groupedEmps).forEach(([dept, emps]) => {
    // Header dòng của từng cửa hàng
    rowsHtml += `
      <tr style="background-color: #92D050; font-weight: bold; text-align: center;">
        <td style="border: 1px solid #000000; width: 100px;">Mã nhân viên</td>
        <td style="border: 1px solid #000000; width: 180px;">Họ và Tên</td>
        <td style="border: 1px solid #000000; width: 80px;">Phòng ban</td>
        <td style="border: 1px solid #000000; width: 80px;">Loại NV</td>
        ${dayColumns.map(col => `<td style="border: 1px solid #000000; width: 80px;">${col.html}</td>`).join('')}
      </tr>
    `;

    emps.forEach((emp) => {
      const empSched = weekSchedule[emp.id] || {};

      const dayCells = dayColumns.map(col => {
        const rawVal = empSched[col.dayKey] || '';
        const { shift, covering_store } = normalizeShift(rawVal);
        let display = shift === 'off' ? 'off' : shift;
        if (covering_store) display += ` ${covering_store}`;
        
        let style = getShiftStyle(rawVal, emp.type);
        
        return `<td style="border: 1px solid #000000; text-align: center; mso-number-format: '\\@'; ${style}">${display || ''}</td>`;
      }).join('');

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #000000; text-align: left; mso-number-format: '\\@';">${emp.id}</td>
          <td style="border: 1px solid #000000; text-align: left; padding-left: 5px;">${emp.name}</td>
          <td style="border: 1px solid #000000; text-align: left;">${emp.dept || dept}</td>
          <td style="border: 1px solid #000000; text-align: left;">${emp.role || emp.type || 'STPT'}</td>
          ${dayCells}
        </tr>
      `;
    });

    // Thêm các dòng trống giữa các cửa hàng (để giống template)
    rowsHtml += `
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
      <tr><td colspan="11"></td></tr>
    `;
  });

  const html = `
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
          <td colspan="4" style="font-weight: bold; font-size: 12pt; text-align: left;">Lịch làm việc SM ${userName}</td>
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
        ${rowsHtml}
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

      const isPT = emp.type === 'PARTTIME' || emp.type === 'STPT' || (emp.role && emp.role.includes('PT'));

      const dayCells = activeDays.map(day => {
        const val = getDayValue ? getDayValue(emp.id, day) : '';
        let cellStyle = 'color: #94a3b8;';
        let displayVal = val || '-';

        if (val && val !== 'OFF' && val !== 'off') {
          const num = parseFloat(val);
          let hrs = 0;
          if (!isNaN(num)) {
            hrs = num;
          } else {
            const u = String(val).trim().toUpperCase();
            if (u === 'AL' || u === 'PL') hrs = 8;
            else if (u === 'AL_H' || u === 'PL_H') hrs = 4;
            else hrs = 0; // UL, KL, NS, v.v..
          }
          
          total += hrs;
          if (isPT) ptTotal += hrs;
          else ftTotal += hrs;

          if (val === '6-14') cellStyle = 'background-color: #bbf7d0; color: #166534; font-weight: bold;';
          else if (val === '14-22') cellStyle = 'background-color: #bfdbfe; color: #1e40af; font-weight: bold;';
          else if (val === '10-18') cellStyle = 'background-color: #fed7aa; color: #9a3412; font-weight: bold;';
          else if (val === '22-6') cellStyle = 'background-color: #fecaca; color: #991b1b; font-weight: bold;';
          else if (['KL', 'UL'].includes(String(val).toUpperCase())) cellStyle = 'background-color: #fee2e2; color: #b91c1c; font-weight: bold;';
          else cellStyle = 'background-color: #e2e8f0; color: #1e293b; font-weight: bold;';
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
