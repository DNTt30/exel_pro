/**
 * SM INSTRUCTION PARSER — Phan tich lenh tu nhien cua Cua hang truong
 *
 * Chuyen doi cau lenh tieng Viet cua SM thanh scheduling constraints:
 *   "Ca dem ngay 15, 18, 19 xep 2 nguoi vi hang ve nhieu"
 *   => { dayOverrides: { "T5": { "22-6": { min:2 } } }, demandFactor: 1.0 }
 *
 * 2 tang:
 *   1. Rule-based: luon hoat dong, offline
 *   2. Gemini-enhanced: khi co API key, cau phuc tap
 */

import { WEEK_DAYS } from '../data/constants';
import { generateGeminiContent } from '../services/geminiService.js';

// --- Mapping ca tieng Viet -> shift code ---

const SHIFT_KEYWORDS = {
  'dem': '22-6',
  'ca dem': '22-6',
  'night': '22-6',
  '22-6': '22-6',
  '22h': '22-6',
  'sang': '6-14',
  'ca sang': '6-14',
  '6-14': '6-14',
  '6h': '6-14',
  'chieu': '14-22',
  'ca chieu': '14-22',
  '14-22': '14-22',
  '14h': '14-22',
  'hanh chinh': '10-18',
  '10-18': '10-18',
  '6-10': '6-10',
  '10-14': '10-14',
  '14-18': '14-18',
  '18-22': '18-22',
};

// --- Demand modifier keywords ---

const DEMAND_MODIFIERS = [
  { keywords: ['mua to', 'mua lon', 'bao'], factor: 0.65, label: 'thoi tiet xau (mua to/bao)' },
  { keywords: ['mua', 'troi mua'], factor: 0.75, label: 'troi mua' },
  { keywords: ['it khach', 'vang', 'e', 'thap diem', 'doanh so thap', 'doanh so giam', 'doanh thu giam', 'khach giam', 'thap', 'giam nhan su', 'bot nguoi', 'giam nguoi'], factor: 0.80, label: 'nhu cau thap' },
  { keywords: ['ngay thuong', 'binh thuong'], factor: 1.0, label: 'nhu cau binh thuong' },
  { keywords: ['hang ve nhieu', 'nhap hang', 'hang ve', 'nhan hang'], factor: 1.0, label: 'hang ve nhieu (giu nhan su)' },
  { keywords: ['dong khach', 'dong nguoi', 'nhieu khach', 'cao diem', 'le', 'tet', 'su kien'], factor: 1.25, label: 'nhu cau cao' },
  { keywords: ['sale', 'khuyen mai', 'promotion'], factor: 1.15, label: 'chuong trinh khuyen mai' },
];

// --- Helpers ---

export function buildDateToDayKeyMap(currentWeek) {
  if (!currentWeek) return {};
  const parts = currentWeek.split('-').map(Number);
  if (parts.length !== 3) return {};
  const map = {};
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  WEEK_DAYS.forEach((dayKey, idx) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + idx);
    map[dt.getDate()] = dayKey;
  });
  return map;
}

function normalizeVietnamese(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

function extractShiftCode(text) {
  const norm = normalizeVietnamese(text);
  const sorted = Object.keys(SHIFT_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (norm.includes(normalizeVietnamese(kw))) return SHIFT_KEYWORDS[kw];
  }
  return null;
}

const WEEKDAY_MAP = {
  'thu 2': 'T2', 'thu hai': 'T2', 't2': 'T2',
  'thu 3': 'T3', 'thu ba': 'T3', 't3': 'T3',
  'thu 4': 'T4', 'thu tu': 'T4', 't4': 'T4',
  'thu 5': 'T5', 'thu nam': 'T5', 't5': 'T5',
  'thu 6': 'T6', 'thu sau': 'T6', 't6': 'T6',
  'thu 7': 'T7', 'thu bay': 'T7', 't7': 'T7',
  'chu nhat': 'CN', 'cn': 'CN'
};

function extractTargetDayKeys(text, dateMap) {
  const norm = normalizeVietnamese(text);
  const foundKeys = new Set();
  const dayDisplayMap = {}; // key -> display string (e.g. 'T3 (15)' or 'T3')

  // 1. Kiểm tra ngày đặc biệt: cuối tuần, ngày thường
  if (norm.includes('cuoi tuan')) {
    ['T7', 'CN'].forEach(k => { foundKeys.add(k); dayDisplayMap[k] = k; });
  }
  if (norm.includes('trong tuan') || norm.includes('ngay thuong')) {
    ['T2', 'T3', 'T4', 'T5', 'T6'].forEach(k => { foundKeys.add(k); dayDisplayMap[k] = k; });
  }

  // 2. Kiểm tra tên thứ trực tiếp (thứ 2, thứ 3, T2, CN...)
  for (const [kw, dayKey] of Object.entries(WEEKDAY_MAP)) {
    // Regex word boundary cho từ khóa thứ
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(norm)) {
      foundKeys.add(dayKey);
      dayDisplayMap[dayKey] = dayKey;
    }
  }

  // 3. Kiểm tra ngày trong tháng (ngày 15 18 19, hôm 15,...)
  const numPattern = /(?:ngay|hom)\s+([\d,\s\va]+)/gi;
  let m;
  const matchedDates = [];
  while ((m = numPattern.exec(norm)) !== null) {
    const nums = m[1].split(/[\s,va]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= 31);
    matchedDates.push(...nums);
  }
  if (matchedDates.length === 0 && foundKeys.size === 0) {
    // Fallback: tìm các số 1-31 đứng độc lập
    const allNums = [...norm.matchAll(/\b(\d{1,2})\b/g)]
      .map(mm => parseInt(mm[1]))
      .filter(n => n >= 1 && n <= 31);
    matchedDates.push(...allNums);
  }

  matchedDates.forEach(date => {
    const dayKey = dateMap[date];
    if (dayKey) {
      foundKeys.add(dayKey);
      dayDisplayMap[dayKey] = `${dayKey} (${String(date).padStart(2, '0')})`;
    }
  });

  return { dayKeys: [...foundKeys], dayDisplayMap };
}

