import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { Download } from 'lucide-react';
import Toolbar from '../../components/Toolbar';

export default function Timesheet() {
  const { employees, schedule, currentWeek } = useStore();
  const weekSchedule = schedule[currentWeek] || {};
  
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  
  const filteredEmps = employees.filter(e => {
    if (deptFilter !== 'ALL' && e.dept !== deptFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <Toolbar 
        search={search} setSearch={setSearch}
        filterDept={deptFilter} setFilterDept={setDeptFilter}
        showWeekPicker={true}
        rightActions={
          <>
            <span className="text-sm font-bold text-slate-800 mr-2">Bảng Công</span>
            <button className="btn btn-primary text-xs py-1 px-2">
              <Download size={14} /> Xuất Bảng Lương (CSV)
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full">
          <table className="excel-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-12">STT</th>
                <th className="w-24">Mã NV</th>
                <th className="w-20">Cửa hàng</th>
                <th className="text-left w-64">Họ và tên</th>
                <th className="w-24">Chức vụ</th>
                <th className="w-24">Tổng giờ chốt</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
              ) : (
                filteredEmps.map((emp, i) => {
                  const empSched = weekSchedule[emp.id] || {};
                  let totalH = 0;
                  Object.values(empSched).forEach(s => {
                    if (s && s !== 'off' && SHIFTS[s]) totalH += SHIFTS[s].hours;
                  });

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="text-center font-bold text-blue-700">{emp.id}</td>
                      <td className="text-center">{emp.dept}</td>
                      <td className="font-bold text-slate-800">{emp.name}</td>
                      <td className="text-center text-slate-500">{emp.role || emp.type}</td>
                      <td className="text-center font-bold text-emerald-600 bg-emerald-50/50">{totalH}h</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}