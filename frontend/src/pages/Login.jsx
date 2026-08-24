import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import storeImg from '../assets/store1.jpg';
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
    <div className="lgx-root min-h-screen flex items-stretch justify-center px-0 sm:px-6 py-0 sm:py-8 relative overflow-hidden">
      <style>{`
        .lgx-root { background:
          radial-gradient(700px 500px at 80% 15%, #1d4ed833, transparent 60%),
          radial-gradient(600px 500px at 15% 85%, #6d28d92b, transparent 60%),
          linear-gradient(160deg,#0b1220,#111c33 55%,#0c1322); }
        @keyframes lgx-drift { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-40px,30px) scale(1.12);} }
        @keyframes lgx-rise { from{transform:translateY(108vh);opacity:0;} 12%{opacity:.75;} 88%{opacity:.5;} to{transform:translateY(-8vh);opacity:0;} }
        @keyframes lgx-in { from{opacity:0;transform:translateY(18px);} to{opacity:1;transform:none;} }
        @keyframes lgx-slide { from{opacity:0;transform:translateX(-14px);} to{opacity:1;transform:none;} }
        @keyframes lgx-spin { to{transform:rotate(360deg);} }
        @keyframes lgx-slowzoom { from{transform:scale(1);} to{transform:scale(1.08);} }
        .lgx-blob{ position:absolute; border-radius:9999px; filter:blur(60px); pointer-events:none; animation:lgx-drift 16s ease-in-out infinite; }
        .lgx-dot{ position:absolute; bottom:-14px; border-radius:9999px; background:rgba(147,197,253,.65); animation:lgx-rise linear infinite; pointer-events:none; box-shadow:0 0 8px rgba(147,197,253,.7); }
        .lgx-card{ animation:lgx-in .55s cubic-bezier(.22,1,.36,1) both; }
        .lgx-item{ animation:lgx-slide .5s cubic-bezier(.22,1,.36,1) both; }
        .lgx-photo{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; animation:lgx-slowzoom 26s ease-in-out infinite alternate; }
        .lgx-btn{ position:relative; overflow:hidden; background:linear-gradient(90deg,#2563eb,#4f46e5); transition:all .25s; }
        .lgx-btn:hover:not(:disabled){ transform:translateY(-1px); box-shadow:0 10px 20px -8px rgba(37,99,235,.5); }
        .lgx-btn::after{ content:''; position:absolute; top:0; bottom:0; width:40%; left:-60%; background:linear-gradient(105deg,transparent,rgba(255,255,255,.3),transparent); transform:skewX(-18deg); }
        .lgx-btn:hover:not(:disabled)::after{ animation:lgx-slide-x .9s ease; }
        @keyframes lgx-slide-x { 0%{left:-60%;} 60%,100%{left:130%;} }
        @media (prefers-reduced-motion: reduce){ .lgx-blob,.lgx-dot,.lgx-photo{animation:none !important;} }
      `}</style>

      {/* Nền động (mobile + viền desktop): đốm màu trôi & hạt bay */}
      <div className="lgx-blob" style={{ top:'-12%', left:'-10%', width:380, height:380, background:'rgba(37,99,235,.35)', animationDelay:'0s' }} />
      <div className="lgx-blob" style={{ bottom:'-14%', right:'-12%', width:420, height:420, background:'rgba(124,58,237,.28)', animationDelay:'-6s' }} />
      {[...Array(8)].map((_, i) => (
        <span key={i} className="lgx-dot hidden sm:block" style={{ left:(i*12+5)+'%', width:i%3===0?8:5, height:i%3===0?8:5, animationDuration:(6+(i%4)*2.4)+'s', animationDelay:-(i*1.5)+'s' }} />
      ))}

      <div className="relative z-10 m-auto w-full max-w-4xl min-h-[560px] lg:min-h-[600px] rounded-none sm:rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] lgx-card">

        {/* ── PANEL ẢNH (desktop) ── */}
        <div className="relative hidden lg:block">
          <img src={storeImg} alt="Cửa hàng" className="lgx-photo" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/25 to-indigo-950/40" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Building2 size={20} />
              <span className="text-sm font-black tracking-wide">OFC SCHEDULE</span>
            </div>
            <p className="text-xl font-black leading-snug max-w-xs">Quản lý lịch làm việc<br />toàn chuỗi cửa hàng</p>
            <p className="text-xs text-white/70 mt-2">Lịch ca · Chấm công · Đổi ca · Bù công C&B</p>
          </div>
        </div>

        {/* ── PANEL FORM ── */}
        <div className="bg-white/[.97] backdrop-blur p-7 sm:p-9 flex flex-col justify-center">
          {/* Logo nhỏ cho mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-5 lgx-item">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <Building2 size={18} />
            </div>
            <span className="text-base font-black text-slate-800 tracking-tight">OFC Schedule</span>
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
            <div className="lgx-item" style={{ animationDelay:'.08s' }}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tài khoản (Mã NV)</label>
              <input type="text" value={empId} onChange={e => setEmpId(e.target.value)}
                className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
                placeholder="VD: 260716009" required />
            </div>

            <div className="lgx-item" style={{ animationDelay:'.16s' }}>
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
    </div>
  );
}