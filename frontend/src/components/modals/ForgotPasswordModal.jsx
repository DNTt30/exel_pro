import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { KeyRound, Send, CheckCircle2, HelpCircle } from 'lucide-react';
import * as api from '../../services/api';
import { notifyTelegram } from '../../utils/telegram';
import { toast } from '../ui/toastStore';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmpId = '', onUseDefaultPassword }) {
  const [empId, setEmpId] = useState(initialEmpId);
  const [busy, setBusy] = useState(false);
  const [emp, setEmp] = useState(null);
  const [searched, setSearched] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmpId(initialEmpId || '');
      setSentSuccess(false);
      setSearched(false);
      setEmp(null);
      if (initialEmpId && initialEmpId.trim()) {
        checkEmp(initialEmpId.trim());
      }
    }
  }, [isOpen, initialEmpId]);

  const checkEmp = async (id) => {
    if (!id) return;
    try {
      const found = await api.getEmployeeById(id);
      setEmp(found || null);
      setSearched(true);
    } catch {
      setEmp(null);
      setSearched(true);
    }
  };

  const handleSendRequest = async () => {
    const targetId = empId.trim();
    if (!targetId) {
      toast.error('Vui lòng nhập mã nhân viên của bạn');
      return;
    }
    setBusy(true);
    try {
      let foundEmp = emp;
      if (!foundEmp) {
        foundEmp = await api.getEmployeeById(targetId);
        setEmp(foundEmp);
      }

      const empName = foundEmp?.name || 'Nhân viên ' + targetId;
      const dept = foundEmp?.dept || 'Chưa gán';
      const when = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

      const msg = [
        '🆘 YÊU CẦU CẤP LẠI MẬT KHẨU GS25',
        `• Nhân viên: ${empName} (${targetId})`,
        `• Cửa hàng / Bộ phận: ${dept}`,
        `• Thời gian yêu cầu: ${when}`,
        '👉 Quản lý / SM vui lòng vào mục "Hệ thống > Nhân viên" trên web để Đặt lại mật khẩu cho bạn ấy.'
      ].join('\n');

      const res = await notifyTelegram(msg);
      if (res.ok) {
        setSentSuccess(true);
        toast.success('Đã gửi yêu cầu cấp lại mật khẩu tới Quản lý!');
      } else {
        toast.info('Đã ghi nhận yêu cầu. Vui lòng báo trực tiếp Cửa hàng trưởng (SM).');
        setSentSuccess(true);
      }
    } catch {
      toast.error('Không gửi được yêu cầu. Vui lòng liên hệ trực tiếp Quản lý ca.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Quên mật khẩu đăng nhập" isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4 text-sm">

        {/* Khối mẹo mật khẩu mặc định */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
            <KeyRound size={15} className="text-blue-600" />
            <span>Mẹo: Thử mật khẩu mặc định</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Nếu bạn là nhân viên mới hoặc vừa được Quản lý cấp lại tài khoản, mật khẩu mặc định của bạn là số <strong>1</strong>.
          </p>
          {onUseDefaultPassword && (
            <button
              type="button"
              onClick={() => {
                onUseDefaultPassword();
                onClose();
              }}
              className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              👉 Điền mật khẩu mặc định (1) & Đăng nhập lại
            </button>
          )}
        </div>

        {/* Form gửi yêu cầu tới SM */}
        <div className="space-y-2.5">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Mã nhân viên của bạn</span>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={empId}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  setSearched(false);
                }}
                onBlur={() => checkEmp(empId.trim())}
                placeholder="VD: 2405001 hoặc 260716009"
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </label>

          {searched && emp && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
              <span>Xác nhận: <strong>{emp.name}</strong> ({emp.dept || 'Chưa gán CH'})</span>
            </div>
          )}

          {sentSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={22} />
              </div>
              <h4 className="text-xs font-bold text-emerald-900">Đã gửi thông báo tới Quản lý</h4>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Yêu cầu đã được gửi qua kênh Telegram của Cửa hàng trưởng. Khi Quản lý đặt lại xong, mật khẩu sẽ quay về mặc định là <strong>1</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || !empId.trim()}
              onClick={handleSendRequest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {busy ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>{busy ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu Quản lý cấp lại mật khẩu'}</span>
            </button>
          )}
        </div>

        {/* Hướng dẫn quy trình cửa hàng */}
        <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px] space-y-1">
          <div className="flex items-center gap-1 font-bold text-slate-600">
            <HelpCircle size={13} />
            <span>Quy trình cấp lại trực tiếp trong ca làm:</span>
          </div>
          <p>
            Bạn có thể báo trực tiếp với <strong>Cửa hàng trưởng (SM)</strong> trong ca trực. Quản lý có thể vào mục <strong>Hệ thống &gt; Nhân viên</strong> và bấm <strong>"Đặt lại mật khẩu"</strong> cho bạn ngay lập tức.
          </p>
        </div>

      </div>
    </Modal>
  );
}