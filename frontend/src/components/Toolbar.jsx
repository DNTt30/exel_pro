import React from 'react';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { listNearbyWeeks } from '../data/constants';
import { visibleDeptIds } from '../utils/dataScope';
import { canPickStore } from '../lib/authSession';
import { useShallow } from 'zustand/react/shallow';

export default function Toolbar({ 
  search, setSearch, 
  filterDept, setFilterDept, 
  filterRole, setFilterRole,
  showWeekPicker = true,
  disableDeptFilter = false,
  rightActions 
}) {
  const { employees, stores, user, currentWeek, setCurrentWeek } = useStore(useShallow((s) => ({ employees: s.employees, stores: s.stores, user: s.user, currentWeek: s.currentWeek, setCurrentWeek: s.setCurrentWeek })));
  const pickStore = canPickStore(user);
  const allowedDepts = new Set(visibleDeptIds(user, stores));
  // Chỉ liệt kê các phòng ban mà user có quyền truy cập
  const depts = [...new Set(employees.map(e => e.dept))].filter(d => d && allowedDepts.has(d)).sort();
  const roles = [...new Set(employees.filter(e => !e.dept || allowedDepts.has(e.dept)).map(e => e.role || e.type))].sort();

  return (
    <div className="bg-white px-3 md:px-4 py-2 border-b border-slate-200 flex flex-wrap gap-2 md:gap-3 items-center justify-between shadow-2xs">
      <div className="flex flex-wrap gap-2 md:gap-3 items-center">
        {/* Search Box with Clear Button */}
        {setSearch && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên / Mã NV..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40 sm:w-52 transition-all outline-none"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        
        {/* Dept Filter */}
        {setFilterDept && !disableDeptFilter && (
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400 hidden sm:block" />
            <select 
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pickStore && <option value="ALL">Tất cả cửa hàng</option>}
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        
        {/* Role Filter */}
        {setFilterRole && (
          <div className="flex items-center gap-1">
            <select 
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả vị trí</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Week Picker */}
        {showWeekPicker && (
          <div className="flex items-center gap-1 sm:border-l sm:border-slate-200 sm:pl-3 sm:ml-1">
            <button 
              onClick={() => {
                const parts = currentWeek.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                d.setDate(d.getDate() - 7);
                const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setCurrentWeek(wKey);
              }}
              className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft size={14} />
            </button>
            
            <div className="relative flex items-center">
              <select 
                value={currentWeek}
                onChange={e => setCurrentWeek(e.target.value)}
                className="border border-blue-200 text-blue-700 rounded-lg pl-3 pr-7 py-1.5 text-xs bg-blue-50/80 hover:bg-blue-100/80 font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-colors"
              >
                {(() => {
                  const list = listNearbyWeeks();
                  if (!list.some(item => item.key === currentWeek)) {
                    const parts = currentWeek.split('-');
                    if (parts.length === 3) {
                      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      d.setHours(0, 0, 0, 0);
                      list.push({ key: currentWeek, offset: null, startDate: d, endDate: new Date(d.getTime() + 6 * 86400000), tag: 'Tuần đã chọn' });
                      list.sort((a, b) => a.startDate - b.startDate);
                    }
                  }
                  return list.map(item => {
                    const wStart = item.startDate;
                    const wEnd = item.endDate || new Date(wStart.getTime() + 6 * 86400000);
                    const startStr = `${wStart.getDate().toString().padStart(2, '0')}/${(wStart.getMonth() + 1).toString().padStart(2, '0')}`;
                    const endStr = `${wEnd.getDate().toString().padStart(2, '0')}/${(wEnd.getMonth() + 1).toString().padStart(2, '0')}`;
                    const yearStr = wStart.getFullYear();
                    return (
                      <option key={item.key} value={item.key}>
                        {item.tag} ({startStr} → {endStr}/{yearStr})
                      </option>
                    );
                  });
                })()}
              </select>
              <div className="pointer-events-none absolute right-2 text-blue-600">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <button 
              onClick={() => {
                const parts = currentWeek.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                d.setDate(d.getDate() + 7);
                const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setCurrentWeek(wKey);
              }}
              className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight size={14} />
            </button>
            
            {/* Quick Calendar Date Picker */}
            <div className="relative ml-0.5 flex items-center group">
              <input 
                type="date" 
                title="Mở lịch chọn ngày"
                className="w-7 h-7 opacity-0 absolute cursor-pointer z-10 inset-0"
                onChange={(e) => {
                  if (!e.target.value) return;
                  const parts = e.target.value.split('-');
                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                  const day = d.getDay();
                  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Get Monday
                  d.setDate(diff);
                  const wKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setCurrentWeek(wKey);
                }}
              />
              <button className="flex items-center justify-center w-7 h-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors" title="Mở lịch">
                <Calendar size={13} />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                Chọn tuần qua lịch
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
        {rightActions}
      </div>
    </div>
  );
}