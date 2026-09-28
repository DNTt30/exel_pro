import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '../../services/api';
import { validateNewPassword } from '../../utils/passwordPolicy';

function RecoveryForm({ onClose, initialEmpId, onSuccess }) {
  const [empId, setEmpId] = useState(initialEmpId.trim());
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState('email');
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    const id = empId.trim();
    if (!/^(admin|\d{9})$/.test(id)) { setError('Nhập mã nhân viên 9 chữ số hoặc admin.'); return; }
    if (step === 2) {
      if (!/^\d{6}$/.test(otp)) { setError('Mã OTP phải gồm đúng 6 chữ số.'); return; }
      setStep(3); return;
    }
    if (step === 3) {
      const validationError = validateNewPassword(password);
      if (validationError) { setError(validationError); return; }
      if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    }
    pending.current = true; setBusy(true);
    try {
      if (step === 1) {
        const result = await requestPasswordResetOtp(id);
        if (!alive.current) return;
        setEmpId(id); setChannel(result.channel); setOtp(''); setStep(2);
      } else {
        const result = await resetPasswordWithOtp(id, otp, password);
        if (!alive.current) return;
        setPassword(''); setConfirm(''); setOtp('');
        onSuccess?.(id, result.warning);
        onClose();
      }
    } catch (failure) {
      if (!alive.current) return;
      setError(failure.message || 'Thao tác thất bại. Vui lòng thử lại.');
      if (['OTP_INVALID', 'OTP_EXPIRED', 'OTP_LOCKED', 'OTP_USED', 'RESET_FAILED'].includes(failure.code)) setStep(2);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const fieldClass = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
  return <Modal title="Khôi phục mật khẩu" isOpen onClose={busy ? () => {} : onClose} preventBackdropClose={busy} hideClose={busy}>
    <form onSubmit={submit} className="space-y-4">
      <ol className="grid grid-cols-3 gap-2 text-xs" aria-label="Các bước khôi phục">
        {['Tài khoản', 'Mã OTP', 'Mật khẩu mới'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
          className={`rounded-lg p-2 text-center ${step === index + 1 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>{index + 1}. {label}</li>)}
      </ol>
      {step === 1 ? <>
        <label className="block space-y-1 text-sm font-semibold">Mã nhân viên / admin
          <input autoFocus autoComplete="username" value={empId} onChange={event => setEmpId(event.target.value)} disabled={busy} className={fieldClass} placeholder="Mã NV 9 chữ số hoặc admin" />
        </label>
        <p className="text-xs text-slate-500">Nhân viên nhận OTP qua Gmail đã được quản lý cập nhật trong hồ sơ. Tài khoản admin nhận mã qua Telegram.</p>
      </> : <>
        <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Đã gửi OTP cho tài khoản <strong>{empId}</strong> qua {channel === 'telegram' ? 'Telegram của quản trị viên' : 'email đã đăng ký'}. Mã có hiệu lực 5 phút; chỉ mã mới nhất còn dùng được. {channel === 'email' && 'Hãy kiểm tra cả thư rác.'}</p>
        {step === 2 ? <label className="block space-y-1 text-sm font-semibold">Mã OTP 6 số
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} className={`${fieldClass} font-mono tracking-widest`} />
        </label> : <>
          <label className="block space-y-1 text-sm font-semibold">Mật khẩu mới
            <input autoFocus type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className={fieldClass} />
          </label>
          <label className="block space-y-1 text-sm font-semibold">Xác nhận mật khẩu mới
            <input type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} disabled={busy} className={fieldClass} />
          </label>
          <p className="text-xs text-slate-500">Tối thiểu 8 ký tự, có số hoặc ký tự đặc biệt; không dùng mật khẩu phổ biến như 12345678. Mã OTP được xác thực khi bấm xác nhận đổi.</p>
        </>}
      </>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? 'Đang xử lý…' : step === 1 ? 'Nhận mã OTP' : step === 2 ? 'Tiếp tục' : 'Xác nhận đổi'}
      </button>
      {step > 1 && <div className="flex justify-between gap-3 text-xs text-blue-700">
        <button type="button" disabled={busy} onClick={() => { setStep(1); setError(''); setOtp(''); setPassword(''); setConfirm(''); }}>Nhận mã mới / Đổi tài khoản</button>
        {step === 3 && <button type="button" disabled={busy} onClick={() => { setStep(2); setError(''); }}>Sửa mã OTP</button>}
      </div>}
    </form>
  </Modal>;
}

export default function ForgotPasswordModal({ isOpen, onClose, initialEmpId = '', onSuccess }) {
  return isOpen ? <RecoveryForm onClose={onClose} initialEmpId={initialEmpId} onSuccess={onSuccess} /> : null;
}
