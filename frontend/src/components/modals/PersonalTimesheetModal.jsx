import React from 'react';
import Modal from './Modal';
import { Printer, Download, User, Building2, Calendar, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getRoleBadgeInfo } from '../../data/constants';
import { getShiftHours, normalizeShift } from '../../utils/shiftHelper';

export default function PersonalTimesheetModal({ isOpen, onClose, user, activeDays, weekSchedule }) {
  if (!user) return null;

  const roleInfo = getRoleBadgeInfo(user.role || user.type);
  const myDept = user.dept || 'VN0485';

  // Thống kê chi tiết công
  let totalHours = 0;
  let totalShifts = 0;
  let nightShiftsCount = 0;
  let offDaysCount = 0;

  const daysDetail = activeDays.map((day) => {
    const rawVal = weekSchedule[user.id]?.[day] || '';
    const { shift } = normalizeShift(rawVal);
    const isOff = !shift || shift === 'off';
    const hours = isOff ? 0 : getShiftHours(shift);

    if (isOff) {
      offDaysCount++;
    } else {
      totalShifts++;
      totalHours += hours;
      if (shift.startsWith('22')) nightShiftsCount++;
    }

    return { day, shift: isOff ? 'OFF' : shift, hours };
  });

  const isPT = user.type === 'STPT' || user.type === 'PARTTIME' || (user.role && user.role.includes('PT'));
  const isOver91 = isPT && totalHours > 91;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Phiếu Chấm Công Cá Nhân" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 max-h-[85vh] flex flex-col">
        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white border border-slate-200 rounded-2xl print:border-none print:p-0">
          
          {/* Header Tiêu Đề */}
          <div className="text-center pb-3 border-b-2 border-slate-800">
            <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Hệ Thống Bán Lẻ & Quản Lý Nhân Sự OFC</div>
            <h2 className="text-lg font-black uppercase text-slate-900 mt-0.5 tracking-tight">
              PHIẾU XÁC NHẬN CÔNG & LỊCH LÀM VIỆC CÁ NHÂN
            </h2>
            <div className="text-xs text-slate-600 mt-0.5">
              Chu kỳ chấm công: <strong>26 tháng trước → 25 tháng này</strong> (31 ngày)
            </div>
          </div>

          {/* Employee Meta Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Họ và Tên</span>
              <strong className="text-slate-900 font-extrabold">{user.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mã Nhân Viên</span>
              <strong className="font-mono text-blue-700">{user.id}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cửa Hàng</span>
              <strong className="text-slate-900">{myDept}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Vị Trí / Chức Vụ</span>
              <strong className="text-indigo-700">{roleInfo.label}</strong>
            </div>
          </div>

          {/* 31-Day Detail Grid */}
          <div className="mb-3">
            <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Bảng Chi Tiết 31 Ngày:</span>
              <span className="text-[11px] text-slate-500 font-normal">Đơn vị tính: Giờ (h)</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-11 gap-1 text-center text-xs">
              {daysDetail.map(({ day, shift, hours }) => {
                const isOff = shift === 'OFF';
                return (
                  <div
                    key={day}
                    className={`p-1.5 rounded-lg border flex flex-col items-center justify-between ${
                      isOff 
                        ? 'bg-slate-50 border-slate-200 text-slate-400' 
                        : 'bg-blue-50/70 border-blue-200 text-blue-900 font-bold'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-slate-500">{day}</span>
                    <span className={`text-[11px] font-black my-0.5 ${isOff ? 'text-slate-400' : 'text-blue-700'}`}>
                      {shift}
                    </span>
                    <span className="text-[9px] font-mono opacity-80">{isOff ? '-' : `${hours}h`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Tổng Giờ Công</div>
              <div className="text-lg font-black text-blue-700 font-mono">{totalHours}h</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Tổng Số Ca Làm</div>
              <div className="text-lg font-black text-emerald-700 font-mono">{totalShifts} ca</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Ca Đêm (22-6)</div>
              <div className="text-lg font-black text-purple-700 font-mono">{nightShiftsCount} ca</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Ngày Nghỉ (OFF)</div>
              <div className="text-lg font-black text-slate-600 font-mono">{offDaysCount} ngày</div>
            </div>
          </div>

          {/* Compliance Status Alert */}
          <div className="mt-3 text-xs">
            {isOver91 ? (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>Cảnh báo: Nhân viên Part-time vượt quá định mức 91h/tháng ({totalHours}h / 91h).</span>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Định mức giờ làm việc hợp lệ và tuân thủ quy định chuỗi cửa hàng.</span>
              </div>
            )}
          </div>

          {/* Signatures Section (Chữ Ký Xác Nhận) */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs mt-6 pt-4 border-t border-slate-300">
            <div>
              <div className="font-bold text-slate-800">Người Lập Phiếu</div>
              <div className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</div>
              <div className="h-12"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Cửa Hàng Trưởng (SM)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</div>
              <div className="h-12"></div>
            </div>
            <div>
              <div className="font-bold text-slate-800">Nhân Viên Xác Nhận</div>
              <div className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</div>
              <div className="h-12"></div>
              <div className="font-bold text-slate-900">{user.name}</div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Ngày in: {new Date().toLocaleDateString('vi-VN')}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs px-4 py-2 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
            >
              <Printer size={13} />
              <span>In Phiếu (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
