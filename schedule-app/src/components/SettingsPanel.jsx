import { STORES, COVERAGE_SHIFT_IDS, SHIFT_TYPES } from "../data/constants";

export default function SettingsPanel({
  minHours,
  minShiftsFulltime,
  staffingRequirements,
  currentUserName,
  updateSettings,
  setCurrentUserName,
}) {
  function setMinHours(key, value) {
    updateSettings({ minHours: { ...minHours, [key]: Number(value) } });
  }

  function setStaffing(storeCode, shiftType, value) {
    updateSettings({
      staffingRequirements: {
        ...staffingRequirements,
        [storeCode]: { ...staffingRequirements[storeCode], [shiftType]: Number(value) },
      },
    });
  }

  return (
    <details className="rounded-xl border bg-white" style={{ borderColor: "var(--color-line)" }}>
      <summary className="cursor-pointer px-4 py-2.5 font-display font-semibold text-sm text-[var(--color-ink)]">
        Cấu hình (ngưỡng giờ · định biên · người thao tác)
      </summary>
      <div className="px-4 pb-4 pt-1 flex flex-col gap-4">
        <label className="text-xs font-medium text-[var(--color-ink-soft)] max-w-xs">
          Đang thao tác với tên
          <input
            type="text"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--color-line-strong)" }}
            value={currentUserName}
            onChange={(e) => setCurrentUserName(e.target.value)}
          />
          <span className="block mt-1 font-normal text-[11px] text-[var(--color-ink-soft)]">
            Dùng để ghi lại ai chỉnh sửa — thay cho tài khoản đăng nhập thật khi có backend.
          </span>
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="text-xs font-medium text-[var(--color-ink-soft)]">
            Giờ tối thiểu / tuần — Part-time (STPT)
            <input
              type="number"
              min="0"
              className="mt-1 w-28 rounded border px-2 py-1.5 text-sm font-data block"
              style={{ borderColor: "var(--color-line-strong)" }}
              value={minHours.STPT}
              onChange={(e) => setMinHours("STPT", e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-ink-soft)]">
            Giờ tối thiểu / tuần — Full-time (STFT)
            <input
              type="number"
              min="0"
              className="mt-1 w-28 rounded border px-2 py-1.5 text-sm font-data block"
              style={{ borderColor: "var(--color-line-strong)" }}
              value={minHours.STFT}
              onChange={(e) => setMinHours("STFT", e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-ink-soft)]">
            Số buổi tối thiểu — Full-time
            <input
              type="number"
              min="0"
              className="mt-1 w-28 rounded border px-2 py-1.5 text-sm font-data block"
              style={{ borderColor: "var(--color-line-strong)" }}
              value={minShiftsFulltime}
              onChange={(e) => updateSettings({ minShiftsFulltime: Number(e.target.value) })}
            />
          </label>
        </div>

        <div>
          <span className="text-xs font-medium text-[var(--color-ink-soft)]">Định biên tối thiểu / ca / ngày</span>
          <table className="mt-1.5 text-sm">
            <thead>
              <tr>
                <th className="text-left font-medium text-[var(--color-ink-soft)] pr-4 pb-1">Store</th>
                {COVERAGE_SHIFT_IDS.map((id) => (
                  <th key={id} className="text-left font-medium pr-4 pb-1" style={{ color: SHIFT_TYPES[id].color }}>
                    {SHIFT_TYPES[id].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STORES.map((s) => (
                <tr key={s.code}>
                  <td className="pr-4 py-0.5 font-data text-[var(--color-ink)]">{s.code}</td>
                  {COVERAGE_SHIFT_IDS.map((id) => (
                    <td key={id} className="pr-4 py-0.5">
                      <input
                        type="number"
                        min="0"
                        className="w-14 rounded border px-1.5 py-1 text-sm font-data"
                        style={{ borderColor: "var(--color-line-strong)" }}
                        value={staffingRequirements[s.code]?.[id] ?? 0}
                        onChange={(e) => setStaffing(s.code, id, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
