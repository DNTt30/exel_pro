import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserRound, Save, KeyRound } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getEmployeeProfiles, saveMyEmployeeProfile, changeMyRecoveryEmail } from '../../services/api';
import { normalizeRecoveryEmail } from '../../utils/recoveryEmail';
import { PROFILE_RULES, validateEmployeeProfile } from '../../utils/employeeProfile';
import Modal from '../../components/modals/Modal';

const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
export default function EmployeeProfile() {
  const id = useStore(s => s.user?.id);
  return id ? <ProfileForm key={id} employeeId={id} /> : null;
}
function ProfileForm({ employeeId }) {
  const [profile, setProfile] = useState(null), [form, setForm] = useState(null);
  const [email, setEmail] = useState(''), [pendingEmail, setPendingEmail] = useState(null), [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [emailError, setEmailError] = useState('');
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    getEmployeeProfiles(employeeId).then(rows => {
      if (!current) return;
      if (!rows[0]) throw new Error('Không tìm thấy hồ sơ nhân viên. Tài khoản admin dùng mục Đổi mật khẩu.');
      setProfile(rows[0]); setForm(rows[0]); setEmail(rows[0].recoveryEmail);
    }).catch(e => { if (current) setError(e.message || 'Không tải được hồ sơ.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [employeeId, reload]);
  const save = async event => {
    event.preventDefault(); if (busy) return;
    setError(''); setNotice('');
    const invalid = validateEmployeeProfile(form);
    if (invalid) { setError(invalid); return; }
    const epoch = useStore.getState()._sessionEpoch;
    setBusy(true);
    try { await saveMyEmployeeProfile(form, employeeId); if (alive.current && epoch === useStore.getState()._sessionEpoch) setNotice('Đã lưu thông tin cá nhân.'); }
    catch (e) { if (alive.current) setError(e.message || 'Không lưu được hồ sơ.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const openEmailConfirmation = event => {
    event.preventDefault(); setEmailError(''); setNotice('');
    try {
      const next = normalizeRecoveryEmail(email);
      if (!next) throw new Error('Vui lòng nhập email khôi phục.');
      if (next === profile.recoveryEmail) { setNotice('Email không thay đổi.'); return; }
      setPassword(''); setPendingEmail(next);
    } catch (e) { setEmailError(e.message); }
  };
  const confirmEmail = async event => {
    event.preventDefault(); if (busy) return;
    const epoch = useStore.getState()._sessionEpoch;
    setBusy(true); setEmailError('');
    try {
      const saved = await changeMyRecoveryEmail(pendingEmail, password, employeeId);
      if (!alive.current || epoch !== useStore.getState()._sessionEpoch) return;
      setProfile(previous => ({ ...previous, recoveryEmail: saved })); setEmail(saved);
      useStore.setState(state => ({ employees: state.employees.map(e => e.id === employeeId ? { ...e, recoveryEmail: saved } : e) }));
      setPendingEmail(null); setNotice('Đã cập nhật email khôi phục. Các OTP cũ đã mất hiệu lực.');
    } catch (e) { if (alive.current) setEmailError(e.message || 'Không đổi được email.'); }
    finally { if (alive.current) { setPassword(''); setBusy(false); } }
  };
  const closeConfirmation = () => { if (!busy) { setPendingEmail(null); setPassword(''); setEmailError(''); } };
  if (loading) return <p role="status" className="p-6 text-slate-500">Đang tải hồ sơ…</p>;
  if (!profile) return <div className="p-6"><p role="alert" className="text-rose-700">{error}</p><button className={`${buttonClass} mt-4`} onClick={() => setReload(x => x + 1)}>Thử lại</button></div>;
  return <div className="mx-auto w-full max-w-4xl space-y-5 p-4 pb-8 sm:p-6">
    <header><h1 className="text-2xl font-bold text-slate-900">Hồ sơ của tôi</h1><p className="mt-1 text-sm text-slate-500">Quản lý thông tin cá nhân và bảo mật tài khoản.</p></header>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><ShieldCheck className="text-blue-600" size={21} /> Bảo mật</h2>
      <form onSubmit={openEmailConfirmation} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Email khôi phục<input className={inputClass} type="email" autoComplete="email" maxLength={254} required value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
        <p className="text-xs text-slate-500">Dùng để nhận OTP khi quên mật khẩu. Thêm hoặc đổi email cần xác nhận mật khẩu hiện tại.</p>
        {emailError && !pendingEmail && <p role="alert" className="text-sm text-rose-700">{emailError}</p>}
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy} type="submit">Lưu email khôi phục</button><Link to="/employee/change-password" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"><KeyRound size={16} /> Đổi mật khẩu</Link></div>
      </form>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><UserRound size={21} className="text-blue-600" /> Thông tin cá nhân</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        {[['Họ và tên', profile.name], ['Mã nhân viên', profile.id], ['Vai trò', profile.jobTitle || profile.role || profile.type], ['Cửa hàng', profile.dept]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{value || '—'}</dd></div>)}
      </dl>
      <p className="my-4 text-xs text-slate-500">Các mục bên dưới không bắt buộc. Chỉ bạn và quản lý có quyền xem.</p>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Ngày sinh<input type="date" min="1900-01-01" className={inputClass} value={form.dob} disabled={busy} onChange={e => setForm({ ...form, dob: e.target.value })} /></label>
        {[['university', 'Trường học', 'Tên trường (nếu có)'], ['major', 'Ngành học', 'Ngành đang theo học'], ['workPlanUntil', 'Dự định làm đến', '12/2026 hoặc Đến khi ra trường']].map(([key, label, placeholder]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<input className={inputClass} type="text" maxLength={PROFILE_RULES.maxTextLength} placeholder={placeholder} value={form[key]} disabled={busy} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <p className="text-xs text-slate-500 sm:col-span-2">Nếu đã có tháng dự kiến, nhập MM/YYYY để quản lý chủ động chuẩn bị nhân sự. Đây là dự định, không phải đơn xin nghỉ.</p>
        {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><button type="submit" className={buttonClass} disabled={busy}><Save size={16} /> {busy ? 'Đang lưu…' : 'Lưu thông tin cá nhân'}</button></div>
      </form>
    </section>
    <Modal isOpen={pendingEmail !== null} title="Xác nhận đổi email" onClose={closeConfirmation} preventBackdropClose={busy} hideClose={busy}>
      <form onSubmit={confirmEmail} className="space-y-4" aria-label="Xác nhận đổi email">
        <p className="break-words text-sm text-slate-600">Email mới: <strong>{pendingEmail}</strong></p>
        <label className="block text-sm font-medium text-slate-700">Mật khẩu hiện tại<input autoFocus type="password" autoComplete="current-password" required maxLength={256} className={inputClass} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
        {emailError && <p role="alert" className="text-sm text-rose-700">{emailError}</p>}
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy} type="submit">{busy ? 'Đang xác nhận…' : 'Xác nhận đổi email'}</button><button type="button" onClick={closeConfirmation} disabled={busy} className="rounded-xl px-4 py-2 text-sm text-slate-600">Hủy</button></div>
      </form>
    </Modal>
  </div>;
}
