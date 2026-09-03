import React, { memo } from 'react';
import TimesheetRow from '../TimesheetRow';

const TimesheetTable = memo(({ groupedEmps, cycleDates, activeDays, getDayValue, editMode = false, getActualValue, onActualChange }) => {
  const deptKeys = Object.keys(groupedEmps);
  const totalEmployees = deptKeys.reduce((sum, dept) => sum + (groupedEmps[dept]?.length || 0), 0);

  if (totalEmployees === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 bg-white">
        <p className="text-sm font-semibold">Không tìm thấy dữ liệu chấm công phù hợp.</p>
        <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc cửa hàng.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden min-w-full">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="excel-table whitespace-nowrap text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700">
                <th className="p-2 border-r border-slate-300 w-10 min-w-[40px] text-center md:sticky left-0 z-20 bg-slate-200">
                  STT
                </th>
                <th className="hidden md:table-cell p-2 border-r border-slate-300 w-24 min-w-[96px] text-center md:sticky z-20 bg-slate-200" style={{ left: '40px' }}>
                  Mã NV
                </th>
                <th className="p-2 border-r border-slate-300 min-w-[150px] md:min-w-[192px] w-[150px] md:w-[192px] text-left sticky md:z-20 z-30 bg-slate-200 px-3 left-0 md:left-[136px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  Họ và Tên
                </th>
                <th className="hidden md:table-cell p-2 border-r border-slate-300 w-20 min-w-[80px] text-center md:sticky z-20 bg-slate-200" style={{ left: '328px' }}>
                  Cửa Hàng
                </th>
                <th className="hidden lg:table-cell p-2 border-r border-slate-400 w-28 min-w-[120px] text-center lg:sticky z-20 bg-slate-200" style={{ left: '408px' }}>
                  Vị Trí
                </th>

                {/* 31 Cột Ngày của Chu kỳ Lương (Thứ + Ngày thực tế) */}
                {cycleDates.map(d => {
                  const now = new Date();
                  const isToday = d.dateObj && d.dateObj.getDate() === now.getDate() && d.dateObj.getMonth() === now.getMonth() && d.dateObj.getFullYear() === now.getFullYear();
                  return (
                    <th 
                      key={d.fullDateStr || d.key} 
                      className={`p-1 border-r border-slate-300 text-center min-w-[56px] w-[56px] max-w-[56px] transition-colors ${
                        isToday 
                          ? 'bg-blue-200/90 text-blue-950 font-black ring-1 ring-blue-500' 
                          : (d.dayKey === 'CN' ? 'bg-orange-50/80 text-orange-950' : 'bg-slate-200 text-slate-700')
                      }`}
                      title={`${d.dayKey} ngày ${d.display || d.shortDisplay}`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className={`text-xs font-black ${
                          d.dayKey === 'CN' ? 'text-rose-600' : (isToday ? 'text-blue-900' : 'text-slate-800')
                        }`}>
                          {d.dayKey}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 block leading-tight mt-0.5">
                          {d.shortDisplay || d.display}
                        </span>
                        {isToday && (
                          <span className="text-[7.5px] uppercase tracking-tighter bg-blue-600 text-white px-1 rounded font-black mt-0.5 shadow-2xs">
                            Hôm nay
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Cột Tổng Giờ */}
                <th className="p-2 text-center bg-slate-300 text-slate-800 font-extrabold sticky z-20 min-w-[64px] w-[64px] border-l border-slate-400" style={{ right: '128px' }}>
                  Giờ FT
                </th>
                <th className="p-2 text-center bg-slate-300 text-slate-800 font-extrabold sticky z-20 min-w-[64px] w-[64px] border-l border-slate-400" style={{ right: '64px' }}>
                  Giờ PT
                </th>
                <th className="p-2 text-center bg-blue-100 text-blue-900 font-black sticky right-0 z-20 min-w-[64px] w-[64px] border-l border-slate-400">
                  Tổng
                </th>
                <th className="p-2 text-center bg-amber-200 text-amber-900 font-black sticky right-0 z-20 min-w-[80px] w-[80px] border-l border-slate-400">
                  Lương (Ước tính)
                </th>
              </tr>
            </thead>
            <tbody>
              {deptKeys.map(dept => (
                <React.Fragment key={dept}>
                  {/* Tiêu đề Phân nhóm Cửa hàng */}
                  <tr className="bg-blue-50/70 border-y border-blue-200">
                    <td colSpan={5 + cycleDates.length + 4} className="px-3 py-1.5 font-bold text-blue-900 text-xs">
                      🏬 Cửa hàng {dept} ({groupedEmps[dept].length} nhân sự)
                    </td>
                  </tr>

                  {/* Danh sách từng nhân viên */}
                  {groupedEmps[dept].map((emp, idx) => (
                    <TimesheetRow
                      key={emp.id}
                      emp={emp}
                      idx={idx}
                      activeDays={activeDays}
                      getDayValue={getDayValue}
                      editMode={editMode}
                      getActualValue={getActualValue}
                      onActualChange={onActualChange}
                    />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default TimesheetTable;
