// ---------------------------------------------------------------------------
// Single source of truth for the whole app. This file exists specifically to
// fix the original spreadsheet bug where shift meaning, color, and time were
// decided by hand, cell by cell. Every shift type is defined ONCE, here.
// ---------------------------------------------------------------------------

export const STORES = [
  { code: "VN0485", label: "VN0485" },
  { code: "VN0497", label: "VN0497" },
  { code: "VN0500", label: "VN0500" },
  { code: "VN0470", label: "VN0470" },
];

export const EMP_TYPES = {
  STPT: { id: "STPT", label: "Part-time (STPT)" },
  STFT: { id: "STFT", label: "Full-time (STFT)" },
};

// A cell can only ever hold one of these. No free text, ever.
export const SHIFT_TYPES = {
  unset: {
    id: "unset",
    label: "— Chưa xếp —",
    short: "Chưa xếp",
    color: "var(--color-unset)",
    soft: "transparent",
    isWorking: false,
    dashed: true,
  },
  off: {
    id: "off",
    label: "OFF (nghỉ)",
    short: "OFF",
    color: "var(--color-off)",
    soft: "var(--color-off-soft)",
    isWorking: false,
  },
  ca1: {
    id: "ca1",
    label: "Ca 1 — Sáng",
    short: "Ca 1",
    color: "var(--color-ca1)",
    soft: "var(--color-ca1-soft)",
    isWorking: true,
    defaultStart: "06:00",
    defaultEnd: "14:00",
  },
  ca2: {
    id: "ca2",
    label: "Ca 2 — Chiều",
    short: "Ca 2",
    color: "var(--color-ca2)",
    soft: "var(--color-ca2-soft)",
    isWorking: true,
    defaultStart: "14:00",
    defaultEnd: "22:00",
  },
  ca3: {
    id: "ca3",
    label: "Ca 3 — Đêm",
    short: "Ca 3",
    color: "var(--color-ca3)",
    soft: "var(--color-ca3-soft)",
    isWorking: true,
    defaultStart: "22:00",
    defaultEnd: "06:00",
  },
  csrNew: {
    id: "csrNew",
    label: "CSR NEW",
    short: "CSR NEW",
    color: "var(--color-csrnew)",
    soft: "var(--color-csrnew-soft)",
    isWorking: true,
    defaultStart: "08:00",
    defaultEnd: "16:00",
  },
  support: {
    id: "support",
    label: "Support (hỗ trợ)",
    short: "Support",
    color: "var(--color-support)",
    soft: "var(--color-support-soft)",
    isWorking: true,
    defaultStart: "08:00",
    defaultEnd: "16:00",
  },
  training: {
    id: "training",
    label: "Training",
    short: "Training",
    color: "var(--color-training)",
    soft: "var(--color-training-soft)",
    isWorking: true,
    defaultStart: "09:00",
    defaultEnd: "17:00",
  },
};

// Only these count as "coverage" shifts for staffing-requirement math.
export const COVERAGE_SHIFT_IDS = ["ca1", "ca2", "ca3"];

export const WEEKDAYS = [
  { key: 0, label: "Thứ Hai", short: "T2" },
  { key: 1, label: "Thứ Ba", short: "T3" },
  { key: 2, label: "Thứ Tư", short: "T4" },
  { key: 3, label: "Thứ Năm", short: "T5" },
  { key: 4, label: "Thứ Sáu", short: "T6" },
  { key: 5, label: "Thứ Bảy", short: "T7" },
  { key: 6, label: "Chủ Nhật", short: "CN" },
];

export const EMPLOYEE_CODE_PATTERN = /^\d{9}$/;

// Configurable, not hardcoded in logic — surfaced and editable in Settings.
export const DEFAULT_MIN_HOURS = {
  STPT: 16,
  STFT: 48,
};

export const DEFAULT_MIN_SHIFTS_FULLTIME = 6;

// "Định biên" — minimum headcount per store, per coverage shift, per day.
// This is the missing input the previous review flagged: without it,
// "understaffed" has no baseline to compare against.
export const DEFAULT_STAFFING_REQUIREMENTS = STORES.reduce((acc, s) => {
  acc[s.code] = { ca1: 2, ca2: 2, ca3: 1 };
  return acc;
}, {});
