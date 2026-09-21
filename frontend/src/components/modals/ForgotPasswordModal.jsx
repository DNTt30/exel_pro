import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { KeyRound, Send, CheckCircle2, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import * as api from '../../services/api';
import { notifyTelegram } from '../../utils/telegram';
import { toast } from '../ui/toastStore';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmpId = '', onUseDefaultPassword }) {
  const [empId, setEmpId] = useState(initialEmpId);
  const [busy, setBusy] = useState(false);
  const [emp, setEmp] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initId = (initialEmpId || '').trim();
      setEmpId(initId);
      setSentSuccess(false);
      setSearched(false);
      setSearchError('');
      setIsAdminUser(false);
      setEmp(null);
      if (initId) {
        checkEmp(initId);
      }
    }
  }, [isOpen, initialEmpId]);

  const checkEmp = async (id) => {
    const trimmed = (id || '').trim();
    if (!trimmed) {
      setEmp(null);
      setSearched(false);
      setSearchError('');
      setIsAdminUser(false);
      return;
    }

    if (trimmed.toLowerCase() === 'admin') {
      setIsAdminUser(true);
      setEmp(null);
      setSearched(true);
      setSearchError('');
      return;
    }

    setIsAdminUser(false);
    try {
      const found = await api.getEmployeeById(trimmed);
      if (found && found.id) {
        setEmp(found);
        setSearched(true);
        setSearchError('');
      } else {
        setEmp(null);
        setSearched(true);
        setSearchError(`Mã nhân viên "${trimmed}" không tồn tại trên hệ thống GS25. Vui lòng kiểm tra lại.`);
      }
    } catch {
      setEmp(null);
      setSearched(true);
      setSearchError(`Không tìm thấy mã nhân viên "${trimmed}". Vui lòng kiểm tra lại.`);
    }
  };

  const handleSendRequest = async () => {
    const targetId = empId.trim();
    if (!targetId) {
      toast.error('Vui lòng nhập mã nhân viên của bạn');
      return;
    }

    if (targetId.toLowerCase() === 'admin') {
      toast.info('Tài khoản Quản trị viên: Vui lòng liên hệ trực tiếp Quản lý cấp cao / Kỹ thuật hệ thống.');
      return;
    }

    setBusy(true);
    try {
      let foundEmp = emp;
      if (!foundEmp) {
        foundEmp = await api.getEmployeeById(targetId);
        setEmp(foundEmp);
      }

      if (!foundEmp || !foundEmp.id) {
        toast.error(`Không tìm thấy mã nhân viên "${targetId}". Vui lòng nhập đúng Mã số nhân viên GS25.`);
        setSearchError(`Mã nhân viên "${targetId}" không tồn tại trên hệ thống.`);
        setBusy(false);
        return;
      }

      const empName = foundEmp.name || `Nhân viên ${targetId}`;
      const dept = foundEmp.dept || 'Chưa gán';
      const job = foundEmp.jobTitle || foundEmp.role || 'STPT';
      const when = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

      const msg = [
        '🆘 YÊU CẦU ĐẶT LẠI MẬT KHẨU GS25',
        `• Nhân viên: ${empName} (Mã: ${targetId})`,
        `• Cửa hàng / Bộ phận: ${dept}`,
        `• Vị trí / Chức danh: ${job}`,
        `• Thời gian gửi: ${when}`,
        '👉 Cửa hàng trưởng (SM) vui lòng vào mục "Hệ thống > Nhân viên" trên website để Cấp lại mật khẩu bảo mật mới cho nhân viên.'
      ].join('\n');

      api.addActivityLog({
        userId: targetId,
        action: 'FORGOT_PASSWORD_REQUEST',
        category: 'security',
        entityType: 'session',
        entityId: targetId,
        description: `Gửi yêu cầu cấp lại mật khẩu cho nhân viên ${empName} (${targetId}) - Cửa hàng ${dept}`
      });

      const res = await notifyTelegram(msg);
      if (res.ok) {
        setSentSuccess(true);
        toast.success('Đã chuyển yêu cầu cấp lại mật khẩu tới Cửa hàng trưởng!');
      } else {
        toast.info('Đã ghi nhận yêu cầu. Vui lòng báo trực tiếp Cửa hàng trưởng (SM) trong ca trực.');
        setSentSuccess(true);
      }
    } catch {
      toast.error('Không gửi được yêu cầu. Vui lòng liên hệ trực tiếp Cửa hàng trưởng ca trực.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Quên mật khẩu đăng nhập" isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4 text-sm">

        {/* Khối hướng dẫn mật khẩu ban đầu */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
            <KeyRound size={15} className="text-blue-600" />
            <span>Mẹo: Thử mật khẩu khởi tạo</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Nếu bạn là nhân viên mới nhận việc hoặc vừa được cấp lại tài khoản, hãy thử đăng nhập bằng mật khẩu khởi tạo là số <strong>1</strong>. Hệ thống sẽ yêu cầu bạn đổi mật khẩu bảo mật mới ngay sau đó.
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
              👉 Thử điền mật khẩu khởi tạo (1) & Đăng nhập
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
                  setSearchError('');
                  setIsAdminUser(false);
                }}
                onBlur={() => checkEmp(empId)}
                placeholder="VD: 260716009 hoặc 251104004"
                className={`flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 font-medium transition-all ${
                  searchError
                    ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30 text-rose-900'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => checkEmp(empId)}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </label>

          {/* Cảnh báo mã admin */}
          {isAdminUser && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
              <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Tài khoản Quản trị viên (admin):</strong> Để đảm bảo an ninh hệ thống, việc khôi phục mật khẩu admin phải qua xác thực của Trưởng khu vực (OFC) hoặc bộ phận Kỹ thuật.
              </div>
            </div>
          )}

          {/* Cảnh báo không tìm thấy mã NV */}
          {searched && searchError && !isAdminUser && (
            <div className="flex items-start gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium animate-fadeIn">
              <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Xác nhận nhân viên hợp lệ */}
          {searched && emp && !isAdminUser && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium animate-fadeIn">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
              <span>Xác nhận: <strong>{emp.name}</strong> ({emp.dept || 'Chưa gán CH'}) - {emp.jobTitle || emp.role || 'STPT'}</span>
            </div>
          )}

          {sentSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={22} />
              </div>
              <h4 className="text-xs font-bold text-emerald-900">Đã gửi yêu cầu tới Quản lý</h4>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Yêu cầu đã được chuyển đến Cửa hàng trưởng (SM). Quản lý ca sẽ đặt lại mật khẩu bảo mật mới và trực tiếp cấp lại cho bạn trong ca trực.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || !empId.trim() || isAdminUser || Boolean(searchError)}
              onClick={handleSendRequest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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