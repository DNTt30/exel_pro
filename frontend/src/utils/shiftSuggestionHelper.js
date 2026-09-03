import { WEEK_DAYS, SCHEDULE_RULES } from '../data/constants';
import { getShiftHours, normalizeShift } from './shiftHelper';

/**
 * Thuật toán sinh lịch gợi ý thông minh cho nhân viên
 * @param {Object} params
 * @param {Object} params.emp - Thông tin nhân viên (type, role, id, name)
 * @param {string} params.preferredShift - '6-14' (Sáng), '14-22' (Chiều), '22-6' (Đêm), hoặc 'any' (Linh hoạt)
 * @param {string[]} params.busyDays - Danh sách các ngày bận học / bận việc không thể đi làm (ví dụ: ['T3', 'T5'])
 * @returns {Object} { suggestedShifts: { T2: '6-14', ... }, totalHours: number, totalShifts: number }
 */
export function generateEmployeeSuggestedSchedule({ emp, preferredShift = 'any', busyDays = [] }) {
  const empType = String(emp?.type || '').toUpperCase();
  const empRole = String(emp?.role || '').toUpperCase();
  const isPT = empType.includes('PT') || empRole.includes('PT');

  const busySet = new Set(busyDays);
  const availableDays = WEEK_DAYS.filter(d => !busySet.has(d));

  const suggestedShifts = {};
  WEEK_DAYS.forEach(d => {
    suggestedShifts[d] = 'off';
  });

  const getShiftForDay = (dayKey, prevShift) => {
    if (preferredShift !== 'any') {
      return preferredShift;
    }
    // Tránh ca đêm (22-6) nối tiếp ca sáng (6-14)
    if (prevShift === '22-6') {
      return '14-22';
    }
    // Mặc định xoay giữa 6-14 và 14-22
    return dayKey === 'T7' || dayKey === 'CN' ? '14-22' : '6-14';
  };

  if (isPT) {
    // Part-time: Định mức 16h - 23h/tuần (Tối ưu là 2 ca 8h = 16h, hoặc 2 ca 8h + 1 ca ngắn nếu cần)
    // Chọn tối đa 2 đến 3 ca sao cho tổng giờ <= 23h
    const daysToAssign = availableDays.slice(0, Math.min(availableDays.length, 2));
    let prev = '';
    daysToAssign.forEach(d => {
      const shift = getShiftForDay(d, prev);
      suggestedShifts[d] = shift;
      prev = shift;
    });
  } else {
    // Full-time: Định mức tối thiểu 48h/tuần (đúng 6 ca x 8h) và 1 ngày OFF
    // Nếu nhân viên có ngày bận, ưu tiên ngày bận đó làm ngày OFF
    let offDay = busyDays.length > 0 ? busyDays[0] : 'CN';
    if (!WEEK_DAYS.includes(offDay)) offDay = 'CN';

    let assignedCount = 0;
    let prev = '';
    WEEK_DAYS.forEach(d => {
      if (d === offDay || assignedCount >= 6) {
        suggestedShifts[d] = 'off';
      } else {
        const shift = getShiftForDay(d, prev);
        suggestedShifts[d] = shift;
        prev = shift;
        assignedCount++;
      }
    });

    // Nếu vẫn chưa đủ 6 ca do có quá nhiều ngày bận, cố gắng lấp vào các ngày còn lại
    if (assignedCount < 6) {
      for (const d of WEEK_DAYS) {
        if (assignedCount >= 6) break;
        if (suggestedShifts[d] === 'off' && d !== offDay) {
          suggestedShifts[d] = getShiftForDay(d, prev);
          assignedCount++;
        }
      }
    }
  }

  let totalHours = 0;
  let totalShifts = 0;
  WEEK_DAYS.forEach(d => {
    const s = suggestedShifts[d];
    if (s && s !== 'off') {
      totalShifts++;
      totalHours += getShiftHours(s);
    }
  });

  return {
    suggestedShifts,
    totalHours,
    totalShifts
  };
}

/**
 * Phân tích và xếp hạng đồng nghiệp phù hợp nhất để đổi ca
 * @param {Object} params
 * @param {string} params.myDayKey - Ngày bản thân muốn đổi ca (ví dụ: 'T3')
 * @param {number} params.myShiftHours - Số giờ của ca mình muốn giao (ví dụ: 8)
 * @param {Array} params.colleagues - Danh sách đồng nghiệp cùng cửa hàng
 * @param {Object} params.weekSched - Dữ liệu lịch của toàn bộ nhân viên trong tuần
 * @returns {Array} Danh sách đồng nghiệp đã được xếp hạng kèm huy hiệu gợi ý
 */
export function rankSwapPartners({ myDayKey, myShiftHours = 8, colleagues = [], weekSched = {} }) {
  const ranked = colleagues.map(colleague => {
    const cSched = weekSched[colleague.id] || {};
    const rawVal = cSched[myDayKey];
    const { shift } = normalizeShift(rawVal);
    const isColleagueOffThatDay = !shift || shift === 'off';

    // Tính tổng giờ hiện tại của đồng nghiệp
    let currentHours = 0;
    WEEK_DAYS.forEach(d => {
      const { shift: s } = normalizeShift(cSched[d]);
      if (s && s !== 'off') currentHours += getShiftHours(s);
    });

    const isColleaguePT = String(colleague.type || colleague.role || '').toUpperCase().includes('PT');
    const hoursAfterTakingShift = currentHours + myShiftHours;
    const willExceedPTLimit = isColleaguePT && hoursAfterTakingShift > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK;

    let score = 0;
    let badge = '';
    let badgeType = 'default';

    if (isColleagueOffThatDay && !willExceedPTLimit) {
      score = 100;
      badge = '⭐ Gợi ý số 1 (Đang OFF & Đúng định mức)';
      badgeType = 'recommended';
    } else if (isColleagueOffThatDay && willExceedPTLimit) {
      score = 40;
      badge = '⚠️ Đang OFF nhưng nhận ca sẽ vượt 23h';
      badgeType = 'warning';
    } else if (!isColleagueOffThatDay) {
      score = 10;
      badge = `Đang có ca ${shift}`;
      badgeType = 'busy';
    }

    return {
      ...colleague,
      swapScore: score,
      swapBadge: badge,
      badgeType,
      isOffOnDay: isColleagueOffThatDay,
      currentHours,
      hoursAfterTakingShift
    };
  });

  // Sắp xếp người có điểm cao nhất lên đầu
  return ranked.sort((a, b) => b.swapScore - a.swapScore);
}
