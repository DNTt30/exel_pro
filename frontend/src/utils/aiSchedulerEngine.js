import { WEEK_DAYS, SCHEDULE_RULES, DECISION_RULES } from '../data/constants';
import { getShiftHours, normalizeShift, parseShiftTimeRange } from './shiftHelper';
import { scheduleRegisteredShifts } from './registeredScheduler';
import { stripVi } from './textSearch';
import { tryAnswerWithData, isSelfUserQuery } from './copilotIntents';
import { streamGeminiMultiTurn, generateGeminiMultiTurn } from '../services/geminiService';
import { buildCopilotRequest } from './copilotContext';
import { handbookApi } from '../services/api/handbook';
import { sanitizeAiInput, sanitizeAiOutput } from './aiGuard';
import { answerClockQuery } from './copilotClock';
import { createCopilotRequest } from './copilotRequest';
import { answerUsageQuery, routeUsageQuery } from './copilotUsage';
import { answerRecipeCalculationQuery } from './recipeCalculator';


const DAY_CODE_BY_JS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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
    ? (totalH > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK
        ? `⚠️ Vượt ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK}h/tuần!`
        : (totalH < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK && totalH > 0
            ? `⚠️ Chưa đủ ${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}h/tuần`
            : '✓ Định mức đạt'))
    : (totalH === SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK
        ? `✓ Đạt chuẩn ${SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK}h (6 ca)`
        : `Tổng: ${totalH}h / ${SCHEDULE_RULES.STFT_MIN_HOURS_PER_WEEK}h`);

  return { totalH, totalShifts, shiftDetails, statusNote, empSched };
}

function isSelfAsk(q, qn) {
  return isSelfUserQuery(q, qn);
}

