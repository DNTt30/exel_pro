import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Users, Clock, Building2, Package, PieChart } from 'lucide-react';

// 6 the KPI hang dau Dashboard â€” tach tu Dashboard.jsx (thuan trinh bay).
export default function KpiCardsGrid({
  ptOvertimeList = [], allPTEmployees = [], viewMode = 'week', quickStats = {}, complianceStats = {},
  currentDeptEmployees = [], currentDeptTotalHours = 0, selectedMonthCycle = '',
  currentWeek = '', filterDept = 'ALL', stores = [], scrollToChart,
}) {
  return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Cảnh báo PT vượt định mức */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
          ptOvertimeList.length > 0 
            ? 'bg-gradient-to-br from-rose-50/90 via-red-50/50 to-white border-rose-200 shadow-sm' 
            : 'bg-white border-slate-200/80 shadow-2xs'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                {viewMode === 'month' ? 'PT > 91h/Tháng' : 'PT > 23h/Tuần'}
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                ptOvertimeList.length > 0 ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {ptOvertimeList.length > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${ptOvertimeList.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {ptOvertimeList.length}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">/ {allPTEmployees.length} PT</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              {ptOvertimeList.length > 0 ? '⚠️ Vượt định mức' : '✅ Đạt chuẩn'}
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Xem biểu đồ ↗
            </button>
          </div>
        </div>

        {/* Card 2: Nhân sự & Hôm nay */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Trực Ca Hôm Nay</span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-blue-700">{quickStats.empsWorkingToday}</span>
              <span className="text-[11px] text-slate-500 font-semibold">/ {currentDeptEmployees.length} NV</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              {currentDeptEmployees.length - allPTEmployees.length} FT • {allPTEmployees.length} PT
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Cơ cấu ca ↗
            </button>
          </div>
        </div>

        {/* Card 3: Tổng giờ công đã xếp */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Tổng Giờ Công
              </span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">{currentDeptTotalHours.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 font-semibold">giờ</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">
              {viewMode === 'month' ? `Tháng ${selectedMonthCycle.split('-')[1]}` : `Tuần ${currentWeek.slice(5)}`}
            </span>
            <button 
              onClick={() => scrollToChart('workload')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Xu hướng ↗
            </button>
          </div>
        </div>

        {/* Card 4: Chuỗi Cửa hàng */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Cửa Hàng</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800">
                {filterDept === 'ALL' ? (stores.length || 3) : 1}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                {filterDept === 'ALL' ? 'chi nhánh' : 'chi nhánh'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[70px]">
              {filterDept === 'ALL' ? 'Toàn chuỗi' : filterDept}
            </span>
            <button 
              onClick={() => scrollToChart('stores')}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              So sánh ↗
            </button>
          </div>
        </div>

        {/* Card 5: Kệ & Date */}
        <Link to="/admin/shelves" className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group block ${
          quickStats.warningShelves > 0 
            ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-amber-200 shadow-sm hover:border-amber-400' 
            : 'bg-white border-slate-200/80 shadow-2xs hover:border-blue-300'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${quickStats.warningShelves > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                Kệ Cận Date
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                quickStats.warningShelves > 0 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}>
                <Package size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${quickStats.warningShelves > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {quickStats.warningShelves}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">kệ cảnh báo</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-slate-400">{quickStats.pendingShelves} kệ chờ kiểm</span>
            <span className="text-amber-600 group-hover:underline flex items-center gap-0.5">Kiểm date ↗</span>
          </div>
        </Link>

        {/* Card 6: Tỷ Lệ Tuân Thủ Part-Time */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Tuân Thủ Định Mức
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white shadow-xs flex items-center justify-center">
                <PieChart size={14} />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700">
                {complianceStats.complianceRate}%
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                ({complianceStats.optimal}/{complianceStats.total} NV)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100/60 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700">
              {viewMode === 'month' ? 'Chuẩn 50-91h' : 'Chuẩn 16-23h'}
            </span>
            <button 
              onClick={() => scrollToChart('shifts')}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Phân tầng ↗
            </button>
          </div>
        </div>

      </div>
  );
}
