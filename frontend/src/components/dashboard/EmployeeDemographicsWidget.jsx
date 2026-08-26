import React, { useMemo, useState } from 'react';
import { Users, PieChart as PieChartIcon } from 'lucide-react';

export default function EmployeeDemographicsWidget({ employees, filterDept }) {
  const [hovered, setHovered] = useState(null);

  // Lọc theo cửa hàng
  const filteredEmps = useMemo(() => {
    if (filterDept === 'ALL') return employees;
    return employees.filter(e => e.dept === filterDept || e.sm_id === filterDept);
  }, [employees, filterDept]);

  // Phân loại
  const stats = useMemo(() => {
    let pt = 0; let ft = 0; let sm = 0; let ofc = 0;

    filteredEmps.forEach(emp => {
      const type = emp.type || '';
      const role = emp.role || '';
      
      if (role.includes('SM') || role.includes('Cửa hàng trưởng') || type === 'SM') {
        sm++;
      } else if (role.includes('OFC') || role.includes('khu vực') || type === 'OFC') {
        ofc++;
      } else if (type === 'STPT' || type === 'PARTTIME' || role.includes('PT')) {
        pt++;
      } else {
        ft++;
      }
    });

    const total = pt + ft + sm + ofc;
    return {
      pt, ft, sm, ofc, total,
      ptPct: total ? (pt / total) * 100 : 0,
      ftPct: total ? (ft / total) * 100 : 0,
      smPct: total ? (sm / total) * 100 : 0,
      ofcPct: total ? (ofc / total) * 100 : 0
    };
  }, [filteredEmps]);

  // Chuẩn bị dữ liệu cho SVG Pie Chart
  const chartData = useMemo(() => {
    const data = [
      { key: 'PT', label: 'Part-time', value: stats.pt, pct: stats.ptPct, color: '#3b82f6', bg: 'bg-blue-500' }, // blue-500
      { key: 'FT', label: 'Full-time', value: stats.ft, pct: stats.ftPct, color: '#a855f7', bg: 'bg-purple-500' }, // purple-500
      { key: 'SM', label: 'Quản lý CH', value: stats.sm, pct: stats.smPct, color: '#f59e0b', bg: 'bg-amber-500' }, // amber-500
      { key: 'OFC', label: 'Văn phòng', value: stats.ofc, pct: stats.ofcPct, color: '#10b981', bg: 'bg-emerald-500' } // emerald-500
    ].filter(d => d.value > 0);

    let cumulativePct = 0;
    return data.map(d => {
      // Trick: Circumference of circle with r=15.91549430918954 is exactly 100.
      const slice = {
        ...d,
        dasharray: `${d.pct} ${100 - d.pct}`,
        dashoffset: -cumulativePct
      };
      cumulativePct += d.pct;
      return slice;
    });
  }, [stats]);

  if (stats.total === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <PieChartIcon size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">Cơ Cấu Nhân Sự</h3>
            <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ PT, FT, Quản lý tại {filterDept === 'ALL' ? 'Toàn hệ thống' : `CH ${filterDept}`}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 py-4 relative">
        {/* Biểu đồ tròn (SVG Donut) dày và rõ ràng */}
        <div className="relative w-44 h-44 shrink-0 mb-6 drop-shadow-sm">
          <svg viewBox="0 0 42 42" className="w-full h-full overflow-visible transform transition-transform duration-300">
            {/* Vòng tròn nền */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
            
            {/* Các lát cắt (Slices) */}
            {chartData.map((slice) => (
              <circle
                key={slice.key}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={slice.color}
                strokeWidth={hovered === slice.key ? "8" : "6"}
                strokeDasharray={slice.dasharray}
                strokeDashoffset={slice.dashoffset}
                transform="rotate(-90 21 21)"
                className="transition-all duration-300 cursor-pointer outline-none"
                onMouseEnter={() => setHovered(slice.key)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          
          {/* Lõi biểu đồ (Inner label) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hovered ? (
              <>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  {chartData.find(d => d.key === hovered)?.label}
                </span>
                <span className="text-2xl font-black" style={{ color: chartData.find(d => d.key === hovered)?.color }}>
                  {chartData.find(d => d.key === hovered)?.pct.toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-slate-600 mt-1">
                  {chartData.find(d => d.key === hovered)?.value} nhân sự
                </span>
              </>
            ) : (
              <>
                <Users size={20} className="text-slate-400 mb-1" />
                <span className="text-2xl font-black text-slate-800 leading-none">{stats.total}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng cộng</span>
              </>
            )}
          </div>
        </div>

        {/* Chú thích (Legends) có tương tác */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {chartData.map(slice => (
            <div 
              key={slice.key}
              onMouseEnter={() => setHovered(slice.key)}
              onMouseLeave={() => setHovered(null)}
              className={`p-3 rounded-xl border flex flex-col justify-center transition-all cursor-pointer ${
                hovered === slice.key 
                  ? 'bg-white shadow-sm scale-[1.02] ring-2 ring-slate-100' 
                  : 'bg-slate-50/70 border-slate-100 hover:bg-slate-50'
              }`}
              style={{ borderColor: hovered === slice.key ? slice.color : '' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-3 h-3 rounded-full ${slice.bg} shadow-sm shrink-0`} style={{ backgroundColor: slice.color }}></div>
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{slice.label}</div>
              </div>
              <div className="flex items-baseline gap-1.5 pl-5">
                <span className="text-base font-black text-slate-800">{slice.value}</span>
                <span className="text-xs font-bold" style={{ color: slice.color }}>({slice.pct.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
