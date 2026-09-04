import { WEEK_DAYS, SCHEDULE_RULES, DEFAULT_STAFFING_MATRIX } from '../data/constants';
import { getShiftHours, normalizeShift, parseShiftTimeRange } from './shiftHelper';
import { lookupFfOnsiteRecipe, stripVi } from '../data/ffOnsiteRecipes';
import { tryAnswerWithData } from './copilotIntents';

const DAY_CODE_BY_JS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const OLLAMA_TIMEOUT_MS = 800;

function todayDayKey(date = new Date()) {
  return DAY_CODE_BY_JS[date.getDay()];
}

function shiftLine(raw) {
  const { shift, covering_store } = normalizeShift(raw);
  if (!shift || shift === 'off') return 'OFF';
  return covering_store ? `${shift} (hỗ trợ ${covering_store})` : shift;
}

function formatEmpWeek(emp, weekSchedule) {
  const empSched = weekSchedule[emp.id] || {};
  let totalH = 0;
  let totalShifts = 0;
  const shiftDetails = WEEK_DAYS.map(d => {
    const { shift, covering_store } = normalizeShift(empSched[d]);
    const hours = getShiftHours(shift);
    if (shift && shift !== 'off') {
      totalH += hours;
      totalShifts += 1;
    }
    const shiftStr = (!shift || shift === 'off')
      ? 'OFF'
      : (covering_store ? `${shift} (hỗ trợ ${covering_store})` : shift);
    return `• **${d}**: ${shiftStr}`;
  }).join('\n');

  const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME';
  const statusNote = isPT
    ? (totalH > 23 ? '⚠️ Vượt 23h/tuần!' : (totalH < 16 && totalH > 0 ? '⚠️ Chưa đủ 16h/tuần' : '✓ Định mức đạt'))
    : (totalH === 48 ? '✓ Đạt chuẩn 48h (6 ca)' : `Tổng: ${totalH}h / 48h`);

  return { totalH, totalShifts, shiftDetails, statusNote, empSched };
}

function isSelfAsk(q, qn) {
  return /(^| )(toi|minh|tui)( |$)/.test(` ${qn} `)
    || q.includes('của tôi')
    || q.includes('của mình')
    || q.includes('tôi làm')
    || q.includes('mình làm');
}

