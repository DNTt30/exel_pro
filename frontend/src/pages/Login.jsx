import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { signedInPath } from '../utils/authNavigation';
import { requestAdminOtp, verifyAdminOtp } from '../lib/adminOtp';
import { getRememberedEmpId, setRememberedEmpId, remembersSession } from '../lib/sessionStorage';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { useWorkspaceBranding } from '../hooks/useWorkspaceBranding';
import {
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  KeyRound,
  Clock,
  ShieldAlert,
  Sparkles,
  CalendarCheck2,
  RefreshCw,
  LockKeyhole,
  X
} from 'lucide-react';

export default function Login() {
  const branding = useWorkspaceBranding();
  const location = useLocation();
  const navigate = useNavigate();

  const user = useStore(state => state.user);
  const login = useStore(state => state.login);

  const [savedEmpId, setSavedEmpId] = useState(() => getRememberedEmpId());
  const [empId, setEmpId] = useState(() => getRememberedEmpId());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => remembersSession());
  const [error, setError] = useState(location.state?.authError || '');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');

  const empInputRef = useRef(null);
  const passwordRef = useRef(null);

  // ── 2FA OTP ──
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNote, setOtpNote] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Tự động chuyển thẳng vào ứng dụng nếu người dùng đã có phiên đăng nhập hợp lệ
  useEffect(() => {
    if (user && !user.isPasswordExpired && !otpStep && !submitting) {
      navigate(signedInPath(user), { replace: true });
    }
  }, [user, otpStep, submitting, navigate]);

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
    const cleanId = empId.trim();
    if (!cleanId) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(cleanId, password, { rememberMe });
      if (rememberMe) {
        setRememberedEmpId(cleanId);
        setSavedEmpId(cleanId);
      } else {
        setRememberedEmpId('');
        setSavedEmpId('');
      }
      navigate(signedInPath(loggedInUser), { replace: true });
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

  const handleClearRememberedId = () => {
    setRememberedEmpId('');
    setSavedEmpId('');
    setEmpId('');
    setPassword('');
    setError('');
    requestAnimationFrame(() => empInputRef.current?.focus());
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden bg-[#120d24] text-slate-100"
      style={{
        backgroundImage: `
          radial-gradient(circle at 18% 18%, rgba(99, 102, 241, 0.22) 0%, transparent 45%),
          radial-gradient(circle at 82% 28%, rgba(236, 72, 153, 0.16) 0%, transparent 48%),
          radial-gradient(circle at 50% 92%, rgba(251, 146, 60, 0.14) 0%, transparent 52%),
          linear-gradient(180deg, #0f0c20 0%, #1a1233 55%, #26173e 100%)
        `
      }}
    >
      {/* Quầng sáng Lo-Fi dịu mắt phía sau */}
      <div className="pointer-events-none absolute -top-36 -left-36 w-[28rem] h-[28rem] rounded-full bg-indigo-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 w-[30rem] h-[30rem] rounded-full bg-rose-500/15 blur-[140px]" />

      {/* ── Khung chính (Twilight Horizon Card) ── */}
      <div
        className="relative z-10 w-full max-w-[1000px] rounded-3xl overflow-hidden shadow-[0_28px_80px_-15px_rgba(8,5,20,0.85)] grid grid-cols-1 lg:grid-cols-[1.08fr_1fr] bg-[#18122B]/90 backdrop-blur-xl border border-purple-200/15"
      >
        {/* ── BANNER MINH HỌA TRÊN ĐIỆN THOẠI (Mobile Twilight Art) ── */}
        <div className="relative lg:hidden h-36 w-full overflow-hidden flex flex-col justify-between p-4 border-b border-purple-200/10"
          style={{
            background: 'linear-gradient(180deg, #161130 0%, #2c1b4d 52%, #58285f 82%, #833864 100%)'
          }}
        >
          {/* Tranh SVG phong cảnh núi & trăng khuyết trên Mobile */}
          <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="mobMoonGlow" cx="78%" cy="32%" r="35%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.45" />
                <stop offset="55%" stopColor="#f472b6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2c1b4d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="600" height="180" fill="url(#mobMoonGlow)" />
            {/* Các ngôi sao nhỏ */}
            <circle cx="75" cy="34" r="1.5" fill="#fef3c7" opacity="0.8" />
            <circle cx="160" cy="24" r="1.2" fill="#e0e7ff" opacity="0.6" />
            <circle cx="280" cy="40" r="1.6" fill="#fbcfe8" opacity="0.7" />
            <circle cx="365" cy="22" r="1.3" fill="#fef3c7" opacity="0.75" />
            <circle cx="535" cy="35" r="1.4" fill="#e0e7ff" opacity="0.7" />
            {/* Mặt trăng khuyết Lo-Fi */}
            <path d="M465 26 A20 20 0 1 0 486 54 A16 16 0 1 1 465 26 Z" fill="#fef08a" opacity="0.92" />
            {/* Dãy núi xa */}
            <path d="M0 142 L95 96 L195 130 L310 86 L430 128 L525 94 L600 124 L600 180 L0 180 Z" fill="#2d1948" opacity="0.82" />
            {/* Dãy núi gần */}
            <path d="M0 156 L130 116 L245 148 L385 108 L495 144 L600 118 L600 180 L0 180 Z" fill="#18122B" />
          </svg>

          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#140e26]/70 backdrop-blur-md border border-purple-200/15 text-amber-200 text-xs font-semibold">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="" className="h-4 w-4 shrink-0 object-contain rounded" />
              ) : (
                <Sparkles size={12} className="text-amber-300" />
              )}
              <span className="truncate max-w-[180px]">{branding.appName}</span>
            </div>
            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#140e26]/70 backdrop-blur-md border border-purple-200/15 text-purple-100 font-mono text-[11px]">
                <Clock size={11} className="text-pink-300" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          <div className="relative z-10">
            <p className="text-xs font-semibold text-pink-200/90 tracking-wide">Không gian làm việc & Điều phối lịch</p>
          </div>
        </div>

        {/* ── CỘT TRÁI (DESKTOP): TRANH PHONG CẢNH TWILIGHT HORIZON LO-FI ── */}
        <div
          className="relative hidden lg:flex flex-col justify-between p-9 border-r border-purple-200/10 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #130f29 0%, #241744 45%, #4c2259 78%, #7a3160 100%)'
          }}
        >
          {/* Tranh nền SVG Chân trời Chạng vạng (Twilight Horizon Artwork) */}
          <svg
            viewBox="0 0 520 640"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full"
          >
            <defs>
              {/* Quầng sáng chân trời hoàng hôn ấm */}
              <radialGradient id="horizonGlow" cx="50%" cy="62%" r="55%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
                <stop offset="45%" stopColor="#f472b6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#1e163b" stopOpacity="0" />
              </radialGradient>
              {/* Mặt trời / Mặt trăng chiều tà */}
              <linearGradient id="twilightSun" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#fb923c" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.78" />
              </linearGradient>
              {/* Sương mù chân trời */}
              <linearGradient id="mistLayer" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
                <stop offset="100%" stopColor="#161029" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Ánh sáng hoàng hôn tỏa nhẹ */}
            <rect width="520" height="640" fill="url(#horizonGlow)" />

            {/* Các ngôi sao & chòm sao trên đỉnh trời */}
            <circle cx="68" cy="78" r="1.6" fill="#fef3c7" opacity="0.85" />
            <circle cx="142" cy="52" r="1.2" fill="#e0e7ff" opacity="0.65" />
            <circle cx="220" cy="92" r="1.8" fill="#fbcfe8" opacity="0.75" />
            <circle cx="310" cy="60" r="1.3" fill="#fef3c7" opacity="0.8" />
            <circle cx="415" cy="84" r="1.7" fill="#e0e7ff" opacity="0.7" />
            <circle cx="462" cy="48" r="1.2" fill="#fde68a" opacity="0.75" />
            <circle cx="95" cy="148" r="1.3" fill="#fbcfe8" opacity="0.6" />
            <circle cx="370" cy="138" r="1.4" fill="#fef3c7" opacity="0.65" />

            {/* Đường sao băng mảnh */}
            <line x1="350" y1="74" x2="398" y2="96" stroke="#fde68a" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />

            {/* Vòng quỹ đạo thời gian mảnh quanh mặt trăng/mặt trời */}
            <circle cx="260" cy="245" r="88" fill="none" stroke="#fbcfe8" strokeWidth="0.9" strokeDasharray="4 7" opacity="0.35" />
            <ellipse cx="260" cy="245" rx="118" ry="38" fill="none" stroke="#fde68a" strokeWidth="1" opacity="0.28" transform="rotate(-14 260 245)" />

            {/* Mặt trời lặn / Trăng tròn ấm áp nơi chân trời */}
            <circle cx="260" cy="245" r="46" fill="url(#twilightSun)" />

            {/* Mây chiều Lo-Fi mỏng */}
            <path d="M70 225 Q95 215 120 223 Q145 212 170 225 Z" fill="#fbcfe8" opacity="0.18" />
            <path d="M335 198 Q365 186 395 196 Q420 188 445 198 Z" fill="#fde68a" opacity="0.16" />

            {/* Lớp núi thứ 1 (Xa nhất - Tím sương mù) */}
            <path d="M0 370 L85 302 L175 348 L275 278 L380 342 L455 296 L520 335 L520 640 L0 640 Z" fill="#371c4b" opacity="0.78" />

            {/* Lớp núi thứ 2 (Trung cảnh - Tím chàm đậm) */}
            <path d="M0 408 L65 362 L158 398 L242 332 L345 392 L432 344 L520 388 L520 640 L0 640 Z" fill="#231438" opacity="0.92" />

            {/* Lớp đồi thông & chân trời gần nhất */}
            <path d="M0 446 L112 396 L218 434 L318 386 L422 430 L520 398 L520 640 L0 640 Z" fill="#150e26" />

            {/* Phản chiếu ánh trăng trên mặt hồ yên ả */}
            <rect x="0" y="446" width="520" height="194" fill="url(#mistLayer)" />
            <line x1="225" y1="452" x2="295" y2="452" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
            <line x1="236" y1="462" x2="284" y2="462" stroke="#fbcfe8" strokeWidth="1.2" strokeLinecap="round" opacity="0.28" />
            <line x1="246" y1="471" x2="274" y2="471" stroke="#fde68a" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
          </svg>

          {/* Thanh trạng thái trên cùng */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#150f28]/70 backdrop-blur-md border border-purple-200/15 text-amber-200 text-xs font-semibold shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="max-w-[200px] truncate" title={branding.appName}>{branding.appName}</span>
            </div>

            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#150f28]/70 backdrop-blur-md border border-purple-200/15 text-purple-100 font-mono text-xs font-medium">
                <Clock size={13} className="text-pink-300" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>

          {/* Nội dung giới thiệu đặt trên nền phong cảnh chiều tà */}
          <div className="relative z-10 mt-auto pt-36">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-300/25 text-pink-200 text-[11px] font-semibold mb-3">
              <Sparkles size={12} className="text-amber-300" />
              <span>Nhịp nhàng · Trực quan · Dịu mắt</span>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
              Không Gian Điều Phối Ca Làm
            </h1>
            <p className="text-sm text-purple-100/80 mt-2 max-w-sm leading-relaxed">
              Quản lý lịch làm việc, đối soát chấm công và tra cứu công thức mượt mà kể cả khi ngoại tuyến.
            </p>

            {/* 3 Thẻ tính năng kính mờ ấm áp */}
            <div className="w-full mt-6 grid grid-cols-3 gap-2.5 text-left">
              <div className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-purple-200/15">
                <CalendarCheck2 size={16} className="text-amber-300 mb-1.5" />
                <div className="text-xs font-bold text-white">Lịch & Công</div>
                <div className="text-[11px] text-purple-200/75 mt-0.5">Xem cả khi mất mạng</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-purple-200/15">
                <RefreshCw size={16} className="text-pink-300 mb-1.5" />
                <div className="text-xs font-bold text-white">Ghi nhớ phiên</div>
                <div className="text-[11px] text-purple-200/75 mt-0.5">Mở app vào thẳng</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-purple-200/15">
                <LockKeyhole size={16} className="text-indigo-300 mb-1.5" />
                <div className="text-xs font-bold text-white">Bảo mật 2 lớp</div>
                <div className="text-[11px] text-purple-200/75 mt-0.5">An toàn tài khoản</div>
              </div>
            </div>
          </div>

          {/* Chân trang cột trái */}
          <div className="relative z-10 flex items-center justify-between text-xs pt-5 mt-5 border-t border-purple-200/10 text-purple-200/70">
            <span className="font-medium">Sẵn sàng đồng bộ đám mây</span>
            <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-purple-200/15 text-purple-100 font-semibold">
              Workspace v4.4
            </span>
          </div>
        </div>

        {/* ── CỘT PHẢI: BIỂU MẪU ĐĂNG NHẬP ── */}
        <div className="p-6 sm:p-10 flex flex-col justify-between bg-[#18122B]/95">
          <div>
            {/* Tiêu đề & nhận diện đơn vị */}
            <div className="mb-6">
              <div className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-300/20 text-amber-200 text-xs font-semibold mb-4 max-w-full">
                {branding.logoDataUrl ? (
                  <img src={branding.logoDataUrl} alt="" className="h-4 w-4 shrink-0 object-contain rounded" />
                ) : (
                  <Sparkles size={13} className="shrink-0 text-amber-300" />
                )}
                <span className="truncate max-w-[240px]" title={branding.appName}>{branding.appName}</span>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                Chào mừng trở lại
              </h2>
              <p className="text-sm text-purple-200/70 mt-1">
                Nhập mã nhân viên và mật khẩu để vào không gian làm việc của bạn.
              </p>
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <div
                role="alert"
                data-testid="login-error"
                className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-400/40 text-rose-100 text-xs font-medium flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={17} className="shrink-0 text-rose-400" />
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
                    className="shrink-0 px-2.5 py-1 bg-rose-900/80 border border-rose-400/40 hover:bg-rose-800 rounded-lg text-[11px] font-semibold text-rose-100 cursor-pointer transition-colors"
                  >
                    Làm mới cache
                  </button>
                )}
              </div>
            )}

            {/* ── Bước xác thực 2FA OTP ── */}
            {otpStep ? (
              <form onSubmit={submitOtp} className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#221a3a]/80 border border-purple-300/20 text-center">
                  <div className="w-11 h-11 mx-auto rounded-xl bg-amber-400/15 border border-amber-300/30 text-amber-200 flex items-center justify-center mb-2">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Xác Thực Bảo Mật 2FA</p>
                  <p className="text-xs text-purple-200/75">Mã xác nhận gồm 6 chữ số đã gửi qua Telegram Admin.</p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] border border-purple-300/25 rounded-xl focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400 bg-[#120d22] text-white outline-none"
                    placeholder="······"
                    autoFocus
                    required
                  />
                </div>

                {otpNote && <div className="text-xs text-purple-200/75 text-center">{otpNote}</div>}

                <button
                  type="submit"
                  disabled={otpBusy || otpCode.length !== 6}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 52%, #db2777 100%)'
                  }}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {otpBusy ? (
                    <span role="status">Đang đăng nhập…</span>
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
                    className="text-xs font-semibold text-pink-300 hover:text-pink-200 cursor-pointer disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
                    className="text-xs font-semibold text-purple-200/70 hover:text-white cursor-pointer"
                  >
                    ← Quay lại
                  </button>
                </div>
              </form>
            ) : (
              /* ── Biểu mẫu đăng nhập chuẩn ── */
              <form
                onSubmit={handleLogin}
                aria-label="Đăng nhập Lịch Ca"
                data-testid="login-form"
                className="space-y-4"
              >
                {/* Thẻ gợi ý tài khoản đã lưu (nếu có) */}
                {savedEmpId && empId === savedEmpId && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#231b3d]/80 border border-purple-300/20 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0 shadow-[0_0_6px_#fcd34d]" />
                      <span className="text-purple-100/90 truncate">
                        Tài khoản gần đây: <strong className="text-white font-bold font-mono">{savedEmpId}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRememberedId}
                      className="inline-flex items-center gap-1 text-pink-300 hover:text-pink-200 font-semibold shrink-0 ml-2 cursor-pointer"
                      title="Đổi tài khoản khác"
                    >
                      <X size={13} />
                      <span>Đổi mã</span>
                    </button>
                  </div>
                )}

                {/* Mã nhân viên */}
                <div>
                  <label
                    htmlFor="login-employee-id"
                    className="block text-xs font-semibold text-purple-100/90 mb-1.5"
                  >
                    Mã nhân viên / Tài khoản
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-300/60">
                      <User size={17} />
                    </div>
                    <input
                      ref={empInputRef}
                      type="text"
                      value={empId}
                      id="login-employee-id"
                      data-testid="login-employee-id"
                      autoComplete="username"
                      onChange={e => setEmpId(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-sm bg-[#120e22]/90 border border-purple-300/20 hover:border-purple-300/35 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 rounded-xl outline-none font-medium text-white transition-all placeholder:text-purple-300/40"
                      placeholder="Nhập mã 9 chữ số hoặc admin"
                      required
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-purple-100/90"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-pink-300 hover:text-pink-200 hover:underline cursor-pointer transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-300/60">
                      <KeyRound size={17} />
                    </div>
                    <input
                      ref={passwordRef}
                      id="login-password"
                      data-testid="login-password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 text-sm bg-[#120e22]/90 border border-purple-300/20 hover:border-purple-300/35 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 rounded-xl outline-none font-medium text-white transition-all placeholder:text-purple-300/40"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-purple-300/60 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Ghi nhớ đăng nhập */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-purple-300/30 bg-[#120e22] text-pink-500 focus:ring-pink-400/30 cursor-pointer accent-pink-500"
                    />
                    <span className="text-xs font-medium text-purple-100/85">
                      Duy trì đăng nhập trên thiết bị này
                    </span>
                  </label>
                </div>

                {/* Nút Đăng nhập Twilight Gradient */}
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="login-submit"
                  aria-label={submitting ? 'Đang đăng nhập' : 'Đăng nhập'}
                  aria-busy={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 52%, #db2777 100%)'
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-950/60 hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all mt-2"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={17} />
                      <span>ĐĂNG NHẬP</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Chân trang cột phải */}
          <div className="mt-8 pt-4 border-t border-purple-200/10 flex items-center justify-between text-xs text-purple-200/60">
            <div className="flex items-center gap-1.5">
              <KeyRound size={13} className="text-amber-300" />
              <span>v4.4</span>
            </div>
            <span className="max-w-[200px] truncate" title={branding.organizationName}>
              {branding.organizationName || 'Không gian làm việc'}
            </span>
          </div>
          {branding.contactEmail && (
            <a
              href={`mailto:${branding.contactEmail}`}
              className="mt-3 block text-center text-xs text-purple-200/70 hover:text-pink-300 break-all transition-colors"
            >
              Liên hệ hỗ trợ: {branding.contactEmail}
            </a>
          )}
        </div>
      </div>

      {recoveryNotice && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-500/40 bg-emerald-950/90 p-3 text-sm text-emerald-200 shadow-lg"
        >
          {recoveryNotice}
        </div>
      )}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmpId={empId}
        onSuccess={(id, warning) => {
          setEmpId(id);
          setPassword('');
          setError('');
          setOtpStep(false);
          setRecoveryNotice(warning || 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
          requestAnimationFrame(() => passwordRef.current?.focus());
        }}
      />
    </div>
  );
}
