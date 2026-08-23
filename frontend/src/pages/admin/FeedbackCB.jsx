import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, XCircle, Search, Filter, Image as ImageIcon, Calendar, Clock, AlertTriangle } from 'lucide-react';
import Toolbar from '../../components/Toolbar';
import StatusBadge from '../../components/ui/StatusBadge';
import { SHIFTS } from '../../data/initialData';
import { getRoleBadgeInfo, WEEK_DAYS, DAY_FULL_NAMES } from '../../data/constants';
import { canPickStore } from '../../lib/authSession';
import { parseDateDetails } from '../../utils/dateHelper';

const FeedbackRow = ({ fb, idx, resolveFeedback, employees, currentWeek }) => {
  // Tìm thông tin nhân viên theo ID nếu trong feedback bị thiếu tên
  const emp = useMemo(() => employees.find(e => e.id === fb.empId), [employees, fb.empId]);
  const empName = fb.empName || fb.name || emp?.name || 'Chưa cập nhật';
  const dept = fb.dept || emp?.dept || '-';
  const badgeInfo = getRoleBadgeInfo(fb.empRole || fb.empType || emp?.role || emp?.type);

  // Tự động phân tích Thứ và Tuần từ ngày bị lỗi
  const dateDetails = useMemo(() => parseDateDetails(fb.date), [fb.date]);
  
  const [targetDay, setTargetDay] = useState(dateDetails.dayKey);
  const [newShift, setNewShift] = useState(fb.shift || '6-14');
  const [resolutionNote, setResolutionNote] = useState('');

  // Tự động cập nhật targetDay khi dateDetails thay đổi
  useEffect(() => {
    if (dateDetails.dayKey) {
      setTargetDay(dateDetails.dayKey);
    }
  }, [dateDetails.dayKey]);

  const handleResolve = (action) => {
    let shiftData = null;
    if (action === 'approved' && newShift) {
      shiftData = {
        week: dateDetails.weekMonday || fb.week || currentWeek,
        empId: fb.empId,
        day: targetDay,
        shiftCode: newShift
      };
    }
    resolveFeedback(fb.id, action, resolutionNote, shiftData);
  };

  return (
    <tr className="hover:bg-blue-50/50 border-b border-slate-200 transition-colors">
      <td className="text-center text-slate-400 font-mono text-xs p-2">{idx + 1}</td>
      <td className="text-center font-bold text-blue-700 text-xs p-2">{dept}</td>
      <td className="text-center font-mono text-xs font-bold text-slate-700 p-2">{fb.empId}</td>
      
      {/* Họ và Tên Nhân Viên */}
      <td className="p-2">
        <div className="font-bold text-slate-800 text-xs leading-snug">{empName}</div>
      </td>

      {/* Vị trí / Chức vụ */}
      <td className="text-center p-2">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeInfo.badgeCls}`}>
          {badgeInfo.id}
        </span>
      </td>

      {/* Ngày bị lỗi - Tự động hiển thị Thứ rõ ràng */}
      <td className="text-center p-2 whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md" title={`${dateDetails.dayLabel}, ngày ${dateDetails.formattedDate}`}>
          <span className="font-extrabold text-blue-700 bg-blue-100/80 px-1 rounded text-[11px]">{dateDetails.dayKey}</span>
          <span className="font-mono text-xs font-semibold text-slate-700">{dateDetails.formattedDate}</span>
        </div>
      </td>

      {/* Vấn đề / Lý do */}
      <td className="text-xs p-2">
        {(fb.isPTOvertime || (fb.issue && fb.issue.includes('91h'))) ? (
          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[11px] font-black">
            <span>⚠️</span> {fb.issue}
          </span>
        ) : (
          <span className="font-semibold text-slate-800">{fb.issue || fb.reason || 'Báo bù / Đổi ca'}</span>
        )}
      </td>

      {/* Ghi chú của NV */}
      <td className="text-xs text-slate-600 p-2 max-w-[220px]" title={fb.note}>
        <div className="truncate">{fb.note || '-'}</div>
      </td>

      {/* Minh chứng */}
      <td className="text-center p-2">
        {fb.imageUrl ? (
          <a href={fb.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline font-bold">
            <ImageIcon size={14} className="mr-1"/> Xem ảnh
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>

      {/* Trạng thái */}
      <td className="text-center p-2">
        <StatusBadge status={fb.status} />
      </td>

      {/* Xử lý duyệt ca & Cập nhật tự động */}
      <td className="p-2 align-middle min-w-[280px]">
        {fb.status === 'pending' ? (
          <div className="flex gap-1.5 items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            {/* Dropdown Thứ - Tự động chọn đúng thứ từ ngày bị lỗi */}
            <div className="relative" title={`Tự động xác định: ${dateDetails.dayLabel}`}>
              <select 
                className="bg-blue-50 border border-blue-300 rounded text-xs px-1.5 py-1 outline-none font-bold text-blue-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                value={targetDay} 
                onChange={e => setTargetDay(e.target.value)}
              >
                {WEEK_DAYS.map(d => (
                  <option key={d} value={d}>
                    {d} {d === dateDetails.dayKey ? '📍' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Ca Mới */}
            <select
              className="bg-slate-50 border border-slate-300 rounded text-xs px-1.5 py-1 outline-none font-semibold text-slate-700 focus:border-blue-500 cursor-pointer w-20"
              value={newShift}
              onChange={e => setNewShift(e.target.value)}
            >
              {Object.keys(SHIFTS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Ghi chú duyệt */}
            <input 
              type="text" 
              placeholder="Ghi chú..." 
              className="bg-slate-50 border border-slate-300 rounded text-xs px-2 py-1 outline-none flex-1 focus:border-blue-500 min-w-[80px]"
              value={resolutionNote} 
              onChange={e => setResolutionNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResolve('approved')}
            />

            {/* Nút Duyệt & Từ Chối */}
            <button 
              onClick={() => handleResolve('approved')} 
              title={`Duyệt ca ${newShift} vào ${targetDay} (Tuần ${dateDetails.weekMonday || currentWeek})`}
              className="flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => handleResolve('rejected')} 
              title="Từ chối phản hồi"
              className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <XCircle size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-600 px-2 flex items-center h-full">
            <span className="font-semibold mr-1">{fb.status === 'approved' ? 'Phản hồi:' : 'Lý do từ chối:'}</span> {fb.resolutionNote || 'Đã xử lý'}
          </div>
        )}
      </td>
    </tr>
  );
};

export default function FeedbackCB() {
  const { feedbacks, resolveFeedback, user, employees, currentWeek } = useStore();
  const pickStore = canPickStore(user);

  const [filterDept, setFilterDept] = useState(pickStore ? 'ALL' : user?.dept);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const effectiveFilterDept = pickStore ? filterDept : user?.dept;

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (effectiveFilterDept !== 'ALL' && fb.dept !== effectiveFilterDept) return false;
    if (filterStatus !== 'ALL' && fb.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      const emp = employees.find(e => e.id === fb.empId);
      const name = fb.empName || fb.name || emp?.name || '';
      if (!name.toLowerCase().includes(s) && !fb.empId.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <Toolbar 
        search={search} setSearch={setSearch}
        filterDept={filterDept} setFilterDept={setFilterDept}
        disableDeptFilter={!pickStore}
        rightActions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Trạng thái:</span>
            <select 
              className="border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        }
      />

      <div className="bg-red-50 text-red-700 p-2 text-xs text-center border-b border-red-200 shadow-xs flex flex-col items-center justify-center">
        <span className="font-bold flex items-center gap-1"><XCircle size={14} /> CHÚ Ý QUAN TRỌNG:</span>
        <span>C&B chốt dữ liệu Feedback lương vào 17h30 ngày 10 hằng tháng. Vui lòng kiểm tra và xử lý toàn bộ báo cáo trước thời hạn này.</span>
      </div>

      <div className="flex-1 overflow-auto bg-slate-100 p-2">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full rounded-lg overflow-hidden">
          <table className="excel-table">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                <th className="w-12 text-center">STT</th>
                <th className="w-24 text-center">Cửa hàng</th>
                <th className="w-24 text-center">Mã NV</th>
                <th className="w-48 text-left px-2">Họ và Tên</th>
                <th className="w-24 text-center">Vị trí</th>
                <th className="w-36 text-center">Ngày bị lỗi</th>
                <th className="w-48 text-left px-2">Vấn đề / Lý do</th>
                <th className="w-56 text-left px-2">Ghi chú của NV</th>
                <th className="w-24 text-center">Minh chứng</th>
                <th className="w-24 text-center">Trạng thái</th>
                <th className="w-72 text-left px-2">Xử lý (Cập nhật lịch)</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-8 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">📋</span>
                      <span className="font-medium text-xs">Không có dữ liệu báo cáo nào phù hợp</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb, idx) => (
                  <FeedbackRow 
                    key={fb.id} 
                    fb={fb} 
                    idx={idx} 
                    resolveFeedback={resolveFeedback}
                    employees={employees}
                    currentWeek={currentWeek}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}