function firstNameOf(name) {
  const parts = String(name || '').toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function refersToLoggedIn(q, user) {
  if (!user?.id) return false;
  if (isSelfAsk(q, stripVi(q))) return true;
  const fn = firstNameOf(user.name);
  return (fn.length >= 2 && q.includes(fn)) || q.includes(String(user.id).toLowerCase());
}

function dayShiftAsk(q) {
  const aboutShift = q.includes('ca') || q.includes('làm') || q.includes('lịch') || q.includes('giờ');
  if (!aboutShift) return null;
  if (q.includes('mai') && !q.includes('hôm nay')) {
    return { key: DAY_CODE_BY_JS[(new Date().getDay() + 1) % 7], label: 'Ngày mai' };
  }
  if (q.includes('hôm qua')) {
    return { key: DAY_CODE_BY_JS[(new Date().getDay() + 6) % 7], label: 'Hôm qua' };
  }
  if (q.includes('hôm nay') || q.includes('ca mấy') || q.includes('mấy giờ') || q.includes('ca nào')) {
    return { key: todayDayKey(), label: 'Hôm nay' };
  }
  return null;
}

function mergeFollowUpQuestion(question, chatHistory) {
  const raw = String(question || '').trim();
  const compact = raw.toLowerCase();
  const isId = /^\d{6,12}$/.test(raw);
  const isShort = raw.split(/\s+/).length <= 4
    && !/công thức|pha |đổi ca|bù công|định mức/.test(compact);
  if (!isId && !isShort) return question;
  const lastUser = [...(chatHistory || [])].reverse().find(m => m.sender === 'user' && m.text);
  if (!lastUser) return question;
  return `${lastUser.text} ${raw}`;
}

function wantsHoursOnly(q) {
  return (q.includes('bao nhiêu') && (q.includes('giờ') || q.includes('công') || q.includes(' tiếng')))
    || q.includes('tổng giờ') || q.includes('tổng h');
}

function formatDayLead(emp, weekSchedule, currentWeek, dayAsk, q = '') {
  const packed = formatEmpWeek(emp, weekSchedule, currentWeek);
  const shift = shiftLine(packed.empSched[dayAsk.key]);
  let out = `${dayAsk.label} (${dayAsk.key}) ${emp.name}: ${shift}`;
  if (wantsHoursOnly(q)) {
    out += `\nTuần: ${packed.totalH}h / ${packed.totalShifts} ca`;
  }
  return out;
}

function compactText(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\n👉[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pendingSwapsOf(shiftSwaps) {
  const pending = new Set(['pending_partner', 'pending_manager', 'pending', 'approved_by_partner']);
  return (shiftSwaps || []).filter(s => pending.has(s.status));
}

function swapPeople(s, employees) {
  const fromId = s.fromEmpId || s.requester_id;
  const toId = s.toEmpId || s.target_id;
  const fromEmp = employees.find(e => e.id === fromId);
  const toEmp = employees.find(e => e.id === toId);
  return {
    fromName: s.fromEmpName || fromEmp?.name || fromId,
    toName: s.toEmpName || toEmp?.name || toId,
    fromShift: s.fromShift || s.requester_shift || '',
    toShift: s.toShift || s.target_shift || '',
    day: s.fromDay || s.date || ''
  };
}

/**
 * GS25 AI SCHEDULER & AUDITING ENGINE (V3.5 - TOÀN DIỆN TRI THỨC LUẬT LAO ĐỘNG & QUY CHẾ C&B GS25)
 */

/**
 * BỘ TRI THỨC LUẬT LAO ĐỘNG & QUY CHẾ NỘI BỘ GS25 (KNOWLEDGE BASE)
 */
export const GS25_LABOR_RULES_KNOWLEDGE = {
  // 1. Khung ca làm việc chuẩn tại hệ thống GS25 (Shift standard)
  shiftStandards: {
    title: 'Khung Ca Làm Việc Tiêu Chuẩn Chuỗi Cửa Hàng Tiện Lợi GS25',
    lawRef: 'Quy định Vận hành Tiện ích 24/7 GS25 Việt Nam',
    details: [
      '🕒 **Ca 8 tiếng (Ca chuẩn)**: Gồm ca Sáng (6:00 - 14:00), Chiều (14:00 - 22:00), Đêm (22:00 - 6:00) và ca Hành chính/Giao nhận (10:00 - 18:00). Phù hợp cho nhân viên Full-time (STFT) và Part-time đăng ký đủ ca.',
      '⏱️ **Ca 4 tiếng (Ca linh hoạt / Part-time)**: Gồm ca 6:00 - 10:00, 10:00 - 14:00, 14:00 - 18:00, 18:00 - 22:00. Tối ưu cho sinh viên xoay ca theo lịch học và bổ sung giờ cao điểm đông khách.',
      '🌙 **Ca đêm 8 tiếng (22:00 - 6:00)**: Phục vụ mô hình mở cửa xuyên suốt 24/7, luôn duy trì tối thiểu 1 nhân sự cứng trực quầy POS, trông coi an ninh và nhận hàng Fresh Food / Dry Food ca đêm.'
    ]
  },

  // 2. Nghỉ giữa ca (Break time)
  breakTime: {
    title: 'Quy định Thời gian Nghỉ giữa ca (Nghỉ ngơi, ăn uống)',
    lawRef: 'Điều 109 Bộ luật Lao động 2019 & Nội quy GS25',
    details: [
      '☕ **Ca ban ngày 8 tiếng (6-14, 14-22, 10-18)**: Được nghỉ giữa giờ ít nhất **30 phút** (thường chia thành 1 lần ăn chính 20-30 phút hoặc 2 lần nghỉ ngắn 15 phút).',
      '🌙 **Ca ban đêm (22-6)**: Được nghỉ giữa giờ ít nhất **45 phút liên tục**.',
      '⏳ **Ca ngắn 4 tiếng**: Được nghỉ giải lao linh động **10 - 15 phút** vào thời điểm lưu lượng khách thấp.',
      '⚡ **Làm thêm giờ (Tăng ca > 2 tiếng)**: Được nghỉ thêm ít nhất **30 phút** trước khi vào ca làm thêm.',
      '🏪 **Tại cửa hàng GS25**: Nhân viên luân phiên nghỉ ăn để luôn duy trì nhân sự trực quầy thu ngân (POS) và khu vực chế biến đồ ăn nhanh (Fresh Food).'
    ]
  },

  // 3. Nghỉ chuyển ca (Daily Rest)
  dailyRest: {
    title: 'Quy định Thời gian Nghỉ chuyển giữa 2 ca liên tiếp',
    lawRef: 'Điều 110 Bộ luật Lao động 2019',
    details: [
      '🛡️ Người lao động làm việc theo ca được nghỉ **ít nhất 12 giờ** (tối thiểu 11 giờ theo quy chuẩn) trước khi chuyển sang ca làm việc khác.',
      '❌ **Cấm tuyệt đối**: Hết ca chiều lúc 22:00 hôm nay mà 06:00 sáng hôm sau lại xếp ca sáng (chỉ nghỉ được 8 tiếng -> Vi phạm).',
      '🌙 **Sau ca đêm (22-6)**: Kết thúc lúc 06:00 sáng hôm sau, người lao động phải được nghỉ nguyên ngày hôm sau hoặc chỉ được làm ca tối muộn sau 18:00.'
    ]
  },

  // 4. Nghỉ hàng tuần (Weekly Rest)
  weeklyRest: {
    title: 'Quy định Ngày Nghỉ Hàng Tuần (OFF)',
    lawRef: 'Điều 111 Bộ luật Lao động 2019',
    details: [
      '📅 Mỗi tuần, người lao động được nghỉ **ít nhất 24 giờ liên tục** (tương đương 1 ngày OFF trọn vẹn).',
      '⚖️ Full-Time (STFT) làm tối đa **6 ca 8h = 48h/tuần**, AI luôn khóa và đảm bảo có đúng 1 ngày nghỉ OFF so le, không làm 7 ngày liên tục.'
    ]
  },

  // 5. Lương ca đêm & Làm thêm giờ (Overtime & Night Shift Pay)
  salaryRules: {
    title: 'Chế độ Tiền Lương Ca Đêm & Tăng Ca (OT)',
    lawRef: 'Điều 98 Bộ luật Lao động 2019',
    details: [
      '🌙 **Làm việc ban đêm (22:00 - 06:00)**: Được trả thêm ít nhất **30% tiền lương** tính theo đơn giá ca ngày.',
      '⏱️ **Làm thêm giờ (OT) ngày thường**: Trả ít nhất **150%** tiền lương.',
      '📅 **Làm thêm ngày nghỉ tuần (OFF)**: Trả ít nhất **200%** tiền lương.',
      '🎆 **Làm thêm ngày Lễ, Tết**: Trả ít nhất **300%** tiền lương (chưa kể lương ngày lễ).',
      '🔥 **Làm thêm ca đêm**: Trả ít nhất **200% - 210%** tiền lương theo công thức luật định.'
    ]
  },

  // 6. Định mức Part-Time & Full-Time GS25
  headcountRules: {
    title: 'Định Mức Giờ Công Chuỗi Cửa Hàng GS25',
    lawRef: 'Quy chế C&B Nội Bộ GS25',
    details: [
      '💼 **Full-Time (STFT)**: Chuẩn 48h/tuần (6 ca 8h + 1 OFF). Tự động bù vào các ca thiếu người của cửa hàng.',
      '⏳ **Part-Time (STPT)**: Định mức an toàn từ **16h đến 23h/tuần**, giới hạn tối đa không vượt quá **91h/tháng** để tuân thủ hợp đồng thời vụ GS25.',
      '👥 **Nhân viên mới (CSR_NEW)**: Dưới 1 tháng kinh nghiệm bắt buộc phải có 1 Bạn Cứng (STFT/SM/Kinh nghiệm >=1 tháng) kèm cặp trong ca, tuyệt đối không trực solo.'
    ]
  },

  // 7. Quy định Đồng phục & Văn hóa Chào khách GS25
  uniformAndServiceRules: {
    title: 'Tiêu Chuẩn Đồng Phục & Văn Hóa Chào Khách GS25',
    lawRef: 'Sổ tay Văn hóa Dịch vụ Khách hàng GS25',
    details: [
      '👕 **Đồng phục chuẩn**: Luôn mặc áo đồng phục GS25 phẳng phiu, sơ vin gọn gàng, đeo bảng tên bên ngực trái, mang giày đen/tối màu kín mũi.',
      '🧢 **Tạp dề & Mũ**: Bắt buộc đeo tạp dề sạch và đội mũ GS25 đúng quy cách khi đứng quầy Fresh Food và chuẩn bị thức ăn nhanh.',
      '🗣️ **Tiêu chuẩn câu chào khách**: Khi khách bước vào cửa hàng, tất cả nhân viên trong ca tươi cười và chào to rõ ràng: **"GS25 xin chào!"**. Khi khách thanh toán xong và ra về: **"GS25 cảm ơn và hẹn gặp lại quý khách!"**.',
      '📵 **Tác phong làm việc**: Tuyệt đối không bấm điện thoại cá nhân trong giờ làm, giữ gìn quầy thu ngân và khu vực ăn uống luôn sạch sẽ, ngăn nắp.'
    ]
  }
};

/**
 * Kiểm tra vi phạm thời gian nghỉ giữa 2 ca của 2 ngày liên tiếp theo chuẩn Luật Lao Động (>= 11 tiếng nghỉ)
 */
export function checkRestPeriodViolation(prevDayShift, currentDayShift) {
  if (!prevDayShift || !currentDayShift) return false;
  const prevCode = normalizeShift(prevDayShift).shift;
  const currCode = normalizeShift(currentDayShift).shift;

  if (prevCode === 'off' || currCode === 'off' || !prevCode || !currCode) return false;

  const prevRange = parseShiftTimeRange(prevCode);
  const currRange = parseShiftTimeRange(currCode);
  if (!prevRange || !currRange) return false;

  // 1. Ca trước là Ca Đêm (22-6) kết thúc lúc 06:00 sáng
  if (prevCode === '22-6' || prevCode.startsWith('22')) {
    if (currRange.start < 18) {
      return true; // Nghỉ < 12 tiếng
    }
  }

  // 2. Ca trước là Ca Chiều/Tối (14-22) kết thúc lúc 22:00 tối
  if (prevCode === '14-22' || prevCode.endsWith('22')) {
    if (currRange.start < 10) {
      return true; // Nghỉ < 11 tiếng (ví dụ 22h -> 6h sáng là chỉ có 8 tiếng)
    }
  }

  return false;
}

/**
 * Kiểm tra xem nhân viên có phải là "Bạn Cứng" (Senior/Experienced) hay không
 */
export function isSeniorStaff(emp) {
  if (!emp) return false;
  const type = (emp.type || '').toUpperCase();
  const role = (emp.role || '').toUpperCase();

  if (role.includes('SM') || role.includes('TRƯỞNG') || role.includes('QUẢN LÝ') || role.includes('LEAD')) return true;
  if (type === 'STFT' || type === 'FULLTIME' || type === 'SM') return true;
  if (emp.experienceMonths && emp.experienceMonths >= 1) return true;
  if (emp.isSenior === true) return true;
  if (type !== 'CSR_NEW' && !role.includes('NEW') && !emp.isNew) return true;

  return false;
}

/**
 * Kiểm tra xem nhân viên có phải là "Nhân Viên Mới" (Trainee/New CSR) cần kèm cặp hay không
 */
export function isNewStaff(emp) {
  if (!emp) return false;
  const type = (emp.type || '').toUpperCase();
  const role = (emp.role || '').toUpperCase();

  if (type === 'CSR_NEW' || role.includes('NEW') || role.includes('MỚI') || emp.isNew === true) return true;
  if (emp.experienceMonths !== undefined && emp.experienceMonths < 1) return true;
  return false;
}

/**
 * AI SMART AUTO-SCHEDULER (V3.5)
 */
export function generateAISchedule(employees, storeId, options = {}) {
  const storeEmployees = employees.filter(e => e.dept === storeId);
  if (storeEmployees.length === 0) {
    throw new Error(`Không tìm thấy nhân viên nào thuộc cửa hàng ${storeId}`);
  }

  const {
    requiredMatrix = DEFAULT_STAFFING_MATRIX.weekday,
    requiredMatrixByDay = {},
    existingSchedule = {},
    nightShiftVolunteers = []
  } = options;

  const resultSchedule = {};
  storeEmployees.forEach(e => {
    resultSchedule[e.id] = { T2: 'off', T3: 'off', T4: 'off', T5: 'off', T6: 'off', T7: 'off', CN: 'off' };
  });

  const employeeHours = {};
  const employeeShiftsCount = {};
  storeEmployees.forEach(e => {
    employeeHours[e.id] = 0;
    employeeShiftsCount[e.id] = 0;
  });

  // CSR_NEW tính như full-time theo quy chuẩn (≥48h & ≥6 ca/tuần)
  const ftEmployees = storeEmployees.filter(e => e.type === 'STFT' || e.type === 'CSR_NEW' || e.type === 'SM' || e.role?.includes('SM') || e.role?.includes('Full'));
  const ptEmployees = storeEmployees.filter(e => !ftEmployees.some(ft => ft.id === e.id));

  const seniorEmployees = storeEmployees.filter(isSeniorStaff);
  const newEmployees = storeEmployees.filter(isNewStaff);

  const ftMandatoryOffDays = {};
  ftEmployees.forEach((emp, index) => {
    ftMandatoryOffDays[emp.id] = WEEK_DAYS[index % WEEK_DAYS.length];
  });

  // Thu tu XU LY trong ngay: dem -> ca ngan gio vang (PT) -> khung xuong ca dai
  const CANON_ORDER = ['22-6', '10-14', '14-18', '18-22', '6-10', '6-14', '14-22', '10-18', '6-12'];
  const matrixCodes = new Set();
  if (requiredMatrix) Object.keys(requiredMatrix).forEach(c => { if ((requiredMatrix[c] || 0) > 0) matrixCodes.add(c); });
  Object.values(requiredMatrixByDay).forEach(m => Object.keys(m || {}).forEach(c => { if ((m[c] || 0) > 0) matrixCodes.add(c); }));
  const shiftPriorities = CANON_ORDER.filter(c => c === '22-6' || matrixCodes.has(c));

  const assignShiftTo = (emp, dayKey, shiftCode) => {
    resultSchedule[emp.id][dayKey] = shiftCode;
    employeeHours[emp.id] += getShiftHours(shiftCode);
    employeeShiftsCount[emp.id]++;
  };

  const canTakeShift = (emp, dayKey, dayIdx, shiftCode, isFTBackfill = false) => {
    if (resultSchedule[emp.id][dayKey] !== 'off') return false;

    const isFT = ftEmployees.some(ft => ft.id === emp.id);

    if (isFT) {
      const offDaysLeft = WEEK_DAYS.filter(d => resultSchedule[emp.id][d] === 'off').length;
      // Luật nghỉ tuần TUYỆT ĐỐI: >=1 ngày off trọn vẹn và tối đa 6 ca (48h).
      // Backfill chỉ được mượn ngày off định mức nếu NV còn ngày off khác & chưa đủ 6 ca.
      if (ftMandatoryOffDays[emp.id] === dayKey && (!isFTBackfill || offDaysLeft <= 1)) return false;
      if (employeeShiftsCount[emp.id] >= 6) return false;
    }

    if (dayIdx > 0) {
      const prevDayKey = WEEK_DAYS[dayIdx - 1];
      if (checkRestPeriodViolation(resultSchedule[emp.id][prevDayKey], shiftCode)) return false;
    }

    const addedHours = getShiftHours(shiftCode);
    if (!isFT) {
      // Tôn trọng định mức riêng của từng NV nếu có (maxH), mặc định 23h
      const ptCap = Number(emp.maxH) > 0 ? Number(emp.maxH) : SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK;
      if (employeeHours[emp.id] + addedHours > ptCap) return false;
    } else {
      if (employeeHours[emp.id] + addedHours > 48 && !isFTBackfill) return false;
    }

    // Nghỉ giữa ca: kiểm cả ngày KẾ TIẾP đã bị xếp trước (phase 3/4 gán lệch thứ tự)
    if (dayIdx < WEEK_DAYS.length - 1) {
      const nextDayKey = WEEK_DAYS[dayIdx + 1];
      if (checkRestPeriodViolation(shiftCode, resultSchedule[emp.id][nextDayKey])) return false;
    }

    return true;
  };

  // GIAI ĐOẠN 0: GHI NHẬN LỊCH ĐÃ XẾP TAY / LỊCH RẢNH (NẾU CÓ)
  WEEK_DAYS.forEach((dayKey, dayIdx) => {
    storeEmployees.forEach(emp => {
      const existingShift = normalizeShift(existingSchedule[emp.id]?.[dayKey]).shift;
      if (existingShift && existingShift !== 'off') {
        if (canTakeShift(emp, dayKey, dayIdx, existingShift)) {
           assignShiftTo(emp, dayKey, existingShift);
        }
      }
    });
  });

  // GIAI ĐOẠN 1: ƯU TIÊN FULL-TIME ĐẠT ĐỦ 48H VÀ ĐÚNG 1 NGÀY OFF
  WEEK_DAYS.forEach((dayKey, dayIdx) => {
    shiftPriorities.forEach(shiftCode => {
      const dayMatrix = requiredMatrixByDay[dayKey] || requiredMatrix;
      const neededCount = dayMatrix[shiftCode] || 0;
      let assignedCount = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).length;

      if (assignedCount < neededCount) {
        const candidateFT = [...ftEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
        for (const ft of candidateFT) {
          if (assignedCount >= neededCount) break;
          // Ưu tiên nguyện vọng ca đêm
          if (shiftCode === '22-6' && nightShiftVolunteers.length > 0 && !nightShiftVolunteers.includes(ft.id)) continue;
          
          if (canTakeShift(ft, dayKey, dayIdx, shiftCode, true)) {
            assignShiftTo(ft, dayKey, shiftCode);
            assignedCount++;
          }
        }
      }
    });
  });

  // GIAI ĐOẠN 2: ÉP FULL-TIME ĐẠT ĐỦ ĐỊNH MỨC NẾU CÒN THIẾU
  ftEmployees.forEach(ft => {
    if (employeeShiftsCount[ft.id] < 6) {
      for (let dayIdx = 0; dayIdx < WEEK_DAYS.length; dayIdx++) {
        if (employeeShiftsCount[ft.id] >= 6) break;
        const dayKey = WEEK_DAYS[dayIdx];

        if (resultSchedule[ft.id][dayKey] === 'off' && ftMandatoryOffDays[ft.id] !== dayKey) {
          let pickedShift = null;
          for(const sCode of shiftPriorities) {
             const dayMatrix = requiredMatrixByDay[dayKey] || requiredMatrix;
             const needed = dayMatrix[sCode] || 0;
             const actual = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === sCode).length;
             if (actual < needed && canTakeShift(ft, dayKey, dayIdx, sCode, true)) {
                 pickedShift = sCode;
                 break;
             }
          }
          if (!pickedShift) {
             const fallback = ['14-22', '6-14', '10-18'];
             for (const sCode of fallback) {
               if (canTakeShift(ft, dayKey, dayIdx, sCode, true)) {
                 pickedShift = sCode;
                 break;
               }
             }
          }

          if (pickedShift) {
             assignShiftTo(ft, dayKey, pickedShift);
          }
        }
      }
    }
  });

  // GIAI ĐOẠN 3: LẤP ĐẦY MATRIX BẰNG PART-TIME
  WEEK_DAYS.forEach((dayKey, dayIdx) => {
    shiftPriorities.forEach(shiftCode => {
      const dayMatrix = requiredMatrixByDay[dayKey] || requiredMatrix;
      const neededCount = dayMatrix[shiftCode] || 0;
      let assignedCount = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).length;

      if (assignedCount < neededCount) {
        const candidatePT = [...ptEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
        for (const pt of candidatePT) {
          if (assignedCount >= neededCount) break;
          // ưu tiên nguyện vọng ca đêm
          if (shiftCode === '22-6' && nightShiftVolunteers.length > 0 && !nightShiftVolunteers.includes(pt.id)) continue;

          if (canTakeShift(pt, dayKey, dayIdx, shiftCode)) {
            assignShiftTo(pt, dayKey, shiftCode);
            assignedCount++;
          }
        }
      }
    });
  });

  // GIAI ĐOẠN 4: Đã xóa (không ép PT đủ 16h nếu phá vỡ định biên)

  // Thống kê
  let totalAssignedHours = 0;
  let totalAssignedShifts = 0;
  let compliantPTCount = 0;
  let compliantFTCount = 0;
  let mentorPairsCount = 0;

  storeEmployees.forEach(e => {
    const h = employeeHours[e.id];
    totalAssignedHours += h;
    totalAssignedShifts += employeeShiftsCount[e.id];

    if (ptEmployees.some(pt => pt.id === e.id)) {
      if (h >= SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK && h <= SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK) {
        compliantPTCount++;
      }
    } else {
      if (h === 48 && employeeShiftsCount[e.id] === 6) {
        compliantFTCount++;
      }
    }
  });

  WEEK_DAYS.forEach(d => {
    shiftPriorities.forEach(sCode => {
      const assigned = storeEmployees.filter(e => resultSchedule[e.id][d] === sCode);
      if (assigned.some(isNewStaff) && assigned.some(isSeniorStaff)) mentorPairsCount++;
    });
  });

  // CẢNH BÁO: các ca vẫn thiếu người so với định biên sau khi đã tối ưu
  const warnings = [];
  WEEK_DAYS.forEach(dayKey => {
    const dayMatrix = requiredMatrixByDay[dayKey] || requiredMatrix;
    shiftPriorities.forEach(shiftCode => {
      const neededCount = dayMatrix[shiftCode] || 0;
      const actualCount = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).length;
      if (actualCount < neededCount) {
        warnings.push(`Thiếu ${neededCount - actualCount} người ca ${shiftCode} ngày ${dayKey} (cần ${neededCount}, có ${actualCount}).`);
      }
    });
  });

  return {
    schedule: resultSchedule,
    employeeHours,
    employeeShiftsCount,
    stats: {
      totalEmployees: storeEmployees.length,
      totalFT: ftEmployees.length,
      totalPT: ptEmployees.length,
      totalSenior: seniorEmployees.length,
      totalNew: newEmployees.length,
      totalHours: totalAssignedHours,
      totalShifts: totalAssignedShifts,
      mentorPairsCount,
      compliantFTPercent: ftEmployees.length > 0 ? Math.round((compliantFTCount / ftEmployees.length) * 100) : 100,
      compliantPTPercent: ptEmployees.length > 0 ? Math.round((compliantPTCount / ptEmployees.length) * 100) : 100
    },
    warnings,
    insights: [
      `🤖 Đã phân bổ tối ưu ${totalAssignedShifts} ca làm việc (${totalAssignedHours} giờ) cho ${storeEmployees.length} nhân sự cửa hàng ${storeId}.`,
      `🛡️ Full-Time bù ca thiếu, tuân thủ Luật Nghỉ Tuần (mỗi bạn >=1 ngày OFF trọn vẹn, tối đa 6 ca = 48h).`,
      `⏱️ Luật nghỉ giữa ca (>= 11 tiếng): không xếp ca gối đầu quá sức (hết ca 22h không dính ca sáng 6h hôm sau).`,
      `👥 Kèm cặp nhân viên mới: ${mentorPairsCount} lượt kèm cặp Bạn Cứng trên các ca.`,
      `✓ Full-Time đạt chuẩn: ${ftEmployees.length > 0 ? Math.round((compliantFTCount / ftEmployees.length) * 100) : 100}% (48h/tuần - 6 ca) | Part-Time đạt định mức: ${ptEmployees.length > 0 ? Math.round((compliantPTCount / ptEmployees.length) * 100) : 100}% (16-23h).`
    ]
  };
}

/**
 * AI SCHEDULE AUDITOR (V3.5)
 */
export function auditSchedule(employees, weekSchedule, storeId) {
  const storeEmployees = employees.filter(e => e.dept === storeId);
  const issues = [];

  WEEK_DAYS.forEach(dayKey => {
    ['6-14', '14-22', '22-6', '10-18', '6-10', '18-22'].forEach(shiftCode => {
      const assigned = storeEmployees.filter(emp => {
        const { shift } = normalizeShift(weekSchedule[emp.id]?.[dayKey]);
        return shift === shiftCode;
      });

      if (assigned.length > 0) {
        const hasNew = assigned.some(isNewStaff);
        const hasSenior = assigned.some(isSeniorStaff);

        if (hasNew && !hasSenior) {
          const newEmps = assigned.filter(isNewStaff).map(e => e.name).join(', ');
          issues.push({
            id: `solo_new_${dayKey}_${shiftCode}`,
            severity: 'error',
            title: `Nhân viên mới trực thiếu bạn cứng kèm (${dayKey} - Ca ${shiftCode})`,
            desc: `Nhân viên mới (${newEmps}) đang được xếp ca ${shiftCode} vào ngày ${dayKey} mà KHÔNG CÓ BẠN CỨNG kèm cặp! Bắt buộc phải có 1 bạn làm trên 1 tháng đi cùng.`,
            autoFixable: true
          });
        }
      }
    });
  });

  storeEmployees.forEach(emp => {
    const empSched = weekSchedule[emp.id] || {};
    let totalH = 0;
    let totalShifts = 0;
    let offDaysCount = 0;
    const isPT = emp.type === 'STPT' || emp.type === 'PARTTIME' || emp.role?.includes('PT');
    const isFT = !isPT;

    WEEK_DAYS.forEach((dayKey, idx) => {
      const raw = empSched[dayKey];
      const { shift } = normalizeShift(raw);

      if (shift && shift !== 'off') {
        totalShifts++;
        totalH += getShiftHours(shift);
      } else {
        offDaysCount++;
      }

      if (idx > 0) {
        const prevDayKey = WEEK_DAYS[idx - 1];
        const prevRaw = empSched[prevDayKey];
        if (checkRestPeriodViolation(prevRaw, raw)) {
          const prevCode = normalizeShift(prevRaw).shift;
          issues.push({
            id: `rest_violation_${emp.id}_${dayKey}`,
            severity: 'error',
            empId: emp.id,
            empName: emp.name,
            day: dayKey,
            title: `Vi phạm luật nghỉ giữa 2 ca (${emp.name})`,
            desc: `${emp.name} làm ca ${prevDayKey} (${prevCode}) và hôm sau ${dayKey} làm ca (${shift}). Khoảng cách nghỉ không đủ ≥ 11 tiếng!`,
            autoFixable: true
          });
        }
      }
    });

    if (isFT) {
      if (totalShifts >= 7 || offDaysCount === 0) {
        issues.push({
          id: `ft_no_off_${emp.id}`,
          severity: 'error',
          empId: emp.id,
          empName: emp.name,
          title: `Vi phạm Luật Nghỉ Tuần Full-Time (${emp.name})`,
          desc: `Nhân viên Full-Time ${emp.name} đang bị xếp làm liên tục 7 ngày trong tuần không có ngày nghỉ OFF nào! Bắt buộc phải có tối thiểu 1 ngày nghỉ trọn vẹn.`,
          autoFixable: true
        });
      } else if (totalH > 0 && totalH < 48) {
        issues.push({
          id: `ft_under_${emp.id}`,
          severity: 'warning',
          empId: emp.id,
          empName: emp.name,
          title: `Full-time chưa đủ 48h (${totalH}h / 48h)`,
          desc: `Nhân viên Full-time ${emp.name} đang thiếu ${48 - totalH}h làm việc trong tuần.`,
          autoFixable: true
        });
      }
    } else if (isPT) {
      if (totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK) {
        issues.push({
          id: `pt_over_${emp.id}`,
          severity: 'error',
          empId: emp.id,
          empName: emp.name,
          title: `Part-time vượt định mức tuần (${totalH}h / 23h)`,
          desc: `Nhân viên ${emp.name} đang bị xếp ${totalH}h, vượt quá ngưỡng an toàn 23h/tuần của C&B.`,
          autoFixable: true
        });
      } else if (totalH > 0 && totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK) {
        issues.push({
          id: `pt_under_${emp.id}`,
          severity: 'warning',
          empId: emp.id,
          empName: emp.name,
          title: `Part-time chưa đủ giờ tối thiểu (${totalH}h / 16h)`,
          desc: `Nhân viên ${emp.name} mới được xếp ${totalH}h, chưa đạt mức tối thiểu 16h/tuần.`,
          autoFixable: true
        });
      }
    }
  });

  return {
    totalIssues: issues.length,
    hasErrors: issues.some(i => i.severity === 'error'),
    hasWarnings: issues.some(i => i.severity === 'warning'),
    issues,
    summary: issues.length === 0 
      ? '🎉 Tuyệt vời! Toàn bộ lịch làm việc tuần này đạt chuẩn 100%: FT bù ca đủ, tuân thủ Luật Nghỉ Tuần và Luật Nghỉ Giữa Ca.'
      : `⚠️ AI phát hiện ${issues.length} vấn đề cần lưu ý (xem chi tiết bên dưới).`
  };
}

/**
 * AI COPILOT QUERY ENGINE (ĐỌC CHI TIẾT TOÀN BỘ CÁC TRƯỜNG & TẤT CẢ CÁC BẢNG DỮ LIỆU)
 */
export function askAICopilot(question, context = {}, chatHistory = []) {
  return compactText(answerCopilot(question, context, chatHistory));
}

function answerCopilot(question, context = {}, chatHistory = []) {
  const history = chatHistory.length ? chatHistory : (context.chatHistory || []);
  // Câu thuộc miền lịch/ca không cho recipe matcher đón sớm (fix: 'muon doi ca' → công thức món)
  const SCHEDULE_DOMAIN = ['doi ca', 'xep ca', 'lich ca', 'ca lam', 'cham cong', 'bu cong'];
  const strippedQuestion = stripVi(String(question || '').toLowerCase());
  const domainLocked = SCHEDULE_DOMAIN.some((w) => strippedQuestion.includes(w));
  const recipeEarly = domainLocked ? null : lookupFfOnsiteRecipe(question);
  if (recipeEarly) return recipeEarly;

  const merged = mergeFollowUpQuestion(question, history);
  const q = String(merged || '').toLowerCase().replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ').replace(/\s+/g, ' ').trim();
  const qn = stripVi(q);
  const { 
    employees = [], 
    weekSchedule = {}, 
    stores = [],
    shiftSwaps = [],
    feedbacks = [],
    storeId = '', 
    currentWeek = '',
    user = null
  } = context;

  const storeEmps = employees.filter(e => e.dept === storeId);

  // INTENT MỚI (copilotIntents): lương cá nhân, so sánh, FT thiếu chuẩn,
  // PT gần giới hạn, hướng dẫn đổi ca, ít giờ nhất... Trả về null thì
  // rơi xuống chuỗi xử lý cũ bên dưới.
  const routedAnswer = tryAnswerWithData({ q, qn, employees, weekSchedule, stores, shiftSwaps, feedbacks, storeId, currentWeek, user });
  if (routedAnswer) return compactText(routedAnswer);

  const recipeReply = lookupFfOnsiteRecipe(q);
  if (recipeReply) return recipeReply;

  // Lịch của tôi / gọi đúng tên mình (vd. "hôm nay Tú làm ca mấy" khi đang login là Tú)
  const selfUser = user && (employees.find(e => e.id === user.id) || user);
  const scheduleish = q.includes('ca') || q.includes('lịch') || q.includes('làm') || q.includes('công') || q.includes('giờ');
  if (selfUser?.id && refersToLoggedIn(q, selfUser) && scheduleish) {
    const dayAsk = dayShiftAsk(q) || { key: todayDayKey(), label: 'Hôm nay' };
    if (wantsHoursOnly(q) && !dayShiftAsk(q)) {
      const packed = formatEmpWeek(selfUser, weekSchedule, currentWeek);
      return `Tuần này ${selfUser.name}: ${packed.totalH}h / ${packed.totalShifts} ca`;
    }
    return formatDayLead(selfUser, weekSchedule, currentWeek, dayAsk, q);
  }

  // 1. FAQ — matcher hẹp, tránh "tối đa" / "gs25" / "ot" bắt nhầm
  const isBreakTimeQuery =
    q.includes('ăn trưa') || q.includes('ăn tối') || q.includes('ăn cơm') || q.includes('giải lao') || q.includes('break') ||
    (q.includes('nghỉ') && (q.includes('phút') || q.includes('trong ca') || q.includes('giữa ca')));

  if (isBreakTimeQuery && !q.includes('giữa 2 ca') && !q.includes('chuyển ca') && !q.includes('ngày nghỉ')) {
    return `Ca ngày 8h: nghỉ 30 phút. Ca đêm: 45 phút. Tăng ca >2h: thêm 30 phút.`;
  }

  if (q.includes('giữa 2 ca') || q.includes('chuyển ca') || q.includes('gối đầu') || q.includes('hồi phục') || (q.includes('cách') && q.includes('tiếng') && q.includes('nghỉ'))) {
    return `Nghỉ giữa 2 ca tối thiểu 12 tiếng (luật 11h). Hết 22h không xếp ca 6h hôm sau. Hết ca đêm nghỉ tới sau 18h.`;
  }

  if (q.includes('lương') || q.includes('phụ cấp') || q.includes('tăng ca') || q.includes('overtime') || /(^| )ot( |$)/.test(` ${qn} `) || (q.includes('tiền') && (q.includes('ca') || q.includes('đêm') || q.includes('làm')))) {
    return `Lương: ca đêm +30%. OT thường 150%, ngày OFF 200%, lễ/tết 300%, OT đêm 200–210%.`;
  }

  const isNightShiftAsk = /ca đêm|ban đêm|22\s*-\s*6/.test(q)
    || (q.includes('đêm') && (q.includes('ca') || q.includes('làm') || q.includes('xếp')) && !q.includes('tối đa'));
  if (isNightShiftAsk && !q.includes('phút') && !q.includes('tiền') && !q.includes('lương')) {
    return `Ca đêm 22-6: ưu tiên người đăng ký / PT. Ca 1 người phải là bạn cứng.`;
  }

  if (q.includes('part') || q.includes('pt') || q.includes('stpt') || q.includes('23h') || q.includes('91h') || q.includes('định mức') || (q.includes('tối đa') && (q.includes('tiếng') || q.includes('giờ') || q.includes('tuần') || q.includes('tháng')))) {
    return `STPT: 16–23h/tuần, tối đa 91h/tháng.`;
  }

  if (q.includes('full') || q.includes('stft') || q.includes('bù ca') || q.includes('luật nghỉ') || q.includes('ngày off') || (q.includes('nghỉ') && (q.includes('ngày') || q.includes('tuần')) && !q.includes('phút'))) {
    return `Full-Time (STFT): 48h/tuần (6 ca) + 1 ngày OFF. Nghỉ giữa 2 ca ≥ 11 tiếng.`;
  }

  if (q.includes('mới') || q.includes('kèm') || q.includes('csr_new') || q.includes('bạn cứng') || q.includes('học việc') || q.includes('thử việc')) {
    return `Bạn mới không trực solo — mỗi ca phải có 1 bạn cứng kèm.`;
  }

  if (q.includes('đồng phục') || q.includes('xin chào') || q.includes('tác phong') || q.includes('bảng tên') || q.includes('thẻ tên') || q.includes('tạp dề') || (q.includes('chào') && q.includes('khách'))) {
    return `Chào: "GS25 xin chào!" / "GS25 cảm ơn và hẹn gặp lại quý khách!". Áo sơ vin, bảng tên trái, tạp dề + mũ khi đứng FF.`;
  }

  if (q.includes('khung ca') || q.includes('ca 4') || q.includes('ca 8') || (q.includes('ca làm') && (q.includes('mấy') || q.includes('loại')))) {
    return `Ca 8h: 6-14, 14-22, 22-6, 10-18. Ca 4h: 6-10, 10-14, 14-18, 18-22.`;
  }

  // 1.8 HỎI GIỜ / NGÀY HIỆN TẠI VÀ TƯƠNG LAI
  const isTimeQuery = q.includes('mấy giờ') || q.includes('bây giờ') || q.includes('thời gian');
  const isDateQuery = (q.includes('ngày') || q.includes('thứ') || q.includes('hôm')) && (q.includes('mấy') || q.includes('nào') || q.includes('bao nhiêu'));
  const looksLikePersonQuery = employees.some(e => {
    const parts = (e.name || '').toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/);
    const firstName = parts[parts.length - 1];
    return (firstName && firstName.length >= 2 && q.includes(firstName)) ||
      (e.id && q.includes(String(e.id).toLowerCase()));
  }) || q.includes('làm ca');

  if ((isTimeQuery || isDateQuery) && !looksLikePersonQuery) {
    let targetDate = new Date();
    let prefix = "⏰ Thời gian hiện tại:";
    
    if (q.includes('ngày mai') || (q.includes('mai') && !q.includes('hôm nay'))) {
      targetDate.setDate(targetDate.getDate() + 1);
      prefix = "📅 Ngày mai là:";
    } else if (q.includes('hôm qua')) {
      targetDate.setDate(targetDate.getDate() - 1);
      prefix = "📅 Hôm qua là:";
    } else if (q.includes('hôm nay')) {
      prefix = "📅 Hôm nay là:";
    } else if (isDateQuery) {
      prefix = "📅 Hôm nay là:";
    }
    
    const timeStr = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
      ...(isTimeQuery ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(targetDate);
    
    return `${prefix} ${timeStr}`;
  }

  // =========================================================================
  // 2. TRA CỨU DỮ LIỆU ĐỘNG (DATA LOOKUP)
  // =========================================================================

  // 2.1 TRA CỨU CHI TIẾT THEO TÊN NHÂN VIÊN HOẶC MÃ NHÂN VIÊN (BẢNG employees + schedules)
  const paddedQ = ' ' + q.replace(/[?!,.]/g, '') + ' ';

  let matchedEmps = employees.filter(e => {
    const nameLower = (e.name || '').toLowerCase();
    const cleanName = nameLower.replace(/\([^)]*\)/g, '').trim();
    const idStr = (e.id || '').toString().toLowerCase();
    
    // Exact ID match
    if (idStr && paddedQ.includes(' ' + idStr + ' ')) return true;
    
    // Full name match
    if (cleanName && q.includes(cleanName)) return true;

    // First name match
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[nameParts.length - 1]; // Tên chính
    if (firstName && firstName.length >= 2 && q.includes(firstName)) return true;
    
    return false;
  });

  if (matchedEmps.length > 1) {
    const exactMatch = matchedEmps.find(e =>
      q.includes((e.name || '').toLowerCase()) || paddedQ.includes(' ' + String(e.id).toLowerCase() + ' ')
    );
    if (exactMatch) matchedEmps = [exactMatch];
    else if (user?.id && matchedEmps.some(e => e.id === user.id)) {
      matchedEmps = matchedEmps.filter(e => e.id === user.id);
    } else {
      const sameStore = matchedEmps.filter(e => e.dept === storeId);
      if (sameStore.length === 1) matchedEmps = sameStore;
    }
  }

  let hasScheduleIntent = q.includes('làm') || q.includes('lịch') || q.includes('thông tin') || q.includes('hồ sơ')
    || paddedQ.includes(' ca ') || paddedQ.includes(' ai ') || paddedQ.includes(' mã ')
    || /^\d{6,12}$/.test(String(question || '').trim())
    || !!dayShiftAsk(q);
  if (matchedEmps.length > 0) {
    const isDirectAnswer = matchedEmps.some(e =>
      q.includes(String(e.id).toLowerCase()) ||
      q === (e.name || '').toLowerCase() ||
      q === firstNameOf(e.name)
    );
    if (isDirectAnswer) hasScheduleIntent = true;
  }

  const dayAsk = dayShiftAsk(q);

  if (matchedEmps.length > 1 && hasScheduleIntent && dayAsk) {
    const lines = matchedEmps.map(e => {
      const empSched = weekSchedule[e.id] || {};
      return `${e.name} ${e.id}: ${shiftLine(empSched[dayAsk.key])}`;
    }).join('\n');
    return `${dayAsk.label} (${dayAsk.key})\n${lines}`;
  }

  if (matchedEmps.length > 1 && hasScheduleIntent) {
    const empList = matchedEmps.map(e => `${e.name} ${e.id}`).join('\n');
    return `Trùng tên:\n${empList}\nGõ mã NV.`;
  }

  const matchedEmp = matchedEmps.length === 1 ? matchedEmps[0] : null;

  if (matchedEmp && hasScheduleIntent) {
    if (dayAsk) return formatDayLead(matchedEmp, weekSchedule, currentWeek, dayAsk, q);
    const packed = formatEmpWeek(matchedEmp, weekSchedule, currentWeek);
    if (wantsHoursOnly(q)) {
      return `${matchedEmp.name}: ${packed.totalH}h / ${packed.totalShifts} ca tuần này`;
    }
    return `${matchedEmp.name} (${matchedEmp.id})\n${packed.shiftDetails.replace(/• /g, '')}`;
  }

  if (q.includes('đổi ca') || q.includes('shift swap') || q.includes('swap')) {
    const pendingSwaps = pendingSwapsOf(shiftSwaps);
    if (pendingSwaps.length === 0) {
      return `Không có đơn đổi ca chờ duyệt.`;
    }
    const swapList = pendingSwaps.slice(0, 4).map((s, idx) => {
      const p = swapPeople(s, employees);
      return `${idx + 1}. ${p.fromName} ${p.fromShift} ⇄ ${p.toName} ${p.toShift} (${p.day})`;
    }).join('\n');

    return `${pendingSwaps.length} đơn đổi ca chờ duyệt:\n${swapList}`;
  }

  if (q.includes('bù công') || q.includes('feedback') || q.includes('quên chấm công') || q.includes('c&b') || q.includes('giải trình')) {
    const pendingFbs = feedbacks.filter(f => f.status === 'pending');
    if (pendingFbs.length === 0) {
      return `Không có đơn bù công chờ duyệt.`;
    }
    const fbList = pendingFbs.slice(0, 4).map((f, idx) => {
      const empId = f.empId || f.emp_id;
      const emp = employees.find(e => e.id === empId);
      const empName = emp ? emp.name : empId;
      return `${idx + 1}. ${empName} ${f.shift_type || '8h'} ${f.date} (${f.reason || 'Quên chấm công'})`;
    }).join('\n');

    return `${pendingFbs.length} đơn bù công chờ duyệt:\n${fbList}`;
  }

  // 2.4 TRA CỨU DANH MỤC CỬA HÀNG (BẢNG stores)
  if (q.includes('cửa hàng') && (q.includes('bao nhiêu') || q.includes('danh sách') || q.includes('toàn bộ') || q.includes('chi nhánh'))) {
    const storeCount = stores.length;
    const storeNames = stores.map(s => `• **${s.id}**: ${s.name} (${s.region || 'Miền Bắc'})`).join('\n');
    return `${storeCount} cửa hàng:\n${storeNames || storeId}`;
  }

  // 2.5 TRA CỨU AI LÀM THEO NGÀY CỤ THỂ
  const dayMatch = {
    'thứ 2': 'T2', 'thứ hai': 'T2', 't2': 'T2',
    'thứ 3': 'T3', 'thứ ba': 'T3', 't3': 'T3',
    'thứ 4': 'T4', 'thứ tư': 'T4', 't4': 'T4',
    'thứ 5': 'T5', 'thứ năm': 'T5', 't5': 'T5',
    'thứ 6': 'T6', 'thứ sáu': 'T6', 't6': 'T6',
    'thứ 7': 'T7', 'thứ bảy': 'T7', 't7': 'T7',
    'chủ nhật': 'CN', 'cn': 'CN'
  };

  let targetDayKey = null;

  // Dùng thời gian thực (real-time) để nhận diện "hôm nay", "ngày mai", "hôm qua"
  const todayIdx = new Date().getDay(); // 0 (CN) -> 6 (T7)
  const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  if (q.includes('hôm nay') && !q.includes('ngày mấy') && !q.includes('thứ mấy')) {
    targetDayKey = dayMap[todayIdx];
  } else if (q.includes('ngày mai') || q.includes('ngày kia')) {
    targetDayKey = dayMap[(todayIdx + 1) % 7];
  } else if (q.includes('hôm qua')) {
    targetDayKey = dayMap[(todayIdx + 6) % 7];
  } else {
    for (const [phrase, code] of Object.entries(dayMatch)) {
      if (q.includes(phrase)) {
        targetDayKey = code;
        break;
      }
    }
  }

  if (targetDayKey && (q.includes('ai làm') || q.includes('ca nào') || q.includes('danh sách') || q.includes('có ai') || q.includes('ca gì') && !q.includes('rảnh') && !q.includes('nghỉ'))) {
    const workingToday = storeEmps.filter(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return shift && shift !== 'off';
    });

    if (workingToday.length === 0) {
      return `${targetDayKey}: chưa xếp ca.`;
    }

    const listByShift = workingToday.map(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return `${e.name}: ${shift}`;
    }).join('\n');

    return `${targetDayKey}\n${listByShift}`;
  }

  // 2.5.1 TRA CỨU AI RẢNH / OFF THEO NGÀY CỤ THỂ (Dùng để tìm người đổi ca)
  if (targetDayKey && (q.includes('ai rảnh') || q.includes('ai nghỉ') || q.includes('ai off') || q.includes('đổi ca'))) {
    const offToday = storeEmps.filter(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return !shift || shift === 'off';
    });

    if (offToday.length === 0) {
      return `${targetDayKey}: không ai OFF.`;
    }

    const listOff = offToday.map(e => e.name).join(', ');
    return `${targetDayKey} đang OFF: ${listOff}`;
  }

  // 2.6 TOP GIỜ LÀM NHIỀU NHẤT
  if (q.includes('nhiều') || q.includes('cao nhất') || q.includes('top') || q.includes('ai làm')) {
    let maxEmp = null;
    let maxH = -1;

    storeEmps.forEach(e => {
      let h = 0;
      WEEK_DAYS.forEach(d => {
        const { shift } = normalizeShift(weekSchedule[e.id]?.[d]);
        if (shift && shift !== 'off') h += getShiftHours(shift);
      });
      if (h > maxH) {
        maxH = h;
        maxEmp = e;
      }
    });

    if (maxEmp) {
      return `Nhiều giờ nhất tuần: ${maxEmp.name} ${maxH}h`;
    }
  }

  // 2.7 KIỂM TRA LỖI / QUÉT LỊCH
  if (q.includes('lỗi') || q.includes('vi phạm') || q.includes('quét') || q.includes('kiểm tra') || q.includes('sai') || q.includes('ổn')) {
    const audit = auditSchedule(employees, weekSchedule, storeId);
    if (audit.totalIssues === 0) {
      return `Tuần ${currentWeek}: 0 lỗi.`;
    } else {
      const topIssues = audit.issues.slice(0, 3).map(i => `- ${i.title}`).join('\n');
      return `${audit.totalIssues} vấn đề:\n${topIssues}`;
    }
  }

  return `Hỏi ca, giờ, lương, công thức món.\nVd: hôm nay tôi làm ca mấy · tuần này bao nhiêu h · trà tắc`;
}

