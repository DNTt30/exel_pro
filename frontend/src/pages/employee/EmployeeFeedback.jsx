import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Send, Image as ImageIcon, Clock, XCircle, AlertTriangle, FileText, History, Sparkles, Search } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { SHIFTS } from '../../data/initialData';
import { getShiftCode } from '../../utils/shiftHelper';
import { getPayrollCycleDates, getPayrollCycleFromWeek } from '../../utils/dateHelper';
import { useShallow } from 'zustand/react/shallow';

// Ô lịch / mảng trống dùng chung — giữ tham chiếu ổn định cho useMemo & React.memo
const EMPTY_SCHED = {};

export default function EmployeeFeedback() {
  const { user, addFeedback, feedbacks, currentWeek, schedule } = useStore(useShallow((s) => ({ user: s.user, addFeedback: s.addFeedback, feedbacks: s.feedbacks, currentWeek: s.currentWeek, schedule: s.schedule })));
  const myFeedbacks = feedbacks.filter(fb => fb.empId === user?.id);
  const weekSchedule = schedule[currentWeek] || EMPTY_SCHED;
  const mySched = weekSchedule[user?.id] || EMPTY_SCHED;

  const isPT = user?.type === 'PARTTIME' || user?.type === 'STPT' || (user?.role && user?.role.includes('PT'));

  // 1. Tính tổng giờ tháng chu kỳ 26-25 của nhân viên
  const payrollCycle = useMemo(() => getPayrollCycleFromWeek(currentWeek), [currentWeek]);
  const cycleDates = useMemo(
    () => getPayrollCycleDates(payrollCycle.year, payrollCycle.month),
    [payrollCycle]
  );

  const monthTotalHours = useMemo(() => {
    let total = 0;
    cycleDates.forEach(d => {
      const s = schedule[d.weekKey]?.[user?.id]?.[d.dayKey] || mySched[d.dayKey];
      const actual = getShiftCode(s);
      if (actual && actual !== 'off') {
        if (SHIFTS[actual]) total += SHIFTS[actual].hours;
        else {
          const match = actual.match(/^(\d+)[hH]?(?:\s*-\s*|\s+)(\d+)[hH]?$/);
          if (match) {
            let start = parseInt(match[1], 10);
            let end = parseInt(match[2], 10);
            if (end < start) end += 24;
            total += (end - start);
          }
        }
      }
    });
    return total;
  }, [schedule, mySched, cycleDates, user?.id]);

  const isOver91 = isPT && monthTotalHours > 91;

  // Form State
  const [reportType, setReportType] = useState('STANDARD'); // 'STANDARD' hoặc 'PT_OVERTIME'
  const [date, setDate] = useState('');
  const [issue, setIssue] = useState('Quên chấm công (In/Out)');
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Fields dành riêng cho Part-time vượt 91h
  const [overtimeHours, setOvertimeHours] = useState(monthTotalHours > 91 ? `${monthTotalHours}` : '92');
  const [overtimeReason, setOvertimeReason] = useState('Hỗ trợ cửa hàng khác đi chi viện');
  const [overtimeStore, setOvertimeStore] = useState(user?.dept || 'VN0497');

  // Search in History
  const [historySearch, setHistorySearch] = useState('');

  const filteredFeedbacks = useMemo(() => {
    if (!historySearch) return myFeedbacks;
    const s = historySearch.toLowerCase();
    return myFeedbacks.filter(fb => 
      (fb.issue && fb.issue.toLowerCase().includes(s)) ||
      (fb.date && fb.date.toLowerCase().includes(s)) ||
      (fb.note && fb.note.toLowerCase().includes(s))
    );
  }, [myFeedbacks, historySearch]);

  const handleQuickPTOvertimeFill = () => {
    setReportType('PT_OVERTIME');
    setIssue('Giải trình / Báo bù vượt hạn mức 91h (Part-Time)');
    setDate(new Date().toISOString().split('T')[0]);
    setOvertimeHours(`${monthTotalHours > 0 ? monthTotalHours : 92}`);
    setNote(`Em làm Part-time có tổng giờ làm trong chu kỳ lương là ${monthTotalHours}h (vượt định mức 91h). Kính gửi C&B và SM duyệt công cho em.`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date && reportType === 'STANDARD') return alert('Vui lòng chọn ngày phát sinh lỗi');
    
    // Kiểm tra Deadline chốt công mùng 10 hàng tháng
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      const isPreviousMonth = 
        selectedDate.getMonth() < today.getMonth() || 
        selectedDate.getFullYear() < today.getFullYear();
        
      if (isPreviousMonth && today.getDate() > 10) {
        return alert('Đã quá hạn chốt dữ liệu (17h30 ngày 10 hàng tháng). Bạn không thể gửi báo cáo cho tháng trước nữa.');
      }
    }

    let finalIssue = issue;
    let finalNote = note;

    if (reportType === 'PT_OVERTIME') {
      finalIssue = 'Giải trình / Báo bù vượt hạn mức 91h (Part-Time)';
      finalNote = `[VƯỢT 91H PT] Tổng giờ: ${overtimeHours}h | Lý do: ${overtimeReason} | Cửa hàng: ${overtimeStore}. ${note ? `Ghi chú thêm: ${note}` : ''}`;
    }
    
    addFeedback({
      empId: user.id,
      empName: user.name,
      dept: user.dept,
      empRole: user.role,
      empType: user.type,
      week: currentWeek,
      date: date || new Date().toISOString().split('T')[0],
      issue: finalIssue,
      note: finalNote,
      imageUrl,
      isPTOvertime: reportType === 'PT_OVERTIME',
      overtimeHours: reportType === 'PT_OVERTIME' ? parseFloat(overtimeHours) || 0 : undefined
    });

    // Reset form
    setDate('');
    setNote('');
    setImageUrl('');
    alert('Đã gửi báo cáo thành công! Vui lòng chờ Quản lý và phòng C&B duyệt.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto p-4 sm:p-6 space-y-6 w-full animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
              <FileText size={20} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Báo Bù Công & Feedback C&B
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Gửi yêu cầu điều chỉnh công, quên chấm công, hoặc giải trình làm vượt 91h Part-Time
              </p>
            </div>
          </div>
        </div>

        {/* Deadline Notice Pill */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
          <XCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>
            Hạn chót chốt công: <strong>17h30 Ngày 10 hàng tháng</strong>
          </span>
        </div>
      </div>

      {/* Part-Time Overtime Status Banner (If Part-Time) */}
      {isPT && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isOver91 
            ? 'bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border-red-200 shadow-xs' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOver91 ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
              {isOver91 ? <AlertTriangle size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800">
                  Theo dõi hạn mức Part-Time tháng này:
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-black ${
                  isOver91 ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {monthTotalHours}h / 91h
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isOver91 
                  ? '⚠️ Bạn đã làm vượt quá hạn mức 91h/tháng theo quy định OFC. Vui lòng gửi phiếu xác nhận để C&B tính đủ lương.'
                  : `✓ Bạn còn ${91 - monthTotalHours} giờ trước khi chạm hạn mức 91h/tháng.`}
              </p>
            </div>
          </div>

          {isOver91 && (
            <button
              onClick={handleQuickPTOvertimeFill}
              className="btn bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3.5 rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles size={14} /> Tạo Báo Cáo Vượt 91H
            </button>
          )}
        </div>
      )}

      {/* Main Content Grid: Full-Width 12 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Gửi Báo Cáo (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Send size={18} className="text-blue-600" />
              <span>Tạo Yêu Cầu Mới</span>
            </h3>
            
            {/* Switch Category */}
            {isPT && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setReportType('STANDARD')}
                  className={`px-2.5 py-1 rounded font-bold transition-all ${
                    reportType === 'STANDARD' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'
                  }`}
                >
                  Bù công ca
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportType('PT_OVERTIME');
                    setIssue('Giải trình / Báo bù vượt hạn mức 91h (Part-Time)');
                  }}
                  className={`px-2.5 py-1 rounded font-bold transition-all ${
                    reportType === 'PT_OVERTIME' ? 'bg-red-600 shadow-2xs text-white' : 'text-slate-600'
                  }`}
                >
                  Vượt 91h PT
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Trường hợp 1: Part-Time Vượt 91h */}
            {reportType === 'PT_OVERTIME' ? (
              <div className="space-y-3 bg-red-50/50 p-3.5 rounded-xl border border-red-200">
                <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                  <AlertTriangle size={15} />
                  <span>Giải trình & Xác nhận Part-Time làm vượt 91 giờ</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tổng giờ thực tế *</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.5"
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-red-700 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={overtimeHours}
                        onChange={e => setOvertimeHours(e.target.value)}
                        placeholder="VD: 98"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">giờ</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cửa hàng làm tăng ca</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={overtimeStore}
                      onChange={e => setOvertimeStore(e.target.value)}
                      placeholder="VD: VN0485"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý do làm vượt 91h *</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-red-500 outline-none"
                    value={overtimeReason}
                    onChange={e => setOvertimeReason(e.target.value)}
                  >
                    <option>Hỗ trợ cửa hàng khác đi chi viện</option>
                    <option>Tăng ca ca cao điểm / Ngày Lễ</option>
                    <option>Thay ca cho nhân viên nghỉ ốm/phép</option>
                    <option>Cửa hàng trưởng yêu cầu tăng ca (OT)</option>
                    <option>Khác (Ghi rõ bên dưới)</option>
                  </select>
                </div>
              </div>
            ) : (
              /* Trường hợp 2: Báo bù công tiêu chuẩn */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày bị lỗi / thiếu công *</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Loại vấn đề *</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-slate-700"
                      value={issue}
                      onChange={e => setIssue(e.target.value)}
                    >
                      <option>Quên chấm công (In/Out)</option>
                      <option>Sai ca làm việc</option>
                      <option>Thiếu giờ làm / Đi trễ</option>
                      <option>Được yêu cầu tăng ca (OT)</option>
                      {isPT && <option>Giải trình / Báo bù vượt hạn mức 91h (Part-Time)</option>}
                      <option>Khác</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú chi tiết</label>
              <textarea 
                rows="3"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="Ví dụ: Em có làm ca 6-14 ngày 12/8 nhưng máy chấm công lỗi, SM có xác nhận..."
                value={note}
                onChange={e => setNote(e.target.value)}
              ></textarea>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ImageIcon size={14} className="text-slate-500" />
                <span>Link ảnh minh chứng (Zalo/Drive/Hình ảnh)</span>
              </label>
              <input 
                type="url" 
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="https://drive.google.com/..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Dán link ảnh chụp tin nhắn xin phép hoặc ảnh bảng phân ca của SM.</p>
            </div>

            <button 
              type="submit" 
              className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                reportType === 'PT_OVERTIME' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Send size={15} /> 
              <span>{reportType === 'PT_OVERTIME' ? 'Gửi Yêu Cầu Xác Nhận Vượt 91H' : 'Gửi Báo Cáo Bù Công'}</span>
            </button>

          </form>
        </div>

        {/* Right Column: Lịch Sử Yêu Cầu Của Tôi (7 Cols - Full Width Excel Table) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          
          {/* Table Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-slate-600" />
              <h3 className="font-extrabold text-sm text-slate-800">
                Lịch Sử Phản Hồi & Kết Quả Phê Duyệt ({myFeedbacks.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                type="text"
                placeholder="Tìm phản hồi..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-36 sm:w-44"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[460px]">
            <table className="excel-table whitespace-nowrap text-xs w-full">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700">
                  <th className="p-2 border-r border-slate-300 w-10 text-center sticky left-0 z-10 bg-slate-200">STT</th>
                  <th className="p-2 border-r border-slate-300 text-center w-24">Ngày lỗi</th>
                  <th className="p-2 border-r border-slate-300 text-left min-w-[150px]">Vấn đề</th>
                  <th className="p-2 border-r border-slate-300 text-left min-w-[200px]">Nội dung ghi chú</th>
                  <th className="p-2 border-r border-slate-300 text-center w-20">Minh chứng</th>
                  <th className="p-2 border-r border-slate-300 text-center w-24">Trạng thái</th>
                  <th className="p-2 text-left min-w-[150px] bg-slate-200">Phản hồi của QL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-2xl">📋</span>
                        <span className="font-bold text-slate-600 text-xs">
                          {historySearch ? 'Không tìm thấy kết quả phù hợp' : 'Bạn chưa có yêu cầu báo bù công nào.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((fb, idx) => {
                    const isPTOver = fb.isPTOvertime || (fb.issue && fb.issue.includes('91h'));

                    return (
                      <tr key={fb.id} className={`hover:bg-slate-50 ${isPTOver ? 'bg-red-50/40' : ''}`}>
                        <td className="p-2 text-center font-mono text-slate-400 sticky left-0 z-10 bg-white border-r border-slate-300">{idx + 1}</td>
                        <td className="p-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-300 whitespace-nowrap">
                          {(() => {
                            if (!fb.date) return '-';
                            let d;
                            if (fb.date.includes('/')) {
                              const parts = fb.date.split('/').map(Number);
                              d = new Date(parts[2], parts[1] - 1, parts[0]);
                            } else if (fb.date.includes('-')) {
                              const parts = fb.date.split('-').map(Number);
                              d = parts[0] > 1000 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                            if (!d || isNaN(d.getTime())) return fb.date;
                            const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                            const dayKey = map[d.getDay()];
                            const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                            return (
                              <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                                <span className="font-bold text-blue-700">{dayKey}</span>
                                <span className="text-slate-600">{formatted}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2 font-bold text-slate-800 border-r border-slate-300">
                          {isPTOver ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                              <span>⚠️</span> {fb.issue}
                            </span>
                          ) : (
                            fb.issue
                          )}
                        </td>
                        <td className="p-2 text-slate-600 border-r border-slate-300 max-w-[220px] truncate" title={fb.note}>
                          {fb.note}
                        </td>
                        <td className="p-2 text-center border-r border-slate-300">
                          {fb.imageUrl ? (
                            <a 
                              href={fb.imageUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 text-[11px]"
                            >
                              <ImageIcon size={12} /> Xem
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-slate-300">
                          <StatusBadge status={fb.status} />
                        </td>
                        <td className="p-2 text-slate-700 font-medium italic">
                          {fb.resolutionNote || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            * Sau khi Quản lý phê duyệt, công sẽ được tự động đồng bộ vào Bảng chấm công chu kỳ của bạn.
          </div>
        </div>

      </div>

    </div>
  );
}