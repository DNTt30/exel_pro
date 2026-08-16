import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useGroupedEmployees } from '../../hooks/useGroupedEmployees';
import TimesheetRow from '../../components/TimesheetRow';
import { Download, Printer } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import { exportTimesheetToExcel } from '../../utils/excelExport';

export default function Timesheet() {
  const { employees, user, currentWeek } = useStore(); // We'll mock timesheet data locally for now
  
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(isAdmin ? 'ALL' : user?.dept);
  const [filterRole, setFilterRole] = useState('ALL');

  // Generate 31 days (26 -> 25)
  const activeDays = useMemo(() => {
    const days = [];
    for (let i = 26; i <= 31; i++) days.push(`${i}`);
    for (let i = 1; i <= 25; i++) days.push(`${i}`);
    return days;
  }, []);

  // Group employees
  const groupedEmps = useGroupedEmployees(search, filterDept, filterRole);

  // Mock timesheet data (Hardcoded for Hoàng Thị Huyền to match Excel)
  const mockTimesheetData = {
    '250731047': {
      '26': 'OFF', '27': '8', '28': '8', '29': '8', '30': '8', '31': '7.98',
      '1': '8', '2': '8', '3': '8', '4': '8', '5': '8', '6': '8',
      '7': 'OFF', '8': 'OFF', '9': 'OFF', '10': 'OFF', '11': 'OFF', '12': 'OFF', '13': 'OFF', '14': 'OFF', '15': 'OFF', '16': 'OFF', '17': 'OFF', '18': 'OFF', '19': 'OFF', '20': 'OFF', '21': 'OFF', '22': 'OFF', '23': 'OFF', '24': 'OFF', '25': 'OFF'
    }
  };

  const getDayValue = (empId, day) => {
    return mockTimesheetData[empId]?.[day] || '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:block">
      <div className="print:hidden">
        <Toolbar 
          search={search} setSearch={setSearch}
          filterDept={filterDept} setFilterDept={setFilterDept}
          filterRole={filterRole} setFilterRole={setFilterRole}
          showWeekPicker={false}
          disableDeptFilter={!isAdmin}
          rightActions={
            <>
              <button 
                className="btn btn-outline text-xs py-1 px-2.5 hover:text-emerald-700 hover:border-emerald-300 font-semibold flex items-center gap-1" 
                onClick={() => exportTimesheetToExcel({
                  currentWeek,
                  deptName: (isAdmin ? filterDept : user?.dept) === 'ALL' ? 'Toan_Bo_Cua_Hang' : (isAdmin ? filterDept : user?.dept),
                  groupedEmps,
                  getDayValue,
                  activeDays,
                  filterOnlyMe: false,
                  currentUserId: user?.id
                })}
                title="Xuất file Excel có đầy đủ bảng biểu và màu sắc"
              >
                <Download size={14} className="text-emerald-600" /> Xuất Excel
              </button>
              <button className="btn btn-outline text-xs py-1 px-2" onClick={() => window.print()}>
                <Printer size={14} /> In Bảng Công
              </button>
            </>
          }
        />
      </div>

      <div className="hidden print:block text-center mb-4 pb-2 border-b border-slate-300">
        <h1 className="text-xl font-black uppercase text-slate-900 tracking-wide">BẢNG TỔNG HỢP CÔNG & LƯƠNG THÁNG (26 - 25)</h1>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-1 px-2">
          <span>{(isAdmin ? filterDept : user?.dept) !== 'ALL' ? `Cửa hàng: ${isAdmin ? filterDept : user?.dept}` : 'Toàn bộ chuỗi cửa hàng'}</span>
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span>Hệ thống OFC</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100 p-2 relative print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full print:shadow-none print:border-none print:w-full print:block">
          <table className="excel-table whitespace-nowrap text-xs print:w-full">
            <thead>
              {/* Header Tầng 1: Nhóm Cột */}
              <tr className="bg-slate-300 border-b border-slate-400">
                <th colSpan={6} className="border-r border-slate-400 sticky left-0 z-20 bg-slate-300">THÔNG TIN NHÂN VIÊN</th>
                <th colSpan={31} className="border-r border-slate-400 bg-blue-100 text-blue-800">NGÀY CÔNG TRONG THÁNG (26 - 25)</th>
                <th colSpan={12} className="border-r border-slate-400 bg-emerald-100 text-emerald-800">TỔNG HỢP CÔNG & PHÉP</th>
                <th colSpan={3} className="border-r border-slate-400 bg-amber-100 text-amber-800">OT - CA NGÀY</th>
                <th colSpan={3} className="border-r border-slate-400 bg-purple-100 text-purple-800">OT - CA ĐÊM</th>
                <th colSpan={3} className="border-r border-slate-400 bg-pink-100 text-pink-800">NGHỈ BÙ</th>
                <th colSpan={2} className="bg-indigo-100 text-indigo-800">TRAINING</th>
              </tr>
              {/* Header Tầng 2: Tên Cột Chi Tiết */}
              <tr className="bg-slate-200 border-b border-slate-400">
                <th className="min-w-[40px] w-[40px] max-w-[40px] border-r border-slate-300 md:sticky left-0 z-20 bg-slate-200">STT</th>
                <th className="hidden md:table-cell min-w-[96px] w-[96px] max-w-[96px] border-r border-slate-300 md:sticky z-20 bg-slate-200" style={{ left: '40px' }}>Mã NV</th>
                <th className="min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] max-w-[150px] md:max-w-[192px] border-r border-slate-300 sticky md:z-20 z-30 bg-slate-200 left-0 md:left-[136px]">Họ và Tên</th>
                <th className="hidden md:table-cell min-w-[80px] w-[80px] max-w-[80px] border-r border-slate-300 md:sticky z-20 bg-slate-200" style={{ left: '328px' }}>Phòng ban</th>
                <th className="hidden lg:table-cell min-w-[128px] w-[128px] max-w-[128px] border-r border-slate-300 lg:sticky z-20 bg-slate-200" style={{ left: '408px' }}>Chức vụ</th>
                <th className="hidden xl:table-cell min-w-[80px] w-[80px] max-w-[80px] border-r border-slate-400 xl:sticky z-20 bg-slate-200" style={{ left: '536px' }}>Loại NV</th>
                
                {/* 31 Ngày */}
                {activeDays.map(day => (
                  <th key={day} className={`min-w-[48px] w-[48px] max-w-[48px] border-r border-slate-300 font-mono ${(day === 'CN' || parseInt(day) % 7 === 0) ? 'bg-orange-50 text-orange-800' : ''}`}>
                    {day}
                  </th>
                ))}
                
                {/* Tổng Hợp */}
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100" title="Working day">Working<br/>day</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100" title="Công cho PT">Công<br/>PT</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100" title="Công cho FT">Công<br/>FT</th>
                <th className="min-w-[48px] w-[48px] border-r border-slate-300 bg-slate-100 text-red-600">Vắng</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Annual<br/>Leave</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Paid<br/>Leave</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Unpaid<br/>Leave</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100 text-orange-600">Come<br/>late</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100 text-orange-600">Leave<br/>early</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Night<br/>Shift</th>
                <th className="min-w-[80px] w-[80px] border-r border-slate-400 bg-emerald-200 font-bold">Tổng công<br/>hưởng lương</th>

                {/* OT Ngày */}
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Ngày<br/>thường</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Ngày<br/>nghỉ</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-400 bg-slate-100">Ngày<br/>lễ</th>

                {/* OT Đêm */}
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Ngày<br/>thường</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Ngày<br/>nghỉ</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-400 bg-slate-100">Ngày<br/>lễ</th>

                {/* Nghỉ bù */}
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Thường</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Ngày nghỉ</th>
                <th className="min-w-[64px] w-[64px] border-r border-slate-400 bg-slate-100">Lễ</th>

                {/* Training */}
                <th className="min-w-[64px] w-[64px] border-r border-slate-300 bg-slate-100">Công<br/>training</th>
                <th className="min-w-[64px] w-[64px] bg-slate-100">Night shift<br/>(training)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedEmps).length === 0 ? (
                <tr><td colSpan={60} className="p-8 text-center text-slate-400">Không tìm thấy dữ liệu</td></tr>
              ) : (
                Object.entries(groupedEmps).map(([dept, emps]) => (
                  <React.Fragment key={dept}>
                    {emps.map((emp, idx) => (
                      <TimesheetRow 
                        key={emp.id} 
                        emp={emp} 
                        idx={idx} 
                        activeDays={activeDays} 
                        getDayValue={getDayValue} 
                      />
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}