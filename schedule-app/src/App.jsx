import { useScheduleStore } from "./hooks/useScheduleStore";
import { STORES } from "./data/constants";
import { formatFullVN } from "./utils/date";
import Legend from "./components/Legend";
import StoreGrid from "./components/StoreGrid";
import StaffingPanel from "./components/StaffingPanel";
import SettingsPanel from "./components/SettingsPanel";
import ChangeLogPanel from "./components/ChangeLogPanel";

export default function App() {
  const store = useScheduleStore();
  const {
    employees,
    weekDates,
    getShift,
    setShift,
    employeeStats,
    staffingGaps,
    totalGapCount,
    belowMinCount,
    eligibleForDay,
    assignSupport,
    minHours,
    minShiftsFulltime,
    staffingRequirements,
    currentUserName,
    updateSettings,
    setCurrentUserName,
    changeLog,
  } = store;

  return (
    <div className="min-h-screen pb-16">
      <header className="border-b bg-white" style={{ borderColor: "var(--color-line)" }}>
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-xl text-[var(--color-ink)]">Lịch làm việc — SM Văn Chương</h1>
            <p className="text-sm text-[var(--color-ink-soft)] font-data">
              {formatFullVN(weekDates[0])} – {formatFullVN(weekDates[6])}
            </p>
          </div>
          <div className="flex gap-2">
            <StatChip
              label="Khung ca thiếu người"
              value={totalGapCount}
              tone={totalGapCount > 0 ? "critical" : "ok"}
            />
            <StatChip
              label="NV dưới giờ tối thiểu"
              value={belowMinCount}
              tone={belowMinCount > 0 ? "warning" : "ok"}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 mt-6 flex flex-col gap-6">
        <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "var(--color-line)" }}>
          <Legend />
        </div>

        <StaffingPanel
          staffingGaps={staffingGaps}
          employees={employees}
          eligibleForDay={eligibleForDay}
          assignSupport={assignSupport}
          totalGapCount={totalGapCount}
        />

        {STORES.map((s) => (
          <StoreGrid
            key={s.code}
            store={s}
            employees={employees.filter((e) => e.store === s.code)}
            weekDates={weekDates}
            getShift={getShift}
            setShift={setShift}
            employeeStats={employeeStats}
            gapCount={staffingGaps[s.code]?.length || 0}
          />
        ))}

        <SettingsPanel
          minHours={minHours}
          minShiftsFulltime={minShiftsFulltime}
          staffingRequirements={staffingRequirements}
          currentUserName={currentUserName}
          updateSettings={updateSettings}
          setCurrentUserName={setCurrentUserName}
        />

        <ChangeLogPanel changeLog={changeLog} employees={employees} />
      </main>
    </div>
  );
}

function StatChip({ label, value, tone }) {
  const toneColors = {
    critical: { bg: "var(--color-critical-soft)", fg: "var(--color-critical)" },
    warning: { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
    ok: { bg: "var(--color-ok-soft)", fg: "var(--color-ok)" },
  }[tone];

  return (
    <div
      className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5"
      style={{ background: toneColors.bg }}
    >
      <span className="font-display font-bold text-base" style={{ color: toneColors.fg }}>
        {value}
      </span>
      <span className="text-xs font-medium" style={{ color: toneColors.fg }}>
        {label}
      </span>
    </div>
  );
}
