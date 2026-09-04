import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { changeMyPassword, adminResetPassword } from '../../services/api/password';
import { toast } from '../ui/toastStore';
import { KeyRound, LogOut } from 'lucide-react';

const MIN_LEN = 8;

export default function ChangePasswordModal({ isOpen, onClose, targetEmp = null }) {
  // targetEmp != null → chế độ ADMIN RESET cho nhân viên đó
  const user = useStore(s => s.user);
  const logout = useStore(s => s.logout);
  const navigate = useNavigate();
  // Khi SM/Manager dùng mật khẩu mặc định → nhắc đổi mật khẩu
  const isForced = !targetEmp && user?.mustChangePassword && !user?.id?.startsWith('admin');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdminReset = Boolean(targetEmp);
  const title = isAdminReset
    ? 'Đặt lại mật khẩu cho ' + targetEmp.name + ' (' + targetEmp.id + ')'
    : (isForced ? 'Thiết lập mật khẩu mới' : 'Đổi mật khẩu của bạn');

  const submit = async () => {
    if (newPw.length < MIN_LEN) return toast.error('Mật khẩu mới tối thiểu ' + MIN_LEN + ' ký tự');
    if (newPw !== confirmPw) return toast.error('Xác nhận mật khẩu không khớp');
    setBusy(true);
    try {
      if (isAdminReset) {
        await adminResetPassword(targetEmp.id, newPw);
        toast.success('✅ Đã đặt lại mật khẩu. Nhân viên nên đăng nhập và đổi lại.');
      } else {
        await changeMyPassword(oldPw, newPw, { isFirstTime: isForced, userId: user?.id });
        useStore.setState(s => ({ user: { ...s.user, mustChangePassword: false, authPassword: newPw } }));
        toast.success('✅ Thiết lập mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
      }
      setOldPw(''); setNewPw(''); setConfirmPw('');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch {
      onClose();
      navigate('/login');
    }
  };

  return (
    <Modal title={title} isOpen={isOpen} onClose={onClose} hideClose={false}>
      <div className="space-y-3 text-sm">
        {isForced && (
          <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium leading-relaxed">
            👋 <strong>Chào bạn!</strong> Bạn đang đăng nhập bằng mật khẩu mặc định (1). Vui lòng đặt mật khẩu mới riêng cho tài khoản của bạn để tiếp tục sử dụng hệ thống.
          </div>
        )}
        {!isAdminReset && !isForced && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Mật khẩu hiện tại</span>
            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mật khẩu đang dùng" />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Mật khẩu mới (≥ {MIN_LEN} ký tự)</span>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder={"Tối thiểu " + MIN_LEN + " ký tự"} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Nhập lại mật khẩu mới</span>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập lại chính xác mật khẩu mới" />
        </label>
        <button type="button" disabled={busy}
          onClick={submit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-500/20 cursor-pointer">
          <KeyRound size={15} />
          {busy ? 'Đang lưu...' : (isAdminReset ? 'Đặt lại mật khẩu' : (isForced ? 'Lưu mật khẩu mới & Bắt đầu' : 'Đổi mật khẩu'))}
        </button>
        {user?.mustChangePassword && !isAdminReset && !isForced && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Bạn đang dùng mật khẩu mặc định — hãy đổi để bảo vệ tài khoản.
          </p>
        )}

        {/* Thoát / Đăng xuất hoặc Để sau */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
          >
            <LogOut size={13} /> Đăng xuất tài khoản
          </button>
          {isForced && (
            <button
              type="button"
              onClick={onClose}
              className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              Để sau, vào xem lịch →
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}