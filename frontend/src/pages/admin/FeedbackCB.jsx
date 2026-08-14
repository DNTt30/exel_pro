import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, XCircle, Search, Filter, Image as ImageIcon } from 'lucide-react';
import Toolbar from '../../components/Toolbar';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const FeedbackRow = ({ fb, idx, getStatusBadge, resolveFeedback }) => {
  const [targetDay, setTargetDay] = useState('T2');
  const [newShift, setNewShift] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const handleResolve = (action) => {
    let shiftData = null;
    if (action === 'approved' && newShift) {
      shiftData = {
        week: fb.week,
        empId: fb.empId,
        day: targetDay,
        shiftCode: newShift
      };
    }
    resolveFeedback(fb.id, action, resolutionNote, shiftData);
  };

  return (
    <tr className="hover:bg-blue-50/50">
      <td className="text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
      <td className="text-center font-semibold text-slate-700">{fb.dept}</td>
      <td className="text-center font-mono text-xs text-slate-500">{fb.empId}</td>
      <td className="font-bold text-slate-800">{fb.empName}</td>
      <td className="text-center font-mono text-xs text-slate-700">{fb.date}</td>
      <td className="text-sm text-red-600 font-semibold">{fb.issue}</td>
      <td className="text-xs text-slate-600 truncate max-w-[200px]" title={fb.note}>{fb.note}</td>
      <td className="text-center">
        {fb.imageUrl ? (
          <a href={fb.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline">
            <ImageIcon size={14} className="mr-1"/> Xem ảnh
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>
      <td className="text-center">
        {getStatusBadge(fb.status)}
      </td>
      <td className="p-1 align-middle">
        {fb.status === 'pending' ? (
          <div className="flex gap-1 items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <select 
              className="bg-slate-50 border border-slate-300 rounded text-xs px-1 py-1.5 outline-none font-semibold text-slate-700 focus:border-blue-500"
              value={targetDay} onChange={e => setTargetDay(e.target.value)}
            >
              {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Ca mới..." 
              className="bg-slate-50 border border-slate-300 rounded text-xs px-2 py-1.5 outline-none w-16 font-semibold focus:border-blue-500"
              value={newShift} onChange={e => setNewShift(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResolve('approved')}
            />
            <input 
              type="text" 
              placeholder="Ghi chú duyệt..." 
              className="bg-slate-50 border border-slate-300 rounded text-xs px-2 py-1.5 outline-none flex-1 focus:border-blue-500"
              value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResolve('approved')}
            />
            <button 
              onClick={() => handleResolve('approved')} 
              title="Duyệt & Lưu ca"
              className="flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white p-1.5 rounded transition-colors"
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => handleResolve('rejected')} 
              title="Từ chối"
              className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded transition-colors"
            >
              <XCircle size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-600 px-2 flex items-center h-full">
            <span className="font-semibold mr-1">{fb.status === 'approved' ? 'Phản hồi:' : 'Lý do từ chối:'}</span> {fb.resolutionNote || 'Không có ghi chú'}
          </div>
        )}
      </td>
    </tr>
  );
};

export default function FeedbackCB() {
  const { feedbacks, resolveFeedback, user } = useStore();
  const isAdmin = user?.role === 'admin';

  const [filterDept, setFilterDept] = useState(isAdmin ? 'ALL' : user?.dept);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const effectiveFilterDept = isAdmin ? filterDept : user?.dept;

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (effectiveFilterDept !== 'ALL' && fb.dept !== effectiveFilterDept) return false;
    if (filterStatus !== 'ALL' && fb.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!fb.empName.toLowerCase().includes(s) && !fb.empId.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === 'approved') return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">ĐÃ DUYỆT</span>;
    if (status === 'rejected') return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">TỪ CHỐI</span>;
    return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">CHỜ DUYỆT</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <Toolbar 
        search={search} setSearch={setSearch}
        filterDept={filterDept} setFilterDept={setFilterDept}
        disableDeptFilter={!isAdmin}
        rightActions={
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Trạng thái:</span>
              <select 
                className="border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
          </>
        }
      />

      <div className="flex-1 overflow-auto bg-slate-100 p-2">
        <div className="bg-white shadow border border-slate-300 inline-block min-w-full">
          <table className="excel-table">
            <thead>
              <tr className="bg-slate-200">
                <th className="w-12">STT</th>
                <th className="w-24">Cửa hàng</th>
                <th className="w-20">Mã NV</th>
                <th className="w-48">Họ và Tên</th>
                <th className="w-28">Ngày bị lỗi</th>
                <th className="w-48">Vấn đề / Lý do</th>
                <th className="w-64">Ghi chú của NV</th>
                <th className="w-24">Minh chứng</th>
                <th className="w-24">Trạng thái</th>
                <th className="w-64">Xử lý (Cập nhật lịch)</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-slate-400">Không có dữ liệu báo cáo</td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb, idx) => (
                  <FeedbackRow 
                    key={fb.id} 
                    fb={fb} 
                    idx={idx} 
                    getStatusBadge={getStatusBadge} 
                    resolveFeedback={resolveFeedback}
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