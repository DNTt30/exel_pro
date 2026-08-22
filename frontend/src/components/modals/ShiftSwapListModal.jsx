import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  Building2,
  Trash2,
  Sparkles
} from 'lucide-react';

import { canPickStore, isOpsManager } from '../../lib/authSession';

export default function ShiftSwapListModal({ isOpen, onClose, currentWeek }) {
  const { user, shiftSwaps, respondShiftSwap } = useStore();
  const pickStore = canPickStore(user);
  const isManager = isOpsManager(user);

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'resolved'

  // Lọc danh sách swap liên quan đến user hiện tại
  const mySwaps = useMemo(() => {
    const list = shiftSwaps || [];
    return list.filter(s => {
      if (pickStore) return true;
      if (isManager && s.store === user?.dept) return true;
      return s.fromEmpId === user?.id || s.toEmpId === user?.id;
    });
  }, [shiftSwaps, user, pickStore, isManager]);

  const filteredSwaps = useMemo(() => {
    if (activeTab === 'pending') {
      return mySwaps.filter(s => s.status === 'pending_partner' || s.status === 'pending_manager');
    }
    if (activeTab === 'resolved') {
      return mySwaps.filter(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'cancelled');
    }
    return mySwaps;
  }, [mySwaps, activeTab]);

  const handlePartnerResponse = (swapId, agree) => {
    if (agree) {
      respondShiftSwap(swapId, 'pending_manager', 'Đồng nghiệp đã đồng ý, chuyển Quản lý phê duyệt.');
      alert('✅ Bạn đã đồng ý đổi ca! Yêu cầu đã được chuyển tới Quản lý để phê duyệt.');
    } else {
      respondShiftSwap(swapId, 'rejected', 'Đồng nghiệp đã từ chối đổi ca.');
      alert('Đã từ chối yêu cầu đổi ca.');
    }
  };

  const handleManagerResponse = (swapId, approve) => {
    if (approve) {
      respondShiftSwap(swapId, 'approved', 'Quản lý đã phê duyệt và tự động hoán đổi ca.');
      alert('✅ Phê duyệt thành công! Lịch làm việc của 2 nhân viên đã được tự động cập nhật trên hệ thống.');
    } else {
      respondShiftSwap(swapId, 'rejected', 'Quản lý đã từ chối đơn đổi ca.');
      alert('Đã từ chối đơn đổi ca.');
    }
  };

  const handleCancel = (swapId) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy yêu cầu đổi ca này?')) {
      respondShiftSwap(swapId, 'cancelled', 'Người tạo đã hủy yêu cầu.');
    }
  };

  const getStatusBadge = (status, swap) => {
    switch (status) {
      case 'pending_partner':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock size={11} /> Chờ {swap.toEmpName} đồng ý
          </span>
        );
      case 'pending_manager':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Clock size={11} /> Chờ Quản lý duyệt
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 size={11} /> Đã đổi ca thành công
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
            <XCircle size={11} /> Đã từ chối
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Modal title="Danh Sách Đơn Đổi Ca" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 max-h-[80vh] flex flex-col">
        {/* Tabs Filter */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({mySwaps.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chờ xử lý ({mySwaps.filter(s => s.status === 'pending_partner' || s.status === 'pending_manager').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resolved')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'resolved' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã xong
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Cửa hàng: <strong>{user?.dept}</strong>
          </div>
        </div>

        {/* List of Swaps */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
          {filteredSwaps.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Sparkles size={24} className="mx-auto mb-2 text-slate-300" />
              <div className="text-xs font-bold text-slate-600">Không có đơn đổi ca nào</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Khi có yêu cầu đổi ca, đơn sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            filteredSwaps.map((swap) => {
              const isCreator = swap.fromEmpId === user?.id;
              const isPartner = swap.toEmpId === user?.id;
              const canPartnerAct = isPartner && swap.status === 'pending_partner';
              const canManagerAct = isManager && swap.status === 'pending_manager';
              const canCancel = isCreator && (swap.status === 'pending_partner' || swap.status === 'pending_manager');

              return (
                <div 
                  key={swap.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  {/* Top info */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-mono text-slate-400 text-[11px]">Tuần: {swap.week}</span>
                    {getStatusBadge(swap.status, swap)}
                  </div>

                  {/* Swap Visual Pair */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex-1 text-left">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Người gửi</div>
                      <div className="font-bold text-xs text-slate-800 truncate">{swap.fromEmpName}</div>
                      <div className="text-xs font-mono font-bold text-blue-700">
                        {swap.fromDay}: {swap.fromShift}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <ArrowRightLeft size={14} />
                    </div>

                    <div className="flex-1 text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Đổi với</div>
                      <div className="font-bold text-xs text-slate-800 truncate">{swap.toEmpName}</div>
                      <div className="text-xs font-mono font-bold text-emerald-700">
                        {swap.toDay}: {swap.toShift}
                      </div>
                    </div>
                  </div>

                  {/* Reason & Notes */}
                  {swap.reason && (
                    <div className="text-[11px] text-slate-600 bg-slate-100/60 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-slate-700">Lý do:</span> {swap.reason}
                    </div>
                  )}

                  {swap.managerNote && (
                    <div className="text-[11px] text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg">
                      <span className="font-bold">Ghi chú:</span> {swap.managerNote}
                    </div>
                  )}

                  {/* Manager Needs Confirmation Banner */}
                  {canManagerAct && (
                    <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="animate-pulse text-base">🔔</span>
                        <span>2 nhân viên đã đồng thuận. <strong>Quản lý cần xác nhận để cập nhật lịch</strong>:</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  {(canPartnerAct || canManagerAct || canCancel) && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                      {/* Partner Action */}
                      {canPartnerAct && (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePartnerResponse(swap.id, false)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePartnerResponse(swap.id, true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={13} /> Đồng ý đổi ca
                          </button>
                        </>
                      )}

                      {/* Manager Action */}
                      {canManagerAct && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleManagerResponse(swap.id, false)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManagerResponse(swap.id, true)}
                            className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={13} /> Duyệt đổi ca (Tự động cập nhật)
                          </button>
                        </>
                      )}

                      {/* Creator Cancel Action */}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(swap.id)}
                          className="text-xs text-slate-400 hover:text-red-600 font-semibold px-2 py-1 transition-colors cursor-pointer"
                        >
                          Hủy yêu cầu
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline text-xs px-4 py-2 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