function extractCount(text) {
  const norm = normalizeVietnamese(text);
  const patterns = [
    /(?:xep|can|toi thieu|it nhat|toi da|du|them)\s+(\d+)\s*(?:nguoi|ban|nhan vien|nv)?/i,
    /(\d+)\s*(?:nguoi|ban|nhan vien|nv)/i,
  ];
  for (const p of patterns) {
    const mm = norm.match(p);
    if (mm) return parseInt(mm[1]);
  }
  return null;
}

function extractReason(sentence) {
  const norm = normalizeVietnamese(sentence);
  const mm = norm.match(/(?:vi|do|boi|ly do|de)\s+(.+)/i);
  if (mm) {
    const idx = norm.indexOf(mm[0]);
    return sentence.slice(idx).replace(/^(vi|do|boi|ly do|de)\s+/i, '').trim().replace(/[.!?]$/, '');
  }
  const parts = sentence.split(',');
  if (parts.length > 1) return parts.slice(1).join(',').trim();
  return '';
}

// --- Core rule-based parser ---

function findEmployeeInSentence(sentence, employees = []) {
  if (!employees.length) return null;
  const sNorm = normalizeVietnamese(sentence);
  for (const emp of employees) {
    if (emp.id && sNorm.includes(emp.id.toLowerCase())) return emp;
    if (emp.name) {
      const fullNorm = normalizeVietnamese(emp.name);
      if (sNorm.includes(fullNorm)) return emp;
      const parts = fullNorm.split(/\s+/).filter(Boolean);
      const fn = parts[parts.length - 1];
      if (fn && fn.length >= 2) {
        const re = new RegExp(`\\b${fn}\\b`, 'i');
        if (re.test(sNorm)) return emp;
      }
    }
  }
  return null;
}

