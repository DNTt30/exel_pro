import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Image as ImageIcon, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function FeedbackCB() {
  const { feedbacks, resolveFeedback, user } = useStore();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.isManager;

  // Cửa hàng trưởng chỉ thấy feedback của nhân viên cửa hàng mình
  const visibleFeedbacks = feedbacks.filter(fb => {
    if (isAdmin) return true;
    return fb.dept === user?.dept;
  });

  const [filterStatus, setFilterStatus] = useState('pending');
  
  // State cho Modal Duyệt
  const [resolvingFb, setResolvingFb] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolveAction, setResolveAction] = useState('approved');
  const [newShift, setNewShift] = useState('');
  const [targetDay, setTargetDay] = useState('T2');

  const filteredFeedbacks = visibleFeedbacks.filter(fb => {
    if (filterStatus === 'ALL') return true;
    return fb.status === filterStatus;
  });

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!resolvingFb) return;

    let shiftData = null;
    if (resolveAction === 'approved' && newShift) {
      shiftData = {
        week: resolvingFb.week, // Tuần lúc tạo feedback
        empId: resolvingFb.empId,
        day: targetDay,
        shiftCode: newShift
      };
    }

    resolveFeedback(resolvingFb.id, resolveAction, resolutionNote, shiftData);
    
    // Đóng form
    setResolvingFb(null);
    setResolutionNote('');
    setNewShift('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Báo Bù Công</h2>
        
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select 
            className="border border-slate-300 rounded px-3 py-2 text-sm outline-none font-semibold"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="pending">Đang chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="ALL">Tất cả</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách Feedback */}
        <div className="lg:col-span-2 space-y-4">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center text-slate-500 py-10 bg-white rounded-xl shadow-sm border border-slate-200">
              Không có báo cáo nào trong mục này.
            </div>
          ) : (
            filteredFeedbacks.map(fb => (
              <div key={fb.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{fb.empName} <span className="text-sm font-normal text-slate-500">({fb.empId} - {fb.dept})</span></h3>
                    <p className="text-sm font-semibold text-blue-600 mt-1">{fb.issue}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">Ngày lỗi: {fb.date}</div>
                    <div className="text-xs text-slate-400">Gửi lúc: {new Date(fb.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 mb-4">
                  <strong>Ghi chú của NV:</strong> {fb.note || 'Không có ghi chú'}
                </div>

                {fb.imageUrl && (
                  <div className="mb-4">
                    <a href={fb.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors">
                      <ImageIcon size={16}/> Xem ảnh minh chứng (Log tin nhắn/Time In-Out)
                    </a>
                  </div>
                )}

                {fb.status === 'pending' && (
                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                    <button 
                      onClick={() => { setResolvingFb(fb); setResolveAction('rejected'); }}
                      className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Từ chối
                    </button>
                    <button 
                      onClick={() => { setResolvingFb(fb); setResolveAction('approved'); }}
                      className="btn btn-primary bg-green-600 hover:bg-green-700 border-green-700"
                    >
                      Xử lý & Duyệt
                    </button>
                  </div>
                )}

                {fb.status !== 'pending' && (
                  <div className="border-t border-slate-100 pt-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded mb-2 ${fb.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {fb.status === 'approved' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                      {fb.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                    </span>
                    <p className="text-sm text-slate-600"><strong>Ghi chú của bạn:</strong> {fb.resolutionNote}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Form Xử lý (Nằm bên phải) */}
        <div className="lg:col-span-1">
          {resolvingFb ? (
            <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-5 sticky top-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                {resolveAction === 'approved' ? <CheckCircle2 className="text-green-600"/> : <XCircle className="text-red-600"/>}
                {resolveAction === 'approved' ? 'Duyệt Báo cáo' : 'Từ chối Báo cáo'}
              </h3>
              
              <div className="text-sm text-slate-600 mb-4">
                Đang xử lý cho: <strong>{resolvingFb.empName}</strong>
              </div>

              <form onSubmit={handleResolveSubmit} className="space-y-4">
                {resolveAction === 'approved' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3 mb-4">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Tự động sửa lịch làm việc</p>
                    <p className="text-xs text-blue-600">Nhập ca làm việc chuẩn để hệ thống tự động ghi đè vào bảng chấm công tuần {resolvingFb.week}.</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày (Thứ) *</label>
                        <select 
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none"
                          value={targetDay}
                          onChange={e => setTargetDay(e.target.value)}
                        >
                          {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Ca (VD: 6-14)</label>
                        <input 
                          type="text" 
                          placeholder="Bỏ trống nếu ko sửa lịch"
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none"
                          value={newShift}
                          onChange={e => setNewShift(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ghi chú phản hồi cho NV *</label>
                  <textarea 
                    required
                    rows="3"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Ví dụ: Đã duyệt và cộng bù 8 tiếng..."
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setResolvingFb(null)} className="flex-1 btn btn-outline">Hủy</button>
                  <button type="submit" className={`flex-1 btn ${resolveAction === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-danger'}`}>
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 sticky top-6">
              Chọn "Từ chối" hoặc "Xử lý & Duyệt" ở một báo cáo để bắt đầu thao tác.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}