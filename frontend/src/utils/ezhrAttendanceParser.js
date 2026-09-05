import { getShiftCode, getShiftHours } from './shiftHelper';

/**
 * Chuẩn hóa giá trị ô công thực tế từ ezHR9:
 * - Số hoặc chuỗi số: '7,84', '7.84', 8, '8h' -> { hours: 7.84, note: '' }
 * - Chấm 0: '0', '0h' -> { hours: 0, note: '' }
 * - Chấm nghỉ: 'OFF' -> { hours: 0, note: 'OFF' }
 * - Mã phép: 'AL', 'PL', 'UL', 'SL', 'CL'... -> { hours: null, note: 'AL' }
 * - Trống: '' hoặc '-' -> null
 */
export function normalizeAttendanceValue(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (str === '' || str === '-') return null;

  const upper = str.toUpperCase();
  if (upper === 'OFF') {
    return { hours: 0, note: 'OFF' };
  }
  if (upper === '0' || upper === '0H') {
    return { hours: 0, note: '' };
  }

  // Số lẻ có dấu phẩy hoặc dấu chấm: 7,84, 7.84, 8, 4.5, 7.84h...
  const normNum = str.replace(',', '.').toUpperCase();
  if (/^[0-9]+(\.[0-9]+)?(H)?$/i.test(normNum)) {
    const clean = normNum.replace(/H$/i, '');
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      const rounded = Math.round(num * 100) / 100;
      return { hours: rounded, note: '' };
    }
  }

  // Mã ca nếu có (ví dụ: '6-14', '14-22', '8-17')
  const shiftCode = getShiftCode(upper);
  if (shiftCode && shiftCode !== 'OFF' && shiftCode !== 'off') {
    const shHours = getShiftHours(shiftCode);
    if (shHours > 0) {
      return { hours: shHours, note: '' };
    }
  }

  // Mã phép / chữ: AL, PL, UL, SL, KL, CL, AL_H...
  return { hours: null, note: upper };
}

/**
 * Tìm cột tương ứng trong header
 */
function findCol(headers, regexList) {
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c] || '').trim().toLowerCase();
    for (const rgx of regexList) {
      if (rgx.test(h)) return c;
    }
  }
  return -1;
}

/**
 * Phân tích file Excel ezHR9 (nhận cả dạng ma trận ngang và dạng danh sách dọc)
 * @param {Array<Array>} rows - Mảng 2 chiều từ sheet_to_json(sheet, { header: 1 })
 * @param {Array} cycleDates - Danh sách ngày chu kỳ lương [d0, d1... d30]
 * @param {Array} employees - Danh sách nhân viên trong hệ thống
 * @param {Object} schedule - Dữ liệu lịch tuần hiện tại
 * @returns {Object} Kết quả phân tích chi tiết kèm dữ liệu đối soát
 */
