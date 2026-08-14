import { useState } from "react";
import { STORES, SHIFT_TYPES, WEEKDAYS } from "../data/constants";
import { formatDMY } from "../utils/date";

function GapRow({ row, storeCode, employees, eligibleForDay, onAssign }) {
  const candidates = eligibleForDay(row.dayIndex);
  const [selected, setSelected] = useState(candidates[0]?.id || "");
  const def = SHIFT_TYPES[row.shiftType];

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b last:border-b-0" style={{ borderColor: "var(--color-line)" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: def.color }} aria-hidden="true" />
      <span className="text-sm text-[var(--color-ink)] w-28 shrink-0">
        {WEEKDAYS[row.dayIndex].label} <span className="font-data text-[var(--color-ink-soft)]">{formatDMY(row.date)}</span>
      </span>
      <span className="text-sm font-medium w-20 shrink-0" style={{ color: def.color }}>{def.short}</span>
      <span className="text-xs text-[var(--color-ink-soft)] w-24 shrink-0">
        đang có {row.have}/{row.need}
      </span>

      {candidates.length > 0 ? (
        <div className="flex items-center gap-1.5 ml-auto">
          <select
            className="rounded border px-1.5 py-1 text-xs"
            style={{ borderColor: "var(--color-line-strong)" }}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.store})
              </option>
            ))}
          </select>
          <button
            onClick={() => onAssign(storeCode, row.dayIndex, row.shiftType, selected)}
            disabled={!selected}
            className="text-xs font-semibold px-2.5 py-1 rounded text-white disabled:opacity-40"
            style={{ background: "var(--color-support)" }}
          >
            Gán hỗ trợ
          </button>
        </div>
      ) : (
        <span className="text-xs text-[var(--color-ink-soft)] ml-auto italic">Không có ai đang rảnh ngày này</span>
      )}
    </div>
  );
}

export default function StaffingPanel({ staffingGaps, employees, eligibleForDay, assignSupport, totalGapCount }) {
  if (totalGapCount === 0) {
    return (
      <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--color-line)", background: "var(--color-ok-soft)" }}>
        <span style={{ color: "var(--color-ok)" }} className="font-medium">
          Đủ định biên cho tất cả các ca trong tuần này.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "var(--color-line)" }}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--color-line)", background: "var(--color-critical-soft)" }}>
        <h2 className="font-display font-semibold text-sm" style={{ color: "var(--color-critical)" }}>
          Cần hỗ trợ — {totalGapCount} khung ca dưới định biên
        </h2>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--color-line)" }}>
        {STORES.filter((s) => staffingGaps[s.code]?.length > 0).map((store) => (
          <details key={store.code} open className="px-4 py-2.5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
              {store.label} · {staffingGaps[store.code].length} khung ca thiếu
            </summary>
            <div className="mt-1.5">
              {staffingGaps[store.code]
                .sort((a, b) => a.dayIndex - b.dayIndex)
                .map((row) => (
                  <GapRow
                    key={`${row.dayIndex}-${row.shiftType}`}
                    row={row}
                    storeCode={store.code}
                    employees={employees}
                    eligibleForDay={eligibleForDay}
                    onAssign={assignSupport}
                  />
                ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
