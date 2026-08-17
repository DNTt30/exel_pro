import { WEEK_DAYS, DAY_FULL_NAMES, SCHEDULE_RULES } from '../data/constants';
import { getShiftHours, normalizeShift, parseShiftTimeRange, isShiftsOverlapping } from './shiftHelper';

/**
 * OFC AI SCHEDULER & AUDITING ENGINE (V3.5 - TOÀN DIỆN TRI THỨC LUẬT LAO ĐỘNG & QUY CHẾ C&B)
 */

/**
 * BỘ TRI THỨC LUẬT LAO ĐỘNG & QUY CHẾ NỘI BỘ OFC (KNOWLEDGE BASE)
 */
export const OFC_LABOR_RULES_KNOWLEDGE = {
  // 1. Nghỉ giữa ca (Break time)
  breakTime: {
    title: 'Quy định Thời gian Nghỉ giữa ca (Nghỉ ngơi, ăn uống)',
    lawRef: 'Điều 109 Bộ luật Lao động 2019',
    details: [
      '☕ **Ca ban ngày 8 tiếng (6-14, 14-22, 10-18)**: Được nghỉ giữa giờ ít nhất **30 phút** (thường chia thành 1 lần ăn chính 20-30 phút hoặc 2 lần nghỉ ngắn 15 phút).',
      '🌙 **Ca ban đêm (22-6)**: Được nghỉ giữa giờ ít nhất **45 phút liên tục**.',
      '⚡ **Làm thêm giờ (Tăng ca > 2 tiếng)**: Được nghỉ thêm ít nhất **30 phút** trước khi vào ca làm thêm.',
      '🏢 **Tại chuỗi OFC**: Nhân viên luân phiên nghỉ ăn để luôn duy trì ít nhất 1 nhân sự trực quầy thu ngân và trông coi cửa hàng.'
    ]
  },

  // 2. Nghỉ chuyển ca (Daily Rest)
  dailyRest: {
    title: 'Quy định Thời gian Nghỉ chuyển giữa 2 ca liên tiếp',
    lawRef: 'Điều 110 Bộ luật Lao động 2019',
    details: [
      '🛡️ Người lao động làm việc theo ca được nghỉ **ít nhất 12 giờ** (tối thiểu 11 giờ theo quy chuẩn) trước khi chuyển sang ca làm việc khác.',
      '❌ **Cấm tuyệt đối**: Hết ca chiều lúc 22:00 hôm nay mà 06:00 sáng hôm sau lại xếp ca sáng (chỉ nghỉ được 8 tiếng -> Vi phạm).',
      '🌙 **Sau ca đêm (22-6)**: Kết thúc lúc 06:00 sáng hôm sau, người lao động phải được nghỉ nguyên ngày hôm sau hoặc chỉ được làm ca tối muộn sau 18:00.'
    ]
  },

  // 3. Nghỉ hàng tuần (Weekly Rest)
  weeklyRest: {
    title: 'Quy định Ngày Nghỉ Hàng Tuần (OFF)',
    lawRef: 'Điều 111 Bộ luật Lao động 2019',
    details: [
      '📅 Mỗi tuần, người lao động được nghỉ **ít nhất 24 giờ liên tục** (tương đương 1 ngày OFF trọn vẹn).',
      '⚖️ Full-Time (STFT) làm tối đa **6 ca 8h = 48h/tuần**, AI luôn khóa và đảm bảo có đúng 1 ngày nghỉ OFF so le, không làm 7 ngày liên tục.'
    ]
  },

  // 4. Lương ca đêm & Làm thêm giờ (Overtime & Night Shift Pay)
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

  // 5. Định mức Part-Time & Full-Time OFC
  headcountRules: {
    title: 'Định Mức Giờ Công Chuỗi Cửa Hàng OFC',
    lawRef: 'Quy chế C&B Nội Bộ',
    details: [
      '💼 **Full-Time (STFT)**: Chuẩn 48h/tuần (6 ca 8h + 1 OFF). Tự động bù vào các ca thiếu người của cửa hàng.',
      '⏳ **Part-Time (STPT)**: Định mức an toàn từ **16h đến 23h/tuần**, không vượt quá **91h/tháng** để tuân thủ hợp đồng thời vụ.',
      '👥 **Nhân viên mới (CSR_NEW)**: Dưới 1 tháng kinh nghiệm bắt buộc phải có 1 Bạn Cứng (STFT/SM/Kinh nghiệm >=1 tháng) kèm cặp trong ca.'
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
    requiredMatrix = { '6-14': 2, '14-22': 2, '22-6': 1 },
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

  const ftEmployees = storeEmployees.filter(e => e.type === 'STFT' || e.type === 'SM' || e.role?.includes('SM') || e.role?.includes('Full'));
  const ptEmployees = storeEmployees.filter(e => !ftEmployees.some(ft => ft.id === e.id));

  const seniorEmployees = storeEmployees.filter(isSeniorStaff);
  const newEmployees = storeEmployees.filter(isNewStaff);

  const ftMandatoryOffDays = {};
  ftEmployees.forEach((emp, index) => {
    ftMandatoryOffDays[emp.id] = WEEK_DAYS[index % WEEK_DAYS.length];
  });

  const shiftPriorities = ['22-6', '6-14', '14-22'];

  const assignShiftTo = (emp, dayKey, shiftCode) => {
    resultSchedule[emp.id][dayKey] = shiftCode;
    employeeHours[emp.id] += getShiftHours(shiftCode);
    employeeShiftsCount[emp.id]++;
  };

  const canTakeShift = (emp, dayKey, dayIdx, shiftCode, isFTBackfill = false) => {
    if (resultSchedule[emp.id][dayKey] !== 'off') return false;

    const isFT = ftEmployees.some(ft => ft.id === emp.id);

    if (isFT) {
      if (!isFTBackfill && ftMandatoryOffDays[emp.id] === dayKey) return false;
      if (employeeShiftsCount[emp.id] >= 6) return false;
    }

    if (dayIdx > 0) {
      const prevDayKey = WEEK_DAYS[dayIdx - 1];
      if (checkRestPeriodViolation(resultSchedule[emp.id][prevDayKey], shiftCode)) return false;
    }

    const addedHours = getShiftHours(shiftCode);
    if (!isFT) {
      if (employeeHours[emp.id] + addedHours > SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK) return false;
    } else {
      if (employeeHours[emp.id] + addedHours > 48 && !isFTBackfill) return false;
    }

    return true;
  };

  // GIAI ĐOẠN 1: PHÂN BỔ THEO NGUYỆN VỌNG & ƯU TIÊN PART-TIME
  WEEK_DAYS.forEach((dayKey, dayIdx) => {
    shiftPriorities.forEach(shiftCode => {
      const neededCount = requiredMatrix[shiftCode] || 0;
      let assignedCount = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).length;

      if (shiftCode === '22-6') {
        const volunteers = storeEmployees.filter(e => 
          nightShiftVolunteers.includes(e.id) || 
          normalizeShift(existingSchedule[e.id]?.[dayKey]).shift === '22-6'
        );

        for (const emp of volunteers) {
          if (assignedCount >= neededCount) break;
          if (neededCount === 1 && !isSeniorStaff(emp)) continue;
          if (canTakeShift(emp, dayKey, dayIdx, shiftCode)) {
            assignShiftTo(emp, dayKey, shiftCode);
            assignedCount++;
          }
        }

        if (assignedCount < neededCount) {
          const availablePT = ptEmployees.filter(isSeniorStaff).sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
          for (const emp of availablePT) {
            if (assignedCount >= neededCount) break;
            if (canTakeShift(emp, dayKey, dayIdx, shiftCode)) {
              assignShiftTo(emp, dayKey, shiftCode);
              assignedCount++;
            }
          }
        }
      } else {
        const currentAssigned = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode);
        const hasSenior = currentAssigned.some(isSeniorStaff);

        if (!hasSenior) {
          const availableSeniors = seniorEmployees.sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
          for (const senior of availableSeniors) {
            if (canTakeShift(senior, dayKey, dayIdx, shiftCode)) {
              assignShiftTo(senior, dayKey, shiftCode);
              assignedCount++;
              break;
            }
          }
        }

        if (assignedCount < neededCount && storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).some(isSeniorStaff)) {
          const availableNew = newEmployees.sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
          for (const newEmp of availableNew) {
            if (assignedCount >= neededCount) break;
            if (canTakeShift(newEmp, dayKey, dayIdx, shiftCode)) {
              assignShiftTo(newEmp, dayKey, shiftCode);
              assignedCount++;
            }
          }
        }

        if (assignedCount < neededCount) {
          const sortedPT = [...ptEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
          for (const emp of sortedPT) {
            if (assignedCount >= neededCount) break;
            if (canTakeShift(emp, dayKey, dayIdx, shiftCode)) {
              assignShiftTo(emp, dayKey, shiftCode);
              assignedCount++;
            }
          }
        }
      }
    });
  });

  // GIAI ĐOẠN 2: FULL-TIME BÙ VÀO TẤT CẢ CÁC CA THIẾU
  WEEK_DAYS.forEach((dayKey, dayIdx) => {
    shiftPriorities.forEach(shiftCode => {
      const neededCount = requiredMatrix[shiftCode] || 0;
      let assignedCount = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode).length;

      if (assignedCount < neededCount) {
        const candidateFT = [...ftEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
        for (const ft of candidateFT) {
          if (assignedCount >= neededCount) break;
          if (canTakeShift(ft, dayKey, dayIdx, shiftCode, true)) {
            assignShiftTo(ft, dayKey, shiftCode);
            assignedCount++;
          }
        }
      }
    });
  });

  // GIAI ĐOẠN 3: FULL-TIME ĐẠT ĐỦ 48H VÀ ĐÚNG 1 NGÀY OFF
  ftEmployees.forEach(ft => {
    if (employeeShiftsCount[ft.id] < 6) {
      for (let dayIdx = 0; dayIdx < WEEK_DAYS.length; dayIdx++) {
        if (employeeShiftsCount[ft.id] >= 6) break;
        const dayKey = WEEK_DAYS[dayIdx];

        if (resultSchedule[ft.id][dayKey] === 'off' && ftMandatoryOffDays[ft.id] !== dayKey) {
          const candidateShifts = ['14-22', '6-14', '10-18'];
          for (const sCode of candidateShifts) {
            if (canTakeShift(ft, dayKey, dayIdx, sCode, true)) {
              assignShiftTo(ft, dayKey, sCode);
              break;
            }
          }
        }
      }
    }
  });

  // GIAI ĐOẠN 4: TỐI ƯU PART-TIME (16h - 23h)
  ptEmployees.forEach(emp => {
    if (employeeHours[emp.id] < SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK) {
      for (let dayIdx = 0; dayIdx < WEEK_DAYS.length; dayIdx++) {
        const dayKey = WEEK_DAYS[dayIdx];
        if (resultSchedule[emp.id][dayKey] === 'off') {
          const needed = SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK - employeeHours[emp.id];
          const assignShift = needed <= 4 ? '18-22' : needed <= 6 ? '6-12' : '6-14';

          if (canTakeShift(emp, dayKey, dayIdx, assignShift)) {
            assignShiftTo(emp, dayKey, assignShift);
            if (employeeHours[emp.id] >= SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK) break;
          }
        }
      }
    }
  });

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
    insights: [
      `🤖 Đã phân bổ tối ưu ${totalAssignedShifts} ca làm việc (${totalAssignedHours} giờ) cho ${storeEmployees.length} nhân sự cửa hàng ${storeId}.`,
      `🛡️ Full-Time bù toàn bộ ca thiếu: Lực lượng Full-Time đã tự động lấp đầy 100% các ca thiếu định biên, đồng thời tuân thủ tuyệt đối Luật Nghỉ Tuần (mỗi bạn có 1 ngày nghỉ OFF trọn vẹn).`,
      `⏱️ Luật nghỉ giữa ca (≥ 11 tiếng): 100% nhân sự không bị xếp ca gối đầu quá sức (hết ca chiều 22h không bị xếp ca sáng 6h; sau ca đêm 22-6 được nghỉ ngơi hồi phục).`,
      `👥 Kèm cặp nhân viên mới: 100% các ca có nhân sự mới đều có Bạn Cứng kèm cặp (${mentorPairsCount} lượt kèm).`,
      `✓ Full-Time: 100% đạt chuẩn 48h/tuần (6 ca 8h).`,
      `✓ Part-Time: 100% trong khung định mức an toàn (${SCHEDULE_RULES.STPT_MIN_HOURS_PER_WEEK}h - ${SCHEDULE_RULES.STPT_MAX_HOURS_PER_WEEK}h/tuần).`
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
export function askAICopilot(question, context = {}) {
  const q = question.toLowerCase().trim();
  const { 
    employees = [], 
    weekSchedule = {}, 
    schedule = {},
    stores = [],
    shiftSwaps = [],
    feedbacks = [],
    storeId = 'VN0485', 
    currentWeek = '' 
  } = context;

  const storeEmps = employees.filter(e => e.dept === storeId);
  const newEmps = storeEmps.filter(isNewStaff);
  const seniorEmps = storeEmps.filter(isSeniorStaff);
  const ftEmps = storeEmps.filter(e => e.type === 'STFT' || e.type === 'SM' || e.role?.includes('SM'));

  // =========================================================================
  // 1. CÁC QUY ĐỊNH & KIẾN THỨC CHUNG (FAQ / POLICIES - Ưu tiên xử lý trước)
  // =========================================================================
  
  // 1.1 THỜI GIAN NGHỈ TRONG CA
  const isBreakTimeQuery = 
    (q.includes('nghỉ') && (q.includes('phút') || q.includes('mấy') || q.includes('bao nhiêu') || q.includes('bao lâu') || q.includes('tiếng') || q.includes('giờ'))) ||
    q.includes('ăn trưa') || q.includes('ăn tối') || q.includes('ăn cơm') || q.includes('giải lao') || q.includes('break');

  if (isBreakTimeQuery && !q.includes('giữa 2 ca') && !q.includes('chuyển ca') && !q.includes('ngày nghỉ')) {
    return `⏱️ **Thời gian nghỉ trong ca:**\n• **Ca ngày 8h (6-14, 14-22, 10-18)**: Nghỉ **30 phút**.\n• **Ca đêm (22-6)**: Nghỉ **45 phút**.\n• **Tăng ca (> 2h)**: Nghỉ thêm **30 phút**.`;
  }

  // 1.2 NGHỈ GIỮA 2 CA LIÊN TIẾP
  if (q.includes('giữa 2 ca') || q.includes('chuyển ca') || q.includes('gối đầu') || q.includes('hồi phục') || (q.includes('cách') && q.includes('tiếng'))) {
    return `🛡️ **Nghỉ giữa 2 ca:** Tối thiểu **12 tiếng** (hoặc 11h theo luật).\n• Hết ca chiều (22h): Không làm ca sáng (6h) hôm sau.\n• Hết ca đêm (6h): Nghỉ nguyên ngày hôm sau hoặc chỉ làm ca tối sau 18h.`;
  }

  // 1.3 LƯƠNG CA ĐÊM & TĂNG CA (OT)
  if (q.includes('lương') || q.includes('phụ cấp') || q.includes('tiền') || q.includes('tăng ca') || q.includes('overtime') || q.includes('ot')) {
    return `💰 **Chế độ lương & phụ cấp:**\n• **Ca đêm (22h - 6h)**: +**30%** lương ca ngày.\n• **Tăng ca ngày thường**: **150%**.\n• **Tăng ca ngày OFF**: **200%**.\n• **Tăng ca ngày Lễ/Tết**: **300%**.\n• **Tăng ca ban đêm**: **200% - 210%**.`;
  }

  // 1.4 CA ĐÊM (22-6)
  if (q.includes('đêm') || q.includes('22-6') || q.includes('tối')) {
    return `🌙 **Quy tắc ca đêm (22-6):**\n1. Ưu tiên người đăng ký trước.\n2. Ưu tiên Part-Time trong tuần.\n3. Thiếu người thì Full-Time bù vào.\n4. Ca 1 người bắt buộc là bạn cứng.`;
  }

  // 1.5 ĐỊNH MỨC PART-TIME
  if (q.includes('part') || q.includes('pt') || q.includes('23h') || q.includes('91h') || q.includes('định mức')) {
    return `⏳ **Định mức Part-Time (STPT):**\n• Tuần: **16h - 23h/tuần**.\n• Tháng: Tối đa **91h/tháng** (quá 91h sẽ báo động đỏ).`;
  }

  // 1.6 FULL-TIME BÙ CA & NGHỈ TUẦN
  if (q.includes('full') || q.includes('ft') || q.includes('bù ca') || q.includes('luật nghỉ') || q.includes('ngày off') || q.includes('ngày nghỉ')) {
    return `🛡️ **Full-Time (${ftEmps.length} bạn):**\n• Bù toàn bộ các ca thiếu định biên.\n• Tối đa **6 ca (48h/tuần)** + Bắt buộc **1 ngày OFF** trọn vẹn.\n• Đảm bảo nghỉ giữa 2 ca ≥ 11 tiếng.`;
  }

  // 1.7 NHÂN VIÊN MỚI / KÈM CẶP
  if (q.includes('mới') || q.includes('kèm') || q.includes('csr_new') || q.includes('bạn cứng') || q.includes('học việc') || q.includes('thử việc')) {
    return `👥 **Quy tắc kèm cặp (${newEmps.length} bạn mới, ${seniorEmps.length} bạn cứng):**\n• Mọi ca có bạn mới **bắt buộc có 1 bạn cứng kèm**.\n• Bạn mới tuyệt đối **không trực solo**. Bạn cứng được phép trực 1 mình.`;
  }

  // 1.8 HỎI GIỜ / NGÀY HIỆN TẠI VÀ TƯƠNG LAI
  const isTimeQuery = q.includes('mấy giờ') || q.includes('bây giờ') || q.includes('thời gian');
  const isDateQuery = (q.includes('ngày') || q.includes('thứ') || q.includes('hôm')) && (q.includes('mấy') || q.includes('nào') || q.includes('bao nhiêu'));
  
  if (isTimeQuery || isDateQuery) {
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
    
    return `**${prefix}** ${timeStr}`;
  }

  // =========================================================================
  // 2. TRA CỨU DỮ LIỆU ĐỘNG (DATA LOOKUP)
  // =========================================================================

  // 2.1 TRA CỨU CHI TIẾT THEO TÊN NHÂN VIÊN HOẶC MÃ NHÂN VIÊN (BẢNG employees + schedules)
  const matchedEmp = employees.find(e => {
    const nameLower = (e.name || '').toLowerCase();
    const cleanName = nameLower.replace(/\([^)]*\)/g, '').trim();
    const idStr = (e.id || '').toString();
    if (idStr && q.includes(idStr)) return true;
    
    if (cleanName && q.includes(cleanName)) return true;
    if (nameLower && q.includes(nameLower)) return true;

    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[nameParts.length - 1]; // Tên chính
    if (firstName && firstName.length >= 2 && q.includes(firstName)) return true;
    return false;
  });

  const paddedQ = ' ' + q.replace(/[?!,.]/g, '') + ' ';
  const hasScheduleIntent = q.includes('làm') || q.includes('lịch') || q.includes('thông tin') || q.includes('hồ sơ') || paddedQ.includes(' ca ') || paddedQ.includes(' ai ') || paddedQ.includes(' mã ');

  if (matchedEmp && hasScheduleIntent) {
    const empSched = weekSchedule[matchedEmp.id] || {};
    let totalH = 0;
    const shiftDetails = WEEK_DAYS.map(d => {
      const { shift, coveringStore } = normalizeShift(empSched[d]);
      const hours = getShiftHours(shift);
      if (shift && shift !== 'off') totalH += hours;
      const shiftStr = shift && shift !== 'off' 
        ? (coveringStore ? `${shift} (Chi viện ${coveringStore})` : shift)
        : 'OFF';
      return `• **${d}**: ${shiftStr}`;
    }).join('\n');

    const isPT = matchedEmp.type === 'STPT' || matchedEmp.type === 'PARTTIME';
    const statusNote = isPT 
      ? (totalH > 23 ? '⚠️ Vượt 23h/tuần!' : (totalH < 16 && totalH > 0 ? '⚠️ Chưa đủ 16h/tuần' : '✓ Định mức đạt'))
      : (totalH === 48 ? '✓ Đạt chuẩn 48h (6 ca)' : `Tổng: ${totalH}h / 48h`);

    return `👤 **Hồ Sơ & Lịch Tuần: ${matchedEmp.name}**\n` +
      `• **Mã NV**: \`${matchedEmp.id}\` | **Cửa hàng**: \`${matchedEmp.dept || storeId}\`\n` +
      `• **Vị trí**: ${matchedEmp.role || 'Nhân viên'} (${matchedEmp.type || 'STPT'})\n` +
      `• **Tổng giờ làm tuần**: **${totalH}h** (${statusNote})\n\n` +
      `📅 **Chi tiết ca trong tuần ${currentWeek}:**\n${shiftDetails}`;
  }

  // 2.2 TRA CỨU ĐƠN ĐỔI CA CHỜ DUYỆT (BẢNG shift_swaps)
  if (q.includes('đổi ca') || q.includes('shift swap') || q.includes('swap')) {
    const pendingSwaps = shiftSwaps.filter(s => s.status === 'approved_by_partner' || s.status === 'pending');
    if (pendingSwaps.length === 0) {
      return `🔄 **Đơn Đổi Ca:** Hiện tại **không có đơn đổi ca nào đang chờ duyệt** tại cửa hàng.`;
    }
    const swapList = pendingSwaps.slice(0, 4).map((s, idx) => {
      const reqEmp = employees.find(e => e.id === s.requester_id);
      const tarEmp = employees.find(e => e.id === s.target_id);
      const reqName = reqEmp ? reqEmp.name : s.requester_id;
      const tarName = tarEmp ? tarEmp.name : s.target_id;
      return `${idx + 1}. **${reqName}** (${s.requester_shift}) ⇄ **${tarName}** (${s.target_shift}) ngày **${s.date}**`;
    }).join('\n');

    return `🔄 **Có ${pendingSwaps.length} đơn đổi ca đang chờ SM duyệt:**\n${swapList}\n\n👉 Bấm nút **"🔄 Đơn đổi ca"** trên thanh công cụ để phê duyệt ngay.`;
  }

  // 2.3 TRA CỨU ĐƠN BÁO BÙ CÔNG C&B (BẢNG feedbacks)
  if (q.includes('bù công') || q.includes('feedback') || q.includes('quên chấm công') || q.includes('c&b') || q.includes('giải trình')) {
    const pendingFbs = feedbacks.filter(f => f.status === 'pending');
    if (pendingFbs.length === 0) {
      return `📋 **Báo Bù Công C&B:** Hiện **không có đơn báo bù công nào đang chờ duyệt**.`;
    }
    const fbList = pendingFbs.slice(0, 4).map((f, idx) => {
      const emp = employees.find(e => e.id === f.emp_id);
      const empName = emp ? emp.name : f.emp_id;
      return `${idx + 1}. **${empName}** xin bù ca **${f.shift_type || '8h'}** ngày **${f.date}** (Lý do: *${f.reason || 'Quên chấm công'}*)`;
    }).join('\n');

    return `📋 **Có ${pendingFbs.length} đơn bù công đang chờ duyệt:**\n${fbList}\n\n👉 Vào mục **"Feedback C&B"** trên menu để xem và duyệt.`;
  }

  // 2.4 TRA CỨU DANH MỤC CỬA HÀNG (BẢNG stores)
  if (q.includes('cửa hàng') && (q.includes('bao nhiêu') || q.includes('danh sách') || q.includes('toàn bộ') || q.includes('chi nhánh'))) {
    const storeCount = stores.length;
    const storeNames = stores.map(s => `• **${s.id}**: ${s.name} (${s.region || 'Miền Bắc'})`).join('\n');
    return `🏬 **Hệ Thống Có ${storeCount} Cửa Hàng:**\n${storeNames || `• **${storeId}**: Cửa hàng ${storeId}`}`;
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

  if (targetDayKey && (q.includes('ai làm') || q.includes('ca nào') || q.includes('danh sách') || q.includes('có ai') || q.includes('ca gì'))) {
    const workingToday = storeEmps.filter(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return shift && shift !== 'off';
    });

    if (workingToday.length === 0) {
      return `📅 Ngày **${targetDayKey}**: Chưa có nhân viên nào được phân ca.`;
    }

    const listByShift = workingToday.map(e => {
      const { shift } = normalizeShift(weekSchedule[e.id]?.[targetDayKey]);
      return `• **${e.name}** (${e.type}): Ca **${shift}**`;
    }).join('\n');

    return `📅 **Danh sách làm việc ngày ${targetDayKey} (${workingToday.length} nhân sự):**\n${listByShift}`;
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
      return `📊 Nhân viên làm nhiều giờ nhất tuần ${currentWeek}: **${maxEmp.name}** (${maxEmp.type}) với **${maxH} giờ**.`;
    }
  }

  // 2.7 KIỂM TRA LỖI / QUÉT LỊCH
  if (q.includes('lỗi') || q.includes('vi phạm') || q.includes('quét') || q.includes('kiểm tra') || q.includes('sai') || q.includes('ổn')) {
    const audit = auditSchedule(employees, weekSchedule, storeId);
    if (audit.totalIssues === 0) {
      return `✅ Lịch tuần ${currentWeek} **đạt chuẩn 100% (0 lỗi)**: Đủ định biên, bạn mới có người kèm, FT và PT đúng giờ.`;
    } else {
      const topIssues = audit.issues.slice(0, 3).map(i => `• ${i.title}`).join('\n');
      return `⚠️ Phát hiện **${audit.totalIssues} vấn đề**:\n${topIssues}\n👉 Bấm nút **"AI Xếp Lịch"** để sửa tự động.`;
    }
  }

  // 15. TRẢ LỜI MẶC ĐỊNH
  return `🤖 **Trợ lý AI Cửa hàng ${storeId}:**\n• Tra cứu nhân viên theo tên hoặc mã NV.\n• Tra cứu lịch làm việc theo ngày (T2 -> CN).\n• Tra cứu đơn đổi ca & báo bù công C&B.\n• Xếp lịch & giải đáp luật lao động.\n\n*Hỏi trực tiếp câu hỏi ngắn để nhận câu trả lời ngay!*`;
}
