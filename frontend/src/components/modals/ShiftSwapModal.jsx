import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { RefreshCw, ArrowRightLeft, User, Calendar, AlertCircle, AlertTriangle } from 'lucide-react';
import { WEEK_DAYS, DAY_FULL_NAMES } from '../../data/constants';
import { normalizeShift, getShiftHours } from '../../utils/shiftHelper';

export default function ShiftSwapModal({ isOpen, onClose, currentWeek }) {
  const { user, employees, schedule, addShiftSwap } = useStore();
  const weekSched = schedule[currentWeek] || {};
  const mySched = weekSched[user?.id] || {};

  // 1. Chỉ lấy những ngày BẢN THÂN CÓ CA LÀM VIỆC (khác OFF)
  const myShiftsList = useMemo(() => {
    const parts = currentWeek.split('-').map(Number);
    const weekStartDate = new Date(parts[0], parts[1] - 1, parts[2]);

    return WEEK_DAYS.map((dayKey, idx) => {
      const dateObj = new Date(weekStartDate);
      dateObj.setDate(weekStartDate.getDate() + idx);
      const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

      const raw = mySched[dayKey] || '';
      const { shift } = normalizeShift(raw);
      const isOff = !shift || shift === 'off';

      return {
        dayKey,
        dayLabel: `${DAY_FULL_NAMES[dayKey]} (${dateStr})`,
        shift: isOff ? 'off' : shift,
        hours: isOff ? 0 : getShiftHours(shift),
        isOff,
        display: `${DAY_FULL_NAMES[dayKey]} (${dateStr}) - Ca ${shift}`
      };
    }).filter(s => !s.isOff); // Chỉ giữ ngày có ca làm việc
  }, [currentWeek, mySched]);

  // 2. Chỉ lấy những đồng nghiệp trong cùng cửa hàng CÓ ÍT NHẤT 1 CA LÀM VIỆC trong tuần
  const colleaguesWithShifts = useMemo(() => {
    return employees.filter(e => {
      if (e.id === user?.id || e.dept !== user?.dept) return false;
      const empSched = weekSched[e.id] || {};
      return WEEK_DAYS.some(d => {
        const { shift } = normalizeShift(empSched[d] || '');
        return shift && shift !== 'off';
      });
    });
  }, [employees, user, weekSched]);

  const [fromDay, setFromDay] = useState('');
  const [toEmpId, setToEmpId] = useState('');
  const [toDay, setToDay] = useState('');
  const [reason, setReason] = useState('');

  // Tự động gán mặc định khi danh sách thay đổi
  useEffect(() => {
    if (myShiftsList.length > 0 && !fromDay) {
      setFromDay(myShiftsList[0].dayKey);
    }
  }, [myShiftsList, fromDay]);

  useEffect(() => {
    if (colleaguesWithShifts.length > 0 && !toEmpId) {
      setToEmpId(colleaguesWithShifts[0].id);
    }
  }, [colleaguesWithShifts, toEmpId]);

  // 3. Ca của đồng nghiệp được chọn (Chỉ lấy ngày ĐỒNG NGHIỆP CÓ CA LÀM VIỆC)
  const partnerSched = useMemo(() => {
    return weekSched[toEmpId] || {};
  }, [weekSched, toEmpId]);

  const partnerShiftsList = useMemo(() => {
    if (!toEmpId) return [];
    const parts = currentWeek.split('-').map(Number);
    const weekStartDate = new Date(parts[0], parts[1] - 1, parts[2]);

    return WEEK_DAYS.map((dayKey, idx) => {
      const dateObj = new Date(weekStartDate);
      dateObj.setDate(weekStartDate.getDate() + idx);
      const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

      const raw = partnerSched[dayKey] || '';
      const { shift } = normalizeShift(raw);
      const isOff = !shift || shift === 'off';

      return {
        dayKey,
        dayLabel: `${DAY_FULL_NAMES[dayKey]} (${dateStr})`,
        shift: isOff ? 'off' : shift,
        hours: isOff ? 0 : getShiftHours(shift),
        isOff,
        display: `${DAY_FULL_NAMES[dayKey]} (${dateStr}) - Ca ${shift}`
      };
    }).filter(s => !s.isOff); // Chỉ giữ ngày có ca làm việc
  }, [currentWeek, partnerSched, toEmpId]);

  useEffect(() => {
    if (partnerShiftsList.length > 0) {
      // Đặt mặc định ca của đồng nghiệp
      setToDay(partnerShiftsList[0].dayKey);
    } else {
      setToDay('');
    }
  }, [partnerShiftsList]);

  const selectedMyShift = myShiftsList.find(s => s.dayKey === fromDay) || myShiftsList[0];
  const selectedPartnerShift = partnerShiftsList.find(s => s.dayKey === toDay) || partnerShiftsList[0];
  const selectedPartnerObj = colleaguesWithShifts.find(c => c.id === toEmpId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMyShift) return alert('Bạn không có ca làm việc nào để thực hiện đổi ca.');
    if (!toEmpId) return alert('Vui lòng chọn đồng nghiệp muốn đổi ca.');
    if (!selectedPartnerShift) return alert('Đồng nghiệp được chọn không có ca làm việc nào để đổi sang.');

    try {
      await addShiftSwap({
        week: currentWeek,
        store: user?.dept,
        fromEmpId: user?.id,
        fromEmpName: user?.name,
        fromDay: selectedMyShift.dayKey,
        fromDayLabel: selectedMyShift.dayLabel,
        fromShift: selectedMyShift.shift,
        toEmpId,
        toEmpName: selectedPartnerObj?.name || toEmpId,
        toDay: selectedPartnerShift.dayKey,
        toDayLabel: selectedPartnerShift.dayLabel,
        toShift: selectedPartnerShift.shift,
        reason: reason.trim()
      });
      alert('Đã gửi yêu cầu đổi ca. Đang chờ đồng nghiệp xác nhận.');
      onClose();
    } catch (err) {
      alert('Không thể gửi đơn đổi ca: ' + (err.message || 'Lỗi kết nối'));
    }
  };

  const hasNoMyShifts = myShiftsList.length === 0;
  const hasNoColleagues = colleaguesWithShifts.length === 0;

  return (
    <Modal title="Yêu Cầu Đổi Ca Làm Việc" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-blue-600 flex-shrink-0" />
          <span>Chỉ có thể đổi giữa <strong>2 ngày đều có ca làm việc thực tế</strong> của bạn và đồng nghiệp.</span>
        </div>

        {/* Cảnh báo nếu bản thân chưa có ca làm */}
        {hasNoMyShifts && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Bạn chưa có ca làm việc nào trong tuần này!</strong>
              <p className="text-[11px] text-amber-700 mt-0.5">Vui lòng đăng ký hoặc chờ xếp ca trước khi thực hiện đổi ca.</p>
            </div>
          </div>
        )}

        {/* Ca của bạn (Tôi) */}
        {!hasNoMyShifts && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">1. Chọn ca của bạn muốn đổi:</label>
            <select
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={fromDay}
              onChange={e => setFromDay(e.target.value)}
            >
              {myShiftsList.map(s => (
                <option key={s.dayKey} value={s.dayKey}>{s.display}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cảnh báo nếu không có đồng nghiệp có ca */}
        {!hasNoMyShifts && hasNoColleagues && (
          <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-600 text-center">
            Chưa có đồng nghiệp nào trong cửa hàng <strong>{user?.dept}</strong> có ca làm việc tuần này để đổi.
          </div>
        )}

        {/* Đồng nghiệp & Ca muốn đổi sang */}
        {!hasNoMyShifts && !hasNoColleagues && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">2. Chọn đồng nghiệp đổi cùng (Có ca tuần này):</label>
              <select
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={toEmpId}
                onChange={e => setToEmpId(e.target.value)}
              >
                {colleaguesWithShifts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id} - {c.role || c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Chọn ca của đồng nghiệp muốn đổi sang:</label>
              {partnerShiftsList.length === 0 ? (
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-400 italic">
                  Đồng nghiệp này không có ca làm việc nào trong tuần.
                </div>
              ) : (
                <select
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={toDay}
                  onChange={e => setToDay(e.target.value)}
                >
                  {partnerShiftsList.map(s => (
                    <option key={s.dayKey} value={s.dayKey}>{s.display}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Lý do */}
        {!hasNoMyShifts && !hasNoColleagues && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lý do đổi ca (Tùy chọn):</label>
            <input
              type="text"
              placeholder="Ví dụ: Bận việc gia đình, đổi ca với bạn..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Summary Card Preview */}
        {!hasNoMyShifts && !hasNoColleagues && selectedMyShift && selectedPartnerShift && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
            <div className="text-center flex-1">
              <span className="text-[10px] text-slate-500 block uppercase">Bạn nhường lại ca</span>
              <span className="text-blue-700">{selectedMyShift.dayKey}: {selectedMyShift.shift}</span>
            </div>
            <ArrowRightLeft size={16} className="text-blue-600 mx-2 flex-shrink-0" />
            <div className="text-center flex-1">
              <span className="text-[10px] text-slate-500 block uppercase">Bạn nhận ca của {selectedPartnerObj?.name}</span>
              <span className="text-emerald-700">{selectedPartnerShift.dayKey}: {selectedPartnerShift.shift}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline text-xs px-4 py-2 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={hasNoMyShifts || hasNoColleagues || !selectedMyShift || !selectedPartnerShift}
            className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} />
            <span>Gửi yêu cầu đổi ca</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
