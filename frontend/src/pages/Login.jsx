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
    <div className="lgx-root min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <style>{`
        .lgx-root { background:
          linear-gradient(160deg,#0b1220 0%,#111c33 50%,#0c1322 100%); }
        @keyframes lgx-drift { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(46px,-34px) scale(1.18);} 66%{transform:translate(-36px,28px) scale(.88);} }
        @keyframes lgx-rise { from{transform:translateY(108vh);opacity:0;} 12%{opacity:.8;} 88%{opacity:.55;} to{transform:translateY(-8vh);opacity:0;} }
        @keyframes lgx-in { from{opacity:0;transform:translateY(22px) scale(.97);} to{opacity:1;transform:none;} }
        @keyframes lgx-slide { from{opacity:0;transform:translateX(-16px);} to{opacity:1;transform:none;} }
        @keyframes lgx-spin { to{transform:rotate(360deg);} }
        @keyframes lgx-ring-pulse { 0%{box-shadow:0 0 0 0 rgba(96,165,250,.5);} 70%{box-shadow:0 0 0 18px rgba(96,165,250,0);} 100%{box-shadow:0 0 0 0 rgba(96,165,250,0);} }
        @keyframes lgx-bob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);} }
        @keyframes lgx-shine { 0%{left:-60%;} 60%,100%{left:130%;} }
        @keyframes lgx-ring-rot { to{transform:rotate(360deg);} }
        .lgx-blob { position:absolute; border-radius:9999px; filter:blur(70px); pointer-events:none; animation:lgx-drift 13s ease-in-out infinite; }
        .lgx-dot { position:absolute; bottom:-14px; border-radius:9999px; background:rgba(147,197,253,.7); animation:lgx-rise linear infinite; pointer-events:none; box-shadow:0 0 8px rgba(147,197,253,.8); }
        .lgx-card { animation:lgx-in .6s cubic-bezier(.22,1,.36,1) both; }
        .lgx-item { animation:lgx-slide .5s cubic-bezier(.22,1,.36,1) both; }
        .lgx-logo-wrap { position:relative; width:60px; height:60px; margin:0 auto 12px; }
        .lgx-logo-ring { position:absolute; inset:-7px; border-radius:20px; background:conic-gradient(from 0deg,#3b82f6,#8b5cf6,#ec4899,#f59e0b,#3b82f6); animation:lgx-ring-rot 4s linear infinite; filter:blur(7px); opacity:.85; }
        .lgx-logo { position:relative; width:60px; height:60px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff;
                    background:linear-gradient(135deg,#2563eb,#4f46e5); box-shadow:0 10px 26px -6px rgba(37,99,235,.55); animation:lgx-ring-pulse 2.4s ease-out infinite; }
        .lgx-logo > svg { animation:lgx-bob 3s ease-in-out infinite; }
        .lgx-btn { position:relative; overflow:hidden; background:linear-gradient(90deg,#2563eb,#4f46e5,#7c3aed); background-size:200% 100%; transition:all .25s; }
        .lgx-btn:hover:not(:disabled){ background-position:100% 0; transform:translateY(-1px); box-shadow:0 12px 24px -8px rgba(79,70,229,.55); }
        .lgx-btn::after { content:''; position:absolute; top:0; bottom:0; width:40%; left:-60%; background:linear-gradient(105deg,transparent,rgba(255,255,255,.35),transparent); transform:skewX(-18deg); }
        .lgx-btn:hover:not(:disabled)::after { animation:lgx-shine .9s ease; }
        .lgx-field:focus-within { transform:translateY(-2px); transition:transform .2s; }
        .lgx-field input { transition:border-color .2s, box-shadow .2s; }
        @media (prefers-reduced-motion: reduce){ .lgx-blob,.lgx-dot,.lgx-logo-ring,.lgx-logo,.lgx-logo>svg{animation:none !important;} }
      `}</style>

      {/* Sương màu trôi */}
      <div className="lgx-blob" style={{ top:'-10%', left:'-8%', width:360, height:360, background:'rgba(59,130,246,.30)', animationDelay:'0s' }} />
      <div className="lgx-blob" style={{ bottom:'-12%', right:'-10%', width:400, height:400, background:'rgba(139,92,246,.26)', animationDelay:'-4s' }} />
      <div className="lgx-blob" style={{ top:'38%', left:'58%', width:280, height:280, background:'rgba(236,72,153,.18)', animationDelay:'-8s' }} />
      {/* Hạt sáng bay */}
      {[...Array(11)].map((_, i) => (
        <span key={i} className="lgx-dot" style={{ left:(i*9+3)+'%', width:i%3===0?8:5, height:i%3===0?8:5, animationDuration:(6+(i%4)*2.4)+'s', animationDelay:-(i*1.4)+'s' }} />
      ))}

      <div className="lgx-card w-full max-w-sm bg-white/[.97] backdrop-blur rounded-2xl shadow-[0_24px_70px_-16px_rgba(0,0,0,.65)] border border-white/40 p-7 sm:p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="lgx-logo-wrap">
            <div className="lgx-logo-ring" />
            <div className="lgx-logo"><Building2 size={26} /></div>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight lgx-item" style={{ animationDelay:'.1s' }}>OFC Schedule</h1>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold lgx-item" style={{ animation:'lgx-slide .35s ease both' }}>
            ⚠️ {error}
          </div>
        )}

        {otpStep ? (
          <form onSubmit={submitOtp} className="space-y-3.5">
            <p className="text-xs text-slate-500 leading-relaxed lgx-item" style={{ animationDelay:'.05s' }}>
              Mã 6 số đã gửi qua Telegram admin · hiệu lực 5 phút.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="block w-full px-3 py-3 text-center text-xl font-black tracking-[0.4em] border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none lgx-item"
              style={{ animationDelay:'.1s' }}
              placeholder="······"
              autoFocus
              required
            />
            {otpNote && <div className="text-xs text-slate-400">{otpNote}</div>}
            <button type="submit" disabled={otpBusy || otpCode.length !== 6}
              className="lgx-btn w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 lgx-item"
              style={{ animationDelay:'.15s' }}>
              {otpBusy ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation:'lgx-spin .7s linear infinite' }} />) : <LogIn size={16} />}
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
          <div className="lgx-field lgx-item" style={{ animationDelay:'.08s' }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tài khoản</label>
            <input type="text" value={empId} onChange={e => setEmpId(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
              placeholder="Mã NV / admin" required />
          </div>

          <div className="lgx-field lgx-item" style={{ animationDelay:'.16s' }}>
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
            style={{ animationDelay:'.24s' }}>
            {submitting ? (<span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation:'lgx-spin .7s linear infinite' }} />) : <LogIn size={16} />}
            {submitting ? 'Đang vào...' : 'Đăng nhập'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}