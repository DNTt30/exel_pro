import ShiftCell from "./ShiftCell";
import { EMPLOYEE_CODE_PATTERN } from "../data/constants";

export default function EmployeeRow({ employee, weekDates, getShift, setShift, stats }) {
  const codeValid = EMPLOYEE_CODE_PATTERN.test(employee.employeeCode);

  return (
    <>
      <div className="sticky left-0 bg-white flex flex-col justify-center gap-0.5 px-3 py-2 border-b border-r" style={{ borderColor: "var(--color-line)" }}>
        <span className="text-sm font-semibold text-[var(--color-ink)] leading-tight">{employee.name}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-data text-[11px] ${codeValid ? "text-[var(--color-ink-soft)]" : "text-[var(--color-critical)] font-semibold"}`}>
            {employee.employeeCode}
            {!codeValid && " ⚠"}
          </span>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-ink-soft)] border" style={{ borderColor: "var(--color-line)" }}>
            {employee.type}
          </span>
        </div>
        {stats && (
          <span
            className="text-[11px] font-data font-medium mt-0.5"
            style={{ color: stats.meetsMin ? "var(--color-ok)" : "var(--color-warning)" }}
          >
            {Math.round(stats.totalHours * 10) / 10}h / {stats.minHours}h tối thiểu
            {!stats.meetsMin && " · thiếu"}
          </span>
        )}
      </div>

      {weekDates.map((date, dayIndex) => (
        <div key={date} className="relative border-b border-r px-1.5 py-1.5" style={{ borderColor: "var(--color-line)" }}>
          <ShiftCell
            entry={getShift(employee.id, dayIndex)}
            homeStore={employee.store}
            onSave={(next) => setShift(employee.id, dayIndex, next)}
          />
        </div>
      ))}
    </>
  );
}