/**
 * AI COPILOT QUERY ENGINE (SỬ DỤNG LLM OLLAMA)
 * Thay vì dùng Regex cứng, hàm này gửi toàn bộ Context và Chat History cho Ollama Local xử lý.
 */
export function isGenericCopilotFallback(text) {
  return /Hỏi ca, giờ, lương, công thức món|TÚ mini — hỏi ngắn là ra ngay|Hỏi trực tiếp câu hỏi ngắn/i.test(String(text || ''));
}

export async function askOllamaCopilot(question, context = {}, chatHistory = []) {
  const localReply = askAICopilot(question, context, chatHistory);
  if (!isGenericCopilotFallback(localReply)) return localReply;

  const { 
    employees = [], 
    weekSchedule = {}, 
    storeId = ''
  } = context;

  // Lược bớt dữ liệu để gửi cho LLM (tránh bị tràn token)
  const storeEmps = employees.filter(e => e.dept === storeId);
  const compactEmployees = storeEmps.map(e => ({
    id: e.id, name: e.name, type: e.type, role: e.role
  }));
  
  let textSchedule = '';
  const dailySummary = {};
  const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  WEEK_DAYS.forEach(day => { dailySummary[day] = {}; });

  storeEmps.forEach(e => {
    if (weekSchedule[e.id]) {
      // Ép kiểu Lịch cá nhân thành chuỗi Text rõ ràng để AI không đọc sai JSON
      const daysStr = WEEK_DAYS.map(day => {
        const rawShift = weekSchedule[e.id][day];
        const shiftStr = typeof rawShift === 'string' ? rawShift : (rawShift?.shift || 'OFF');
        return `${day}(${shiftStr})`;
      }).join(', ');
      
      textSchedule += `- [${e.id}] ${e.name}: ${daysStr}\n`;
      
      // Xây dựng danh sách ai làm ca nào trong ngày để LLM dễ đọc
      WEEK_DAYS.forEach(day => {
        const rawShift = weekSchedule[e.id][day];
        const shiftStr = typeof rawShift === 'string' ? rawShift : (rawShift?.shift || 'OFF');
        const cleanShift = shiftStr.toUpperCase();
        if (cleanShift && cleanShift !== 'OFF' && cleanShift !== 'AL' && cleanShift !== 'U') {
          if (!dailySummary[day][cleanShift]) dailySummary[day][cleanShift] = [];
          dailySummary[day][cleanShift].push(e.name);
        }
      });
    }
  });

  const now = new Date();
  const timeStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(now);

  const systemPrompt = `Bạn là TÚ mini, trợ lý AI thông minh tại chuỗi cửa hàng tiện lợi GS25 (Chi nhánh ${storeId}).

THỜI GIAN HIỆN TẠI TẠI CỬA HÀNG: ${timeStr}
(Luôn dùng thời gian này làm gốc để trả lời các câu hỏi về "hôm nay", "ngày mai", "bây giờ").

DỮ LIỆU NHÂN SỰ & LỊCH LÀM VIỆC:
1. Thông tin nhân sự: ${JSON.stringify(compactEmployees)}
2. Lịch cá nhân từng người (Từ T2 đến CN):
${textSchedule}
3. Danh sách ca trực theo ngày (RẤT QUAN TRỌNG): ${JSON.stringify(dailySummary)}

HƯỚNG DẪN ĐỌC LỊCH:
- Khi được hỏi "Lịch làm việc của X" hoặc "X làm ca nào": BẮT BUỘC phải liệt kê đầy đủ từng ngày trong tuần của người đó (Từ T2 đến CN) dựa vào [Lịch cá nhân từng người]. Tuyệt đối KHÔNG ĐƯỢC gộp chung chung "cả tuần" hay bỏ sót ngày. Tuyệt đối ghi ĐÚNG HỌ TÊN, không tự chế tên.
- Để trả lời "ai làm cùng ai vào ngày X", hãy nhìn vào [Danh sách ca trực theo ngày], chọn ngày X, tìm xem nhân viên đó đang làm ca nào, và những ai đang có cùng ca đó. Phải đọc dữ liệu tuyệt đối CHÍNH XÁC, không đoán mò!
- Nếu hỏi "ai nghỉ/rảnh", tìm những nhân viên không có tên trong bất kỳ ca nào của ngày hôm đó.

NGUYÊN TẮC XỬ LÝ NGỮ CẢNH:
1. Theo dõi toàn bộ lịch sử hội thoại, không chỉ tin nhắn gần nhất.
2. Giải quyết tham chiếu ngầm định ("cái đó", "hôm đó", "như lúc nãy"...).
3. Giữ nhất quán vai trò "TÚ mini" (hài hước, xưng hô sếp - em hoặc Tú - bạn).

Yêu cầu định dạng:
- Trả lời bằng tiếng Việt. Dùng Markdown in đậm những thông tin quan trọng.
- Xuống dòng rõ ràng, có thể dùng emoji (🥸) cho sinh động.`;

  // Format lịch sử chat
  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    })),
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        messages: messages,
        stream: false
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
    });

    if (!response.ok) return localReply;
    const data = await response.json();
    return data.message?.content || localReply;
  } catch {
    // Ollama không chạy → thử Hugging Face GS25 Model
    return askGS25HFModel(question, systemPrompt, chatHistory, localReply);
  }
}

