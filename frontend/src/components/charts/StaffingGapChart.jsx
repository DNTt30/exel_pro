import React, { useMemo, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { WEEK_DAYS, DAY_FULL_NAMES, getStaffingMatrix, STAFFING_SHIFT_CODES } from '../../data/constants';
import { calculateStaffingGap } from '../../utils/shiftHelper';

// Nhãn tiếng Việt cho từng ca
const SHIFT_LABELS = { '6-14': 'Ca sáng', '14-22': 'Ca chiều', '22-6': 'Ca đêm' };

/**
 * Biểu đồ cột nhóm: Định biên (cần) vs Thực tế (có) theo Ngày × Ca.
 * Tái dùng đúng logic của StaffingGapTable qua calculateStaffingGap + getStaffingMatrix.
 */
export default function StaffingGapChart({ employees, weekSchedule = {}, stores = [], scopeStoreId = 'ALL', currentWeek }) {
  const [hoverKey, setHoverKey] = useState(null);

  const scopedStores = useMemo(() => {
    if (scopeStoreId && scopeStoreId !== 'ALL') {
      const found = stores.filter((s) => s.id === scopeStoreId);
      // Fallback giống StaffingGapTable: cửa hàng chưa có row vẫn xem được với định biên mặc định
      return found.length ? found : [{ id: scopeStoreId, name: scopeStoreId, staffing: null }];
    }
    return stores;
  }, [stores, scopeStoreId]);

  // Gom dữ liệu: với mỗi ngày, cộng dồn required/total từ từng cửa hàng trong phạm vi xem
  const dayData = useMemo(() => {
    if (!scopedStores.length) return [];
    return WEEK_DAYS.map((day) => {
      const perShift = {};
      STAFFING_SHIFT_CODES.forEach((code) => { perShift[code] = { required: 0, actual: 0, support: 0 }; });
      scopedStores.forEach((store) => {
        const matrix = getStaffingMatrix(store, day);
        const gap = calculateStaffingGap(employees, weekSchedule, day, store.id, matrix);
        STAFFING_SHIFT_CODES.forEach((code) => {
          const g = gap[code];
          if (!g) return;
          perShift[code].required += g.required;
          perShift[code].actual += g.actual;
          perShift[code].support += g.support;
        });
      });
      return { day, perShift };
    });
  }, [employees, weekSchedule, scopedStores]);

  const deficitCount = dayData.reduce((sum, d) => sum + STAFFING_SHIFT_CODES.filter(
    (c) => d.perShift[c].actual + d.perShift[c].support < d.perShift[c].required
  ).length, 0);

  // ── Hình học SVG ──
  const W = 720, H = 230, padL = 26, padR = 8, padT = 12, padB = 30;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const maxVal = Math.max(1, ...dayData.flatMap((d) => STAFFING_SHIFT_CODES.map(
    (c) => Math.max(d.perShift[c].required, d.perShift[c].actual + d.perShift[c].support)
  )));
  const yOf = (v) => padT + chartH - (v / maxVal) * chartH;
  const groupW = chartW / Math.max(dayData.length, 1);
  const barW = Math.min(10, (groupW - 14) / 2);
  const gapBetweenPairs = Math.min(6, groupW / 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 print:hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <BarChart3 size={15} className="text-blue-600" />
          <span>Định biên vs Thực tế theo ca — Tuần {currentWeek}</span>
          <span className="text-[10px] font-semibold text-slate-400">({scopeStoreId === 'ALL' ? 'Toàn bộ cửa hàng' : 'Cửa hàng ' + scopeStoreId})</span>
        </div>
        {deficitCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
            <AlertTriangle size={11} /> {deficitCount} ca thiếu người trong tuần
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Đủ định biên cả tuần</span>
        )}
      </div>

      {/* Chú giải */}
      <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500 mb-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#cbd5e1' }} /> Định biên (cần)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#2563eb' }} /> Thực tế — đủ</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#dc2626' }} /> Thực tế — thiếu</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        {/* lưới ngang */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={yOf(maxVal * f)} y2={yOf(maxVal * f)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 5} y={yOf(maxVal * f) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{Math.round(maxVal * f)}</text>
          </g>
        ))}

        {dayData.map(({ day, perShift }, di) => {
          const gx = padL + di * groupW;
          return (
            <g key={day}>
              {STAFFING_SHIFT_CODES.map((code, si) => {
                const p = perShift[code];
                const totalAvail = p.actual + p.support;
                const pairW = barW * 2 + gapBetweenPairs;
                const bx = gx + (groupW - pairW) / 2 + si * (pairW + 4);
                const hReq = chartH - (yOf(p.required) - padT);
                const hAct = chartH - (yOf(totalAvail) - padT);
                const deficient = totalAvail < p.required;
                const actColor = deficient ? '#dc2626' : totalAvail > p.required ? '#16a34a' : '#2563eb';
                const keyStr = day + code;
                return (
                  <g key={code} onMouseEnter={() => setHoverKey(keyStr)} onMouseLeave={() => setHoverKey(null)}>
                    <rect x={bx - 2} y={padT} width={pairW + 4} height={chartH} fill={hoverKey === keyStr ? '#f1f5f9' : 'transparent'} rx="3" />
                    <rect x={bx} y={yOf(p.required)} width={barW} height={Math.max(hReq, 1)} fill="#cbd5e1" rx="2">
                      <title>{`${DAY_FULL_NAMES[day]} · ${SHIFT_LABELS[code] || code}: cần ${p.required}`}</title>
                    </rect>
                    <rect x={bx + barW + gapBetweenPairs} y={yOf(totalAvail)} width={barW} height={Math.max(hAct, 1)} fill={actColor} rx="2">
                      <title>{`${DAY_FULL_NAMES[day]} · ${SHIFT_LABELS[code] || code}: có ${totalAvail} (cơ hữu ${p.actual}${p.support ? ' + chi viện ' + p.support : ''}) — cần ${p.required}`}</title>
                    </rect>
                    <text x={bx + pairW / 2} y={yOf(Math.max(p.required, totalAvail)) - 3} fontSize="8" fontWeight="700" fill={deficient ? '#dc2626' : '#64748b'} textAnchor="middle">
                      {deficient ? `-${p.required - totalAvail}` : ''}
                    </text>
                  </g>
                );
              })}
              <text x={gx + groupW / 2} y={H - 10} fontSize="10" fontWeight="700" fill="#475569" textAnchor="middle">{day}</text>
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-3 gap-2 mt-1">
        {STAFFING_SHIFT_CODES.map((code) => (
          <div key={code} className="text-[10px] font-semibold text-slate-400 text-center">{SHIFT_LABELS[code] || code}</div>
        ))}
      </div>
    </div>
  );
}
