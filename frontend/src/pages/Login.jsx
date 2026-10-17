import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { signedInPath } from '../utils/authNavigation';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { useWorkspaceBranding } from '../hooks/useWorkspaceBranding';
import { 
  LogIn,
  CalendarDays,
  Eye,
  EyeOff,
  ShieldCheck,
  User, 
  KeyRound,
  Home, 
  Clock, 
  ShieldAlert,
  Zap,
  Shield,
  Sparkles
} from 'lucide-react';

export default function Login() {
  const branding = useWorkspaceBranding();
  const location = useLocation();
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(location.state?.authError || '');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);
  const passwordRef = useRef(null);
  const [recoveryNotice, setRecoveryNotice] = useState('');

  // ── 2FA OTP ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNote, setOtpNote] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const login = useStore(state => state.login);
  const navigate = useNavigate();

  // Đồng hồ thời gian thực
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // OTP Cooldown
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
    await handleLogin();
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!empId.trim()) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await login(empId.trim(), password, { rememberMe });
      navigate(signedInPath(user), { replace: true });
    } catch (err) {
      if (err.code === 'OTP_REQUIRED') {
        setOtpStep(true);
        setError('');
        sendOtp(false);
      } else {
        setError(err.message || 'Đăng nhập không thành công');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Click creates warm sparkles on background
  const handleBackgroundClick = useCallback((e) => {
    if (containerRef.current && containerRef.current.contains(e.target)) return;

    const newParticle = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
      color: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fef08a'][Math.floor(Math.random() * 5)]
    };
    setParticles(prev => [...prev.slice(-15), newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);
  }, []);

  return (
    <div 
      className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden select-none bg-[#070a13]"
      onClick={handleBackgroundClick}
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 45%),
          radial-gradient(circle at 85% 25%, rgba(168, 85, 247, 0.2) 0%, transparent 40%),
          radial-gradient(circle at 50% 85%, rgba(6, 182, 212, 0.16) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.14) 0%, transparent 40%),
          radial-gradient(ellipse 90% 70% at 50% -20%, rgba(129, 140, 248, 0.18) 0%, transparent 60%)
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* ── Cosmic Ambient Starfield & Nebula Glow ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
        <div className="absolute top-[8%] left-[12%] w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse shadow-[0_0_8px_#38bdf8]" />
        <div className="absolute top-[18%] left-[28%] w-1 h-1 bg-white rounded-full animate-ping shadow-[0_0_6px_#fff]" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[35%] left-[8%] w-1 h-1 bg-purple-300 rounded-full animate-pulse" />
        <div className="absolute top-[12%] right-[18%] w-1.5 h-1.5 bg-pink-300 rounded-full animate-pulse shadow-[0_0_8px_#f472b6]" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[28%] right-[32%] w-1 h-1 bg-cyan-200 rounded-full animate-pulse" />
        <div className="absolute top-[75%] left-[16%] w-1 h-1 bg-indigo-300 rounded-full animate-ping shadow-[0_0_6px_#818cf8]" style={{ animationDuration: '5s' }} />
        <div className="absolute top-[82%] right-[22%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDuration: '2.5s' }} />
        <div className="absolute top-[65%] right-[10%] w-1 h-1 bg-purple-200 rounded-full animate-pulse" />
        <div className="absolute top-[48%] right-[5%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
      </div>

      {/* ── Soft Floating Nebula Orbs (No Glare, Calming Cosmic Depth) ── */}
      <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[34rem] h-[34rem] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-cyan-600/10 rounded-full blur-[180px] pointer-events-none" />

      {/* ── Custom Animations ── */}
      <style>{`
        @keyframes shimmer-ray {
          0% { transform: translateX(-150%) skewX(-20deg); }
          50%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes orbit-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sparkle-burst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(2.2) rotate(120deg); opacity: 0; }
        }
        .btn-shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .btn-shimmer-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
          transform: translateX(-150%) skewX(-20deg);
          animation: shimmer-ray 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* ── Stardust Sparkles on Background Click ── */}
      {particles.map(p => (
        <div 
          key={p.id}
          className="fixed pointer-events-none rounded-full z-50"
          style={{
            left: p.x - 12,
            top: p.y - 12,
            width: 24,
            height: 24,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            animation: 'sparkle-burst 1s ease-out forwards'
          }}
        />
      ))}

      {/* ── Main Container (Cosmic Frosted Glass Container) ── */}
      <div 
        ref={containerRef}
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility'
        }}
        className="relative z-10 w-full max-w-[1040px] min-h-[580px] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.12)] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-slate-900/80 backdrop-blur-2xl border border-white/10 transition-all text-white"
      >
        
        {/* ── LEFT COSMIC ORBIT PANEL ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-8 xl:p-9 bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-purple-950/60 backdrop-blur-xl border-r border-white/10 overflow-hidden text-white">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Bar */}
          <div className="relative z-10 flex items-center justify-between pb-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-[11px] font-black tracking-wider shadow-2xs border border-white/15">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="max-w-[200px] truncate" title={branding.appName}>{branding.appName}</span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-slate-200 font-mono text-[11px] font-bold shadow-2xs border border-white/15">
                <Clock size={13} className="text-cyan-400" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Minh họa Cosmic Orbit Schedule Widget */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-2">
            
            <div aria-hidden="true" className="w-full max-w-[345px] mb-5 rounded-2xl shadow-[0_12px_40px_-10px_rgba(79,70,229,0.25)] border border-white/15 bg-white/[0.06] backdrop-blur-md p-5 text-left transition-all hover:bg-white/[0.09]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-cyan-300 shadow-2xs">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white leading-tight">Điều Phối Thời Gian</div>
                    <div className="text-[10px] font-medium text-slate-300">Tối ưu hóa nhịp ca làm</div>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">Cosmic Engine</span>
              </div>

              {/* Weekly Shift Cycle in Cosmic Colors */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 pb-1 border-b border-white/10">
                  <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span className="text-indigo-300">T7</span><span className="text-purple-300">CN</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  <div className="h-7 rounded-lg bg-indigo-500/25 border border-indigo-400/35 text-cyan-200 flex items-center justify-center text-[10px] font-black">6-14</div>
                  <div className="h-7 rounded-lg bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 flex items-center justify-center text-[10px] font-black">14-22</div>
                  <div className="h-7 rounded-lg bg-indigo-500/25 border border-indigo-400/35 text-cyan-200 flex items-center justify-center text-[10px] font-black">6-14</div>
                  <div className="h-7 rounded-lg bg-purple-500/25 border border-purple-400/35 text-purple-200 flex items-center justify-center text-[10px] font-black">22-6</div>
                  <div className="h-7 rounded-lg bg-indigo-500/25 border border-indigo-400/35 text-cyan-200 flex items-center justify-center text-[10px] font-black">6-14</div>
                  <div className="h-7 rounded-lg bg-pink-500/25 border border-pink-400/35 text-pink-200 flex items-center justify-center text-[10px] font-black">14-22</div>
                  <div className="h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center text-[9px] font-bold">OFF</div>
                </div>
                <div className="flex items-center justify-between pt-1.5 text-[10.5px]">
                  <span className="text-slate-400 font-medium">Chu kỳ vận hành tuần</span>
                  <span className="font-mono font-bold text-cyan-300">24/7 Linh hoạt</span>
                </div>
              </div>
            </div>

            <h1 className="text-[25px] xl:text-[27px] font-[900] text-white tracking-tight leading-tight">
              Quản Lý Ca Làm Thông Minh
            </h1>
            <p className="text-[13px] text-cyan-300 mt-1.5 font-bold tracking-tight">
              Tối ưu hóa thời gian, nâng tầm năng suất
            </p>

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-4">
              <span className="px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md shadow-2xs border border-white/15 text-[11.5px] font-bold text-slate-200 flex items-center gap-1.5 hover:border-cyan-400/40 transition-colors">
                <Zap size={13} className="text-amber-400 fill-amber-400" />
                <span>Nhanh chóng</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md shadow-2xs border border-white/15 text-[11.5px] font-bold text-slate-200 flex items-center gap-1.5 hover:border-emerald-400/40 transition-colors">
                <Shield size={13} className="text-emerald-400" />
                <span>Bảo mật</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md shadow-2xs border border-white/15 text-[11.5px] font-bold text-slate-200 flex items-center gap-1.5 hover:border-purple-400/40 transition-colors">
                <Sparkles size={13} className="text-purple-400" />
                <span>Trợ lý AI</span>
              </span>
            </div>
          </div>

          {/* Bottom Footer Status */}
          <div className="relative z-10 flex items-center justify-between text-xs pt-4 mt-auto font-medium border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
              <span className="text-slate-300 text-[11.5px] font-bold">Hệ thống sẵn sàng</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200 text-[11px] font-bold bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/15 shadow-2xs">
              <span className="w-4 h-4 border border-white/20 rounded flex items-center justify-center text-[7.5px] font-black text-cyan-300">v2</span>
              <span>Phiên bản Vũ trụ</span>
            </div>
          </div>

        </div>

        {/* ── RIGHT LOGIN FORM PANEL (Sleek Dark Glassmorphism) ── */}
        <div className="bg-slate-900/90 backdrop-blur-2xl p-8 sm:p-10 xl:p-12 flex flex-col justify-between relative text-white">
          
          <div>
            {/* Header Greeting */}
            <div className="flex flex-col items-start gap-3 mb-7">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shadow-2xs shrink-0 text-cyan-300">
                  <Sparkles size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-[23px] sm:text-[25px] font-[900] text-white tracking-tight leading-snug">
                    Chào mừng trở lại!
                  </h2>
                  <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                    Đăng nhập vào không gian làm việc của bạn.
                  </p>
                </div>
              </div>

              <span className="order-first max-w-full px-2.5 py-1 rounded-md bg-white/[0.08] border border-white/15 text-[10px] font-black tracking-wider shadow-2xs text-cyan-300">
                <span className="inline-flex max-w-[240px] items-center gap-1.5" title={branding.appName}>
                  {branding.logoDataUrl && <img src={branding.logoDataUrl} alt="" className="h-5 w-5 shrink-0 object-contain rounded" />}
                  <span className="truncate">{branding.appName}</span>
                </span>
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in duration-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={17} className="shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
                {error.includes('cấu hình') && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if ('caches' in window) {
                          const keys = await caches.keys();
                          await Promise.all(keys.map(k => caches.delete(k)));
                        }
                        if ('serviceWorker' in navigator) {
                          const regs = await navigator.serviceWorker.getRegistrations();
                          await Promise.all(regs.map(r => r.unregister()));
                        }
                      } catch {}
                      window.location.reload();
                    }}
                    className="shrink-0 px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-100 rounded-lg text-[11px] font-bold text-rose-800 cursor-pointer shadow-xs transition-colors"
                  >
                    Làm mới cache
                  </button>
                )}
              </div>
            )}

            {/* ── 2FA OTP Step ── */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-400/30 text-center">
                  <div className="w-11 h-11 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Xác Thực Bảo Mật 2FA</p>
                  <p className="text-xs text-slate-500">Mã xác nhận đã gửi qua Telegram Admin.</p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-black tracking-[0.4em] border-2 border-slate-700 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400 bg-slate-800 text-white outline-none shadow-2xs"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-slate-500 text-center font-medium">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  style={{ background: branding.primaryColor }}
                  className="btn-shimmer-effect w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {otpBusy ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  <span>{otpBusy ? 'Đang xác minh...' : 'XÁC NHẬN'}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => sendOtp(true)}
                    disabled={otpBusy || cooldown > 0}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ← Quay lại
                  </button>
                </div>
              </form>
            ) : (
              /* ── Standard Login Form (Razor-Sharp, High Contrast) ── */
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                
                {/* Employee ID */}
                <div>
                  <label className="block text-[11.5px] font-[800] text-slate-300 uppercase tracking-wider mb-2">
                    MÃ NHÂN VIÊN / TÀI KHOẢN
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <User size={18} strokeWidth={2.2} />
                    </div>
                    <input
                      type="text"
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 sm:py-3.5 text-[14px] bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 rounded-xl outline-none font-semibold text-white transition-all placeholder:text-slate-500 placeholder:font-normal shadow-2xs"
                      placeholder="Nhập mã nhân viên (VD: admin hoặc 2511004004)"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11.5px] font-[800] text-slate-300 uppercase tracking-wider">
                      MẬT KHẨU
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11.5px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <KeyRound size={18} strokeWidth={2.2} />
                    </div>
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 sm:py-3.5 text-[14px] bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 rounded-xl outline-none font-semibold text-white transition-all placeholder:text-slate-500 placeholder:font-normal shadow-2xs"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="peer appearance-none w-[18px] h-[18px] border border-slate-600 hover:border-slate-500 rounded-md bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer transition-all shadow-2xs"
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-300 group-hover:text-white transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                </div>

                {/* Submit Button with Animated Shimmer Light */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: branding.primaryColor }}
                  className="btn-shimmer-effect relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-black text-[14px] tracking-wider shadow-[0_4px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_24px_rgba(168,85,247,0.5)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all mt-6"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={17} strokeWidth={2.5} />
                      <span>ĐĂNG NHẬP</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

          {/* Footer Versions (Clean, crisp border, ample breathing room) */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between text-[11.5px] font-bold">
            <div className="flex items-center gap-1.5 text-slate-500">
              <KeyRound size={14} className="text-blue-600" />
              <span>v4.2.3</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
              </svg>
              <span className="max-w-[180px] truncate" title={branding.organizationName}>{branding.organizationName || 'Không gian làm việc'}</span>
            </div>
          </div>
          {branding.contactEmail && <a href={`mailto:${branding.contactEmail}`} className="mt-4 block text-center text-xs text-slate-600 break-all">Liên hệ hỗ trợ: {branding.contactEmail}</a>}

        </div>

      </div>

      {recoveryNotice && <div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{recoveryNotice}</div>}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmpId={empId}
        onSuccess={(id, warning) => {
          setEmpId(id); setPassword(''); setError(''); setOtpStep(false);
          setRecoveryNotice(warning || 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
          requestAnimationFrame(() => passwordRef.current?.focus());
        }}
      />
    </div>
  );
}