/**
 * Gọi model GS25 đã train trên Hugging Face Inference API.
 * Được kích hoạt khi model MiniMind GS25 đã được deploy.
 * Cấu hình trong .env: VITE_GS25_AI_MODEL_URL và VITE_HF_TOKEN
 */
export async function askGS25HFModel(question, systemPrompt, chatHistory = [], fallbackReply = '') {
  let modelUrl = import.meta.env.VITE_GS25_AI_MODEL_URL;
  const hfToken = import.meta.env.VITE_HF_TOKEN;

  // Nếu chưa cấu hình model URL → bỏ qua
  if (!modelUrl) return fallbackReply;

  // Tự động chuyển đổi endpoint cũ sang router mới nếu cần
  if (modelUrl.includes('api-inference.huggingface.co/models/')) {
    modelUrl = modelUrl.replace('api-inference.huggingface.co/models/', 'router.huggingface.co/hf-inference/models/');
  }

  const messages = [
    { role: 'system', content: systemPrompt || 'Bạn là trợ lý AI nghiệp vụ GS25.' },
    ...chatHistory.map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    })),
    { role: 'user', content: question }
  ];

  const formattedPrompt = messages.map(m => `${m.role === 'system' ? 'HỆ THỐNG' : m.role === 'assistant' ? 'AI' : 'NGƯỜI DÙNG'}: ${m.content}`).join('\n') + '\nAI:';

  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {})
      },
      body: JSON.stringify({
        inputs: formattedPrompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
          return_full_text: false
        }
      }),
      signal: AbortSignal.timeout(15000) // 15s timeout cho HF
    });

    if (!response.ok) return fallbackReply;
    const data = await response.json();

    // HF Inference API trả về array
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }
    // Hoặc dạng object trực tiếp
    if (data?.generated_text) return data.generated_text;

    return fallbackReply;
  } catch {
    return fallbackReply;
  }
}