function firstNameOf(name) {
  const parts = String(name || '').toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function refersToLoggedIn(q, user) {
  if (!user?.id) return false;
  if (isSelfAsk(q, stripVi(q))) return true;
  const fn = firstNameOf(user.name);
  if (fn.length >= 2) {
    const qLower = ` ${q.toLowerCase()} `;
    const fnWord = new RegExp(`(^|\\s)${fn}(\\s|[?!,.]|$)`, 'i').test(qLower);
    if (fnWord) {
      const aboutShift = /ca|lịch|lich|giờ|tiếng|nghỉ|off|làm/.test(qLower);
      if (aboutShift && !qLower.includes('công việc') && !qLower.includes('ổn định')) {
        return true;
      }
    }
  }
  return q.includes(String(user.id).toLowerCase());
}

function dayShiftAsk(q) {
  const qLower = String(q || '').toLowerCase();
  const qn = stripVi(qLower);
  const aboutShift = qLower.includes('ca') || qLower.includes('làm') || qLower.includes('lịch') || qLower.includes('giờ') || qLower.includes('nghỉ') || qLower.includes('off') || qLower.includes('rảnh') || qLower.includes('trực');
  if (!aboutShift) return null;

  if (qLower.includes('mai') && !qLower.includes('hôm nay')) {
    return { key: DAY_CODE_BY_JS[(new Date().getDay() + 1) % 7], label: 'Ngày mai' };
  }
  if (qLower.includes('hôm qua')) {
    return { key: DAY_CODE_BY_JS[(new Date().getDay() + 6) % 7], label: 'Hôm qua' };
  }

  // Nhận diện thứ cụ thể trong tuần
  const DAY_LOOKUP = [
    { patterns: ['thứ 2', 'thứ hai', 'thu 2', 'thu hai', ' t2 '], key: 'T2', label: 'Thứ 2' },
    { patterns: ['thứ 3', 'thứ ba', 'thu 3', 'thu ba', ' t3 '], key: 'T3', label: 'Thứ 3' },
    { patterns: ['thứ 4', 'thứ tư', 'thu 4', 'thu tu', ' t4 '], key: 'T4', label: 'Thứ 4' },
    { patterns: ['thứ 5', 'thứ năm', 'thu 5', 'thu nam', ' t5 '], key: 'T5', label: 'Thứ 5' },
    { patterns: ['thứ 6', 'thứ sáu', 'thu 6', 'thu sau', ' t6 '], key: 'T6', label: 'Thứ 6' },
    { patterns: ['thứ 7', 'thứ bảy', 'thu 7', 'thu bay', ' t7 '], key: 'T7', label: 'Thứ 7' },
    { patterns: ['chủ nhật', 'chu nhat', ' cn '], key: 'CN', label: 'Chủ Nhật' }
  ];

  const padded = ` ${qLower} ${qn} `;
  for (const item of DAY_LOOKUP) {
    if (item.patterns.some(p => padded.includes(p))) {
      return { key: item.key, label: item.label };
    }
  }

  if (qLower.includes('hôm nay') || qLower.includes('ca mấy') || qLower.includes('mấy giờ') || qLower.includes('ca nào')) {
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
    || q.includes('tổng giờ') || q.includes('tổng h') || q.includes('mấy tiếng') || q.includes('tổng cộng');
}

function formatDayLead(emp, weekSchedule, currentWeek, dayAsk, q = '') {
  const packed = formatEmpWeek(emp, weekSchedule, currentWeek);
  const shift = shiftLine(packed.empSched[dayAsk.key]);
  const isOffAsk = q.includes('nghỉ') || q.includes('off') || q.includes('rảnh');
  let out = '';
  if (isOffAsk) {
    if (shift === 'OFF') {
      out = `${dayAsk.label} (${dayAsk.key}) ${emp.name}: OFF (bạn được nghỉ nhé 🎉)`;
    } else {
      out = `${dayAsk.label} (${dayAsk.key}) ${emp.name}: ${shift} (bạn có lịch làm, không được nghỉ)`;
    }
  } else {
    out = `${dayAsk.label} (${dayAsk.key}) ${emp.name}: ${shift}`;
  }
  if (wantsHoursOnly(q)) {
    out += `\nTuần: ${packed.totalH}h / ${packed.totalShifts} ca`;
  }
  return out;
}

function findCoworkersSameShift(targetEmp, dayAsk, weekSchedule, storeEmps) {
  const empSched = weekSchedule[targetEmp.id] || {};
  const myShift = normalizeShift(empSched[dayAsk.key]).shift;
  if (!myShift || myShift === 'off') {
    return `${dayAsk.label} (${dayAsk.key}) ${targetEmp.name} đang OFF (nghỉ) nên không có ai làm cùng ca nhé!`;
  }

  const coworkers = [];
  storeEmps.forEach(e => {
    if (e.id === targetEmp.id) return;
    const { shift } = normalizeShift(weekSchedule[e.id]?.[dayAsk.key]);
    if (shift && shift !== 'off') {
      if (shift === myShift) {
        coworkers.push({ name: e.name, shift });
      }
    }
  });

  if (coworkers.length === 0) {
    return `${dayAsk.label} (${dayAsk.key}) ${targetEmp.name} làm ca ${myShift} một mình (trực solo, chưa có ai làm cùng).`;
  }

  const names = coworkers.map(c => `${c.name} (${c.shift})`).join(', ');
  return `${dayAsk.label} (${dayAsk.key}) ${targetEmp.name} làm ca ${myShift} cùng với: ${names}.`;
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


/**
 * Kiểm tra thời gian nghỉ giữa ca theo DECISION_RULES.MIN_REST_HOURS.
 */
export function checkRestPeriodViolation(prevDayShift, currentDayShift) {
  if (!prevDayShift || !currentDayShift) return false;
  const prevCode = normalizeShift(prevDayShift).shift;
  const currCode = normalizeShift(currentDayShift).shift;

  if (prevCode === 'off' || currCode === 'off' || !prevCode || !currCode) return false;

  const previous = prevCode.split('/').map(code => parseShiftTimeRange(code.trim()));
  const current = currCode.split('/').map(code => parseShiftTimeRange(code.trim()));
  if (previous.some(range => !range) || current.some(range => !range)) return true;
  return 24 + Math.min(...current.map(range => range.start)) - Math.max(...previous.map(range => range.end)) < DECISION_RULES.MIN_REST_HOURS;
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

/** Select only employee registrations; never invent availability. */
export function generateAISchedule(employees, storeId, options = {}) {
  return scheduleRegisteredShifts(employees, storeId, options, { checkRestPeriodViolation, isSeniorStaff, isNewStaff });
}

/**
 * AI SCHEDULE AUDITOR (V3.5)
 */
export function auditSchedule(employees, weekSchedule, storeId) {
  const storeEmployees = employees.filter(e => e.dept === storeId && e.isActive !== false);
  const issues = [];

  WEEK_DAYS.forEach(dayKey => {
    ['6-14', '14-22', '22-6', '10-18', '6-10', '18-22'].forEach(shiftCode => {
      const assigned = storeEmployees.filter(emp => {
        const { shift, confirmed, covering_store } = normalizeShift(weekSchedule[emp.id]?.[dayKey]);
        return confirmed && shift === shiftCode && (!covering_store || covering_store === storeId);
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
      const raw = normalizeShift(empSched[dayKey]).confirmed ? empSched[dayKey] : '';
      const { shift } = normalizeShift(raw);

      if (shift && shift !== 'off') {
        totalShifts++;
        totalH += getShiftHours(shift);
      } else {
        offDaysCount++;
      }

      if (idx > 0) {
        const prevDayKey = WEEK_DAYS[idx - 1];
        const prevRaw = normalizeShift(empSched[prevDayKey]).confirmed ? empSched[prevDayKey] : '';
        if (checkRestPeriodViolation(prevRaw, raw)) {
          const prevCode = normalizeShift(prevRaw).shift;
          issues.push({
            id: `rest_violation_${emp.id}_${dayKey}`,
            severity: 'error',
            empId: emp.id,
            empName: emp.name,
            day: dayKey,
            title: `Vi phạm luật nghỉ giữa 2 ca (${emp.name})`,
            desc: `${emp.name} làm ca ${prevDayKey} (${prevCode}) và hôm sau ${dayKey} làm ca (${shift}). Khoảng cách nghỉ không đủ ≥ ${DECISION_RULES.MIN_REST_HOURS} tiếng!`,
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
  const guard = sanitizeAiInput(question);
  if (!guard.safe) {
    return guard.reason;
  }
  return sanitizeAiOutput(compactText(answerCopilot(guard.text, context, chatHistory)));
}

function answerCopilot(question, context = {}, chatHistory = []) {
  const history = chatHistory.length ? chatHistory : (context.chatHistory || []);
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

  // 1. Tra cứu dữ liệu nội bộ (hồ sơ, đổi ca, lương cá nhân).
  const routedAnswer = tryAnswerWithData({ q, qn, employees, weekSchedule, stores, shiftSwaps, feedbacks, storeId, currentWeek, user });
  if (routedAnswer) return compactText(routedAnswer);


  // Lịch của tôi / gọi đúng tên mình (vd. "hôm nay Tú làm ca mấy" khi đang login là Tú)
  const selfUser = user && (employees.find(e => e.id === user.id) || user);
  const scheduleish = !q.includes('công việc') && (q.includes('ca') || q.includes('lịch') || q.includes('làm') || /(^|\s)(công|cham cong|bu cong)(\s|$)/.test(q) || q.includes('giờ') || q.includes('tiếng') || q.includes('nghỉ') || q.includes('off') || q.includes('rảnh') || q.includes('trực'));
  if (selfUser?.id && refersToLoggedIn(q, selfUser) && scheduleish) {
    const selfSched = weekSchedule[selfUser.id] || {};

    // 0. Hỏi ai làm cùng ca với mình (vd: "Hôm nay ai làm cùng ca với em?", "Ai làm cùng ca với tôi thứ 3?")
    if (q.includes('cùng ca') || q.includes('chung ca') || q.includes('làm cùng') || q.includes('làm chung') || q.includes('trực cùng') || q.includes('trực chung')) {
      const dayAsk = dayShiftAsk(q) || { key: todayDayKey(), label: 'Hôm nay' };
      return findCoworkersSameShift(selfUser, dayAsk, weekSchedule, storeEmps);
    }

    // 1. Hỏi về ca đêm cá nhân (vd: "Chị có phải làm ca đêm hôm nào không?", "Em có ca đêm không?", "Chị có làm ca 22-6 hôm nào không?")
    if (q.includes('đêm') || q.includes('22-6') || q.includes('22h') || q.includes('ca 3') || q.includes('ca ba')) {
      const nightDays = WEEK_DAYS.filter(d => {
        const { shift } = normalizeShift(selfSched[d]);
        return shift === '22-6' || (shift && shift.startsWith('22'));
      });
      if (nightDays.length === 0) {
        return `Tuần này (${currentWeek}) ${selfUser.name} KHÔNG có ca đêm (22-6) nào cả nhé! Toàn bộ đều là ca ngày / chiều.`;
      }
      return `Tuần này (${currentWeek}) ${selfUser.name} có ca đêm (22-6) vào các ngày: ${nightDays.join(', ')}.`;
    }

    // 2. Hỏi tổng giờ / bao nhiêu tiếng (vd: "Tuần này em làm tổng cộng mấy tiếng?", "Tuần này tao làm tổng bao nhiêu tiếng?")
    if (wantsHoursOnly(q) || q.includes('mấy tiếng') || q.includes('tổng cộng') || q.includes('bao nhiêu')) {
      const packed = formatEmpWeek(selfUser, weekSchedule, currentWeek);
      return `Tuần này ${selfUser.name} làm tổng cộng: ${packed.totalH}h / ${packed.totalShifts} ca.\nChi tiết các ngày:\n${packed.shiftDetails}`;
    }

    const asksWholeWeek = q.includes('tuần') || q.includes('cả tuần') || q.includes('toàn bộ');
    const dayAsk = dayShiftAsk(q);
    if (!dayAsk || (asksWholeWeek && !q.includes('hôm nay') && !q.includes('mai'))) {
      const packed = formatEmpWeek(selfUser, weekSchedule, currentWeek);
      return `Lịch tuần này của ${selfUser.name} (${currentWeek}):\n${packed.shiftDetails}\n(${packed.statusNote})`;
    }
    return formatDayLead(selfUser, weekSchedule, currentWeek, dayAsk, q);
  }

  // 1. FAQ — matcher hẹp, tránh "tối đa" / "gs25" / "ot" bắt nhầm
  if (q.includes('giữa 2 ca') || q.includes('chuyển ca') || q.includes('gối đầu') || q.includes('hồi phục') || (q.includes('cách') && q.includes('tiếng') && q.includes('nghỉ'))) {
    return `Ứng dụng yêu cầu nghỉ giữa ca ngày khác tối thiểu ${DECISION_RULES.MIN_REST_HOURS} tiếng. Hết 22h không xếp ca 6h hôm sau. Hết ca đêm lúc 6h thì sớm nhất bắt đầu ca tiếp lúc 18h.`;
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
    return `Full-Time (STFT): 48h/tuần (6 ca) + 1 ngày OFF. Nghỉ giữa ca ≥ ${DECISION_RULES.MIN_REST_HOURS} tiếng; tối đa ${DECISION_RULES.MAX_CONSECUTIVE_NIGHTS} đêm liên tiếp.`;
  }

  if (q.includes('mới') || q.includes('kèm') || q.includes('csr_new') || q.includes('bạn cứng') || q.includes('học việc') || q.includes('thử việc')) {
    return `Bạn mới không trực solo — mỗi ca phải có 1 bạn cứng kèm.`;
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
    if (q.includes('cùng ca') || q.includes('chung ca') || q.includes('làm cùng') || q.includes('làm chung') || q.includes('trực cùng') || q.includes('trực chung')) {
      const targetDay = dayAsk || { key: todayDayKey(), label: 'Hôm nay' };
      return findCoworkersSameShift(matchedEmp, targetDay, weekSchedule, storeEmps);
    }
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
  const isStabilizeQuery = q.includes('ổn định') || qn.includes('on dinh');
  const isAuditAsk = !isStabilizeQuery && (
    q.includes('lỗi') || q.includes('vi phạm') || q.includes('quét') || q.includes('kiểm tra') || q.includes('sai') ||
    /(^|\s)(ổn không|on khong|có ổn|co on|ổn chưa|on chua|ổn ko|on ko|lịch ổn|lich on)(\s|$)/.test(` ${q} `) ||
    q.trim() === 'ổn' || q.trim() === 'ổn ko' || q.trim() === 'ổn không'
  );
  if (isAuditAsk) {
    const audit = auditSchedule(employees, weekSchedule, storeId);
    if (audit.totalIssues === 0) {
      return `✅ Tuần ${currentWeek}: Lịch đạt chuẩn 100%, không có vi phạm nào.`;
    }
    const errors = audit.issues.filter(i => i.severity === 'error');
    const warnings = audit.issues.filter(i => i.severity === 'warning');
    const lines = [];
    if (errors.length > 0) {
      lines.push(`🔴 ${errors.length} lỗi nghiêm trọng:`);
      errors.forEach((i, idx) => lines.push(`  ${idx + 1}. ${i.title}`));
    }
    if (warnings.length > 0) {
      lines.push(`⚠️ ${warnings.length} cảnh báo:`);
      warnings.forEach((i, idx) => lines.push(`  ${idx + 1}. ${i.title}`));
    }
    return lines.join('\n');
  }

  // 2.8 AI CHƯA ĐỦ GIỜ / VƯỢT GIỜ
  const isUnderHoursAsk = q.includes('chưa đủ') || q.includes('thiếu giờ') || q.includes('thiếu công') || q.includes('ít giờ');
  const isOverHoursAsk = q.includes('vượt giờ') || q.includes('quá giờ') || q.includes('quá định mức') || q.includes('nhiều hơn định mức');
  if (isUnderHoursAsk || isOverHoursAsk) {
    const result = [];
    storeEmps.forEach(e => {
      let totalH = 0;
      WEEK_DAYS.forEach(d => {
        const { shift } = normalizeShift(weekSchedule[e.id]?.[d]);
        if (shift && shift !== 'off') totalH += getShiftHours(shift);
      });
      const isPT = e.type === 'STPT' || e.type === 'PARTTIME' || e.role?.includes('PT');
      if (isUnderHoursAsk) {
        const minH = isPT ? SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK : 48;
        if (totalH > 0 && totalH < minH) {
          result.push(`${e.name}: ${totalH}h (cần ${minH}h${isPT ? ' PT' : ' FT'})`);
        }
      } else {
        const maxH = isPT ? SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK : 48;
        if (totalH > maxH) {
          result.push(`${e.name}: ${totalH}h (vượt ${totalH - maxH}h)`);
        }
      }
    });
    if (result.length === 0) {
      return isUnderHoursAsk ? `Tất cả nhân viên đã đủ giờ định mức tuần này.` : `Không có ai vượt giờ định mức tuần này.`;
    }
    const label = isUnderHoursAsk ? 'Chưa đủ giờ' : 'Vượt định mức';
    return `${label} (${result.length} người):\n${result.join('\n')}`;
  }

  // 2.9 ĐỊNH BIÊN THEO NGÀY (VD: "Thứ 3 có đủ người không?")
  const isStaffingAsk = (q.includes('đủ người') || q.includes('đủ nhân sự') || q.includes('thiếu người')) && targetDayKey;
  if (isStaffingAsk) {
    const working = storeEmps.filter(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return shift && shift !== 'off';
    });
    const offCount = storeEmps.length - working.length;
    const byShift = {};
    working.forEach(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      if (!byShift[shift]) byShift[shift] = [];
      byShift[shift].push(e.name);
    });
    const shiftSummary = Object.entries(byShift).map(([s, names]) => `  Ca ${s}: ${names.join(', ')}`).join('\n');
    return `${targetDayKey}: ${working.length}/${storeEmps.length} người làm việc (${offCount} OFF)\n${shiftSummary || '  (Chưa xếp ca)'}`;
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

export async function askGeminiCopilot(question, context = {}, chatHistory = [], geminiApiKey = '', onChunk = null, requestOptions = {}) {
  const request = createCopilotRequest(requestOptions.signal, 120000);
  try {
    request.signal.throwIfAborted();
    // 1. Màng lọc đầu vào: Kiểm tra an toàn, chống prompt injection & che giấu secret
    const guard = sanitizeAiInput(question);
    if (!guard.safe) {
      if (onChunk) onChunk(guard.reason);
      return guard.reason;
    }
    const cleanQuestion = guard.text;
    const recipeAnswer = answerRecipeCalculationQuery(cleanQuestion);
    if (recipeAnswer) {
      if (onChunk) onChunk(recipeAnswer);
      return recipeAnswer;
    }

    const clockAnswer = answerClockQuery(cleanQuestion);
    if (clockAnswer) {
      if (onChunk) onChunk(clockAnswer);
      return clockAnswer;
    }
    const usageRoute = routeUsageQuery(cleanQuestion, chatHistory);
    if (usageRoute) {
      const answer = await request.wait(answerUsageQuery(usageRoute, context));
      if (onChunk) onChunk(answer);
      return answer;
    }

    // Always fetch with the current JWT. No persisted cache can carry drafts or another
    // store's knowledge across sessions; a failed fetch must not silently use stale rules.
    const handbookEntries = await request.wait(handbookApi.getKnowledge({ signal: request.signal }));
    const { contents, systemPrompt, options } = buildCopilotRequest(cleanQuestion, { ...context, handbookEntries }, chatHistory);

    // 3. Màng lọc đầu ra: Quét sạch thông tin nhạy cảm trước khi trả về
    let rawResponse = '';
    if (onChunk) {
      rawResponse = await streamGeminiMultiTurn(contents, systemPrompt, geminiApiKey, (delta) => {
        onChunk(sanitizeAiOutput(delta));
      }, { ...options, signal: request.signal });
    } else {
      rawResponse = await generateGeminiMultiTurn(contents, systemPrompt, geminiApiKey, { ...options, signal: request.signal });
    }

    return sanitizeAiOutput(rawResponse);
  } finally { request.dispose(); }
}

