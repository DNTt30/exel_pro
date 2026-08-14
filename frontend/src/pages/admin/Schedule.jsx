import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { SHIFTS } from '../../data/initialData';
import { Save, Download, Printer } from 'lucide-react';
import ShiftInput from '../../components/ShiftInput';
import Toolbar from '../../components/Toolbar';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

import AddEmployeeModal from '../../components/modals/AddEmployeeModal';
import AddStoreModal from '../../components/modals/AddStoreModal';
import TransferModal from '../../components/modals/TransferModal';
import EmployeeRow from '../../components/EmployeeRow';

export default function Schedule() {
  const { employees, schedule, updateShift, currentWeek, user } = useStore();
  const weekSchedule = schedule[currentWeek] || {};
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.isManager;
  
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(isAdmin ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');

  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Group employees by department + Borrowed logic
  const groupedEmps = useMemo(() => {
    let filtered = employees;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s));
    }
    if (filterRole !== 'ALL') {
      filtered = filtered.filter(e => (e.role || e.type) === filterRole);
    }
    
    // Nếu là cửa hàng trưởng, CHỈ cho phép hiển thị cửa hàng của họ
    const effectiveFilterDept = isAdmin ? filterDept : user?.dept;
    
    const groups = {};
    filtered.forEach(emp => {
      // 1. Thêm vào cửa hàng gốc
      if (!groups[emp.dept]) groups[emp.dept] = [];
      groups[emp.dept].push({ ...emp, isBorrowedTo: null });
      
      // 2. Kiểm tra lịch xem có mượn đi đâu không
      const empSched = weekSchedule[emp.id] || {};
      const borrowedStores = new Set();
      WEEK_DAYS.forEach(d => {
        const s = empSched[d];
        if (s && s.includes('_')) {
          const parts = s.split('_');
          const st = parts[parts.length - 1]; // Store ID is the last part
          if (st && st !== emp.dept) borrowedStores.add(st);
        }
      });
      
      // 3. Nhân bản nhân viên vào các cửa hàng mượn
      borrowedStores.forEach(st => {
        if (!groups[st]) groups[st] = [];
        groups[st].push({ ...emp, isBorrowedTo: st });
      });
    });

    // Lọc theo phòng ban nếu có
    if (effectiveFilterDept && effectiveFilterDept !== 'ALL') {
      const filteredGroups = {};
      if (groups[effectiveFilterDept]) filteredGroups[effectiveFilterDept] = groups[effectiveFilterDept];
      return filteredGroups;
    }
    return groups;
  }, [employees, search, filterDept, filterRole, weekSchedule, isAdmin, user?.dept]);

  const handleShiftChange = React.useCallback((emp, day, value) => {
    let saveVal = value;
    // Nếu đang sửa ở bảng cửa hàng đích (mượn) và không rỗng
    if (emp.isBorrowedTo && value && !value.includes('_')) {
      saveVal = `${value}_${emp.isBorrowedTo}`;
    }
    updateShift(currentWeek, emp.id, day, saveVal);
  }, [currentWeek, updateShift]);

  const getShiftColor = (shiftCode) => {
    if (!shiftCode || shiftCode === 'off') return 'bg-white text-slate-400';
    return SHIFTS[shiftCode]?.color || 'bg-blue-50 text-blue-800';
  };

  const parseShiftForCell = (emp, val) => {
    if (!val) return { display: '', isBorrowedSlot: false, colorClass: '' };
    if (val.includes('_')) {
      const parts = val.split('_');
      const targetStore = parts.pop();
      const actualShift = parts.join('_');
      
      if (emp.isBorrowedTo) {
        // Đang render ở bảng mượn
        if (targetStore === emp.isBorrowedTo) {
          return { display: actualShift === 'off' ? '' : actualShift, isBorrowedSlot: true, colorClass: 'bg-orange-50 text-orange-700' };
        } else {
          // Ngày này đi mượn ở chỗ KHÁC -> Không hiển thị ở cửa hàng mượn này
          return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
        }
      } else {
        // Đang render ở bảng gốc
        return { display: actualShift === 'off' ? `off ${targetStore}` : `${actualShift} ${targetStore}`, isBorrowedSlot: true, colorClass: 'bg-slate-100 text-slate-500 italic text-[10px]' };
      }
    } else {
      // Shift bình thường
      if (emp.isBorrowedTo) {
        // Đang render ở bảng mượn nhưng ngày này làm ở gốc -> Không hiển thị
        return { display: '', isBorrowedSlot: false, colorClass: 'bg-slate-100' };
      }
      return { display: val, isBorrowedSlot: false, colorClass: '' };
    }
  };

  const handleExportCSV = () => {
    let csv = 'Cửa hàng,Mã NV,Họ và tên,Vị trí,T2,T3,T4,T5,T6,T7,CN,Tổng giờ\n';
    Object.entries(groupedEmps).forEach(([dept, emps]) => {
      emps.forEach(emp => {
        const empSched = weekSchedule[emp.id] || {};
        let totalH = 0;
        const daysStr = WEEK_DAYS.map(d => {
          const s = empSched[d];
          let actualShift = s;
          if (s && s.includes('_')) {
            actualShift = s.split('_')[0];
          }
          if (actualShift && actualShift !== 'off' && SHIFTS[actualShift]) totalH += SHIFTS[actualShift].hours;
          return actualShift && actualShift !== 'off' ? actualShift : '';
        }).join(',');
        csv += `${dept},${emp.id},"${emp.name}",${emp.role || emp.type},${daysStr},${totalH}\n`;
      });
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Lich_Lam_Viec_${currentWeek}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      <div className="print:hidden">
        <Toolbar 
          search={search} setSearch={setSearch}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterRole={filterRole} setFilterRole={setFilterRole}
          showWeekPicker={true}
          disableDeptFilter={!isAdmin}
          rightActions={
            <>
              <button className="btn btn-outline text-xs py-1 px-2 border-orange-200 text-orange-600 hover:bg-orange-50 mr-2" onClick={() => setShowTransfer(true)}>
                Điều chuyển
              </button>
              <div className="border-r border-slate-200 h-6 mx-1"></div>
              <button className="btn btn-outline text-xs py-1 px-2" onClick={() => setShowAddEmp(true)}>
                + NV
              </button>
              {isAdmin && (
                <button className="btn btn-outline text-xs py-1 px-2" onClick={() => setShowAddStore(true)}>
                  + CH
                </button>
              )}
              <div className="border-r border-slate-200 h-6 mx-1"></div>
              <button className="btn btn-outline text-xs py-1 px-2" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV
              </button>
              <button className="btn btn-outline text-xs py-1 px-2" onClick={handlePrint}>
                <Printer size={14} /> In Lịch (PDF)
              </button>
              <button className="btn btn-primary text-xs py-1 px-2">
                <Save size={14} /> Auto-Saved
              </button>
            </>
          }
        />
      </div>

      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold uppercase">Lịch Làm Việc - Tuần {currentWeek}</h1>
        {(effectiveFilterDept && effectiveFilterDept !== 'ALL') && <h2 className="text-lg font-semibold mt-1">Cửa hàng: {effectiveFilterDept}</h2>}
      </div>
      
      <AddEmployeeModal isOpen={showAddEmp} onClose={() => setShowAddEmp(false)} />
      <AddStoreModal isOpen={showAddStore} onClose={() => setShowAddStore(false)} />
      <TransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} />

      {/* Excel Spreadsheet Area */}
      <div className="flex-1 overflow-auto bg-slate-100 p-2">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full">
          <table className="excel-table">
            <thead>
              <tr>
                <th className="w-12">STT</th>
                <th className="sticky-col-1 w-56" style={{ left: 0 }}>Nhân viên</th>
                <th className="sticky-col-2 w-24" style={{ left: '224px' }}>Vị trí</th>
                {WEEK_DAYS.map(day => (
                  <th key={day} className="w-24">{day}</th>
                ))}
                <th className="w-20">Tổng giờ</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedEmps).length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Không tìm thấy nhân viên nào</td></tr>
              ) : (
                Object.entries(groupedEmps).map(([dept, emps]) => (
                  <React.Fragment key={dept}>
                    {/* Department Header Row */}
                    <tr className="bg-blue-50">
                      <td colSpan={11} className="font-bold text-blue-800 sticky left-0 z-10 border-r-0">
                        🏬 Cửa hàng: {dept}
                      </td>
                    </tr>
                    
                    {/* Employees Rows */}
                    {emps.map((emp, idx) => {
                      const empSched = weekSchedule[emp.id] || {};
                      return (
                        <EmployeeRow 
                          key={emp.id + (emp.isBorrowedTo ? '_borrowed' : '')}
                          emp={emp}
                          empSched={empSched}
                          idx={idx}
                          handleShiftChange={handleShiftChange}
                        />
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Hidden Datalist for standard shifts */}
      <datalist id="shift-options">
        {Object.entries(SHIFTS).filter(([code]) => code !== 'off').map(([code, info]) => (
          <option key={code} value={code}>{info.label || code}</option>
        ))}
      </datalist>
    </div>
  );
}