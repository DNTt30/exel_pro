import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import chibiCutoutImg from '../../assets/chibi_cutout.png';
import { Sparkles, Box, Upload, RefreshCw, Eye } from 'lucide-react';

/**
 * GS25 3D Mascot System:
 * - Chế độ 1: "Three.js 3D WebGL" (Đồ họa 3D thời gian thực 60fps, mắt & đầu xoay theo vector chuột 3D)
 * - Chế độ 2: "Chibi 2.5D" (Ảnh vẽ tay anime nguyên bản, 3D Parallax Perspective, bóng đổ 2 tầng)
 * - Hỗ trợ nạp mô hình .glb / .gltf bất kỳ (Kéo thả hoặc tải lên) với tự động gán xương Head / Eyes!
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '360px',
  _focusField = null 
}) {
  const [activeTab, setActiveTab] = useState('threejs'); // 'threejs' | 'chibi'
  const [customModelName, setCustomModelName] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isCheering, setIsCheering] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // REFS CHO THREE.JS SCENE
  // ─────────────────────────────────────────────────────────────
  const threeMountRef = useRef(null);
  const threeSceneRef = useRef(null);
  const threeRendererRef = useRef(null);
  const threeCameraRef = useRef(null);
  const threeAnimFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // 3D Objects in Three.js
  const headGroupRef = useRef(null);
  const eyesGroupRef = useRef(null);
  const bodyGroupRef = useRef(null);
  const customModelRef = useRef(null);
  const customBonesRef = useRef({ head: null, leftEye: null, rightEye: null });
  const mixerRef = useRef(null);

  // Mouse tracking in 3D: [-1, 1]
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurRef = useRef({ x: 0, y: 0 });

  // ─────────────────────────────────────────────────────────────
  // REFS CHO CHIBI 2.5D PARALLAX MODE
  // ─────────────────────────────────────────────────────────────
  const chibiTargetRef = useRef({ x: 0.2, y: -0.1 });
  const chibiCurRef = useRef({ x: 0.2, y: -0.1 });
  const chibiAnimFrameRef = useRef(null);
  const [chibiMotion, setChibiMotion] = useState({
    rotX: 0, rotY: 0, rotZ: 0, transX: 0,
    shadowOffsetX: 0, shadowSkew: 0, lightX: 50, lightY: 40
  });

  // ─────────────────────────────────────────────────────────────
  // 1. GLOBAL POINTER TRACKING
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx; // [-1, 1]
      const ny = (e.clientY - cy) / cy;

      mouseTargetRef.current = {
        x: Math.max(-1.2, Math.min(1.2, nx)),
        y: Math.max(-1.0, Math.min(1.0, ny))
      };

      chibiTargetRef.current = {
        x: Math.max(-1.2, Math.min(1.2, nx)),
        y: Math.max(-1.0, Math.min(1.0, ny))
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. CHIBI 2.5D PARALLAX LOOP
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'chibi') return;

    let lastTime = performance.now();
    const updateChibi = (now) => {
      chibiAnimFrameRef.current = requestAnimationFrame(updateChibi);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const cur = chibiCurRef.current;
      const target = chibiTargetRef.current;
      const factor = 1.0 - Math.exp(-8.5 * dt);

      cur.x += (target.x - cur.x) * factor;
      cur.y += (target.y - cur.y) * factor;

      setChibiMotion({
        rotY: cur.x * 22,
        rotX: -cur.y * 16,
        rotZ: cur.x * -2.2,
        transX: cur.x * 6,
        shadowOffsetX: -cur.x * 20,
        shadowSkew: -cur.x * 14,
        lightX: 50 + cur.x * 30,
        lightY: 40 + cur.y * 24
      });
    };

    chibiAnimFrameRef.current = requestAnimationFrame(updateChibi);
    return () => {
      if (chibiAnimFrameRef.current) cancelAnimationFrame(chibiAnimFrameRef.current);
    };
  }, [activeTab]);

  // ─────────────────────────────────────────────────────────────
  // 3. BUILD PROCEDURAL 3D GS25 CHIBI MASCOT IN THREE.JS
  // ─────────────────────────────────────────────────────────────
  const buildProceduralChibiMascot = useCallback((scene) => {
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -0.4, 0);

    // MATERIAL PALETTE
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe0bd,
      roughness: 0.4,
      metalness: 0.05
    });

    const coatWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1
    });

    const gs25BlueMat = new THREE.MeshStandardMaterial({
      color: 0x0072bc,
      roughness: 0.2,
      metalness: 0.25
    });

    const gs25CyanMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      roughness: 0.15,
      metalness: 0.3,
      emissive: 0x0088cc,
      emissiveIntensity: 0.25
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.4
    });

    const glassLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.75,
      ior: 1.5
    });

    // 1. BODY & LAB COAT
    const bodyGroup = new THREE.Group();
    bodyGroupRef.current = bodyGroup;

    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.72, 32);
    const torsoMesh = new THREE.Mesh(torsoGeo, coatWhiteMat);
    torsoMesh.position.y = 0.55;
    torsoMesh.castShadow = true;
    bodyGroup.add(torsoMesh);

    const lapelGeo = new THREE.BoxGeometry(0.32, 0.35, 0.42);
    const lapelMesh = new THREE.Mesh(lapelGeo, gs25BlueMat);
    lapelMesh.position.set(0, 0.72, 0.06);
    bodyGroup.add(lapelMesh);

    const gemGeo = new THREE.OctahedronGeometry(0.09, 0);
    const gemMesh = new THREE.Mesh(gemGeo, gs25CyanMat);
    gemMesh.position.set(0, 0.65, 0.25);
    gemMesh.rotation.y = Math.PI / 4;
    bodyGroup.add(gemMesh);

    const bootGeo = new THREE.CapsuleGeometry(0.12, 0.18, 16, 16);
    const bootL = new THREE.Mesh(bootGeo, darkTrimMat);
    bootL.position.set(-0.22, 0.12, 0.05);
    bootL.rotation.x = Math.PI / 2.3;
    bootL.castShadow = true;
    bodyGroup.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, darkTrimMat);
    bootR.position.set(0.22, 0.12, 0.05);
    bootR.rotation.x = Math.PI / 2.3;
    bootR.castShadow = true;
    bodyGroup.add(bootR);

    characterGroup.add(bodyGroup);

    // 2. HEAD & EXPRESSIVE EYES
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);
    headGroupRef.current = headGroup;

    const headGeo = new THREE.SphereGeometry(0.68, 36, 36);
    headGeo.scale(1.05, 0.98, 1.0);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    const hairGeo = new THREE.SphereGeometry(0.72, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const hairMesh = new THREE.Mesh(hairGeo, gs25BlueMat);
    hairMesh.position.set(0, 0.05, -0.05);
    hairMesh.rotation.x = -0.2;
    headGroup.add(hairMesh);

    const tuftGeo = new THREE.ConeGeometry(0.18, 0.45, 16);
    const tuftMesh = new THREE.Mesh(tuftGeo, gs25CyanMat);
    tuftMesh.position.set(0, 0.58, 0.52);
    tuftMesh.rotation.x = -0.6;
    headGroup.add(tuftMesh);

    const goggleFrameGeo = new THREE.TorusGeometry(0.22, 0.045, 16, 32);
    const goggleL = new THREE.Mesh(goggleFrameGeo, darkTrimMat);
    goggleL.position.set(-0.28, 0.42, 0.55);
    headGroup.add(goggleL);

    const lensL = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), glassLensMat);
    lensL.position.set(-0.28, 0.42, 0.56);
    headGroup.add(lensL);

    const goggleR = new THREE.Mesh(goggleFrameGeo, darkTrimMat);
    goggleR.position.set(0.28, 0.42, 0.55);
    headGroup.add(goggleR);

    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), glassLensMat);
    lensR.position.set(0.28, 0.42, 0.56);
    headGroup.add(lensR);

    const bridgeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16);
    const bridge = new THREE.Mesh(bridgeGeo, darkTrimMat);
    bridge.position.set(0, 0.42, 0.58);
    bridge.rotation.z = Math.PI / 2;
    headGroup.add(bridge);

    // 3. DYNAMIC 3D EYEBALL RIG
    const eyesGroup = new THREE.Group();
    eyesGroupRef.current = eyesGroup;

    const createEye = (posX) => {
      const eyeParent = new THREE.Group();
      eyeParent.position.set(posX, 0.02, 0.56);

      const scleraGeo = new THREE.SphereGeometry(0.18, 24, 24);
      scleraGeo.scale(1.0, 1.25, 0.45);
      const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      eyeParent.add(sclera);

      const pupilGeo = new THREE.CircleGeometry(0.11, 32);
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, -0.02, 0.08);

      const glintGeo = new THREE.CircleGeometry(0.038, 16);
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(-0.035, 0.045, 0.005);
      pupil.add(glint);

      eyeParent.add(pupil);
      return { parent: eyeParent, pupil };
    };

    const leftEye = createEye(-0.25);
    const rightEye = createEye(0.25);
    eyesGroup.add(leftEye.parent);
    eyesGroup.add(rightEye.parent);
    eyesGroup.userData = { leftPupil: leftEye.pupil, rightPupil: rightEye.pupil };

    headGroup.add(eyesGroup);
    characterGroup.add(headGroup);

    // 4. FLOATING HANDS
    const handMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const handGeo = new THREE.SphereGeometry(0.14, 20, 20);

    const handL = new THREE.Mesh(handGeo, handMat);
    handL.position.set(-0.62, 0.48, 0.22);
    handL.castShadow = true;
    characterGroup.add(handL);

    const handR = new THREE.Mesh(handGeo, handMat);
    handR.position.set(0.62, 0.48, 0.22);
    handR.castShadow = true;
    characterGroup.add(handR);

    // 5. HOLOGRAPHIC GS25 CYBER PODIUM
    const podiumGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.08, 36);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0b132b,
      roughness: 0.2,
      metalness: 0.8
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = 0.04;
    podium.receiveShadow = true;
    characterGroup.add(podium);

    const ringGeo = new THREE.TorusGeometry(0.86, 0.02, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.08;
    ring.rotation.x = Math.PI / 2;
    characterGroup.add(ring);

    scene.add(characterGroup);
    return characterGroup;
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 4. PARSE & LOAD CUSTOM GLTF / GLB MODEL
  // ─────────────────────────────────────────────────────────────
  const loadGLBFile = useCallback((fileOrUrl) => {
    if (!threeSceneRef.current) return;
    setIsLoadingModel(true);
    setLoadError(null);

    const loader = new GLTFLoader();

    const onModelLoaded = (gltf) => {
      const scene = threeSceneRef.current;
      if (!scene) return;

      if (customModelRef.current) {
        scene.remove(customModelRef.current);
        customModelRef.current = null;
      }
      if (headGroupRef.current) {
        headGroupRef.current.parent?.remove(headGroupRef.current);
        headGroupRef.current = null;
      }

      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Auto-center & Scale
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.85 / (maxDim || 1);
      model.scale.set(scale, scale, scale);
      model.position.x = -center.x * scale;
      model.position.y = -box.min.y * scale - 0.4;
      model.position.z = -center.z * scale;

      // Scan for Head & Eye Bones
      let headBone = null;
      let leftEye = null;
      let rightEye = null;

      model.traverse((child) => {
        const name = child.name.toLowerCase();
        if (!headBone && (name.includes('head') || name.includes('neck'))) {
          headBone = child;
        }
        if (!leftEye && (name.includes('eye_l') || name.includes('eyel') || name.includes('left_eye'))) {
          leftEye = child;
        }
        if (!rightEye && (name.includes('eye_r') || name.includes('eyer') || name.includes('right_eye'))) {
          rightEye = child;
        }
      });

      customBonesRef.current = { head: headBone, leftEye, rightEye };
      customModelRef.current = model;

      if (gltf.animations && gltf.animations.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(model);
        const action = mixerRef.current.clipAction(gltf.animations[0]);
        action.play();
      }

      scene.add(model);
      setIsLoadingModel(false);
      setCustomModelName(typeof fileOrUrl === 'string' ? 'mascot.glb' : fileOrUrl.name);
    };

    if (typeof fileOrUrl === 'string') {
      loader.load(
        fileOrUrl,
        onModelLoaded,
        undefined,
        (_err) => {
          setIsLoadingModel(false);
          setLoadError('Không tìm thấy file mẫu mặc định. Bạn có thể tải file .glb tùy chọn!');
          if (threeSceneRef.current && !customModelRef.current) {
            buildProceduralChibiMascot(threeSceneRef.current);
          }
        }
      );
    } else {
      const reader = new FileReader();
      reader.readAsArrayBuffer(fileOrUrl);
      reader.onload = (e) => {
        loader.parse(
          e.target.result,
          '',
          onModelLoaded,
          (_err) => {
            setIsLoadingModel(false);
            setLoadError('Lỗi đọc file .glb! Vui lòng kiểm tra định dạng.');
          }
        );
      };
    }
  }, [buildProceduralChibiMascot]);

  // ─────────────────────────────────────────────────────────────
  // 5. INITIALIZE THREE.JS SCENE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'threejs') return;

    const mount = threeMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const heightPx = mount.clientHeight || 340;

    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 50);
    camera.position.set(0, 0.95, 3.4);
    threeCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    threeRendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(2.5, 4.5, 3.0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x00d2ff, 3.5, 8);
    rimLight.position.set(-2.5, 2.2, -1.5);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xffedd5, 1.8, 6);
    warmLight.position.set(2.0, 1.5, 2.0);
    scene.add(warmLight);

    const shadowPlaneGeo = new THREE.PlaneGeometry(6, 6);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.4;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    buildProceduralChibiMascot(scene);

    const defaultGlbPath = `${import.meta.env.BASE_URL}models/mascot.glb`;
    fetch(defaultGlbPath, { method: 'HEAD' })
      .then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('octet-stream')) {
          loadGLBFile(defaultGlbPath);
        }
      })
      .catch(() => {});

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let clock = new THREE.Clock();
    const animate = () => {
      threeAnimFrameRef.current = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (mixerRef.current) mixerRef.current.update(dt);

      const cur = mouseCurRef.current;
      const target = mouseTargetRef.current;
      cur.x += (target.x - cur.x) * (1.0 - Math.exp(-9.0 * dt));
      cur.y += (target.y - cur.y) * (1.0 - Math.exp(-9.0 * dt));

      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = cur.x * 0.42;
        headGroupRef.current.rotation.x = -cur.y * 0.28;
        headGroupRef.current.rotation.z = -cur.x * 0.08;

        if (eyesGroupRef.current?.userData?.leftPupil) {
          const lp = eyesGroupRef.current.userData.leftPupil;
          const rp = eyesGroupRef.current.userData.rightPupil;
          const eyeShiftX = THREE.MathUtils.clamp(cur.x * 0.038, -0.045, 0.045);
          const eyeShiftY = THREE.MathUtils.clamp(-cur.y * 0.032, -0.035, 0.035);

          lp.position.x = eyeShiftX;
          lp.position.y = eyeShiftY;
          rp.position.x = eyeShiftX;
          rp.position.y = eyeShiftY;
        }

        const breathe = Math.sin(elapsed * 2.2) * 0.02;
        headGroupRef.current.position.y = 1.25 + breathe;

        if (bodyGroupRef.current) {
          bodyGroupRef.current.position.y = breathe * 0.5;
        }
      }

      const bones = customBonesRef.current;
      if (bones.head) {
        bones.head.rotation.y = cur.x * 0.5;
        bones.head.rotation.x = -cur.y * 0.35;
      }
      if (bones.leftEye) {
        bones.leftEye.rotation.y = cur.x * 0.3;
        bones.leftEye.rotation.x = -cur.y * 0.2;
      }
      if (bones.rightEye) {
        bones.rightEye.rotation.y = cur.x * 0.3;
        bones.rightEye.rotation.x = -cur.y * 0.2;
      }

      renderer.render(scene, camera);
    };

    threeAnimFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeAnimFrameRef.current) cancelAnimationFrame(threeAnimFrameRef.current);
      renderer.dispose();
    };
  }, [activeTab, buildProceduralChibiMascot, loadGLBFile]);

  const handleMascotClick = () => {
    setIsCheering(true);
    setTimeout(() => setIsCheering(false), 500);

    if (headGroupRef.current) {
      headGroupRef.current.position.y += 0.2;
      setTimeout(() => {
        if (headGroupRef.current) headGroupRef.current.position.y -= 0.2;
      }, 250);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        loadGLBFile(file);
      } else {
        setLoadError('Vui lòng chọn file 3D định dạng .glb hoặc .gltf');
      }
    }
  };

  return (
    <div 
      className={`relative w-full flex flex-col items-center select-none ${className}`}
      style={{ minHeight: height }}
    >
      {/* MODE SWITCHER TABS */}
      <div className="flex items-center gap-1.5 p-1 mb-2 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg z-20">
        <button
          type="button"
          onClick={() => setActiveTab('threejs')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            activeTab === 'threejs'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box size={13} />
          <span>Three.js 3D WebGL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chibi')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            activeTab === 'chibi'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye size={13} />
          <span>Chibi 2.5D Anime</span>
        </button>
      </div>

      {/* VIEW 1: THREE.JS 3D WEBGL ENGINE */}
      {activeTab === 'threejs' && (
        <div 
          className="relative w-full flex flex-col items-center cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleMascotClick}
        >
          <div 
            ref={threeMountRef} 
            className="w-full max-w-[320px] aspect-[1/1] flex items-center justify-center relative pointer-events-auto"
            style={{ height: '280px' }}
          />

          {isLoadingModel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs rounded-2xl">
              <RefreshCw size={24} className="text-cyan-400 animate-spin mb-2" />
              <span className="text-xs text-cyan-200 font-semibold">Đang nạp mô hình 3D...</span>
            </div>
          )}

          {loadError && (
            <div className="absolute top-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] text-amber-300 font-medium">
              {loadError}
            </div>
          )}

          <div className="mt-1 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".glb,.gltf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) loadGLBFile(e.target.files[0]);
              }} 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 shadow-md transition-all hover:scale-105 active:scale-95"
              title="Tải lên tệp .glb hoặc .gltf từ máy bạn để hiển thị trực tiếp"
            >
              <Upload size={12} />
              <span>{customModelName ? `Mẫu: ${customModelName}` : 'Nạp file .glb của bạn'}</span>
            </button>

            {customModelName && (
              <button
                type="button"
                onClick={() => {
                  setCustomModelName(null);
                  if (threeSceneRef.current) {
                    if (customModelRef.current) threeSceneRef.current.remove(customModelRef.current);
                    customModelRef.current = null;
                    buildProceduralChibiMascot(threeSceneRef.current);
                  }
                }}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-700"
                title="Quay lại Mascot 3D mặc định"
              >
                <RefreshCw size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CHIBI 2.5D PARALLAX MODE */}
      {activeTab === 'chibi' && (
        <div 
          style={{ perspective: '1100px' }}
          className="w-full flex justify-center items-center py-1 cursor-pointer"
          onClick={() => {
            setIsCheering(true);
            setTimeout(() => setIsCheering(false), 500);
          }}
        >
          <div 
            style={{
              transform: `rotateX(${chibiMotion.rotX}deg) rotateY(${chibiMotion.rotY}deg) rotateZ(${chibiMotion.rotZ}deg) translateX(${chibiMotion.transX}px) translateY(${isCheering ? '-24px' : '0px'})`,
              transformStyle: 'preserve-3d',
              transition: isCheering ? 'transform 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.28)' : 'none'
            }}
            className="relative w-full max-w-[280px] aspect-[855/1024] flex items-center justify-center pointer-events-auto"
          >
            <div 
              className="absolute -bottom-2 w-36 h-5 bg-slate-950/85 rounded-full blur-[3px] pointer-events-none"
              style={{ transform: 'translateZ(-20px)' }}
            />
            <div 
              className="absolute -bottom-4 w-52 h-11 bg-slate-950/65 rounded-full blur-xl pointer-events-none"
              style={{
                transform: `translateZ(-30px) translateX(${chibiMotion.shadowOffsetX}px) skewX(${chibiMotion.shadowSkew}deg)`
              }}
            />

            <div className="relative w-full h-full" style={{ transform: 'translateZ(0px)' }}>
              <img 
                src={chibiCutoutImg} 
                alt="Chibi Scientist" 
                className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.65)] brightness-[1.03] contrast-[1.04] pointer-events-none select-none"
              />
              <div 
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  background: `radial-gradient(circle at ${chibiMotion.lightX}% ${chibiMotion.lightY}%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 38%, transparent 65%)`,
                  mixBlendMode: 'overlay'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Status Ticker */}
      <div className="mt-2 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/30 text-[11px] font-bold text-cyan-300 shadow-md">
          <Sparkles size={12} className="text-cyan-400" />
          <span>
            {activeTab === 'threejs' 
              ? 'Three.js 60fps • Mắt & Đầu xoay theo tọa độ chuột 3D • Kéo thả file .glb' 
              : 'GS25 Chibi • Xoay 3D Parallax mượt mà • Click để tương tác'}
          </span>
        </div>
      </div>
    </div>
  );
}
