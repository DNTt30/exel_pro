import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Toolbar({ 
  search, setSearch, 
  filterDept, setFilterDept, 
  filterRole, setFilterRole,
  showWeekPicker = true,
  disableDeptFilter = false,
  rightActions 
}) {
  const { employees, currentWeek, setCurrentWeek, schedule } = useStore();
  
  const depts = [...new Set(employees.map(e => e.dept))].sort();
  const roles = [...new Set(employees.map(e => e.role || e.type))].sort();
  const availableWeeks = Object.keys(schedule).sort();

  return (
    <div className="bg-white px-4 py-2 border-b border-slate-300 flex flex-wrap gap-4 items-center justify-between shadow-sm">
      <div className="flex gap-4 items-center">
        {setSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>
        )}
        
        {setFilterDept && !disableDeptFilter && (
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-slate-50 font-semibold"
            >
              <option value="ALL">Tất cả cửa hàng</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        
        {setFilterRole && (
          <div className="flex items-center gap-1">
            <select 
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-slate-50 font-semibold"
            >
              <option value="ALL">Tất cả chức vụ</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {showWeekPicker && (
          <div className="flex items-center gap-1 border-l border-slate-300 pl-4 ml-2">
            <Calendar size={14} className="text-slate-400" />
            <select 
              value={currentWeek}
              onChange={e => setCurrentWeek(e.target.value)}
              className="border border-blue-300 text-blue-700 rounded px-2 py-1 text-xs bg-blue-50 font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableWeeks.map(w => <option key={w} value={w}>Tuần: {w}</option>)}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 items-center">
        {rightActions}
      </div>
    </div>
  );
}
