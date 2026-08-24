import React from 'react';

// Tinh hinh nhan su & gio lam theo cua hang â€” tach tu Dashboard.jsx.
export default function StoreBreakdownCards({
  storeStats = [], totalSystemHours = 0, filterDept = 'ALL',
  setFilterDept, viewMode = 'week', selectedMonthCycle = '',
}) {
  return (
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Tình Hình Nhân Sự & Giờ Làm Theo Cửa Hàng ({viewMode === 'month' ? `Tháng ${selectedMonthCycle.split('-')[1]}/${selectedMonthCycle.split('-')[0]}` : 'Theo Tuần'})
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Click vào cửa hàng để lọc nhanh danh sách nhân sự</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-slate-100 rounded-lg">Toàn hệ thống ({storeStats.length} chi nhánh)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {storeStats.map(s => {
            const isCurrentFilter = filterDept === s.dept;
            const pctOfTotal = totalSystemHours > 0 ? Math.round((s.totalHours / totalSystemHours) * 100) : 0;

            return (
              <div 
                key={s.dept} 
                onClick={() => setFilterDept(isCurrentFilter ? 'ALL' : s.dept)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrentFilter 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs' 
                    : 'border-slate-200/90 hover:border-blue-300 bg-slate-50/40 hover:bg-white shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-700 text-sm">🏬 {s.dept}</span>
                  {s.ptOver91 > 0 ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-extrabold">
                      ⚠️ {s.ptOver91} PT vượt {viewMode === 'month' ? '91h' : '23h'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                      ✓ Đạt chuẩn
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Nhân sự</span>
                    <span className="font-extrabold text-slate-800">{s.totalEmps} <span className="font-normal text-slate-500">(PT: {s.ptEmps})</span></span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Tổng giờ ({pctOfTotal}%)</span>
                    <span className="font-extrabold text-blue-700">{s.totalHours.toLocaleString()}h</span>
                  </div>
                </div>

                {/* Mini Store Share Bar */}
                <div className="w-full bg-slate-200/80 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${pctOfTotal}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
}
