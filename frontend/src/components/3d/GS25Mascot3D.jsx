import { useEffect, useRef, useState } from 'react';
import chibiCutoutImg from '../../assets/chibi_cutout.png';
import { Sparkles } from 'lucide-react';

/**
 * GS25 Chibi Scientist Mascot - "Bác Học Nhí"
 * - 100% Authentic Artist Render: Gỡ bỏ hoàn toàn các lớp decal mắt dán đè giả tạo,
 *   giữ trọn vẹn đôi mắt to tròn lấp lánh nguyên bản tuyệt đẹp của nhân vật.
 * - Ánh nhìn & Gương mặt tự nhiên hướng theo chuột: Sử dụng góc xoay 3D (Pitch, Yaw, Roll)
 *   với chiều sâu không gian (perspective 1100px), toàn bộ gương mặt và ánh mắt bé Chibi
 *   tự động nghiêng và quay sang hướng con trỏ chuột một cách mượt mà và chân thực.
 * - Hệ thống bóng đổ sàn 2 tầng thực tế (Dual-layer 3D Ground Shadows).
 * - Phản xạ ánh sáng 3D bề mặt (Dynamic Specular Shimmer) trượt trên kính bảo hộ khi quay đầu.
 * - Nhịp thở êm ái (Breathing Idle) & Click để nhảy nhót (Cheer Bounce) bùng nổ sao lấp lánh.
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '360px',
  _focusField = null 
}) {
  const containerRef = useRef(null);
  const characterRef = useRef(null);
  const animFrameRef = useRef(null);

  // Mouse tracking in [-1, 1]
  const targetMouseRef = useRef({ x: 0.25, y: -0.1 });
  const currentMouseRef = useRef({ x: 0.25, y: -0.1 });

  // 3D Motion state
  const [motion, setMotion] = useState({
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    transX: 0,
    shadowOffsetX: 0,
    shadowSkew: 0,
    lightX: 50,
    lightY: 40
  });

  const [isCheering, setIsCheering] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. SMOOTH 60FPS INTERPOLATION FOR 3D GAZE & SHADOWS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx; // [-1, 1]
      const dy = (e.clientY - cy) / cy; // [-1, 1]

      targetMouseRef.current = {
        x: Math.max(-1.25, Math.min(1.25, dx)),
        y: Math.max(-1.0, Math.min(1.0, dy))
      };
    };

    const handlePointerDown = () => {
      setIsCheering(true);
      setTimeout(() => setIsCheering(false), 500);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);

    let lastTime = performance.now();

    const updateMotion = (now) => {
      animFrameRef.current = requestAnimationFrame(updateMotion);

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth exponential decay lerp
      const cur = currentMouseRef.current;
      const target = targetMouseRef.current;
      const factor = 1.0 - Math.exp(-8.5 * dt);

      cur.x += (target.x - cur.x) * factor;
      cur.y += (target.y - cur.y) * factor;

      // 3D Rotations (Pitch, Yaw, Roll)
      const rotY = cur.x * 22;   // Head & gaze turn left/right
      const rotX = -cur.y * 16;  // Head & gaze tilt up/down
      const rotZ = cur.x * -2.2; // Organic slight tilt
      const transX = cur.x * 6;  // Organic translation

      // Shadow projection (shifts opposite to light/look direction)
      const shadowOffsetX = -cur.x * 20;
      const shadowSkew = -cur.x * 14;

      // Dynamic surface light reflection position
      const lightX = 50 + cur.x * 30;
      const lightY = 40 + cur.y * 24;

      setMotion({
        rotX,
        rotY,
        rotZ,
        transX,
        shadowOffsetX,
        shadowSkew,
        lightX,
        lightY
      });
    };

    animFrameRef.current = requestAnimationFrame(updateMotion);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex flex-col items-center select-none ${className}`}
      style={{ minHeight: height }}
    >
      {/* ── Advanced Animation Styles ── */}
      <style>{`
        @keyframes chibi-breathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.015, 0.99); }
        }
        .anim-chibi-breathe {
          animation: chibi-breathe 4s ease-in-out infinite;
        }
      `}</style>

      {/* ── 3D Stage Container ── */}
      <div 
        style={{ perspective: '1100px' }}
        className="w-full flex justify-center items-center py-2"
      >
        {/* Main 3D Rig */}
        <div 
          ref={characterRef}
          style={{
            transform: `rotateX(${motion.rotX}deg) rotateY(${motion.rotY}deg) rotateZ(${motion.rotZ}deg) translateX(${motion.transX}px) translateY(${isCheering ? '-24px' : '0px'})`,
            transformStyle: 'preserve-3d',
            transition: isCheering 
              ? 'transform 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.28)' 
              : 'none'
          }}
          className="relative w-full max-w-[280px] aspect-[855/1024] flex items-center justify-center cursor-pointer pointer-events-auto group"
          onClick={() => {
            setIsCheering(true);
            setTimeout(() => setIsCheering(false), 500);
          }}
        >

          {/* ── REALISTIC DUAL-LAYER 3D GROUND SHADOWS ── */}
          {/* Layer 1: Ambient Contact Occlusion (Direct shadow under boots) */}
          <div 
            className="absolute -bottom-2 w-36 h-5 bg-slate-950/85 rounded-full blur-[3px] pointer-events-none"
            style={{
              transform: `translateZ(-20px) scale(${isCheering ? 0.7 : 1})`,
              opacity: isCheering ? 0.3 : 0.85
            }}
          />

          {/* Layer 2: Dynamic Projected Cast Shadow (Skews & stretches opposite to cursor) */}
          <div 
            className="absolute -bottom-4 w-52 h-11 bg-slate-950/65 rounded-full blur-xl pointer-events-none transition-opacity duration-200"
            style={{
              transform: `translateZ(-30px) translateX(${motion.shadowOffsetX}px) skewX(${motion.shadowSkew}deg) scale(${isCheering ? 0.8 : 1.05})`,
              opacity: isCheering ? 0.25 : 0.65
            }}
          />

          {/* ── AUTHENTIC CHIBI FIGURE (No fake stickers, 100% original gorgeous art) ── */}
          <div 
            className="relative w-full h-full anim-chibi-breathe"
            style={{ transform: 'translateZ(0px)' }}
          >
            <img 
              src={chibiCutoutImg} 
              alt="Chibi Scientist" 
              className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.65)] brightness-[1.03] contrast-[1.04] pointer-events-none select-none"
            />

            {/* Dynamic Specular Light Glint (Glides naturally over goggles, hair & suit as she turns) */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: `radial-gradient(circle at ${motion.lightX}% ${motion.lightY}%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 38%, transparent 65%)`,
                mixBlendMode: 'overlay'
              }}
            />
          </div>

          {/* ── CELEBRATION STAR BURST ON CLICK (translateZ 30px) ── */}
          {isCheering && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ transform: 'translateZ(30px)' }}
            >
              <span className="absolute -top-8 left-10 text-2xl animate-bounce">✨</span>
              <span className="absolute -top-6 right-10 text-xl animate-bounce" style={{ animationDelay: '0.08s' }}>⭐</span>
              <span className="absolute top-14 -left-8 text-2xl animate-bounce" style={{ animationDelay: '0.14s' }}>💖</span>
              <span className="absolute top-18 -right-8 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
            </div>
          )}

        </div>
      </div>

      {/* ── Status Pill Badge ── */}
      <div className="mt-2 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-emerald-400/30 text-[11px] font-bold text-emerald-300 shadow-md">
          <Sparkles size={12} className="text-emerald-400" />
          <span>GS25 Chibi Scientist • Quay đầu nhìn theo chuột • Click để tương tác</span>
        </div>
      </div>

    </div>
  );
}
