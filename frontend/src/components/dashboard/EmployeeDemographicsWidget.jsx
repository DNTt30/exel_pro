import React, { useMemo } from 'react';
import { Users, PieChart as PieChartIcon } from 'lucide-react';

export default function EmployeeDemographicsWidget({ employees, filterDept }) {
  // Lọc theo cửa hàng (nếu đang chọn 1 cửa hàng cụ thể)
  const filteredEmps = useMemo(() => {
    if (filterDept === 'ALL') return employees;
    return employees.filter(e => e.dept === filterDept || e.sm_id === filterDept);
  }, [employees, filterDept]);

  // Phân loại
  const stats = useMemo(() => {
    let pt = 0;
    let ft = 0;
    let sm = 0;
    let ofc = 0;

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
        // Mặc định các nhân viên còn lại là FT (STFT, CSR, v.v..)
        ft++;
      }
    });

    const total = pt + ft + sm + ofc;
    if (total === 0) return { pt: 0, ft: 0, sm: 0, ofc: 0, total: 0, ptPct: 0, ftPct: 0, smPct: 0, ofcPct: 0 };

    return {
      pt, ft, sm, ofc, total,
      ptPct: (pt / total) * 100,
      ftPct: (ft / total) * 100,
      smPct: (sm / total) * 100,
      ofcPct: (ofc / total) * 100
    };
  }, [filteredEmps]);

  if (stats.total === 0) return null;
  
  const ptEnd = stats.ptPct;
  const ftEnd = ptEnd + stats.ftPct;
  const smEnd = ftEnd + stats.smPct;

  const gradient = `conic-gradient(
    #3b82f6 0% ${ptEnd}%, 
    #8b5cf6 ${ptEnd}% ${ftEnd}%, 
    #f59e0b ${ftEnd}% ${smEnd}%, 
    #10b981 ${smEnd}% 100%
  )`;

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

      <div className="flex flex-col items-center justify-center flex-1 py-4">
        {/* Biểu đồ tròn (Donut) dày hơn */}
        <div className="relative w-40 h-40 shrink-0 mb-6 group">
          <div 
            className="w-full h-full rounded-full shadow-sm transition-transform duration-500 group-hover:scale-105" 
            style={{ background: gradient }}
          ></div>
          <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
            <Users size={18} className="text-slate-400 mb-0.5" />
            <span className="text-xl font-black text-slate-800 leading-tight">{stats.total}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Nhân sự</span>
          </div>
        </div>

        {/* Chú thích gọn hơn */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Part-time */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shrink-0"></div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Part-time</div>
            </div>
            <div className="flex items-baseline gap-1.5 pl-4.5">
              <span className="text-base font-black text-slate-800">{stats.pt}</span>
              <span className="text-[11px] font-bold text-blue-600">({stats.ptPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Full-time */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shrink-0"></div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full-time</div>
            </div>
            <div className="flex items-baseline gap-1.5 pl-4.5">
              <span className="text-base font-black text-slate-800">{stats.ft}</span>
              <span className="text-[11px] font-bold text-purple-600">({stats.ftPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* SM */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shrink-0"></div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Quản lý CH</div>
            </div>
            <div className="flex items-baseline gap-1.5 pl-4.5">
              <span className="text-base font-black text-slate-800">{stats.sm}</span>
              <span className="text-[11px] font-bold text-amber-600">({stats.smPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* OFC */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Văn phòng</div>
            </div>
            <div className="flex items-baseline gap-1.5 pl-4.5">
              <span className="text-base font-black text-slate-800">{stats.ofc}</span>
              <span className="text-[11px] font-bold text-emerald-600">({stats.ofcPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
