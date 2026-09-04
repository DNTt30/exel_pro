import { useEffect, useRef, useState } from 'react';
import chibiCutoutImg from '../../assets/chibi_cutout.png';
import { Sparkles } from 'lucide-react';

/**
 * GS25 Chibi Scientist Mascot - "Bác Học Nhí"
 * - 100% Focused on the Chibi character.
 * - Genuine 3D feel on rotation: Multi-layer Z-space parallax (body, goggles, telescope at different Z-depths).
 * - Real 3D Ground Shadows: Ambient contact occlusion under shoes + dynamic cast shadow shifting opposite to cursor.
 * - Authentic Eye Pupil Tracking: Dark navy & cyan pupils with gold star reflections physically move inside eye sockets.
 *   (NO glowing star icons or artificial lights in eyes).
 * - Natural soft eyelid blinking every 3.5s.
 * - Dynamic 3D surface light highlight gliding across goggles and coat as the character turns.
 * - NO crude lines across the screen.
 * - Interactive Click Cheer: Chibi bounces with joy and emits celebratory floating stars.
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
  const targetMouseRef = useRef({ x: 0.2, y: -0.1 });
  const currentMouseRef = useRef({ x: 0.2, y: -0.1 });

  // State for rendering
  const [motion, setMotion] = useState({
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    pupilX: 0,
    pupilY: 0,
    shadowOffsetX: 0,
    shadowSkew: 0,
    lightX: 50,
    lightY: 40,
    telescopeAngle: 0
  });

  const [isBlinking, setIsBlinking] = useState(false);
  const [isCheering, setIsCheering] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. SMOOTH ANIMATION LOOP (LERP 3D ROTATION, SHADOW, PUPILS)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx; // [-1, 1]
      const dy = (e.clientY - cy) / cy; // [-1, 1]

      targetMouseRef.current = {
        x: Math.max(-1.2, Math.min(1.2, dx)),
        y: Math.max(-1.0, Math.min(1.0, dy))
      };
    };

    const handlePointerDown = () => {
      setIsCheering(true);
      setTimeout(() => setIsCheering(false), 500);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);

    // 60FPS Smooth Interpolation Loop
    let lastTime = performance.now();

    const updateMotion = (now) => {
      animFrameRef.current = requestAnimationFrame(updateMotion);

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth lerp (damping)
      const cur = currentMouseRef.current;
      const target = targetMouseRef.current;
      const factor = 1.0 - Math.exp(-9 * dt); // smooth exponential decay

      cur.x += (target.x - cur.x) * factor;
      cur.y += (target.y - cur.y) * factor;

      // 3D Rotations (Pitch, Yaw, Roll)
      const rotY = cur.x * 20;  // turn left/right (yaw)
      const rotX = -cur.y * 14; // tilt up/down (pitch)
      const rotZ = cur.x * -2.5; // slight organic roll

      // Pupil movement inside eye sockets (max ±9px horizontal, ±7px vertical)
      const pupilX = cur.x * 9;
      const pupilY = cur.y * 7;

      // Shadow projection (shifts opposite to light direction)
      const shadowOffsetX = -cur.x * 18;
      const shadowSkew = -cur.x * 12;

      // Dynamic surface light center percentage
      const lightX = 50 + cur.x * 28;
      const lightY = 40 + cur.y * 22;

      // Telescope subtle aiming angle
      const telescopeAngle = Math.max(-20, Math.min(20, cur.x * 14 + cur.y * 6));

      setMotion({
        rotX,
        rotY,
        rotZ,
        pupilX,
        pupilY,
        shadowOffsetX,
        shadowSkew,
        lightX,
        lightY,
        telescopeAngle
      });
    };

    animFrameRef.current = requestAnimationFrame(updateMotion);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. NATURAL EYE BLINKING (Every 3.6s)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 130);
    }, 3600);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex flex-col items-center select-none ${className}`}
      style={{ minHeight: height }}
    >
      {/* ── 3D Stage Container ── */}
      <div 
        style={{ perspective: '1100px' }}
        className="w-full flex justify-center items-center py-2"
      >
        {/* Main 3D Card / Rig */}
        <div 
          ref={characterRef}
          style={{
            transform: `rotateX(${motion.rotX}deg) rotateY(${motion.rotY}deg) rotateZ(${motion.rotZ}deg) translateY(${isCheering ? '-22px' : '0px'})`,
            transformStyle: 'preserve-3d',
            transition: isCheering 
              ? 'transform 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.28)' 
              : 'none' // continuous 60fps rAF interpolation
          }}
          className="relative w-full max-w-[275px] aspect-[855/1024] flex items-center justify-center cursor-pointer pointer-events-auto group"
          onClick={() => {
            setIsCheering(true);
            setTimeout(() => setIsCheering(false), 500);
          }}
        >

          {/* ── REALISTIC 3D GROUND SHADOWS ── */}
          {/* Layer 1: Sharp Ambient Occlusion (Direct contact under shoes) */}
          <div 
            className="absolute -bottom-2.5 w-32 h-5 bg-slate-950/80 rounded-full blur-[3px] pointer-events-none"
            style={{
              transform: `translateZ(-20px) scale(${isCheering ? 0.7 : 1})`,
              opacity: isCheering ? 0.3 : 0.85
            }}
          />

          {/* Layer 2: Dynamic Cast Shadow (Projects and skews opposite to light) */}
          <div 
            className="absolute -bottom-4 w-48 h-10 bg-slate-950/60 rounded-full blur-xl pointer-events-none transition-opacity duration-200"
            style={{
              transform: `translateZ(-30px) translateX(${motion.shadowOffsetX}px) skewX(${motion.shadowSkew}deg) scale(${isCheering ? 0.8 : 1.05})`,
              opacity: isCheering ? 0.25 : 0.65
            }}
          />

          {/* ── LAYER 1: BASE CHIBI CUTOUT BODY (translateZ 0px) ── */}
          <div 
            className="relative w-full h-full"
            style={{ transform: 'translateZ(0px)' }}
          >
            <img 
              src={chibiCutoutImg} 
              alt="Chibi Scientist" 
              className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] brightness-[1.03] pointer-events-none select-none"
            />

            {/* Dynamic Surface Specular Highlight (glides across goggles & suit on 3D rotation) */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: `radial-gradient(circle at ${motion.lightX}% ${motion.lightY}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)`,
                mixBlendMode: 'overlay'
              }}
            />
          </div>

          {/* ── LAYER 2: AUTHENTIC EYE PUPIL TRACKING (translateZ 12px) ── */}
          {/* Left Eye Socket */}
          <div 
            className="absolute pointer-events-none overflow-hidden"
            style={{
              left: '32.6%',
              top: '33.8%',
              width: '12.8%',
              height: '14.2%',
              borderRadius: '48% 52% 46% 54% / 44% 48% 52% 56%',
              transform: 'translateZ(12px)'
            }}
          >
            {/* Pupil & Iris Mesh (Dark navy/cyan iris with gold star reflection, NO lights) */}
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${motion.pupilX}px, ${motion.pupilY}px)`
              }}
            >
              {/* Authentic Anime Iris */}
              <div 
                className="relative w-[78%] h-[82%] rounded-full shadow-inner overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 45% 65%, #0284c7 0%, #1e3a8a 55%, #0f172a 100%)'
                }}
              >
                {/* Soft Star Reflection inside Pupil */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-2.5 h-2.5 bg-amber-100/90 rotate-45 transform scale-75 opacity-85"
                    style={{ clipPath: 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)' }}
                  />
                </div>

                {/* Specular White Glint (Top-Left) */}
                <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white opacity-95" />
                <div className="absolute bottom-1 right-2 w-1 h-1 rounded-full bg-cyan-300/80" />
              </div>
            </div>

            {/* Eyelid Blink Overlay (Smooth flesh-tone anime eyelid) */}
            <div 
              className="absolute inset-0 bg-[#fde8dc] border-b-2 border-[#5c3e31] transition-transform duration-100 ease-in-out origin-top"
              style={{
                transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)'
              }}
            />
          </div>

          {/* Right Eye Socket */}
          <div 
            className="absolute pointer-events-none overflow-hidden"
            style={{
              left: '55.4%',
              top: '35.0%',
              width: '12.8%',
              height: '14.2%',
              borderRadius: '48% 52% 46% 54% / 44% 48% 52% 56%',
              transform: 'translateZ(12px)'
            }}
          >
            {/* Pupil & Iris Mesh */}
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${motion.pupilX}px, ${motion.pupilY}px)`
              }}
            >
              <div 
                className="relative w-[78%] h-[82%] rounded-full shadow-inner overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 45% 65%, #0284c7 0%, #1e3a8a 55%, #0f172a 100%)'
                }}
              >
                {/* Soft Star Reflection inside Pupil */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-2.5 h-2.5 bg-amber-100/90 rotate-45 transform scale-75 opacity-85"
                    style={{ clipPath: 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)' }}
                  />
                </div>

                {/* Specular White Glint (Top-Left) */}
                <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white opacity-95" />
                <div className="absolute bottom-1 right-2 w-1 h-1 rounded-full bg-cyan-300/80" />
              </div>
            </div>

            {/* Eyelid Blink Overlay */}
            <div 
              className="absolute inset-0 bg-[#fde8dc] border-b-2 border-[#5c3e31] transition-transform duration-100 ease-in-out origin-top"
              style={{
                transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)'
              }}
            />
          </div>

          {/* ── LAYER 3: TELESCOPE & EMERALD CRYSTAL LENS (translateZ 24px) ── */}
          <div 
            style={{
              left: '20.5%',
              top: '47.0%',
              width: '16%',
              height: '14%',
              transform: `translateZ(24px) rotate(${motion.telescopeAngle}deg)`,
              transformOrigin: '75% 75%'
            }}
            className="absolute pointer-events-none flex items-center justify-center transition-transform duration-100 ease-out"
          >
            {/* Emerald Crystal Lens Specular Ring */}
            <div className="relative w-6 h-6 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-[2px] animate-pulse" />
              <div className="w-4 h-4 rounded-full bg-emerald-500/80 shadow-[0_0_10px_#10b981] flex items-center justify-center border border-emerald-300/70">
                <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
              </div>
            </div>
          </div>

          {/* ── LAYER 4: CELEBRATION STAR BURST ON CLICK (translateZ 35px) ── */}
          {isCheering && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ transform: 'translateZ(35px)' }}
            >
              <span className="absolute -top-7 left-12 text-2xl animate-bounce">✨</span>
              <span className="absolute -top-5 right-12 text-xl animate-bounce" style={{ animationDelay: '0.08s' }}>⭐</span>
              <span className="absolute top-16 -left-8 text-2xl animate-bounce" style={{ animationDelay: '0.14s' }}>💖</span>
              <span className="absolute top-20 -right-8 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
            </div>
          )}

        </div>
      </div>

      {/* ── Status Pill Badge ── */}
      <div className="mt-2 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-emerald-400/30 text-[11px] font-bold text-emerald-300 shadow-md">
          <Sparkles size={12} className="text-emerald-400" />
          <span>GS25 Chibi Scientist • Nhìn theo trỏ chuột • Click để tương tác</span>
        </div>
      </div>

    </div>
  );
}
