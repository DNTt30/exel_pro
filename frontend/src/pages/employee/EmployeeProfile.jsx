import { useEmployeeRoleName } from '../../hooks/useEmployeeRoleName';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserRound, Save, KeyRound, Mail } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getEmployeeProfiles, saveMyEmployeeProfile, changeMyRecoveryEmail } from '../../services/api';
import { normalizeRecoveryEmail } from '../../utils/recoveryEmail';
import { PROFILE_RULES, validateEmployeeProfile } from '../../utils/employeeProfile';
import Modal from '../../components/modals/Modal';

const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors';

export default function EmployeeProfile() {
  const id = useStore(s => s.user?.id);
  return id ? <ProfileForm key={id} employeeId={id} /> : null;
}

function ProfileForm({ employeeId }) {
  const roleName = useEmployeeRoleName({ id: employeeId });
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

  if (loading) return <p role="status" className="p-4 text-sm text-slate-500">Đang tải hồ sơ…</p>;
  if (!profile) return <div className="p-4"><p role="alert" className="text-sm text-rose-700">{error}</p><button className={`${buttonClass} mt-3`} onClick={() => setReload(x => x + 1)}>Thử lại</button></div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-2.5 sm:space-y-3.5 p-2.5 pb-6 sm:p-4">
      {/* ── Thẻ Định danh Cá nhân Gọn Gàng (Tối ưu Mobile 2x2) ── */}
      <header className="rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-base text-amber-200 shrink-0">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'NV'}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">Hồ sơ của tôi</h1>
              <p className="text-xs text-indigo-200/80 truncate">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
            </div>
          </div>
          <Link
            to="/employee/change-password"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white shrink-0 transition-colors"
          >
            <KeyRound size={14} className="text-amber-300" />
            <span>Đổi mật khẩu</span>
          </Link>
        </div>

        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Họ và tên', profile.name],
            ['Mã nhân viên', profile.id],
            ['Vai trò', roleName || profile.jobTitle || profile.role || profile.type],
            ['Cửa hàng', profile.dept]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/[0.08] border border-white/10 px-2.5 py-2 min-w-0">
              <dt className="text-[11px] text-indigo-200/75 truncate">{label}</dt>
              <dd className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </header>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}

      {/* ── Bố cục 2 Cột trên màn hình lớn / Xếp chồng khít trên Mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-start">
        {/* CỘT TRÁI (5/12): Bảo mật & Email khôi phục */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800">
            <ShieldCheck className="text-indigo-600 shrink-0" size={18} />
            <span>Bảo mật</span>
          </h2>
          <form onSubmit={openEmailConfirmation} className="mt-2.5 space-y-2.5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                <span>Email khôi phục</span>
              </span>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                placeholder="nhap-email@example.com"
                value={email}
                disabled={busy}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dùng để nhận OTP khi quên mật khẩu. Thêm hoặc đổi email cần xác nhận mật khẩu hiện tại.
            </p>
            {emailError && !pendingEmail && <p role="alert" className="text-xs font-medium text-rose-700">{emailError}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button className={buttonClass} disabled={busy} type="submit">
                Lưu email khôi phục
              </button>
              <Link
                to="/employee/change-password"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors"
              >
                <KeyRound size={14} />
                <span>Đổi mật khẩu</span>
              </Link>
            </div>
          </form>
        </section>

        {/* CỘT PHẢI (7/12): Thông tin cá nhân bổ sung (2 cột ngay trên Mobile cho các ô ngắn) */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800">
              <UserRound size={18} className="text-indigo-600 shrink-0" />
              <span>Thông tin cá nhân</span>
            </h2>
            <span className="text-[11px] text-slate-500">Không bắt buộc · Chỉ bạn và quản lý xem</span>
          </div>

          <form onSubmit={save} className="mt-2.5 grid grid-cols-2 gap-2.5 sm:gap-3">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">
              Ngày sinh
              <input
                type="date"
                min="1900-01-01"
                className={inputClass}
                value={form.dob}
                disabled={busy}
                onChange={e => setForm({ ...form, dob: e.target.value })}
              />
            </label>

            <label className="block text-xs sm:text-sm font-semibold text-slate-700">
              Dự định làm đến
              <input
                className={inputClass}
                type="text"
                maxLength={PROFILE_RULES.maxTextLength}
                placeholder="12/2026 hoặc Đến khi ra trường"
                value={form.workPlanUntil}
                disabled={busy}
                onChange={e => setForm({ ...form, workPlanUntil: e.target.value })}
              />
            </label>

            <label className="block text-xs sm:text-sm font-semibold text-slate-700 col-span-2 sm:col-span-1">
              Trường học
              <input
                className={inputClass}
                type="text"
                maxLength={PROFILE_RULES.maxTextLength}
                placeholder="Tên trường (nếu có)"
                value={form.university}
                disabled={busy}
                onChange={e => setForm({ ...form, university: e.target.value })}
              />
            </label>

            <label className="block text-xs sm:text-sm font-semibold text-slate-700 col-span-2 sm:col-span-1">
              Ngành học
              <input
                className={inputClass}
                type="text"
                maxLength={PROFILE_RULES.maxTextLength}
                placeholder="Ngành đang theo học"
                value={form.major}
                disabled={busy}
                onChange={e => setForm({ ...form, major: e.target.value })}
              />
            </label>

            <p className="text-[11px] text-slate-500 col-span-2 leading-relaxed">
              Nếu đã có tháng dự kiến, nhập MM/YYYY để quản lý chủ động chuẩn bị nhân sự. Đây là dự định, không phải đơn xin nghỉ.
            </p>
            {error && <p role="alert" className="text-xs font-medium text-rose-700 col-span-2">{error}</p>}
            <div className="col-span-2 pt-0.5">
              <button type="submit" className={buttonClass} disabled={busy}>
                <Save size={15} />
                <span>{busy ? 'Đang lưu…' : 'Lưu thông tin cá nhân'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      <Modal isOpen={pendingEmail !== null} title="Xác nhận đổi email" onClose={closeConfirmation} preventBackdropClose={busy} hideClose={busy}>
        <form onSubmit={confirmEmail} className="space-y-3.5" aria-label="Xác nhận đổi email">
          <p className="break-words text-sm text-slate-600">Email mới: <strong>{pendingEmail}</strong></p>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            Mật khẩu hiện tại
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              className={inputClass}
              value={password}
              disabled={busy}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          {emailError && <p role="alert" className="text-xs font-medium text-rose-700">{emailError}</p>}
          <div className="flex flex-wrap gap-2.5">
            <button className={buttonClass} disabled={busy} type="submit">{busy ? 'Đang xác nhận…' : 'Xác nhận đổi email'}</button>
            <button type="button" onClick={closeConfirmation} disabled={busy} className="rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-600 cursor-pointer">Hủy</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
