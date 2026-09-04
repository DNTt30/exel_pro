import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * GS25 3D Mascot Copilot - "G-Bot"
 * - Interactive 3D robot character built with Three.js.
 * - Right cyber arm & pointing finger continuously track and aim at the mouse cursor in real-time 3D world space.
 * - Head and eyes dynamically follow cursor with smooth damping and natural blinking.
 * - Floating zero-gravity bobbing animation with glowing plasma thruster.
 * - High performance: lightweight procedural geometries, zero external assets, automatic resource cleanup.
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '340px',
  focusField = null 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0)); // initial position facing slightly towards form
  const isPointerDownRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 320;
    let heightPx = container.clientHeight || 340;

    // ── 1. Scene & Camera Setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(0, 0.1, 4.3);
    camera.updateMatrixWorld();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, heightPx, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // ── 2. Lights ──
    const ambientLight = new THREE.AmbientLight(0x8ba2c4, 1.1);
    scene.add(ambientLight);

    // Key Light (warm white)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    // Rim Light (cyber cyan)
    const rimLight = new THREE.DirectionalLight(0x00f5ff, 2.8);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Fill Light (soft blue)
    const fillLight = new THREE.DirectionalLight(0x3b82f6, 1.0);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // ── 3. Materials ──
    const whiteBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.28
    });

    const gs25BlueMat = new THREE.MeshStandardMaterial({
      color: 0x0072ce, // GS25 Signature Blue
      roughness: 0.25,
      metalness: 0.4
    });

    const darkVisorMat = new THREE.MeshStandardMaterial({
      color: 0x050a14,
      roughness: 0.04,
      metalness: 0.95
    });

    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff
    });

    const laserBeamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35
    });

    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xff7a00, // GS25 Orange Accent
      roughness: 0.3,
      metalness: 0.25
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.8
    });

    const thrusterFlameMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.65
    });

    // ── 4. Build Mascot Hierarchy ──
    const mascotRoot = new THREE.Group();
    scene.add(mascotRoot);

    // Floating Mascot Wrapper
    const mascot = new THREE.Group();
    mascotRoot.add(mascot);

    // -- Torso Group --
    const bodyGroup = new THREE.Group();
    mascot.add(bodyGroup);

    // Chest Body (Capsule/Cylinder)
    const torsoGeo = new THREE.CylinderGeometry(0.48, 0.38, 0.85, 32);
    const torso = new THREE.Mesh(torsoGeo, gs25BlueMat);
    torso.position.y = 0;
    bodyGroup.add(torso);

    // Chest Front Armor Plate (White Ceramic)
    const chestPlateGeo = new THREE.CylinderGeometry(0.49, 0.40, 0.72, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
    const chestPlate = new THREE.Mesh(chestPlateGeo, whiteBodyMat);
    chestPlate.position.y = 0.04;
    bodyGroup.add(chestPlate);

    // Orange GS25 Stripe on Torso
    const stripeGeo = new THREE.CylinderGeometry(0.495, 0.45, 0.08, 32, 1, false, -Math.PI / 4, Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, orangeAccentMat);
    stripe.position.set(0, 0.16, 0);
    bodyGroup.add(stripe);

    // Glowing Arc Core / Logo Reactor
    const coreRingGeo = new THREE.TorusGeometry(0.12, 0.025, 16, 32);
    const coreRing = new THREE.Mesh(coreRingGeo, titaniumMat);
    coreRing.position.set(0, 0.02, 0.46);
    bodyGroup.add(coreRing);

    const coreDiscGeo = new THREE.CircleGeometry(0.09, 32);
    const coreDisc = new THREE.Mesh(coreDiscGeo, cyanGlowMat);
    coreDisc.position.set(0, 0.02, 0.47);
    bodyGroup.add(coreDisc);

    // Hover Thruster (Bottom)
    const nozzleGeo = new THREE.ConeGeometry(0.28, 0.32, 32, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, titaniumMat);
    nozzle.position.set(0, -0.48, 0);
    nozzle.rotation.x = Math.PI;
    bodyGroup.add(nozzle);

    const thrusterRingGeo = new THREE.TorusGeometry(0.22, 0.03, 16, 32);
    const thrusterRing = new THREE.Mesh(thrusterRingGeo, cyanGlowMat);
    thrusterRing.position.set(0, -0.62, 0);
    thrusterRing.rotation.x = Math.PI / 2;
    bodyGroup.add(thrusterRing);

    const flameGeo = new THREE.ConeGeometry(0.18, 0.45, 24);
    const flame = new THREE.Mesh(flameGeo, thrusterFlameMat);
    flame.position.set(0, -0.84, 0);
    flame.rotation.x = Math.PI;
    bodyGroup.add(flame);

    // -- Head Group --
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.6, 0);
    mascot.add(headPivot);

    // Neck Joint
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.16, 24);
    const neck = new THREE.Mesh(neckGeo, titaniumMat);
    neck.position.set(0, -0.04, 0);
    headPivot.add(neck);

    // Helmet (Cute Round White Head)
    const helmetGeo = new THREE.SphereGeometry(0.5, 32, 32);
    helmetGeo.scale(1, 0.95, 1);
    const helmet = new THREE.Mesh(helmetGeo, whiteBodyMat);
    helmet.position.set(0, 0.32, 0);
    headPivot.add(helmet);

    // Dark Visor Screen
    const visorGeo = new THREE.SphereGeometry(0.44, 32, 16, 0, Math.PI, 0, Math.PI / 1.7);
    const visor = new THREE.Mesh(visorGeo, darkVisorMat);
    visor.position.set(0, 0.31, 0.12);
    visor.rotation.x = -Math.PI / 12;
    headPivot.add(visor);

    // Glowing Digital Eyes
    const eyeGeo = new THREE.CapsuleGeometry(0.045, 0.08, 12, 16);
    eyeGeo.rotateZ(Math.PI / 2);

    const leftEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    leftEye.position.set(-0.16, 0.33, 0.5);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    rightEye.position.set(0.16, 0.33, 0.5);
    headPivot.add(rightEye);

    // Side Cyber Ear-Pods (Cyan Rings)
    const earGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 24);
    earGeo.rotateZ(Math.PI / 2);

    const leftEar = new THREE.Mesh(earGeo, gs25BlueMat);
    leftEar.position.set(-0.52, 0.32, 0);
    headPivot.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, gs25BlueMat);
    rightEar.position.set(0.52, 0.32, 0);
    headPivot.add(rightEar);

    const earRingGeo = new THREE.TorusGeometry(0.11, 0.02, 12, 24);
    earRingGeo.rotateY(Math.PI / 2);
    const leftEarRing = new THREE.Mesh(earRingGeo, cyanGlowMat);
    leftEarRing.position.set(-0.58, 0.32, 0);
    headPivot.add(leftEarRing);

    const rightEarRing = new THREE.Mesh(earRingGeo, cyanGlowMat);
    rightEarRing.position.set(0.58, 0.32, 0);
    headPivot.add(rightEarRing);

    // Antenna on Helmet
    const antennaStickGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.28, 16);
    const antennaStick = new THREE.Mesh(antennaStickGeo, titaniumMat);
    antennaStick.position.set(0.24, 0.86, -0.05);
    antennaStick.rotation.z = -0.3;
    headPivot.add(antennaStick);

    const antennaOrbGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const antennaOrb = new THREE.Mesh(antennaOrbGeo, cyanGlowMat);
    antennaOrb.position.set(0.32, 1.0, -0.05);
    headPivot.add(antennaOrb);

    // -- Left Arm (Resting on Hip / Waving) --
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.56, 0.25, 0);
    mascot.add(leftArmPivot);

    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), gs25BlueMat);
    leftArmPivot.add(leftShoulder);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 16), whiteBodyMat);
    leftUpperArm.position.set(-0.1, -0.16, 0);
    leftUpperArm.rotation.z = 0.45;
    leftArmPivot.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 16), gs25BlueMat);
    leftForearm.position.set(-0.16, -0.4, 0.12);
    leftForearm.rotation.set(-0.5, 0, 0.2);
    leftArmPivot.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), titaniumMat);
    leftHand.position.set(-0.18, -0.56, 0.22);
    leftArmPivot.add(leftHand);

    // ── THE INTERACTIVE CURSOR-TRACKING POINTER ARM ──
    // Placed on the viewer's right (x = +0.56) facing towards the login form & inputs!
    const pointerArmPivot = new THREE.Group();
    pointerArmPivot.position.set(0.56, 0.25, 0);
    mascot.add(pointerArmPivot);

    // Dummy helper object for computing lookAt orientation
    const armLookAtDummy = new THREE.Object3D();
    armLookAtDummy.position.copy(pointerArmPivot.position);
    mascot.add(armLookAtDummy);

    // All parts of the pointer arm extend forward along +Z axis so lookAt(target) aligns perfectly!
    const pointerShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 20), gs25BlueMat);
    pointerArmPivot.add(pointerShoulder);

    // Upper Arm Cylinder along +Z
    const pointerUpperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.4, 16);
    pointerUpperArmGeo.rotateX(Math.PI / 2);
    const pointerUpperArm = new THREE.Mesh(pointerUpperArmGeo, whiteBodyMat);
    pointerUpperArm.position.set(0, 0, 0.2);
    pointerArmPivot.add(pointerUpperArm);

    // Elbow Joint
    const pointerElbow = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), titaniumMat);
    pointerElbow.position.set(0, 0, 0.42);
    pointerArmPivot.add(pointerElbow);

    // Forearm Cylinder along +Z
    const pointerForearmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.42, 16);
    pointerForearmGeo.rotateX(Math.PI / 2);
    const pointerForearm = new THREE.Mesh(pointerForearmGeo, gs25BlueMat);
    pointerForearm.position.set(0, 0, 0.65);
    pointerArmPivot.add(pointerForearm);

    // Wrist Ring with Glowing Cyan LED
    const wristGeo = new THREE.TorusGeometry(0.075, 0.018, 12, 24);
    const wristRing = new THREE.Mesh(wristGeo, cyanGlowMat);
    wristRing.position.set(0, 0, 0.86);
    pointerArmPivot.add(wristRing);

    // Hand Palm
    const palmGeo = new THREE.SphereGeometry(0.085, 16, 16);
    palmGeo.scale(1, 0.8, 1.2);
    const pointerPalm = new THREE.Mesh(palmGeo, titaniumMat);
    pointerPalm.position.set(0, 0, 0.98);
    pointerArmPivot.add(pointerPalm);

    // Curled Finger Knuckles (thumb + other fingers)
    const curledGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const curl1 = new THREE.Mesh(curledGeo, titaniumMat);
    curl1.position.set(0.05, -0.04, 1.02);
    pointerArmPivot.add(curl1);

    const curl2 = new THREE.Mesh(curledGeo, titaniumMat);
    curl2.position.set(-0.04, -0.03, 1.02);
    pointerArmPivot.add(curl2);

    // ── OUTSTRETCHED INDEX POINTER FINGER ──
    const fingerGeo = new THREE.CylinderGeometry(0.026, 0.032, 0.28, 14);
    fingerGeo.rotateX(Math.PI / 2);
    const indexFinger = new THREE.Mesh(fingerGeo, whiteBodyMat);
    indexFinger.position.set(0.01, 0.02, 1.18);
    pointerArmPivot.add(indexFinger);

    // Glowing Cyan Laser Fingertip
    const fingerTipGeo = new THREE.SphereGeometry(0.032, 16, 16);
    const fingerTip = new THREE.Mesh(fingerTipGeo, cyanGlowMat);
    fingerTip.position.set(0.01, 0.02, 1.32);
    pointerArmPivot.add(fingerTip);

    // Tapered Laser Pointer Beam shooting from index finger
    const beamGeo = new THREE.CylinderGeometry(0.006, 0.035, 1.8, 12);
    beamGeo.rotateX(Math.PI / 2);
    const laserBeam = new THREE.Mesh(beamGeo, laserBeamMat);
    laserBeam.position.set(0.01, 0.02, 2.25);
    pointerArmPivot.add(laserBeam);

    // ── 5. Mouse & Window Raycasting Setup ──
    const raycaster = new THREE.Raycaster();
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z = 0 plane
    const worldCursorTarget = new THREE.Vector3(2.5, 0.2, 0); // default aiming toward login form
    const headTargetDummy = new THREE.Object3D();

    const onPointerMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Calculate normalized device coordinates (-1 to +1) relative to canvas
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    const onPointerDown = () => {
      isPointerDownRef.current = true;
    };

    const onPointerUp = () => {
      isPointerDownRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // ── 6. Resize Observer ──
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          heightPx = cr.height;
          camera.aspect = width / heightPx;
          camera.updateProjectionMatrix();
          renderer.setSize(width, heightPx, false);
        }
      }
    });
    ro.observe(container);

    // ── 7. Animation Loop ──
    let animId;
    let clock = new THREE.Clock();
    let blinkTimer = 0;
    let nextBlinkTime = 3.5;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Soft zero-gravity floating bob
      mascot.position.y = Math.sin(elapsedTime * 2.2) * 0.07;
      mascot.rotation.z = Math.sin(elapsedTime * 1.5) * 0.025;

      // Thruster flame flicker & core pulse
      flame.scale.y = 0.85 + Math.sin(elapsedTime * 18) * 0.25;
      thrusterFlameMat.opacity = 0.45 + Math.sin(elapsedTime * 14) * 0.25;
      coreRing.rotation.z = elapsedTime * 0.8;

      // Pulse laser beam
      laserBeamMat.opacity = 0.25 + Math.sin(elapsedTime * 6) * 0.15;

      // Eye blinking logic
      blinkTimer += 0.016;
      if (blinkTimer > nextBlinkTime) {
        leftEye.scale.y = 0.1;
        rightEye.scale.y = 0.1;
        if (blinkTimer > nextBlinkTime + 0.14) {
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
          blinkTimer = 0;
          nextBlinkTime = 3.0 + Math.random() * 3.5;
        }
      }

      // ── Cursor 3D Raycasting & Arm Aiming ──
      const mx = THREE.MathUtils.clamp(mouseRef.current.x, -3.5, 3.5);
      const my = THREE.MathUtils.clamp(mouseRef.current.y, -2.5, 2.5);

      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      raycaster.ray.intersectPlane(targetPlane, worldCursorTarget);

      // Arm LookAt targeting
      armLookAtDummy.position.copy(pointerArmPivot.position);
      armLookAtDummy.lookAt(worldCursorTarget);

      // Smoothly slerp arm rotation towards cursor target
      pointerArmPivot.quaternion.slerp(armLookAtDummy.quaternion, 0.12);

      // Pointer click recoil reaction
      if (isPointerDownRef.current) {
        pointerArmPivot.position.z = THREE.MathUtils.lerp(pointerArmPivot.position.z, 0.12, 0.2);
      } else {
        pointerArmPivot.position.z = THREE.MathUtils.lerp(pointerArmPivot.position.z, 0, 0.1);
      }

      // Head lookAt targeting
      headTargetDummy.position.copy(headPivot.position);
      headTargetDummy.lookAt(
        worldCursorTarget.x * 0.45,
        worldCursorTarget.y * 0.45 + 0.6,
        worldCursorTarget.z + 2.8
      );
      headPivot.quaternion.slerp(headTargetDummy.quaternion, 0.075);

      // Subtle torso lean
      bodyGroup.rotation.y = THREE.MathUtils.lerp(bodyGroup.rotation.y, (mx * 0.15), 0.05);

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    // ── 8. Cleanup on Unmount ──
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      ro.disconnect();

      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [focusField]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full overflow-visible pointer-events-none ${className}`}
      style={{ height }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        style={{ touchAction: 'none' }}
      />
      
      {/* Interactive Helper Badge */}
      <div className="absolute bottom-1 inset-x-0 flex items-center justify-center pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-cyan-400/30 text-[11px] font-bold text-cyan-300 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>G-Bot 3D Copilot • Luôn theo sát thao tác chuột</span>
        </div>
      </div>
    </div>
  );
}
