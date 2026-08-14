// Illustrative seed data — a handful of employees across the four store
// codes, deliberately covering every rule in the app at least once:
// an under-minimum-hours case, an exactly-at-minimum case, a cross-store
// covering shift, and an explicitly "chưa xếp" (unset) cell. Replace with
// real data once the shape looks right — see README.

export const WEEK_START = "2026-08-10"; // Monday

export const seedEmployees = [
  { id: "e1", employeeCode: "260512008", name: "Nguyễn Việt Hưng", store: "VN0485", type: "STPT" },
  { id: "e2", employeeCode: "260508026", name: "Nguyễn Việt Bách", store: "VN0485", type: "STPT" },
  { id: "e3", employeeCode: "260225006", name: "Vũ Thị Kim Vương", store: "VN0497", type: "STPT" },
  { id: "e4", employeeCode: "260522010", name: "Trần Hải Anh", store: "VN0497", type: "STFT" },
  { id: "e5", employeeCode: "250826005", name: "Lê Ngọc Dung", store: "VN0500", type: "STPT" },
  { id: "e6", employeeCode: "250910016", name: "Mai Thị Phương Thúy", store: "VN0500", type: "STPT" },
  { id: "e7", employeeCode: "260618015", name: "Nguyễn Minh Tâm", store: "VN0500", type: "STFT" },
  { id: "e8", employeeCode: "260602010", name: "Quách Thị Phương Linh", store: "VN0500", type: "STPT" },
  { id: "e9", employeeCode: "260804027", name: "Nguyễn Vũ Thanh Bình", store: "VN0470", type: "STPT" },
];

// shifts[employeeId][dayIndex] = { type, start?, end?, coveringStore? }
// A day missing from the map is "unset" by default — never a silent blank.
export const seedShifts = {
  e1: {
    0: { type: "ca3" }, 1: { type: "ca3" }, 2: { type: "ca3" },
    3: { type: "ca3" }, 4: { type: "ca3" }, 5: { type: "off" }, 6: { type: "off" },
  },
  e2: {
    0: { type: "ca1", start: "06:00", end: "10:00" },
    1: { type: "off" }, 2: { type: "off" }, 3: { type: "off" },
    4: { type: "off" }, 5: { type: "off" }, 6: { type: "off" },
  },
  e3: {
    0: { type: "ca2" }, 1: { type: "off" }, 2: { type: "off" },
    3: { type: "off" }, 4: { type: "ca2" }, 5: { type: "off" }, 6: { type: "off" },
  },
  e4: {
    0: { type: "ca3" }, 1: { type: "ca3" }, 2: { type: "ca3" },
    3: { type: "ca3" }, 4: { type: "ca3" }, 5: { type: "ca3" }, 6: { type: "off" },
  },
  e5: {
    0: { type: "off" }, 1: { type: "off" }, 2: { type: "training" },
    3: { type: "training" }, 4: { type: "training" },
    // 5, 6 intentionally absent -> renders as "Chưa xếp"
  },
  e6: {
    0: { type: "off" }, 1: { type: "ca3" }, 2: { type: "ca2" },
    3: { type: "ca1" }, 4: { type: "ca1" }, 5: { type: "ca1" },
    // 6 absent -> "Chưa xếp"
  },
  e7: {
    0: { type: "ca3" },
    1: { type: "ca3", coveringStore: "VN0497" },
    2: { type: "ca3" }, 3: { type: "ca3" }, 4: { type: "ca3" }, 5: { type: "ca3" },
    // 6 absent -> "Chưa xếp"
  },
  e8: {
    0: { type: "off" }, 1: { type: "off" },
    2: { type: "support", coveringStore: "VN0497", start: "06:00", end: "12:00" },
    3: { type: "off" },
    4: { type: "ca2", coveringStore: "VN0485" },
    5: { type: "off" }, 6: { type: "ca2" },
  },
  e9: {
    1: { type: "ca3" },
    // all other days intentionally absent -> "Chưa xếp", same employee
    // that had a near-empty week in the original sheet — now it's honest
    // about it instead of leaving the reader to guess.
  },
};
