import { SHIFT_TYPES, WEEKDAYS } from "../data/constants";

export default function ChangeLogPanel({ changeLog, employees }) {
  const nameById = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  return (
    <details className="rounded-xl border bg-white" style={{ borderColor: "var(--color-line)" }}>
      <summary className="cursor-pointer px-4 py-2.5 font-display font-semibold text-sm text-[var(--color-ink)]">
        Nhật ký thay đổi ({changeLog.length})
      </summary>
      <div className="px-4 pb-3 max-h-64 overflow-y-auto">
        {changeLog.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-soft)] py-2">Chưa có thay đổi nào.</p>
        ) : (
          <ul className="text-xs divide-y" style={{ borderColor: "var(--color-line)" }}>
            {changeLog.map((log) => (
              <li key={log.id} className="py-1.5 flex flex-wrap gap-x-1.5 text-[var(--color-ink-soft)]">
                <span className="font-medium text-[var(--color-ink)]">{log.updatedBy}</span>
                <span>sửa</span>
                <span className="font-medium text-[var(--color-ink)]">{nameById[log.employeeId] || log.employeeId}</span>
                <span>({WEEKDAYS[log.dayIndex]?.short}):</span>
                <span>{SHIFT_TYPES[log.from]?.short}</span>
                <span>→</span>
                <span className="font-medium" style={{ color: SHIFT_TYPES[log.to]?.color }}>
                  {SHIFT_TYPES[log.to]?.short}
                </span>
                <span className="font-data ml-auto">{new Date(log.updatedAt).toLocaleTimeString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
