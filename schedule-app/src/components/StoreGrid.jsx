import EmployeeRow from "./EmployeeRow";
import { WEEKDAYS } from "../data/constants";
import { formatDMY } from "../utils/date";

export default function StoreGrid({ store, employees, weekDates, getShift, setShift, employeeStats, gapCount }) {
  if (employees.length === 0) return null;

  return (
    <section className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "var(--color-line)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
        <div className="flex items-baseline gap-2">
          <h2 className="font-display font-semibold text-base text-[var(--color-ink)]">{store.label}</h2>
          <span className="text-xs text-[var(--color-ink-soft)]">{employees.length} nhân viên</span>
        </div>
        {gapCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-critical-soft)", color: "var(--color-critical)" }}
          >
            {gapCount} khung ca thiếu người
          </span>
        )}
      </div>

      <div
        className="grid overflow-x-auto"
        style={{ gridTemplateColumns: "minmax(200px,240px) repeat(7, minmax(120px,1fr))" }}
      >
        <div className="sticky left-0 top-0 bg-white border-b border-r px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide">Nhân viên</span>
        </div>
        {weekDates.map((date, i) => (
          <div key={date} className="border-b border-r px-2 py-2 text-center" style={{ borderColor: "var(--color-line)" }}>
            <div className="text-xs font-semibold text-[var(--color-ink)]">{WEEKDAYS[i].label}</div>
            <div className="text-[11px] font-data text-[var(--color-ink-soft)]">{formatDMY(date)}</div>
          </div>
        ))}

        {employees.map((emp) => (
          <EmployeeRow
            key={emp.id}
            employee={emp}
            weekDates={weekDates}
            getShift={getShift}
            setShift={setShift}
            stats={employeeStats[emp.id]}
          />
        ))}
      </div>
    </section>
  );
}