export function parseSmInstructions(text, currentWeek = '', employees = []) {
  if (!text || !text.trim()) {
    return { dayOverrides: {}, employeeOverrides: {}, nightVolunteers: [], demandFactor: 1.0, globalReason: '', appliedRules: [] };
  }

  const normFull = normalizeVietnamese(text);
  const dateMap = buildDateToDayKeyMap(currentWeek);
  const dayOverrides = {};
  const employeeOverrides = {};
  const nightVolunteers = [];
  const appliedRules = [];

  const sentences = text.split(/[.;\n]/).map(s => s.trim()).filter(Boolean);

  for (const sentence of sentences) {
    const sNorm = normalizeVietnamese(sentence);
    const shiftCode = extractShiftCode(sNorm);
    const { dayKeys, dayDisplayMap } = extractTargetDayKeys(sentence, dateMap);
    const count = extractCount(sNorm);
    const targetEmp = findEmployeeInSentence(sentence, employees);

    // 1. Chỉ đạo đích danh nhân viên (Employee Overrides)
    if (targetEmp) {
      const isOffReq = sNorm.includes('nghi') || sNorm.includes('off') || sNorm.includes('vang');
      const isNightPriority = (sNorm.includes('uu tien') || sNorm.includes('chuyen')) && (shiftCode === '22-6' || sNorm.includes('dem'));

      if (isNightPriority) {
        if (!nightVolunteers.includes(targetEmp.id)) nightVolunteers.push(targetEmp.id);
        appliedRules.push(`Nhân sự **${targetEmp.name}**: ưu tiên xếp ca đêm 22-6 (lệnh SM)`);
      }

      if (dayKeys.length > 0) {
        if (!employeeOverrides[targetEmp.id]) employeeOverrides[targetEmp.id] = {};
        const assignCode = isOffReq ? 'off' : (shiftCode || '6-14');
        const displayDays = dayKeys.map(d => dayDisplayMap[d] || d).join(', ');

        dayKeys.forEach(dk => {
          employeeOverrides[targetEmp.id][dk] = assignCode;
        });

        if (isOffReq) {
          appliedRules.push(`Nhân sự **${targetEmp.name}**: duyệt **NGHỈ (OFF)** ngày **${displayDays}** (lệnh SM)`);
        } else {
          appliedRules.push(`Nhân sự **${targetEmp.name}**: cố định ca **${assignCode}** ngày **${displayDays}** (lệnh SM)`);
        }
      }
      continue;
    }

    // 2. Chỉ đạo theo định biên chung (Staffing Matrix Overrides)
    if (shiftCode && dayKeys.length > 0 && count !== null) {
      const displayLabels = [];
      for (const dayKey of dayKeys) {
        if (!dayOverrides[dayKey]) dayOverrides[dayKey] = {};
        dayOverrides[dayKey][shiftCode] = {
          min: count,
          max: count,
          reason: extractReason(sentence),
          source: 'sm_instruction',
        };
        displayLabels.push(dayDisplayMap[dayKey] || dayKey);
      }
      if (displayLabels.length > 0) {
        const reason = extractReason(sentence);
        appliedRules.push(
          `Ca ${shiftCode} — ${displayLabels.join(', ')}: tối thiểu **${count} người**${reason ? ` (${reason})` : ''}`
        );
      }
    }
  }

  // Demand factor
  let demandFactor = 1.0;
  let globalReason = '';

  const sortedModifiers = [...DEMAND_MODIFIERS].sort((a, b) =>
    Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length))
  );

  for (const mod of sortedModifiers) {
    if (mod.keywords.some(kw => normFull.includes(normalizeVietnamese(kw)))) {
      demandFactor = mod.factor;
      globalReason = mod.label;
      break;
    }
  }

  if (demandFactor !== 1.0) {
    const pct = demandFactor < 1
      ? `giảm ~${Math.round((1 - demandFactor) * 100)}%`
      : `tăng ~${Math.round((demandFactor - 1) * 100)}%`;
    appliedRules.push(`Nhân sự toàn tuần: **${pct}** so với định biên (${globalReason})`);
  }

  return { dayOverrides, employeeOverrides, nightVolunteers, demandFactor, globalReason, appliedRules };
}

// --- Tang 2: Gemini-enhanced parser ---

export async function parseSmInstructionsWithGemini(text, currentWeek, geminiApiKey) {
  if (!geminiApiKey || !text?.trim()) {
    return parseSmInstructions(text, currentWeek);
  }

  const dateMap = buildDateToDayKeyMap(currentWeek);
  const weekSummary = Object.entries(dateMap)
    .map(([date, dayKey]) => `${dayKey}=ngay ${date}`)
    .join(', ');

  const systemPrompt = `Ban la AI phan tich lenh xep lich cua Cua hang truong GS25 (Viet Nam).
Tuan dang xep: ${currentWeek || 'chua ro'}. Mapping ngay→thu: ${weekSummary || 'chua co'}.
Ca lam viec hop le: "6-14" (sang), "14-22" (chieu), "22-6" (dem), "10-18" (hanh chinh), "6-10", "10-14", "14-18", "18-22" (ca ngan PT).

Phan tich cau lenh SM va tra ve JSON theo format:
{
  "dayOverrides": { "T5": { "22-6": { "min": 2, "reason": "hang ve nhieu" } } },
  "demandFactor": 0.8,
  "globalReason": "troi mua, doanh so thap",
  "appliedRules": ["mo ta rule 1"]
}
Quy tac: dayOverrides key phai la T2/T3/T4/T5/T6/T7/CN. Chi tra JSON, khong giai thich them.`;

  try {
    const raw = await generateGeminiContent(text, systemPrompt, geminiApiKey);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    const rulebased = parseSmInstructions(text, currentWeek);
    return {
      dayOverrides: { ...rulebased.dayOverrides, ...(parsed.dayOverrides || {}) },
      demandFactor: typeof parsed.demandFactor === 'number' ? parsed.demandFactor : rulebased.demandFactor,
      globalReason: parsed.globalReason || rulebased.globalReason,
      appliedRules: parsed.appliedRules?.length ? parsed.appliedRules : rulebased.appliedRules,
      source: 'gemini',
    };
  } catch {
    return parseSmInstructions(text, currentWeek);
  }
}