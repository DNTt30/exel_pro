import { SHIFT_TYPES } from "../data/constants";

const ORDER = ["ca1", "ca2", "ca3", "csrNew", "support", "training", "off", "unset"];

export default function Legend() {
  return (
    <div className="flex flex-wrap gap-2">
      {ORDER.map((id) => {
        const def = SHIFT_TYPES[id];
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 bg-white"
            style={{ borderColor: "var(--color-line)" }}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{
                background: id === "unset" ? "transparent" : def.color,
                border: id === "unset" ? `1.5px dashed ${def.color}` : "none",
              }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-[var(--color-ink)]">{def.label}</span>
            {def.defaultStart && (
              <span className="text-[11px] font-data text-[var(--color-ink-soft)]">
                {def.defaultStart}–{def.defaultEnd}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
