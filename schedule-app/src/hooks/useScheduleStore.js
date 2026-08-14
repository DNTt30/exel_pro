import { useState, useEffect, useMemo, useCallback } from "react";
import {
  SHIFT_TYPES,
  STORES,
  COVERAGE_SHIFT_IDS,
  DEFAULT_MIN_HOURS,
  DEFAULT_MIN_SHIFTS_FULLTIME,
  DEFAULT_STAFFING_REQUIREMENTS,
} from "../data/constants";
import { seedEmployees, seedShifts, WEEK_START } from "../data/seedData";
import { addDays, hoursBetween } from "../utils/date";

const STORAGE_KEY = "schedule-app-v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Không đọc được dữ liệu đã lưu, dùng dữ liệu mẫu.", err);
  }
  return {
    weekStart: WEEK_START,
    employees: seedEmployees,
    shifts: seedShifts,
    minHours: DEFAULT_MIN_HOURS,
    minShiftsFulltime: DEFAULT_MIN_SHIFTS_FULLTIME,
    staffingRequirements: DEFAULT_STAFFING_REQUIREMENTS,
    currentUserName: "Quản lý",
    changeLog: [],
  };
}

export function useScheduleStore() {
  const [state, setState] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Không lưu được dữ liệu vào localStorage.", err);
    }
  }, [state]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i)),
    [state.weekStart]
  );

  const getShift = useCallback(
    (employeeId, dayIndex) => state.shifts?.[employeeId]?.[dayIndex] || { type: "unset" },
    [state.shifts]
  );

  const setShift = useCallback((employeeId, dayIndex, entry) => {
    setState((prev) => {
      const prevEntry = prev.shifts?.[employeeId]?.[dayIndex] || { type: "unset" };
      const nextShiftsForEmp = { ...(prev.shifts[employeeId] || {}) };
      nextShiftsForEmp[dayIndex] = entry;
      const logEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        employeeId,
        dayIndex,
        from: prevEntry.type,
        to: entry.type,
        updatedBy: prev.currentUserName,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        shifts: { ...prev.shifts, [employeeId]: nextShiftsForEmp },
        changeLog: [logEntry, ...prev.changeLog].slice(0, 50),
      };
    });
  }, []);

  const updateSettings = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setCurrentUserName = useCallback((name) => {
    setState((prev) => ({ ...prev, currentUserName: name }));
  }, []);

  // ---- Derived: weekly hours + minimum-hours status per employee ----
  const employeeStats = useMemo(() => {
    const stats = {};
    for (const emp of state.employees) {
      let totalHours = 0;
      let workingShifts = 0;
      for (let d = 0; d < 7; d++) {
        const entry = state.shifts?.[emp.id]?.[d];
        if (!entry) continue;
        const def = SHIFT_TYPES[entry.type];
        if (!def || !def.isWorking) continue;
        const start = entry.start || def.defaultStart;
        const end = entry.end || def.defaultEnd;
        totalHours += hoursBetween(start, end);
        workingShifts += 1;
      }
      const minHours = state.minHours[emp.type] ?? 0;
      const meetsMin =
        emp.type === "STFT"
          ? totalHours >= minHours && workingShifts >= state.minShiftsFulltime
          : totalHours >= minHours;
      stats[emp.id] = { totalHours, workingShifts, minHours, meetsMin };
    }
    return stats;
  }, [state.employees, state.shifts, state.minHours, state.minShiftsFulltime]);

  // ---- Derived: understaffed (store, day, shift-type) slots ----
  const staffingGaps = useMemo(() => {
    const gaps = {};
    for (const store of STORES) {
      const rows = [];
      for (let d = 0; d < 7; d++) {
        for (const shiftType of COVERAGE_SHIFT_IDS) {
          const need = state.staffingRequirements?.[store.code]?.[shiftType] ?? 0;
          if (need <= 0) continue;
          let have = 0;
          for (const emp of state.employees) {
            const entry = state.shifts?.[emp.id]?.[d];
            if (!entry || entry.type !== shiftType) continue;
            const effectiveStore = entry.coveringStore || emp.store;
            if (effectiveStore === store.code) have++;
          }
          if (have < need) {
            rows.push({ dayIndex: d, date: weekDates[d], shiftType, have, need, deficit: need - have });
          }
        }
      }
      gaps[store.code] = rows;
    }
    return gaps;
  }, [state.employees, state.shifts, state.staffingRequirements, weekDates]);

  const totalGapCount = useMemo(
    () => Object.values(staffingGaps).reduce((sum, rows) => sum + rows.length, 0),
    [staffingGaps]
  );

  const belowMinCount = useMemo(
    () => Object.values(employeeStats).filter((s) => !s.meetsMin).length,
    [employeeStats]
  );

  // Employees free (off/unset) on a given day — candidates to cover a gap.
  const eligibleForDay = useCallback(
    (dayIndex) =>
      state.employees.filter((emp) => {
        const entry = state.shifts?.[emp.id]?.[dayIndex];
        return !entry || !SHIFT_TYPES[entry.type]?.isWorking;
      }),
    [state.employees, state.shifts]
  );

  const assignSupport = useCallback(
    (storeCode, dayIndex, shiftType, employeeId) => {
      const def = SHIFT_TYPES[shiftType];
      const emp = state.employees.find((e) => e.id === employeeId);
      const isCrossStore = emp && emp.store !== storeCode;
      setShift(employeeId, dayIndex, {
        type: shiftType,
        start: def.defaultStart,
        end: def.defaultEnd,
        coveringStore: isCrossStore ? storeCode : undefined,
      });
    },
    [setShift, state.employees]
  );

  return {
    ...state,
    weekDates,
    getShift,
    setShift,
    updateSettings,
    setCurrentUserName,
    employeeStats,
    staffingGaps,
    totalGapCount,
    belowMinCount,
    eligibleForDay,
    assignSupport,
  };
}