export function parseEzHRAttendance({ rows, cycleDates = [], employees = [], schedule = {} }) {
  if (!rows || rows.length < 2) {
    return {
      success: false,
      error: 'File Excel không có dữ liệu hoặc không đủ số dòng!',
      records: [],
      stats: { totalCells: 0, totalHours: 0, matchedCount: 0, diffCount: 0 }
    };
  }

  // 1. Quét tìm dòng tiêu đề (Header Row) trong 15 dòng đầu
  let headerRowIdx = -1;
  let idCol = -1;
  let nameCol = -1;
  let dateCol = -1;
  let hoursCol = -1;
  let statusCol = -1;

  // Bản đồ cột ngày cho dạng Ma trận (cột index -> cellDate)
  let matrixDateMap = {};

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r].map(c => String(c || '').trim());
    
    // Tìm các cột cơ bản
    const curIdCol = findCol(row, [/mã.*nv/i, /mã.*nhân/i, /mã.*cc/i, /mã.*chấm/i, /^manv$/i, /^id$/i, /^mã$/i]);
    const curNameCol = findCol(row, [/họ.*tên/i, /họ.*và.*tên/i, /^tên$/i, /^name$/i, /nhân.*viên/i]);
    const curDateCol = findCol(row, [/ngày.*làm/i, /ngày.*công/i, /^ngày$/i, /^date$/i, /work.*date/i]);
    const curHoursCol = findCol(row, [/tổng.*giờ/i, /giờ.*công/i, /công.*thực/i, /số.*giờ/i, /thực.*tế/i, /actual/i, /hours/i]);
    const curStatusCol = findCol(row, [/ghi.*chú/i, /trạng.*thái/i, /mã.*ca/i, /note/i, /status/i]);

    if (curIdCol !== -1 || (curNameCol !== -1 && (curDateCol !== -1 || curHoursCol !== -1))) {
      headerRowIdx = r;
      idCol = curIdCol;
      nameCol = curNameCol;
      dateCol = curDateCol;
      hoursCol = curHoursCol;
      statusCol = curStatusCol;

      // Kiểm tra xem có các cột ngày theo dạng Ma trận (Grid Matrix) không
      const tempMatrixMap = {};
      row.forEach((cellVal, cIdx) => {
        if (cIdx === idCol || cIdx === nameCol || cIdx === dateCol) return;
        const cellStr = cellVal.replace(/\r?\n/g, ' ').trim();
        
        // Dò ngày tương ứng trong cycleDates
        for (const cd of cycleDates) {
          if (!cd.fullDateStr) continue;
          const [yyyy, mm, dd] = cd.fullDateStr.split('-');
          const dayNum = parseInt(dd, 10);
          
          // Khớp dạng: '26', '26/08', '26/8', '26/08/2026', '2026-08-26'
          const regexExact = new RegExp(`(^|\\D)0?${dayNum}(\\/0?${parseInt(mm, 10)})?(\\/${yyyy})?($|\\D)`);
          if (
            cellStr === String(dayNum) || 
            cellStr === cd.shortDisplay || 
            cellStr === cd.display || 
            cellStr === cd.fullDateStr ||
            regexExact.test(cellStr)
          ) {
            tempMatrixMap[cIdx] = cd;
            break;
          }
        }
      });

      if (Object.keys(tempMatrixMap).length >= 3) {
        matrixDateMap = tempMatrixMap;
        break;
      }

      if (dateCol !== -1 && (hoursCol !== -1 || statusCol !== -1)) {
        // Đây là dạng danh sách dòng chi tiết (Flat Rows)
        break;
      }
    }
  }

  if (headerRowIdx === -1 || (idCol === -1 && nameCol === -1)) {
    return {
      success: false,
      error: 'Không tìm thấy dòng tiêu đề hợp lệ (cần có cột Mã nhân viên hoặc Họ tên)!',
      records: [],
      stats: { totalCells: 0, totalHours: 0, matchedCount: 0, diffCount: 0 }
    };
  }

  // Tạo index tra cứu nhân viên nhanh: theo ID, mã chấm công, họ tên
  const empMapById = new Map();
  const empMapByName = new Map();
  employees.forEach(e => {
    if (e.id) empMapById.set(String(e.id).trim().toUpperCase(), e);
    if (e.attendanceCode) empMapById.set(String(e.attendanceCode).trim().toUpperCase(), e);
    if (e.name) empMapByName.set(String(e.name).trim().toUpperCase(), e);
  });

  const isMatrixFormat = Object.keys(matrixDateMap).length >= 3;
  const records = [];
  const unmatchedEmployees = [];
  let totalHoursSum = 0;
  let diffCount = 0;
  let otCount = 0;
  let underCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  // 2. Phân tích từng dòng dữ liệu
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawId = idCol !== -1 ? String(row[idCol] || '').trim() : '';
    const rawName = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';

    // Bỏ qua dòng trống hoặc dòng tổng cộng / footer
    if (!rawId && !rawName) continue;
    if (rawName.toLowerCase().includes('tổng cộng') || rawName.toLowerCase().includes('total') || rawId.toLowerCase().includes('total')) {
      continue;
    }

    // Khớp nhân viên
    let matchedEmp = empMapById.get(rawId.toUpperCase());
    if (!matchedEmp && rawName) {
      matchedEmp = empMapByName.get(rawName.toUpperCase());
    }

    if (!matchedEmp) {
      unmatchedEmployees.push({ rowIdx: r + 1, rawId, rawName });
      continue;
    }

    // --- DẠNG 1: BẢNG MA TRẬN THEO NGÀY (MATRIX) ---
    if (isMatrixFormat) {
      Object.entries(matrixDateMap).forEach(([cIdxStr, cellDate]) => {
        const cIdx = parseInt(cIdxStr, 10);
        const cellRaw = row[cIdx];
        const normalized = normalizeAttendanceValue(cellRaw);
        if (!normalized) return; // Ô trống thì giữ nguyên theo lịch

        // So sánh với lịch xếp kế hoạch
        const rawSched = schedule[cellDate.weekKey]?.[matchedEmp.id]?.[cellDate.dayKey] || '';
        const schedCode = getShiftCode(rawSched);
        const isSchedOff = !schedCode || schedCode === 'OFF' || schedCode === 'off';
        const plannedHours = isSchedOff ? 0 : getShiftHours(schedCode);

        const actualHours = normalized.hours;
        const note = normalized.note || '';

        // Đánh giá độ lệch
        let diff = 0;
        let status = 'MATCH';

        if (note && note !== 'OFF') {
          status = 'LEAVE';
          leaveCount++;
        } else if (note === 'OFF' || actualHours === 0) {
          if (!isSchedOff && plannedHours > 0) {
            status = 'ABSENT'; // Có lịch nhưng thực tế nghỉ
            diff = -plannedHours;
            absentCount++;
            diffCount++;
          } else {
            status = 'OFF_MATCH';
          }
        } else if (actualHours !== null) {
          diff = Math.round((actualHours - plannedHours) * 100) / 100;
          totalHoursSum += actualHours;

          if (isSchedOff) {
            status = 'OFF_WORK'; // Đi làm ngày nghỉ / tăng ca
            otCount++;
            diffCount++;
          } else if (diff > 0.05) {
            status = 'OVER'; // Làm thêm giờ
            otCount++;
            diffCount++;
          } else if (diff < -0.05) {
            status = 'UNDER'; // Về sớm / thiếu giờ (vd: 7.84 vs 8)
            underCount++;
            diffCount++;
          } else {
            status = 'MATCH';
          }
        }

        records.push({
          empId: matchedEmp.id,
          empName: matchedEmp.name,
          empDept: matchedEmp.dept,
          workDate: cellDate.fullDateStr,
          dayKey: cellDate.dayKey,
          shortDisplay: cellDate.shortDisplay,
          actualHours,
          note,
          plannedShift: rawSched || (isSchedOff ? 'OFF' : 'Ca ngày'),
          plannedHours,
          diff,
          status
        });
      });
    } 
    // --- DẠNG 2: DANH SÁCH DÒNG CHI TIẾT (FLAT ROWS) ---
    else if (dateCol !== -1) {
      const rawDateStr = String(row[dateCol] || '').trim();
      const rawVal = hoursCol !== -1 ? row[hoursCol] : (statusCol !== -1 ? row[statusCol] : '');
      const normalized = normalizeAttendanceValue(rawVal);
      if (!normalized) continue;

      // Dò ngày tương ứng trong cycleDates
      let targetCellDate = null;
      for (const cd of cycleDates) {
        if (!cd.fullDateStr) continue;
        const [yyyy, mm, dd] = cd.fullDateStr.split('-');
        if (
          rawDateStr === cd.fullDateStr || 
          rawDateStr === cd.display || 
          rawDateStr.includes(cd.fullDateStr) ||
          rawDateStr === `${dd}/${mm}` ||
          rawDateStr === `${dd}/${mm}/${yyyy}`
        ) {
          targetCellDate = cd;
          break;
        }
      }

      if (!targetCellDate) continue;

      const rawSched = schedule[targetCellDate.weekKey]?.[matchedEmp.id]?.[targetCellDate.dayKey] || '';
      const schedCode = getShiftCode(rawSched);
      const isSchedOff = !schedCode || schedCode === 'OFF' || schedCode === 'off';
      const plannedHours = isSchedOff ? 0 : getShiftHours(schedCode);

      const actualHours = normalized.hours;
      const note = normalized.note || '';

      let diff = 0;
      let status = 'MATCH';
      if (note && note !== 'OFF') {
        status = 'LEAVE';
        leaveCount++;
      } else if (note === 'OFF' || actualHours === 0) {
        if (!isSchedOff && plannedHours > 0) {
          status = 'ABSENT';
          diff = -plannedHours;
          absentCount++;
          diffCount++;
        }
      } else if (actualHours !== null) {
        diff = Math.round((actualHours - plannedHours) * 100) / 100;
        totalHoursSum += actualHours;
        if (isSchedOff) { status = 'OFF_WORK'; otCount++; diffCount++; }
        else if (diff > 0.05) { status = 'OVER'; otCount++; diffCount++; }
        else if (diff < -0.05) { status = 'UNDER'; underCount++; diffCount++; }
      }

      records.push({
        empId: matchedEmp.id,
        empName: matchedEmp.name,
        empDept: matchedEmp.dept,
        workDate: targetCellDate.fullDateStr,
        dayKey: targetCellDate.dayKey,
        shortDisplay: targetCellDate.shortDisplay,
        actualHours,
        note,
        plannedShift: rawSched || (isSchedOff ? 'OFF' : 'Ca ngày'),
        plannedHours,
        diff,
        status
      });
    }
  }

  const uniqueEmpsCount = new Set(records.map(r => r.empId)).size;

  return {
    success: records.length > 0,
    format: isMatrixFormat ? 'MATRIX' : 'FLAT_LIST',
    totalRecords: records.length,
    matchedEmployeesCount: uniqueEmpsCount,
    unmatchedEmployees,
    records,
    stats: {
      totalCells: records.length,
      totalHours: Math.round(totalHoursSum * 100) / 100,
      matchedCount: uniqueEmpsCount,
      diffCount,
      otCount,
      underCount,
      absentCount,
      leaveCount
    }
  };
}
