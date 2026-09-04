import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * GS25 3D Anime Knight Swordsman (Inspired by Allain - Liên Quân)
 * - Detailed 3D anime character with blond bowl-cut hair, piercing blue eyes, high collar, white & teal knight coat.
 * - Wields the legendary Golden Energy Greatsword with flaming amber edge and floating ember sparks.
 * - Dynamic 3D mouse tracking: Sword arm & blade continuously aim directly at the user's cursor in 3D world space!
 * - Head and eyes track cursor with intense warrior focus.
 * - Click reaction: sword thrust slash action.
 */
export default function GS25Mascot3D({ 
  className = '', 
  height = '340px',
  focusField = null 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0.6, 0.1)); // default aiming towards login form
  const isPointerDownRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 320;
    let heightPx = container.clientHeight || 340;

    // ── 1. Scene & Camera Setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / heightPx, 0.1, 100);
    camera.position.set(-0.15, 0.55, 4.3); // Frame from waist up
    camera.updateMatrixWorld();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, heightPx, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // ── 2. Atmospheric & Dramatic Lighting ──
    // Ambient light (cold dark slate)
    const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
    scene.add(ambientLight);

    // Key Light (cool white highlighting face and white armor)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(-3.5, 4.5, 4);
    scene.add(keyLight);

    // Cyan Rim Light (from behind/top for dramatic anime silhouette)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
    rimLight.position.set(3.5, 3.5, -3);
    scene.add(rimLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x1e293b, 0.8);
    fillLight.position.set(0, -3, 2);
    scene.add(fillLight);

    // Dynamic Golden Sword Light (casts warm amber fire on knight as sword moves)
    const swordLight = new THREE.PointLight(0xffa200, 3.2, 4.5);
    scene.add(swordLight);

    // ── 3. Materials ──
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfceade,
      roughness: 0.65,
      metalness: 0.05
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xedd69a, // Light blonde
      roughness: 0.45,
      metalness: 0.1
    });

    const hairHighlightMat = new THREE.MeshStandardMaterial({
      color: 0xffeec7, // Highlight lock
      roughness: 0.4,
      metalness: 0.08
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeIrisMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff }); // Piercing light cyan/blue
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x075985 });

    const turtleneckMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.6,
      metalness: 0.15
    });

    const whiteCoatMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.22
    });

    const tealCoatMat = new THREE.MeshStandardMaterial({
      color: 0x054f4a, // Signature Emerald/Teal Coat pattern
      roughness: 0.32,
      metalness: 0.25
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.85
    });

    const bronzeArmorMat = new THREE.MeshStandardMaterial({
      color: 0x483a2c, // Antique bronze gauntlets
      roughness: 0.32,
      metalness: 0.82
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });

    // Sword Materials
    const bladeSpineMat = new THREE.MeshStandardMaterial({
      color: 0x161c28,
      roughness: 0.2,
      metalness: 0.9
    });

    const glowingEdgeMat = new THREE.MeshBasicMaterial({
      color: 0xffb703
    });

    const flamingAuraMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    // ── 4. Build Character Hierarchy ──
    const characterRoot = new THREE.Group();
    scene.add(characterRoot);

    // Floating/Breathing Group
    const knight = new THREE.Group();
    characterRoot.add(knight);

    // ── A. Torso & Coat ──
    const torsoGroup = new THREE.Group();
    knight.add(torsoGroup);

    // Lower Waist
    const waistGeo = new THREE.CylinderGeometry(0.32, 0.30, 0.35, 24);
    const waist = new THREE.Mesh(waistGeo, turtleneckMat);
    waist.position.set(0, 0.15, 0);
    torsoGroup.add(waist);

    // Golden Belt
    const beltGeo = new THREE.CylinderGeometry(0.33, 0.31, 0.07, 24);
    const belt = new THREE.Mesh(beltGeo, goldTrimMat);
    belt.position.set(0, 0.08, 0);
    torsoGroup.add(belt);

    // Belt Dagger/Buckle Motif
    const buckleGeo = new THREE.BoxGeometry(0.08, 0.16, 0.06);
    const buckle = new THREE.Mesh(buckleGeo, goldTrimMat);
    buckle.position.set(0.12, 0.04, 0.32);
    buckle.rotation.z = -0.3;
    torsoGroup.add(buckle);

    // Coat Skirt Tails (draping down)
    const coatSkirtGeo = new THREE.ConeGeometry(0.46, 0.65, 24, 1, true);
    const coatWhiteTail = new THREE.Mesh(coatSkirtGeo, whiteCoatMat);
    coatWhiteTail.position.set(0, -0.22, 0);
    coatWhiteTail.rotation.y = Math.PI / 4;
    torsoGroup.add(coatWhiteTail);

    // Chest (V-tapered Knight Torso)
    const chestGeo = new THREE.CylinderGeometry(0.42, 0.33, 0.55, 24);
    const chest = new THREE.Mesh(chestGeo, whiteCoatMat);
    chest.position.set(0, 0.52, 0);
    torsoGroup.add(chest);

    // Teal Diagonal Cross Panel (Iconic chest pattern)
    const tealPanelGeo = new THREE.BoxGeometry(0.24, 0.52, 0.08);
    const tealPanel = new THREE.Mesh(tealPanelGeo, tealCoatMat);
    tealPanel.position.set(0.08, 0.52, 0.38);
    tealPanel.rotation.z = -0.32;
    torsoGroup.add(tealPanel);

    // Gold Trim on Chest
    const goldRibGeo = new THREE.BoxGeometry(0.03, 0.56, 0.09);
    const goldRib = new THREE.Mesh(goldRibGeo, goldTrimMat);
    goldRib.position.set(0.08, 0.52, 0.385);
    goldRib.rotation.z = -0.32;
    torsoGroup.add(goldRib);

    // High Turtle Neck Collar
    const collarGeo = new THREE.CylinderGeometry(0.19, 0.22, 0.22, 24);
    const collar = new THREE.Mesh(collarGeo, turtleneckMat);
    collar.position.set(0, 0.86, 0);
    torsoGroup.add(collar);

    const collarGoldRimGeo = new THREE.TorusGeometry(0.195, 0.015, 12, 24);
    collarGoldRimGeo.rotateX(Math.PI / 2);
    const collarGoldRim = new THREE.Mesh(collarGoldRimGeo, goldTrimMat);
    collarGoldRim.position.set(0, 0.96, 0);
    torsoGroup.add(collarGoldRim);

    // ── B. Shoulders (Pauldrons) ──
    // Right Shoulder Armor (Multi-tiered White & Gold)
    const rightPauldron = new THREE.Group();
    rightPauldron.position.set(0.44, 0.72, 0);
    const p1Geo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const p1 = new THREE.Mesh(p1Geo, whiteCoatMat);
    p1.scale.set(1.1, 0.8, 1.2);
    rightPauldron.add(p1);

    const pGoldRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 12, 24), goldTrimMat);
    pGoldRim.rotation.x = Math.PI / 2;
    pGoldRim.position.y = -0.02;
    rightPauldron.add(pGoldRim);

    const pSteelLayer = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 16), darkSteelMat);
    pSteelLayer.position.y = -0.07;
    rightPauldron.add(pSteelLayer);
    torsoGroup.add(rightPauldron);

    // Left Shoulder Armor
    const leftPauldron = rightPauldron.clone();
    leftPauldron.position.set(-0.44, 0.72, 0);
    leftPauldron.scale.x = -1;
    torsoGroup.add(leftPauldron);

    // ── C. Head & Hair Group ──
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.98, 0);
    knight.add(headPivot);

    // Anime Face
    const faceGeo = new THREE.SphereGeometry(0.24, 24, 24);
    faceGeo.scale(0.85, 1.15, 0.95);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.position.set(0, 0.16, 0.02);
    headPivot.add(face);

    // Piercing Anime Eyes
    const createEye = (xPos) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xPos, 0.19, 0.22);

      const sclera = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.038), eyeWhiteMat);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), eyeIrisMat);
      iris.position.z = 0.002;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), eyePupilMat);
      pupil.position.z = 0.003;
      eyeGroup.add(pupil);

      // Sharp upper eyelid eyeliner
      const liner = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.005), turtleneckMat);
      liner.position.set(0, 0.02, 0.004);
      eyeGroup.add(liner);

      return eyeGroup;
    };

    const leftEye = createEye(-0.085);
    headPivot.add(leftEye);

    const rightEye = createEye(0.085);
    headPivot.add(rightEye);

    // Warrior Scar on right cheek
    const scarGeo = new THREE.BoxGeometry(0.008, 0.045, 0.005);
    const scar = new THREE.Mesh(scarGeo, new THREE.MeshBasicMaterial({ color: 0xbe123c }));
    scar.position.set(0.12, 0.13, 0.22);
    scar.rotation.z = -0.4;
    headPivot.add(scar);

    // ── Signature Blond Bowl-cut Anime Hair ──
    const hairGroup = new THREE.Group();
    headPivot.add(hairGroup);

    // Hair Top Dome
    const hairDomeGeo = new THREE.SphereGeometry(0.27, 24, 24);
    hairDomeGeo.scale(0.95, 1.05, 1.05);
    const hairDome = new THREE.Mesh(hairDomeGeo, hairMat);
    hairDome.position.set(0, 0.22, -0.02);
    hairGroup.add(hairDome);

    // Front Bangs (Iconic straight/tapered fringe over forehead)
    const bangsGeo = new THREE.CylinderGeometry(0.265, 0.28, 0.18, 24, 1, false, -Math.PI / 2.3, (2 * Math.PI) / 2.3);
    const bangs = new THREE.Mesh(bangsGeo, hairMat);
    bangs.position.set(0, 0.24, 0.03);
    bangs.rotation.x = 0.15;
    hairGroup.add(bangs);

    // Front Hair Tapered Locks (Wisps)
    for (let i = -3; i <= 3; i++) {
      const lockGeo = new THREE.ConeGeometry(0.035, 0.14, 8);
      const lock = new THREE.Mesh(lockGeo, i % 2 === 0 ? hairHighlightMat : hairMat);
      lock.position.set(i * 0.042, 0.21, 0.24 - Math.abs(i) * 0.02);
      lock.rotation.z = i * -0.08;
      lock.rotation.x = Math.PI + 0.25;
      hairGroup.add(lock);
    }

    // Side Hair Flaps (framing cheeks)
    const sideHairL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.16), hairMat);
    sideHairL.position.set(-0.21, 0.18, 0.04);
    sideHairL.rotation.z = -0.15;
    hairGroup.add(sideHairL);

    const sideHairR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.16), hairMat);
    sideHairR.position.set(0.21, 0.18, 0.04);
    sideHairR.rotation.z = 0.15;
    hairGroup.add(sideHairR);

    // ── D. Left Arm (Heroic Stance on Hip) ──
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 0.70, 0);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.35, 16), turtleneckMat);
    leftUpperArm.position.set(-0.12, -0.18, 0.02);
    leftUpperArm.rotation.z = 0.55;
    leftArm.add(leftUpperArm);

    // Heavy Bronze Gauntlet (Forearm)
    const leftGauntletGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.38, 16);
    const leftGauntlet = new THREE.Mesh(leftGauntletGeo, bronzeArmorMat);
    leftGauntlet.position.set(-0.20, -0.42, 0.14);
    leftGauntlet.rotation.set(-0.6, 0, 0.3);
    leftArm.add(leftGauntlet);

    // Gauntlet Elbow Blade Flare
    const elbowFlare = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 8), bronzeArmorMat);
    elbowFlare.position.set(-0.26, -0.32, 0.02);
    elbowFlare.rotation.set(0.4, 0, 0.8);
    leftArm.add(elbowFlare);

    // Armored Gauntlet Fist on Hip
    const leftFist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), bronzeArmorMat);
    leftFist.position.set(-0.22, -0.58, 0.26);
    leftArm.add(leftFist);

    torsoGroup.add(leftArm);

    // ── E. THE INTERACTIVE SWORD ARM & BLAZING ENERGY GREATSWORD ──
    // Mounted on right shoulder (facing towards the login form & inputs)
    const swordArmPivot = new THREE.Group();
    swordArmPivot.position.set(0.46, 0.70, 0);
    knight.add(swordArmPivot);

    const armLookAtDummy = new THREE.Object3D();
    armLookAtDummy.position.copy(swordArmPivot.position);
    knight.add(armLookAtDummy);

    // Shoulder Joint
    const swordShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), turtleneckMat);
    swordArmPivot.add(swordShoulder);

    // Upper Arm along +Z
    const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.36, 16);
    upperArmGeo.rotateX(Math.PI / 2);
    const swordUpperArm = new THREE.Mesh(upperArmGeo, turtleneckMat);
    swordUpperArm.position.set(0, 0, 0.18);
    swordArmPivot.add(swordUpperArm);

    // Bronze Armored Gauntlet (Forearm)
    const gauntletGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.42, 16);
    gauntletGeo.rotateX(Math.PI / 2);
    const swordGauntlet = new THREE.Mesh(gauntletGeo, bronzeArmorMat);
    swordGauntlet.position.set(0, 0, 0.52);
    swordArmPivot.add(swordGauntlet);

    // Gauntlet Spiked Cuff
    const cuffGeo = new THREE.TorusGeometry(0.11, 0.022, 12, 24);
    const cuff = new THREE.Mesh(cuffGeo, bronzeArmorMat);
    cuff.position.set(0, 0, 0.38);
    swordArmPivot.add(cuff);

    // Gauntlet Hand gripping Greatsword Hilt
    const swordHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.14), bronzeArmorMat);
    swordHand.position.set(0, 0, 0.78);
    swordArmPivot.add(swordHand);

    // ── THE LEGENDARY GOLDEN ENERGY GREATSWORD ──
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, 0, 0.82);
    swordArmPivot.add(swordGroup);

    // Sword Hilt & Gun Trigger Guard
    const hiltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 16);
    hiltGeo.rotateX(Math.PI / 2);
    const hilt = new THREE.Mesh(hiltGeo, bronzeArmorMat);
    hilt.position.set(0, 0, 0);
    swordGroup.add(hilt);

    const triggerGuardGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI);
    triggerGuardGeo.rotateY(Math.PI / 2);
    const triggerGuard = new THREE.Mesh(triggerGuardGeo, bronzeArmorMat);
    triggerGuard.position.set(0, -0.06, -0.02);
    swordGroup.add(triggerGuard);

    // Heavy Dark Steel Blade Spine (extends along +Z towards cursor!)
    const spineGeo = new THREE.BoxGeometry(0.08, 0.28, 1.55);
    const swordSpine = new THREE.Mesh(spineGeo, bladeSpineMat);
    swordSpine.position.set(0, 0.06, 0.88);
    swordGroup.add(swordSpine);

    // Golden Core Energy Chambers inside Spine
    const chamberGeo = new THREE.BoxGeometry(0.085, 0.06, 0.8);
    const energyChamber = new THREE.Mesh(chamberGeo, glowingEdgeMat);
    energyChamber.position.set(0, 0.06, 0.9);
    swordGroup.add(energyChamber);

    // ── BLAZING GOLDEN ENERGY CUTTING EDGE ──
    // Bottom primary razor energy edge
    const mainEdgeGeo = new THREE.BoxGeometry(0.035, 0.12, 1.6);
    const mainEdge = new THREE.Mesh(mainEdgeGeo, glowingEdgeMat);
    mainEdge.position.set(0, -0.12, 0.88);
    swordGroup.add(mainEdge);

    // Sharp Angled Buster Sword Tip
    const tipGeo = new THREE.ConeGeometry(0.18, 0.45, 4);
    tipGeo.rotateX(Math.PI / 2);
    const swordTip = new THREE.Mesh(tipGeo, glowingEdgeMat);
    swordTip.position.set(0, 0.02, 1.8);
    swordTip.scale.set(0.35, 1.2, 1);
    swordGroup.add(swordTip);

    // Flaming Energy Aura (Additive Glow)
    const auraGeo = new THREE.BoxGeometry(0.12, 0.42, 1.85);
    const swordAura = new THREE.Mesh(auraGeo, flamingAuraMat);
    swordAura.position.set(0, 0.02, 0.95);
    swordGroup.add(swordAura);

    // ── Floating Fire Ember Sparks along Blade ──
    const sparkCount = 36;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 0.22;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 0.32;
      sparkPos[i * 3 + 2] = Math.random() * 1.7 + 0.3;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.065,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    swordGroup.add(sparks);

    // ── 5. Mouse Raycaster Setup ──
    const raycaster = new THREE.Raycaster();
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const worldCursorTarget = new THREE.Vector3(2.5, 0.3, 0);
    const headTargetDummy = new THREE.Object3D();

    const onPointerMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
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

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Heroic breathing & subtle stance sway
      knight.position.y = Math.sin(elapsedTime * 2.0) * 0.04;
      knight.rotation.z = Math.sin(elapsedTime * 1.2) * 0.015;

      // Flaming Aura Heat Pulse
      flamingAuraMat.opacity = 0.35 + Math.sin(elapsedTime * 9) * 0.18;
      swordAura.scale.y = 1.0 + Math.sin(elapsedTime * 12) * 0.06;

      // Update Floating Fire Sparks
      const pArr = sparks.geometry.attributes.position.array;
      for (let i = 0; i < sparkCount; i++) {
        pArr[i * 3 + 2] += 0.025; // Drift towards tip
        pArr[i * 3 + 1] += Math.sin(elapsedTime * 4 + i) * 0.003;
        if (pArr[i * 3 + 2] > 2.1) {
          pArr[i * 3 + 2] = 0.35;
          pArr[i * 3] = (Math.random() - 0.5) * 0.18;
          pArr[i * 3 + 1] = (Math.random() - 0.5) * 0.28;
        }
      }
      sparks.geometry.attributes.position.needsUpdate = true;

      // ── Cursor 3D Raycasting & Sword Aiming ──
      const mx = THREE.MathUtils.clamp(mouseRef.current.x, -3.5, 3.5);
      const my = THREE.MathUtils.clamp(mouseRef.current.y, -2.5, 2.5);

      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      raycaster.ray.intersectPlane(targetPlane, worldCursorTarget);

      // Sword Arm Aiming: LookAt targets world cursor point!
      armLookAtDummy.position.copy(swordArmPivot.position);
      armLookAtDummy.lookAt(worldCursorTarget);

      // Smoothly slerp sword arm rotation towards cursor
      swordArmPivot.quaternion.slerp(armLookAtDummy.quaternion, 0.12);

      // Sword Slash / Thrust Click Reaction
      if (isPointerDownRef.current) {
        swordArmPivot.position.z = THREE.MathUtils.lerp(swordArmPivot.position.z, 0.16, 0.25);
        swordLight.intensity = 4.8; // Flare up light on click
      } else {
        swordArmPivot.position.z = THREE.MathUtils.lerp(swordArmPivot.position.z, 0, 0.1);
        swordLight.intensity = 3.2 + Math.sin(elapsedTime * 8) * 0.6;
      }

      // Sync Golden Light position with the Sword Blade
      const bladeWorldPos = new THREE.Vector3();
      swordSpine.getWorldPosition(bladeWorldPos);
      swordLight.position.copy(bladeWorldPos);

      // Head lookAt targeting (Warrior gaze follows cursor)
      headTargetDummy.position.copy(headPivot.position);
      headTargetDummy.lookAt(
        worldCursorTarget.x * 0.4,
        worldCursorTarget.y * 0.4 + 1.1,
        worldCursorTarget.z + 3.0
      );
      headPivot.quaternion.slerp(headTargetDummy.quaternion, 0.08);

      // Subtle torso lean
      torsoGroup.rotation.y = THREE.MathUtils.lerp(torsoGroup.rotation.y, (mx * 0.12), 0.05);

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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-amber-400/40 text-[11px] font-bold text-amber-300 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Kiếm Khách Ánh Kim 3D • Thanh thần kiếm luôn hướng theo con trỏ chuột</span>
        </div>
      </div>
    </div>
  );
}
