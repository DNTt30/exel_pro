import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { isOpsManager } from '../lib/authSession';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import { LogIn, Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Bước 2FA: nhập mã OTP gửi qua Telegram của admin ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNote, setOtpNote] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const login = useStore(state => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (isResend) => {
    setOtpBusy(true);
    setOtpNote('');
    const r = await requestAdminOtp();
    setOtpBusy(false);
    if (!r.ok) {
      setOtpNote(r.reason === 'cooldown'
        ? 'Mã trước vẫn còn hiệu lực — hãy kiểm tra Telegram.'
        : 'Không gửi được mã. Kiểm tra cấu hình 2FA rồi thử "Gửi lại mã".');
      return;
    }
    setCooldown(60);
    if (isResend) setOtpNote('Đã gửi lại mã — kiểm tra Telegram của admin.');
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (otpBusy) return;
    setOtpBusy(true);
    setError('');
    const r = await verifyAdminOtp(otpCode);
    if (!r.ok) {
      setOtpBusy(false);
      setError(r.reason === 'wrong' ? 'Mã không đúng — thử lại.'
        : r.reason === 'expired' ? 'Mã hết hạn hoặc sai quá 5 lần — gửi lại mã mới.'
        : 'Xác minh lỗi, thử lại.');
      return;
    }
    setOtpBusy(false);
    await handleLogin(); // thiết bị đã tin tưởng → vào thẳng
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(empId, password);
      if (isOpsManager(user)) {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/home');
      }
    } catch (err) {
      if (err.code === 'OTP_REQUIRED') {
        setOtpStep(true);
        setError('');
        sendOtp(false);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="lgx-root min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <style>{`
        .lgx-root { background:
          radial-gradient(900px 600px at 15% 20%, #1d4ed81f, transparent 55%),
          radial-gradient(800px 600px at 85% 85%, #6d28d91a, transparent 55%),
          linear-gradient(160deg, #0b1220 0%, #101a2e 55%, #0c1322 100%); }
        @keyframes lgx-glow { 0%,100% { opacity:.5; transform:translate(0,0); } 50% { opacity:.75; transform:translate(-24px,18px); } }
        @keyframes lgx-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .lgx-halo { position:absolute; width:520px; height:520px; border-radius:9999px;
                    background:radial-gradient(circle,#3b82f62e,transparent 65%);
                    filter:blur(40px); animation: lgx-glow 18s ease-in-out infinite; pointer-events:none; }
        .lgx-card { animation: lgx-in .5s ease-out both; }
        .lgx-item { animation: lgx-in .45s ease-out both; }
        .lgx-logo { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#fff; margin:0 auto 14px;
                    background:linear-gradient(135deg,#2563eb,#4f46e5); box-shadow:0 8px 20px -6px rgba(37,99,235,.45); }
        .lgx-btn { background:#2563eb; transition:background .2s, transform .15s, box-shadow .2s; }
        .lgx-btn:hover:not(:disabled) { background:#1d4ed8; box-shadow:0 8px 18px -8px rgba(37,99,235,.5); }
        .lgx-btn:active:not(:disabled) { transform:scale(.985); }
        .lgx-shake { animation: lgx-in .3s ease; }
        @keyframes lgx-spin { to { transform:rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .lgx-halo,.lgx-card,.lgx-item{animation:none !important;} }
      `}</style>

      <div className="lgx-halo" style={{ top: '8%', left: '12%' }} />
      <div className="lgx-halo" style={{ bottom: '-12%', right: '6%', animationDelay: '-9s' }} />

      <div className="lgx-card w-full max-w-sm bg-white/[.97] backdrop-blur rounded-2xl shadow-[0_24px_60px_-16px_rgba(0,0,0,.55)] border border-white/40 p-7 sm:p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="lgx-logo"><Building2 size={24} /></div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">OFC Schedule</h1>
        </div>

        {error && (
          <div className="lgx-shake mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">⚠️ {error}</div>
        )}

        {otpStep ? (
          <form onSubmit={submitOtp} className="space-y-3.5">
            <p className="text-xs text-slate-500 leading-relaxed lgx-item" style={{ animationDelay: '.05s' }}>
              Mã 6 số đã gửi qua Telegram admin · hiệu lực 5 phút.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="block w-full px-3 py-3 text-center text-xl font-black tracking-[0.4em] border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none lgx-item"
              style={{ animationDelay: '.1s' }}
              placeholder="······"
              autoFocus
              required
            />
            {otpNote && <div className="text-xs text-slate-400">{otpNote}</div>}
            <button type="submit" disabled={otpBusy || otpCode.length !== 6}
              className="lgx-btn w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 lgx-item"
              style={{ animationDelay: '.15s' }}>
              {otpBusy ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation: 'lgx-spin .7s linear infinite' }} />) : <LogIn size={16} />}
              {otpBusy ? 'Đang xác minh...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={() => sendOtp(true)} disabled={otpBusy || cooldown > 0}
              className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300 transition-colors cursor-pointer">
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : otpBusy ? 'Đang gửi...' : 'Gửi lại mã'}
            </button>
            <button type="button" onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              ← Quay lại
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="lgx-item" style={{ animationDelay: '.06s' }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tài khoản</label>
            <input type="text" value={empId} onChange={e => setEmpId(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
              placeholder="Mã NV / admin" required />
          </div>

          <div className="lgx-item" style={{ animationDelay: '.12s' }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="block w-full pr-10 pl-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
                placeholder="••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="lgx-btn w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 lgx-item"
            style={{ animationDelay: '.18s' }}>
            {submitting ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation: 'lgx-spin .7s linear infinite' }} />) : <LogIn size={16} />}
            {submitting ? 'Đang vào...' : 'Đăng nhập'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}