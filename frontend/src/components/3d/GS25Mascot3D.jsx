import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import allainHeroImg from '../../assets/allain_hero.png';
import { Sparkles, Bot, Swords } from 'lucide-react';

/**
 * GS25 Dual Mascot System:
 * 1. ⚔️ Allain Kiếm Khách (Cinematic Live 2.5D):
 *    - Authentic, ultra-sharp high-definition artwork (không bị thô, chuẩn 100% nguyên tác Liên Quân).
 *    - 3D Holographic Parallax Tilt: nhân vật nghiêng người và xoay theo con trỏ chuột trong không gian 3D.
 *    - Lưỡi kiếm năng lượng phóng tia laser ánh kim khóa theo con trỏ chuột trên toàn màn hình.
 *    - Hệ thống tàn lửa & tia sáng (Fire Embers Canvas) bay lơ lửng thời gian thực.
 *    - Click để tung trảm kích chém kiếm năng lượng (Slash Burst).
 * 2. 🤖 G-Bot 3D (Three.js Procedural Cyber Mascot):
 *    - Mô hình 3D người máy dễ thương với cánh tay robot vươn ra và ngón tay trỏ chỉ theo chuột.
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '340px',
  _focusField = null 
}) {
  const [mode, setMode] = useState('allain'); // 'allain' | 'robot'
  const containerRef = useRef(null);

  // ── Allain 2.5D State & Refs ──
  const allainCardRef = useRef(null);
  const emberCanvasRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [swordTipPos, setSwordTipPos] = useState({ x: 0, y: 0 });
  const [isSlashing, setIsSlashing] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // ── Robot Three.js Canvas Ref ──
  const robotCanvasRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // 1. ALLAIN 2.5D INTERACTION & REAL-TIME EMBER CANVAS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'allain') return undefined;

    const handlePointerMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      // 3D Parallax Tilt Calculation
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      setTilt({
        x: -dy * 14, // tilt up/down
        y: dx * 16   // tilt left/right
      });
    };

    const handlePointerDown = () => {
      setIsSlashing(true);
      setTimeout(() => setIsSlashing(false), 350);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);

    // Calculate Sword Tip screen position
    const updateSwordTip = () => {
      if (!allainCardRef.current) return;
      const rect = allainCardRef.current.getBoundingClientRect();
      // The sword tip in the artwork is located at roughly x: 12%, y: 88% of the card
      setSwordTipPos({
        x: rect.left + rect.width * 0.15,
        y: rect.top + rect.height * 0.85
      });
    };

    updateSwordTip();
    window.addEventListener('resize', updateSwordTip);
    const tipInterval = setInterval(updateSwordTip, 500);

    // Canvas Fire Embers Loop
    const canvas = emberCanvasRef.current;
    let animId;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      const embers = Array.from({ length: 30 }, () => ({
        x: Math.random() * (canvas.width * 0.45) + canvas.width * 0.05,
        y: Math.random() * (canvas.height * 0.6) + canvas.height * 0.35,
        size: Math.random() * 2.5 + 1,
        speedY: Math.random() * 1.5 + 0.6,
        speedX: (Math.random() - 0.4) * 0.8,
        opacity: Math.random() * 0.8 + 0.2,
        hue: 35 + Math.random() * 25 // golden amber to orange
      }));

      const renderEmbers = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        embers.forEach((p) => {
          p.y -= p.speedY;
          p.x += p.speedX;
          p.opacity -= 0.005;

          if (p.y < 0 || p.opacity <= 0) {
            p.y = canvas.height * 0.85 + Math.random() * 20;
            p.x = Math.random() * (canvas.width * 0.35) + canvas.width * 0.08;
            p.opacity = Math.random() * 0.9 + 0.3;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 55%, ${p.opacity})`;
          ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
          ctx.shadowBlur = 8;
          ctx.fill();
        });

        animId = requestAnimationFrame(renderEmbers);
      };

      renderEmbers();
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', updateSwordTip);
      clearInterval(tipInterval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [mode]);

  // ─────────────────────────────────────────────────────────────
  // 2. ROBOT 3D (THREE.JS PROCEDURAL MASCOT)
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

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x8ba2c4, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f5ff, 2.8);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Materials
    const whiteBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22, metalness: 0.28 });
    const gs25BlueMat = new THREE.MeshStandardMaterial({ color: 0x0072ce, roughness: 0.25, metalness: 0.4 });
    const darkVisorMat = new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.04, metalness: 0.95 });
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.8 });
    const laserBeamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });

    // Mascot Hierarchy
    const mascot = new THREE.Group();
    scene.add(mascot);

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.85, 32), gs25BlueMat);
    mascot.add(torso);

    const chestPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.40, 0.72, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3), whiteBodyMat);
    chestPlate.position.y = 0.04;
    mascot.add(chestPlate);

    // Thruster
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 32, 1, true), titaniumMat);
    nozzle.position.set(0, -0.48, 0);
    nozzle.rotation.x = Math.PI;
    mascot.add(nozzle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 24), cyanGlowMat);
    flame.position.set(0, -0.84, 0);
    flame.rotation.x = Math.PI;
    mascot.add(flame);

    // Head
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

    // Eyes
    const eyeGeo = new THREE.CapsuleGeometry(0.045, 0.08, 12, 16);
    eyeGeo.rotateZ(Math.PI / 2);
    const leftEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    leftEye.position.set(-0.16, 0.33, 0.5);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    rightEye.position.set(0.16, 0.33, 0.5);
    headPivot.add(rightEye);

    // Pointer Arm (tracks cursor)
    const pointerArmPivot = new THREE.Group();
    pointerArmPivot.position.set(0.56, 0.25, 0);
    mascot.add(pointerArmPivot);

    const armLookAtDummy = new THREE.Object3D();
    armLookAtDummy.position.copy(pointerArmPivot.position);
    mascot.add(armLookAtDummy);

    const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.4, 16);
    upperArmGeo.rotateX(Math.PI / 2);
    const upperArm = new THREE.Mesh(upperArmGeo, whiteBodyMat);
    upperArm.position.set(0, 0, 0.2);
    pointerArmPivot.add(upperArm);

    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.42, 16);
    forearmGeo.rotateX(Math.PI / 2);
    const forearm = new THREE.Mesh(forearmGeo, gs25BlueMat);
    forearm.position.set(0, 0, 0.65);
    pointerArmPivot.add(forearm);

    const fingerGeo = new THREE.CylinderGeometry(0.026, 0.032, 0.28, 14);
    fingerGeo.rotateX(Math.PI / 2);
    const finger = new THREE.Mesh(fingerGeo, whiteBodyMat);
    finger.position.set(0.01, 0.02, 1.18);
    pointerArmPivot.add(finger);

    const fingerTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), cyanGlowMat);
    fingerTip.position.set(0.01, 0.02, 1.32);
    pointerArmPivot.add(fingerTip);

    const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.035, 1.8, 12), laserBeamMat);
    laser.rotateX(Math.PI / 2);
    laser.position.set(0.01, 0.02, 2.25);
    pointerArmPivot.add(laser);

    // Mouse Tracking
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
      flame.scale.y = 0.85 + Math.sin(t * 18) * 0.25;

      // Arm Aiming
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
      {/* ── Mode Toggle Header ── */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-950/80 backdrop-blur-xl border border-white/20 mb-3 z-30 shadow-lg">
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
      {/* 1. ALLAIN 2.5D CINEMATIC LIVE MODE                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {mode === 'allain' && (
        <div className="relative w-full flex flex-col items-center">
          
          {/* Parallax 3D Card Container */}
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
              {/* High Definition Authentic Allain Splash Art */}
              <img 
                src={allainHeroImg} 
                alt="Allain Swordsman" 
                className="w-full h-full object-cover object-center filter brightness-[1.05] contrast-[1.08] transition-transform duration-300"
              />

              {/* Cinematic Vignette & Ambient Glow Mask */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Warm Flaming Sword Aura Glow on the Left */}
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/35 rounded-full blur-3xl pointer-events-none animate-pulse" />

              {/* Fire Embers Real-time Canvas */}
              <canvas 
                ref={emberCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Laser Sword Tip Indicator */}
              <div 
                className="absolute w-4 h-4 rounded-full bg-amber-400/90 shadow-[0_0_15px_#f59e0b] pointer-events-none animate-ping"
                style={{
                  left: '15%',
                  top: '85%'
                }}
              />

              {/* Character Name Tag Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider shadow-md">
                <Sparkles size={12} className="text-amber-400" />
                <span>Allain • Kiếm Khách Ánh Kim</span>
              </div>
            </div>
          </div>

          {/* ── Fullscreen Real-Time Laser Energy Beam from Sword to Cursor ── */}
          {swordTipPos.x > 0 && cursorPos.x > 0 && (
            <svg 
              className="fixed inset-0 w-screen h-screen pointer-events-none z-50 overflow-visible"
            >
              <defs>
                {/* Glow Filter */}
                <filter id="swordLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                {/* Linear Gradient from Sword Amber to Cursor Cyan */}
                <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Outer Glowing Energy Beam Line */}
              <line 
                x1={swordTipPos.x} 
                y1={swordTipPos.y} 
                x2={cursorPos.x} 
                y2={cursorPos.y} 
                stroke="#f59e0b" 
                strokeWidth="4.5"
                strokeOpacity="0.35"
                strokeDasharray="8, 4"
                filter="url(#swordLaserGlow)"
              />

              {/* Sharp Inner Laser Core */}
              <line 
                x1={swordTipPos.x} 
                y1={swordTipPos.y} 
                x2={cursorPos.x} 
                y2={cursorPos.y} 
                stroke="url(#beamGradient)" 
                strokeWidth="2.0"
                strokeOpacity="0.85"
              />

              {/* Laser Crosshair Target Lock-On at Cursor */}
              <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`}>
                {/* Outer Spinning Reticle */}
                <circle 
                  r="14" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="1.5" 
                  strokeDasharray="6, 4"
                  className="animate-spin"
                  style={{ animationDuration: '4s' }}
                />
                {/* Inner Reticle */}
                <circle 
                  r="6" 
                  fill="none" 
                  stroke="#fbbf24" 
                  strokeWidth="1.5" 
                />
                {/* Center Core Dot */}
                <circle 
                  r="2.5" 
                  fill="#f59e0b" 
                  filter="url(#swordLaserGlow)"
                />
              </g>

              {/* Slash Strike Burst Effect on Click */}
              {isSlashing && (
                <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`}>
                  <line 
                    x1="-40" 
                    y1="-40" 
                    x2="40" 
                    y2="40" 
                    stroke="#fff" 
                    strokeWidth="4" 
                    filter="url(#swordLaserGlow)" 
                  />
                  <line 
                    x1="-30" 
                    y1="30" 
                    x2="30" 
                    y2="-30" 
                    stroke="#fbbf24" 
                    strokeWidth="3" 
                    filter="url(#swordLaserGlow)" 
                  />
                </g>
              )}
            </svg>
          )}

          {/* Interactive Helper Badge */}
          <div className="mt-2 text-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/40 text-[11px] font-bold text-amber-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Tia thần kiếm khóa mục tiêu theo chuột • Click để chém kiếm</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. G-BOT 3D THREE.JS ROBOT MODE                            */}
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
