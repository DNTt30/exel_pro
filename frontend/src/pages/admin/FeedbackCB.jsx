import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, XCircle, Search, Filter, Image as ImageIcon } from 'lucide-react';
import Toolbar from '../../components/Toolbar';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function FeedbackCB() {
  const { feedbacks, resolveFeedback, user } = useStore();
  const isAdmin = user?.role === 'admin';

  // Nếu là Admin, có thể xem toàn bộ hoặc lọc theo Cửa hàng.
  // Nếu là SM, chỉ xem cửa hàng của mình.
  const [filterDept, setFilterDept] = useState(isAdmin ? 'ALL' : user?.dept);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const [resolvingId, setResolvingId] = useState(null);
  const [resolveAction, setResolveAction] = useState('approved');
  const [resolutionNote, setResolutionNote] = useState('');
  const [targetDay, setTargetDay] = useState('T2');
  const [newShift, setNewShift] = useState('');

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

  const handleResolveSubmit = (fb) => {
    let shiftData = null;
    if (resolveAction === 'approved' && newShift) {
      shiftData = {
        week: fb.week,
        empId: fb.empId,
        day: targetDay,
        shiftCode: newShift
      };
    }
    resolveFeedback(fb.id, resolveAction, resolutionNote, shiftData);
    setResolvingId(null);
    setResolutionNote('');
    setNewShift('');
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">ĐÃ DUYỆT</span>;
    if (status === 'rejected') return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">TỪ CHỐI</span>;
    return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">CHỜ DUYỆT</span>;
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
                className="border border-slate-300 rounded px-2 py-1 text-xs outline-none"
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
                  <React.Fragment key={fb.id}>
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
                      <td className="p-1">
                        {fb.status === 'pending' ? (
                          resolvingId === fb.id ? (
                            <div className="flex gap-1 items-center bg-white p-1 rounded border border-blue-200 shadow-sm">
                              <select 
                                className="border border-slate-300 rounded text-xs px-1 py-1 outline-none w-16"
                                value={targetDay} onChange={e => setTargetDay(e.target.value)}
                              >
                                {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <input 
                                type="text" 
                                placeholder="Ca (VD: 6-14)" 
                                className="border border-slate-300 rounded text-xs px-2 py-1 outline-none w-20"
                                value={newShift} onChange={e => setNewShift(e.target.value)}
                              />
                              <input 
                                type="text" 
                                placeholder="Ghi chú duyệt..." 
                                className="border border-slate-300 rounded text-xs px-2 py-1 outline-none flex-1"
                                value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                              />
                              <button onClick={() => setResolveAction('approved')} className={`px-2 py-1 text-[10px] font-bold rounded ${resolveAction === 'approved' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Duyệt</button>
                              <button onClick={() => setResolveAction('rejected')} className={`px-2 py-1 text-[10px] font-bold rounded ${resolveAction === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Từ chối</button>
                              <button onClick={() => handleResolveSubmit(fb)} className="bg-blue-600 text-white px-2 py-1 text-[10px] font-bold rounded hover:bg-blue-700">Lưu</button>
                              <button onClick={() => setResolvingId(null)} className="text-slate-400 hover:text-slate-600 px-1"><XCircle size={14}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setResolvingId(fb.id); setResolveAction('approved'); }}
                              className="w-full text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded py-1 transition-colors"
                            >
                              Xử lý báo cáo
                            </button>
                          )
                        ) : (
                          <div className="text-xs text-slate-600 px-2">
                            <span className="font-semibold">{fb.status === 'approved' ? 'Sửa thành:' : 'Lý do từ chối:'}</span> {fb.resolutionNote || 'Không có ghi chú'}
                          </div>
                        )}
                      </td>
                    </tr>
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