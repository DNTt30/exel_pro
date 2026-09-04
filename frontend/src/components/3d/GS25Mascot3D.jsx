import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import chibiCutoutImg from '../../assets/chibi_cutout.png';
import allainHeroImg from '../../assets/allain_hero.png';
import { Sparkles, Bot, Swords, Eye } from 'lucide-react';

/**
 * GS25 Multi-Mascot System:
 * 1. 🧪 Chibi Nhà Bác Học Nhí (Bản Cutout Trong Suốt - Hoạt ảnh cử động chân thực):
 *    - Tách nền trong suốt 100%, nhân vật đứng trực tiếp trên sàn giao diện, không còn viền khung ảnh chữ nhật.
 *    - Bỏ đường kẻ thô cắt ngang màn hình — thay bằng luồng ánh sáng ngọc bích tỏa nón mềm mại và tâm điểm ánh sáng.
 *    - Cặp mắt to tròn có con ngươi sao lấp lánh LIẾC NHÌN THEO CHUỘT thời gian thực.
 *    - Nhịp chớp mắt tự nhiên (Blinking), bóng đổ sàn động (Ground Shadow).
 *    - Ống kính ngọc bích xoay hướng ngắm theo góc di chuyển chuột và nhấp nháy phát quang.
 *    - Nhấp chuột (Click) để kích hoạt hiệu ứng nhảy bật (Cheer Jump) & bùng nổ sao lung linh.
 * 2. ⚔️ Allain Kiếm Khách (Liên Quân).
 * 3. 🤖 G-Bot 3D (Three.js Mascot).
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '340px',
  _focusField = null 
}) {
  const [mode, setMode] = useState('chibi'); // 'chibi' | 'allain' | 'robot'
  const containerRef = useRef(null);

  // ── Global Mouse & Screen Tracking ──
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // ── Chibi Specific State & Refs ──
  const chibiCardRef = useRef(null);
  const lensRef = useRef(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isCheering, setIsCheering] = useState(false);
  const [telescopeAngle, setTelescopeAngle] = useState(0);

  // ── Allain Specific State & Refs ──
  const allainCardRef = useRef(null);

  // ── Robot Three.js Canvas Ref ──
  const robotCanvasRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // 1. GLOBAL POINTER TRACKING & 3D PARALLAX
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      // 3D Tilt calculation
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      setTilt({
        x: -dy * 10,
        y: dx * 14
      });

      // Pupil Tracking calculation (relative to center of screen)
      setPupilOffset({
        x: Math.max(-8, Math.min(8, dx * 9)),
        y: Math.max(-6, Math.min(6, dy * 7))
      });

      // Telescope Angle calculation (aiming toward cursor)
      if (lensRef.current) {
        const rect = lensRef.current.getBoundingClientRect();
        const lx = rect.left + rect.width / 2;
        const ly = rect.top + rect.height / 2;
        const angleRad = Math.atan2(e.clientY - ly, e.clientX - lx);
        const deg = (angleRad * 180) / Math.PI;
        setTelescopeAngle(Math.max(-28, Math.min(28, deg * 0.35)));
      }
    };

    const handlePointerDown = () => {
      if (mode === 'chibi') {
        setIsCheering(true);
        setTimeout(() => setIsCheering(false), 450);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mode]);

  // ─────────────────────────────────────────────────────────────
  // 2. CHIBI NATURAL BLINKING
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'chibi') return undefined;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3600);

    return () => clearInterval(blinkInterval);
  }, [mode]);

  // ─────────────────────────────────────────────────────────────
  // 3. ROBOT THREE.JS ANIMATION
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'robot') return undefined;

    const canvas = robotCanvasRef.current;
    if (!canvas) return;

    let width = canvas.clientWidth || 320;
    let heightPx = canvas.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(0, 0.1, 4.3);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, heightPx, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambientLight = new THREE.AmbientLight(0x8ba2c4, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f5ff, 2.8);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const whiteBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22, metalness: 0.28 });
    const gs25BlueMat = new THREE.MeshStandardMaterial({ color: 0x0072ce, roughness: 0.25, metalness: 0.4 });
    const darkVisorMat = new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.04, metalness: 0.95 });
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    const mascot = new THREE.Group();
    scene.add(mascot);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.85, 32), gs25BlueMat);
    mascot.add(torso);

    const chestPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.40, 0.72, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3), whiteBodyMat);
    chestPlate.position.y = 0.04;
    mascot.add(chestPlate);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.6, 0);
    mascot.add(headPivot);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), whiteBodyMat);
    helmet.position.set(0, 0.32, 0);
    headPivot.add(helmet);

    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 16, 0, Math.PI, 0, Math.PI / 1.7), darkVisorMat);
    visor.position.set(0, 0.31, 0.12);
    visor.rotation.x = -Math.PI / 12;
    headPivot.add(visor);

    const leftEye = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 12, 16), cyanGlowMat);
    leftEye.rotation.z = Math.PI / 2;
    leftEye.position.set(-0.16, 0.33, 0.5);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 12, 16), cyanGlowMat);
    rightEye.rotation.z = Math.PI / 2;
    rightEye.position.set(0.16, 0.33, 0.5);
    headPivot.add(rightEye);

    // Pointer Arm
    const pointerArmPivot = new THREE.Group();
    pointerArmPivot.position.set(0.56, 0.25, 0);
    mascot.add(pointerArmPivot);

    const armLookAtDummy = new THREE.Object3D();
    armLookAtDummy.position.copy(pointerArmPivot.position);
    mascot.add(armLookAtDummy);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.4, 16), whiteBodyMat);
    upperArm.rotation.x = Math.PI / 2;
    upperArm.position.set(0, 0, 0.2);
    pointerArmPivot.add(upperArm);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 16), gs25BlueMat);
    forearm.rotation.x = Math.PI / 2;
    forearm.position.set(0, 0, 0.65);
    pointerArmPivot.add(forearm);

    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.28, 14), whiteBodyMat);
    finger.rotation.x = Math.PI / 2;
    finger.position.set(0.01, 0.02, 1.18);
    pointerArmPivot.add(finger);

    const fingerTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), cyanGlowMat);
    fingerTip.position.set(0.01, 0.02, 1.32);
    pointerArmPivot.add(fingerTip);

    const mouse = new THREE.Vector2(0.6, 0);
    const raycaster = new THREE.Raycaster();
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const worldTarget = new THREE.Vector3(2.5, 0.2, 0);

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.set(x, y);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      mascot.position.y = Math.sin(t * 2.2) * 0.07;

      const mx = THREE.MathUtils.clamp(mouse.x, -3.5, 3.5);
      const my = THREE.MathUtils.clamp(mouse.y, -2.5, 2.5);
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      raycaster.ray.intersectPlane(targetPlane, worldTarget);

      armLookAtDummy.position.copy(pointerArmPivot.position);
      armLookAtDummy.lookAt(worldTarget);
      pointerArmPivot.quaternion.slerp(armLookAtDummy.quaternion, 0.12);

      headPivot.lookAt(worldTarget.x * 0.4, worldTarget.y * 0.4 + 0.6, worldTarget.z + 3);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [mode]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full flex flex-col items-center select-none ${className}`}
      style={{ minHeight: height }}
    >
      {/* ── Mode Switch Tabs ── */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/20 mb-3 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setMode('chibi')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
            mode === 'chibi'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye size={13} className={mode === 'chibi' ? 'text-emerald-200 animate-pulse' : ''} />
          <span>Chibi Bác Học</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('allain')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            mode === 'allain'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords size={13} className={mode === 'allain' ? 'text-amber-200' : ''} />
          <span>Allain Kiếm Khách</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('robot')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            mode === 'robot'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot size={13} className={mode === 'robot' ? 'text-cyan-200' : ''} />
          <span>G-Bot 3D</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. CHIBI NHÀ BÁC HỌC NHÍ (CUTOUT TÁCH NỀN TRONG SUỐT 100%) */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'chibi' && (
        <div className="relative w-full flex flex-col items-center">
          
          {/* Free-standing Character Stage (No card frame, no rectangle box!) */}
          <div 
            style={{ perspective: '900px' }}
            className="w-full flex justify-center items-center py-1"
          >
            <div 
              ref={chibiCardRef}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(${isCheering ? '-20px' : '0px'})`,
                transition: isCheering ? 'transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)' : 'transform 0.08s ease-out'
              }}
              className="relative w-full max-w-[280px] aspect-[855/1024] flex items-center justify-center cursor-pointer"
              onClick={() => {
                setIsCheering(true);
                setTimeout(() => setIsCheering(false), 450);
              }}
            >
              {/* Soft Ground Shadow beneath shoes */}
              <div 
                className="absolute -bottom-3 w-48 h-9 bg-black/60 rounded-full blur-xl pointer-events-none transition-transform duration-200"
                style={{
                  transform: `scale(${isCheering ? 0.75 : 1})`,
                  opacity: isCheering ? 0.25 : 0.7
                }}
              />

              {/* Seamless Transparent Cutout Figure */}
              <img 
                src={chibiCutoutImg} 
                alt="Chibi Explorer Scientist" 
                className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.65)] brightness-[1.04] select-none pointer-events-none"
              />

              {/* ── INTERACTIVE ANIMATED PUPILS (Follows Mouse Cursor!) ── */}
              {/* Left Eye Socket */}
              <div 
                className="absolute pointer-events-none overflow-hidden"
                style={{
                  left: '32.5%',
                  top: '33.5%',
                  width: '13%',
                  height: '14.5%',
                  borderRadius: '50%'
                }}
              >
                {/* Moving Sparkle Star Pupil */}
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8] flex items-center justify-center opacity-85 animate-pulse">
                    <span className="text-[10px] text-amber-200">✨</span>
                  </div>
                </div>

                {/* Natural Eyelid Blink Overlay */}
                <div 
                  className="absolute inset-0 bg-[#fce9df] transition-transform duration-100 ease-in-out origin-top"
                  style={{
                    transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)'
                  }}
                />
              </div>

              {/* Right Eye Socket */}
              <div 
                className="absolute pointer-events-none overflow-hidden"
                style={{
                  left: '55.5%',
                  top: '35%',
                  width: '13%',
                  height: '14.5%',
                  borderRadius: '50%'
                }}
              >
                {/* Moving Sparkle Star Pupil */}
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8] flex items-center justify-center opacity-85 animate-pulse">
                    <span className="text-[10px] text-amber-200">✨</span>
                  </div>
                </div>

                {/* Natural Eyelid Blink Overlay */}
                <div 
                  className="absolute inset-0 bg-[#fce9df] transition-transform duration-100 ease-in-out origin-top"
                  style={{
                    transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)'
                  }}
                />
              </div>

              {/* ── TELESCOPE & EMERALD LENS INTERACTION ── */}
              <div 
                ref={lensRef}
                style={{
                  left: '21%',
                  top: '47.5%',
                  width: '16%',
                  height: '14%',
                  transform: `rotate(${telescopeAngle}deg)`,
                  transformOrigin: '70% 70%'
                }}
                className="absolute pointer-events-none flex items-center justify-center"
              >
                {/* Soft Emerald Spotlight Cone radiating outward towards the right */}
                <div 
                  className="absolute left-1/2 top-1/2 -translate-y-1/2 w-48 h-32 pointer-events-none opacity-40 blur-lg"
                  style={{
                    background: 'radial-gradient(ellipse at left, rgba(52, 211, 153, 0.7) 0%, rgba(16, 185, 129, 0.2) 45%, transparent 75%)',
                    transform: 'rotate(-10deg)',
                    transformOrigin: 'left center'
                  }}
                />

                {/* Emerald Core Pulsing Aura */}
                <div className="w-7 h-7 rounded-full bg-emerald-400/50 shadow-[0_0_20px_#10b981] animate-ping" />
                <div className="absolute w-5 h-5 rounded-full bg-emerald-300/90 shadow-[0_0_12px_#34d399] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white opacity-95 animate-pulse" />
                </div>
              </div>

              {/* Cheer Star Burst Effect on Click */}
              {isCheering && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="absolute -top-6 left-12 text-xl animate-bounce">✨</span>
                  <span className="absolute -top-4 right-14 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>⭐</span>
                  <span className="absolute top-16 -left-6 text-xl animate-bounce" style={{ animationDelay: '0.15s' }}>💖</span>
                  <span className="absolute top-20 -right-6 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Subdued Interactive Focus Beacon (Follows mouse over inputs without harsh lines) ── */}
          {cursorPos.x > 0 && (
            <div 
              className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Elegant Subtle Emerald Focus Reticle */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute w-7 h-7 rounded-full border border-emerald-400/50 animate-ping opacity-60" />
                <div className="absolute w-4 h-4 rounded-full border border-emerald-300/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </div>
            </div>
          )}

          {/* Interactive Helper Badge */}
          <div className="mt-1 text-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-emerald-400/40 text-[11px] font-bold text-emerald-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Chibi tách nền sống động • Mắt liếc & Ống ngắm xoay theo chuột • Click để nhảy nhót</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. ALLAIN KIẾM KHÁCH MODE                                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'allain' && (
        <div className="relative w-full flex flex-col items-center">
          <div 
            style={{ perspective: '1000px' }}
            className="w-full flex justify-center items-center"
          >
            <div 
              ref={allainCardRef}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
                transition: 'transform 0.08s ease-out'
              }}
              className="relative w-full max-w-[420px] aspect-[16/10] rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-[0_20px_50px_rgba(245,158,11,0.25)] bg-slate-950/80 group"
            >
              <img 
                src={allainHeroImg} 
                alt="Allain Swordsman" 
                className="w-full h-full object-cover object-center filter brightness-[1.05] contrast-[1.08]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider shadow-md">
                <Sparkles size={12} className="text-amber-400" />
                <span>Allain • Kiếm Khách Ánh Kim</span>
              </div>
            </div>
          </div>

          <div className="mt-2 text-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/40 text-[11px] font-bold text-amber-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Nghiêng 3D theo góc nhìn chuột</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. G-BOT 3D THREE.JS ROBOT MODE                            */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'robot' && (
        <div className="relative w-full flex flex-col items-center">
          <canvas 
            ref={robotCanvasRef} 
            className="w-full h-[290px] block pointer-events-none" 
            style={{ touchAction: 'none' }}
          />
          <div className="mt-1 text-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/40 text-[11px] font-bold text-cyan-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>G-Bot 3D Copilot • Cánh tay robot luôn chỉ theo con trỏ chuột</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
