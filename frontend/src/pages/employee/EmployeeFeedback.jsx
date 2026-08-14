import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Image as ImageIcon, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function EmployeeFeedback() {
  const { user, addFeedback, feedbacks, currentWeek } = useStore();
  const myFeedbacks = feedbacks.filter(fb => fb.empId === user?.id);

  const [date, setDate] = useState('');
  const [issue, setIssue] = useState('Quên chấm công (In/Out)');
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !issue) return alert('Vui lòng nhập ngày và loại báo cáo');
    
    addFeedback({
      empId: user.id,
      empName: user.name,
      dept: user.dept,
      week: currentWeek, // Lưu tuần hiện tại để SM dễ tra
      date,
      issue,
      note,
      imageUrl
    });

    // Reset form
    setDate('');
    setNote('');
    setImageUrl('');
    alert('Đã gửi báo cáo thành công! Vui lòng chờ Quản lý duyệt.');
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle2 size={14}/> Đã duyệt</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><XCircle size={14}/> Từ chối</span>;
    return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold"><Clock size={14}/> Đang chờ</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Báo Bù Công / Feedback (C&B)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form gửi Feedback */}
        <div className="md:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Send size={18} className="text-blue-600" /> Gửi Báo Cáo Mới
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày bị lỗi *</label>
              <input 
                type="date" 
                required 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Vấn đề *</label>
              <select 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                value={issue}
                onChange={e => setIssue(e.target.value)}
              >
                <option>Quên chấm công (In/Out)</option>
                <option>Sai ca làm việc</option>
                <option>Thiếu giờ làm / Đi trễ</option>
                <option>Được yêu cầu OT</option>
                <option>Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ghi chú chi tiết</label>
              <textarea 
                rows="3"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Ví dụ: Em có làm ca 6-14 nhưng quên chấm công lúc về..."
                value={note}
                onChange={e => setNote(e.target.value)}
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <ImageIcon size={14}/> Ảnh minh chứng (Link ảnh)
              </label>
              <input 
                type="url" 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Dán link ảnh Zalo/Drive vào đây..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">VD: Link ảnh tin nhắn xin phép Quản lý.</p>
            </div>

            <button type="submit" className="w-full btn btn-primary py-2 mt-2">
              <Send size={16} /> Gửi Yêu Cầu
            </button>
          </form>
        </div>

        {/* Lịch sử Feedback */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Lịch sử Báo Cáo của tôi</h3>
          
          {myFeedbacks.length === 0 ? (
            <div className="text-center text-slate-500 py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              Bạn chưa có báo cáo nào.
            </div>
          ) : (
            <div className="space-y-4">
              {myFeedbacks.map(fb => (
                <div key={fb.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-slate-800">{fb.issue}</span>
                      <span className="text-xs text-slate-500 ml-2">Ngày: {fb.date}</span>
                    </div>
                    {getStatusBadge(fb.status)}
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">{fb.note}</p>
                  
                  {fb.imageUrl && (
                    <a href={fb.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-2">
                      <ImageIcon size={12}/> Xem ảnh đính kèm
                    </a>
                  )}

                  {fb.resolutionNote && (
                    <div className="mt-3 bg-white p-3 rounded border border-slate-200 text-sm">
                      <strong className="text-slate-700">Quản lý phản hồi:</strong>
                      <p className="text-slate-600 mt-1">{fb.resolutionNote}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}