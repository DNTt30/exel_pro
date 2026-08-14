import { useState } from "react";
import { SHIFT_TYPES, STORES } from "../data/constants";
import { hoursBetween } from "../utils/date";

const TYPE_ORDER = ["unset", "off", "ca1", "ca2", "ca3", "csrNew", "support", "training"];

export default function ShiftCell({ entry, homeStore, onSave }) {
  const [editing, setEditing] = useState(false);
  const def = SHIFT_TYPES[entry.type] || SHIFT_TYPES.unset;
  const [draft, setDraft] = useState(() => toDraft(entry, homeStore));

  function toDraft(e, home) {
    const d = SHIFT_TYPES[e.type] || SHIFT_TYPES.unset;
    return {
      type: e.type,
      start: e.start || d.defaultStart || "",
      end: e.end || d.defaultEnd || "",
      coveringStore: e.coveringStore || home,
    };
  }

  function openEdit() {
    setDraft(toDraft(entry, homeStore));
    setEditing(true);
  }

  function handleTypeChange(newType) {
    const d = SHIFT_TYPES[newType];
    setDraft((prev) => ({
      ...prev,
      type: newType,
      start: d.isWorking ? d.defaultStart : "",
      end: d.isWorking ? d.defaultEnd : "",
    }));
  }

  function isWorkingType(t) {
    return SHIFT_TYPES[t]?.isWorking;
  }

  function save() {
    if (!isWorkingType(draft.type)) {
      onSave({ type: draft.type });
    } else {
      onSave({
        type: draft.type,
        start: draft.start,
        end: draft.end,
        coveringStore: draft.coveringStore !== homeStore ? draft.coveringStore : undefined,
      });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="absolute z-20 left-0 top-0 w-56 rounded-lg border bg-white shadow-lg p-2.5 flex flex-col gap-2"
        style={{ borderColor: "var(--color-line-strong)" }}
      >
        <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">
          Loại ca
          <select
            className="mt-0.5 w-full rounded border px-1.5 py-1 text-sm"
            style={{ borderColor: "var(--color-line-strong)" }}
            value={draft.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            autoFocus
          >
            {TYPE_ORDER.map((id) => (
              <option key={id} value={id}>
                {SHIFT_TYPES[id].label}
              </option>
            ))}
          </select>
        </label>

        {isWorkingType(draft.type) && (
          <>
            <div className="flex gap-1.5">
              <label className="text-[11px] font-medium text-[var(--color-ink-soft)] flex-1">
                Vào
                <input
                  type="time"
                  className="mt-0.5 w-full rounded border px-1.5 py-1 text-sm font-data"
                  style={{ borderColor: "var(--color-line-strong)" }}
                  value={draft.start}
                  onChange={(e) => setDraft((p) => ({ ...p, start: e.target.value }))}
                />
              </label>
              <label className="text-[11px] font-medium text-[var(--color-ink-soft)] flex-1">
                Ra
                <input
                  type="time"
                  className="mt-0.5 w-full rounded border px-1.5 py-1 text-sm font-data"
                  style={{ borderColor: "var(--color-line-strong)" }}
                  value={draft.end}
                  onChange={(e) => setDraft((p) => ({ ...p, end: e.target.value }))}
                />
              </label>
            </div>
            <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">
              Trực tại
              <select
                className="mt-0.5 w-full rounded border px-1.5 py-1 text-sm"
                style={{ borderColor: "var(--color-line-strong)" }}
                value={draft.coveringStore}
                onChange={(e) => setDraft((p) => ({ ...p, coveringStore: e.target.value }))}
              >
                {STORES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                    {s.code === homeStore ? " (store gốc)" : " — hỗ trợ chéo"}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <div className="flex gap-1.5 mt-0.5">
          <button
            onClick={save}
            className="flex-1 rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Lưu
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 rounded px-2 py-1 text-xs font-semibold border"
            style={{ borderColor: "var(--color-line-strong)", color: "var(--color-ink-soft)" }}
          >
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  const hrs = def.isWorking ? hoursBetween(entry.start || def.defaultStart, entry.end || def.defaultEnd) : 0;

  return (
    <button
      type="button"
      onClick={openEdit}
      className="relative w-full min-h-[52px] rounded-md border px-2 py-1.5 text-left transition-shadow hover:shadow-sm"
      style={{
        borderColor: entry.type === "unset" ? "var(--color-line-strong)" : "transparent",
        borderStyle: entry.type === "unset" ? "dashed" : "solid",
        background: def.soft,
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
        style={{ background: entry.type === "unset" ? "transparent" : def.color }}
      />
      <span className="block text-[11px] font-semibold" style={{ color: entry.type === "unset" ? "var(--color-ink-soft)" : def.color }}>
        {def.short}
      </span>
      {def.isWorking && (
        <span className="block text-[11px] font-data text-[var(--color-ink-soft)]">
          {entry.start || def.defaultStart}–{entry.end || def.defaultEnd}
          <span className="opacity-70"> · {hrs}h</span>
        </span>
      )}
      {entry.coveringStore && (
        <span className="block text-[10px] font-medium mt-0.5" style={{ color: "var(--color-support)" }}>
          → {entry.coveringStore}
        </span>
      )}
    </button>
  );
}
