import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import bgImg from '../assets/gs25_cafe_bg_real.jpg';
import manager3d from '../assets/gs25_manager_hd.jpg';
import { isOpsManager } from '../lib/authSession';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { 
  LogIn,
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
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);

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
      const user = await login(empId.trim(), password || '1');
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
      color: ['#fbbf24', '#f59e0b', '#fde047', '#fff'][Math.floor(Math.random() * 4)]
    };
    setParticles(prev => [...prev.slice(-15), newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);
  }, []);

  return (
    <div 
      className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden select-none"
      onClick={handleBackgroundClick}
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 45%',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* ── Custom Animations ── */}
      <style>{`
        @keyframes shimmer-ray {
          0% { transform: translateX(-150%) skewX(-20deg); }
          50%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes steam-rise {
          0% { transform: translateY(0) scaleX(0.8); opacity: 0; }
          25% { opacity: 0.5; }
          65% { transform: translateY(-35px) scaleX(1.3); opacity: 0.35; }
          100% { transform: translateY(-70px) scaleX(1.8); opacity: 0; }
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

      {/* ── Animated Steam over the Coffee Cup on Table (Bottom Right) ── */}
      <div className="absolute bottom-[8%] right-[13%] pointer-events-none z-0 hidden sm:flex flex-col items-center">
        <div className="relative w-8 h-20">
          <div 
            className="absolute bottom-0 left-1 w-2.5 h-10 bg-white/40 blur-[3px] rounded-full"
            style={{ animation: 'steam-rise 3.2s ease-in-out infinite' }}
          />
          <div 
            className="absolute bottom-0 right-1 w-2.5 h-12 bg-white/30 blur-[4px] rounded-full"
            style={{ animation: 'steam-rise 4s ease-in-out infinite 1.2s' }}
          />
        </div>
      </div>

      {/* ── Warm Sparkles on Background Click ── */}
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

      {/* ── Main Container (Ultra-sharp, high-contrast, crisp edges & typography) ── */}
      <div 
        ref={containerRef}
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility'
        }}
        className="relative z-10 w-full max-w-[1040px] min-h-[580px] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_70px_-12px_rgba(15,23,42,0.38),0_0_0_1px_rgba(255,255,255,0.9),0_0_0_2px_rgba(15,23,42,0.08)] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-white border border-slate-200/90 transition-all"
      >
        
        {/* ── LEFT SHOWCASE PANEL (Ultra-sharp 3D Pixar Illustration & Clear Text) ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-8 xl:p-9 bg-gradient-to-b from-[#f0f7ff] via-[#f5faff] to-[#eaf4fd] border-r border-slate-200 overflow-hidden">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-12 -left-12 w-56 h-56 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-56 h-56 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Bar */}
          <div className="relative z-10 flex items-center justify-between pb-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-blue-700 text-[11px] font-black tracking-wider shadow-2xs border border-blue-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>GS25 PORTAL</span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-slate-800 font-mono text-[11px] font-bold shadow-2xs border border-slate-200">
                <Clock size={13} className="text-blue-600" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Center Stage: Ultra HD 3D Pixar Manager & Titles (Clear spacing, crisp borders) */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-2">
            
            {/* 3D Pixar Manager Illustration (Crystal Clear HD) */}
            <div className="relative w-full max-w-[340px] h-[195px] mb-4 rounded-2xl overflow-hidden shadow-sm border border-slate-200/90 bg-white group">
              <img 
                src={manager3d} 
                alt="GS25 Store Manager 3D" 
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>

            <h1 className="text-[25px] xl:text-[27px] font-[900] text-slate-900 tracking-tight leading-tight">
              Quản lý Cửa hàng Của Bạn
            </h1>
            <p className="text-[13px] text-blue-600 mt-1.5 font-bold tracking-tight">
              Đơn giản hóa công việc, kiến tạo thành công
            </p>

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-4">
              <span className="px-3.5 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5 hover:border-slate-300 transition-colors">
                <Zap size={13} className="text-amber-500 fill-amber-400" />
                <span>Dễ sử dụng</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5 hover:border-slate-300 transition-colors">
                <Shield size={13} className="text-emerald-500" />
                <span>An toàn</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5 hover:border-slate-300 transition-colors">
                <Sparkles size={13} className="text-purple-500" />
                <span>Hỗ trợ Thân thiện</span>
              </span>
            </div>
          </div>

          {/* Bottom Footer Status */}
          <div className="relative z-10 flex items-center justify-between text-xs pt-4 mt-auto font-medium border-t border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
              <span className="text-slate-800 text-[11.5px] font-bold">Hệ thống sẵn sàng</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center text-[7.5px] font-black text-slate-700">CB</span>
              <span>Phiên bản Cơ bản</span>
            </div>
          </div>

        </div>

        {/* ── RIGHT LOGIN FORM PANEL (Crisp, High-contrast Inputs & Button) ── */}
        <div className="bg-white p-8 sm:p-10 xl:p-12 flex flex-col justify-between relative">
          
          <div>
            {/* Header Greeting */}
            <div className="flex items-start justify-between mb-7">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-2xs shrink-0">
                  <Home size={24} className="text-amber-600" strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-[23px] sm:text-[25px] font-[900] text-slate-900 tracking-tight leading-snug">
                    Chào mừng bạn về nhà!
                  </h2>
                  <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                    Vui lòng đăng nhập để bắt đầu.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black whitespace-nowrap tracking-wider shadow-2xs">
                PORTAL 24/7
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-2xs">
                <ShieldAlert size={17} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* ── 2FA OTP Step ── */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-center">
                  <div className="w-11 h-11 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">Xác Thực Bảo Mật 2FA</p>
                  <p className="text-xs text-slate-500">Mã xác nhận đã gửi qua Telegram Admin.</p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-black tracking-[0.4em] border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 bg-white text-slate-900 outline-none shadow-2xs"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-slate-500 text-center font-medium">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  className="btn-shimmer-effect w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-sm tracking-wider shadow-[0_4px_16px_rgba(37,99,235,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
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
                  <label className="block text-[11.5px] font-[800] text-slate-700 uppercase tracking-wider mb-2">
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
                      className="block w-full pl-10 pr-4 py-3 sm:py-3.5 text-[14px] bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl outline-none font-semibold text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
                      placeholder="Nhập mã nhân viên (VD: admin hoặc 2511004004)"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11.5px] font-[800] text-slate-700 uppercase tracking-wider">
                      MẬT KHẨU
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <KeyRound size={18} strokeWidth={2.2} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 sm:py-3.5 text-[14px] bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 rounded-xl outline-none font-semibold text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
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
                        className="peer appearance-none w-[18px] h-[18px] border border-slate-300 hover:border-slate-400 rounded-md bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all shadow-2xs"
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                </div>

                {/* Submit Button with Animated Shimmer Light */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-shimmer-effect relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-sky-600 hover:from-blue-700 hover:via-blue-700 hover:to-sky-700 text-white font-black text-[14px] tracking-wider shadow-[0_4px_16px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.45)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all mt-6"
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
              <span>GS25 Workspace</span>
            </div>
          </div>

        </div>

      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmpId={empId}
        onUseDefaultPassword={() => setPassword('1')}
      />
    </div>
  );
}
