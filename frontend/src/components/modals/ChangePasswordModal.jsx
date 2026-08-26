import React, { useState } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { changeMyPassword, adminResetPassword } from '../../services/api/password';
import { toast } from '../ui/toastStore';
import { KeyRound } from 'lucide-react';

const MIN_LEN = 8;

export default function ChangePasswordModal({ isOpen, onClose, targetEmp = null }) {
  // targetEmp != null → chế độ ADMIN RESET cho nhân viên đó
  const user = useStore(s => s.user);
  // Khi SM/Manager dùng mật khẩu mặc định → ép đổi, không cho đóng modal
  const isForced = !targetEmp && user?.mustChangePassword && !user?.id?.startsWith('admin');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdminReset = Boolean(targetEmp);
  const title = isAdminReset
    ? 'Đặt lại mật khẩu cho ' + targetEmp.name + ' (' + targetEmp.id + ')'
    : 'Đổi mật khẩu của bạn';

  const submit = async () => {
    if (newPw.length < MIN_LEN) return toast.error('Mật khẩu mới tối thiểu ' + MIN_LEN + ' ký tự');
    if (newPw !== confirmPw) return toast.error('Xác nhận mật khẩu không khớp');
    setBusy(true);
    try {
      if (isAdminReset) {
        await adminResetPassword(targetEmp.id, newPw);
        toast.success('✅ Đã đặt lại mật khẩu. Nhân viên nên đăng nhập và đổi lại.');
      } else {
        await changeMyPassword(oldPw, newPw);
        useStore.setState(s => ({ user: { ...s.user, mustChangePassword: false, authPassword: newPw } }));
        toast.success('✅ Đổi mật khẩu thành công!');
      }
      setOldPw(''); setNewPw(''); setConfirmPw('');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} isOpen={isOpen} onClose={isForced ? undefined : onClose} hideClose={isForced}>
      <div className="space-y-3 text-sm">
        {isForced && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 font-semibold">
            ⚠️ Bạn đang dùng mật khẩu mặc định. Vui lòng đặt mật khẩu mới để tiếp tục sử dụng hệ thống.
          </div>
        )}
        {!isAdminReset && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Mật khẩu hiện tại</span>
            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Mật khẩu đang dùng" />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Mật khẩu mới (≥ {MIN_LEN} ký tự)</span>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2" placeholder={"Tối thiểu " + MIN_LEN + " ký tự"} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Nhập lại mật khẩu mới</span>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <button type="button" disabled={busy}
          onClick={submit}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
          <KeyRound size={15} />
          {busy ? 'Đang lưu...' : (isAdminReset ? 'Đặt lại mật khẩu' : 'Đổi mật khẩu')}
        </button>
        {user?.mustChangePassword && !isAdminReset && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Bạn đang dùng mật khẩu mặc định — hãy đổi để bảo vệ tài khoản.
          </p>
        )}
      </div>
    </Modal>
  );
}