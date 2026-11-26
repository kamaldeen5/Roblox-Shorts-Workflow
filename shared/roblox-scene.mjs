/**
 * Shared deterministic 3D Roblox Town + R6 Character engine for BOTH Remotion and HyperFrames.
 * Zero React/DOM dependencies — works identically inside Three.js + hf-seek and Remotion.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Compute beat timeline offsets and current beat state at time t (seconds).
 */
export function evaluateEpisodeAtTime(episode, t) {
  const beats = episode.beats || [];
  let cursor = 0;
  let currentIndex = 0;
  let localTime = 0;
  let prevScale = 1.0;
  let prevTilt = 0.0;

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const start = cursor;
    const end = cursor + b.duration;
    if (t >= start && (t < end || i === beats.length - 1)) {
      currentIndex = i;
      localTime = Math.max(0, t - start);
      prevScale = i > 0 ? beats[i - 1].actor.scale : b.actor.scale;
      prevTilt = i > 0 ? (beats[i - 1].actor.headTiltX ?? 0) : (b.actor.headTiltX ?? 0);
      break;
    }
    cursor = end;
  }

  const beat = beats[currentIndex];
  const progress = beat ? clamp01(localTime / Math.max(0.001, beat.duration)) : 0;
  const ramp = easeOutBack(clamp01(localTime / 0.55));
  const actorScale =
    beat && currentIndex > 0 && beats[currentIndex - 1].actor.name === beat.actor.name
      ? lerp(prevScale, beat.actor.scale ?? 1.0, ramp)
      : beat?.actor.scale ?? 1.0;

  const targetTilt = beat?.actor.headTiltX ?? 0;
  const headTiltX =
    beat && currentIndex > 0 && beats[currentIndex - 1].actor.name === beat.actor.name
      ? lerp(prevTilt, targetTilt, easeInOutCubic(clamp01(localTime / 0.6)))
      : targetTilt;

  return {
    time: t,
    beatIndex: currentIndex,
    beat,
    localTime,
    progress,
    actorScale,
    headTiltX,
  };
}

/**
 * Build procedural blocky Roblox R6 character rig with hair accessory and deadpan face.
 */
export function createBlockyCharacter(THREE, colors) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: colors.skin || "#facc15",
    roughness: 0.42,
    metalness: 0.05,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: colors.shirt || "#2563eb",
    roughness: 0.5,
    metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: colors.pants || "#1e293b",
    roughness: 0.6,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: colors.hair || "#1f2937",
    roughness: 0.7,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: "#0b0f19" });
  const mouthMat = new THREE.MeshBasicMaterial({ color: "#111827" });

  // Legs (pivot at hip y = 1.6)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.42, 1.6, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.6, 0.8), pantsMat);
  leftLeg.position.y = -0.8;
  leftLegPivot.add(leftLeg);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.42, 1.6, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.6, 0.8), pantsMat);
  rightLeg.position.y = -0.8;
  rightLegPivot.add(rightLeg);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 0.85), shirtMat);
  torso.position.set(0, 2.45, 0);

  // Arms (pivot at shoulder y = 3.2)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-1.2, 3.2, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.6, 0.78), shirtMat);
  leftArm.position.y = -0.6;
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.78), skinMat);
  leftHand.position.y = -1.42;
  leftArmPivot.add(leftArm, leftHand);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(1.2, 3.2, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.6, 0.78), shirtMat);
  rightArm.position.y = -0.6;
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.78), skinMat);
  rightHand.position.y = -1.42;
  rightArmPivot.add(rightArm, rightHand);

  // Head + blocky Roblox hair + deadpan face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 3.85, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.08, 1.08), skinMat);
  headGroup.add(head);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.34, 1.18), hairMat);
  hairTop.position.set(0, 0.56, -0.02);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.75, 0.32), hairMat);
  hairBack.position.set(0, 0.14, -0.46);
  headGroup.add(hairTop, hairBack);

  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.05), eyeMat);
  leftEye.position.set(-0.22, 0.1, 0.55);
  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.05), eyeMat);
  rightEye.position.set(0.22, 0.1, 0.55);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.05), mouthMat);
  mouth.position.set(0, -0.22, 0.55);
  headGroup.add(leftEye, rightEye, mouth);

  root.add(leftLegPivot, rightLegPivot, torso, leftArmPivot, rightArmPivot, headGroup);

  return {
    root,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    headGroup,
    torso,
    skinMat,
    shirtMat,
    pantsMat,
    hairMat,
    mouth,
    leftEye,
    rightEye,
  };
}

/**
 * Create the complete deterministic Roblox Town scene + updater.
 */
export function createRobloxWorld(THREE, episode) {
  const palette = episode.palette || {};
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.skyBottom || "#1b2748");
  scene.fog = new THREE.FogExp2(palette.fog || "#16203d", 0.017);

  const camera = new THREE.PerspectiveCamera(48, (episode.width || 1080) / (episode.height || 1920), 0.1, 300);

  // Moody twilight / night lighting
  const hemi = new THREE.HemisphereLight("#c7d2fe", "#0f172a", 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight("#fff7ed", 1.25);
  dir.position.set(14, 28, 18);
  scene.add(dir);

  const rim = new THREE.DirectionalLight("#60a5fa", 0.8);
  rim.position.set(-16, 12, -14);
  scene.add(rim);

  // Ground + raised sidewalks + road
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(180, 1, 180),
    new THREE.MeshStandardMaterial({ color: palette.ground || "#1e293b", roughness: 0.9 })
  );
  ground.position.y = -0.5;
  scene.add(ground);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85 });
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 180), sidewalkMat);
    sw.position.set(side * 6.6, 0.1, 0);
    scene.add(sw);
  }

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.08, 180),
    new THREE.MeshStandardMaterial({ color: palette.road || "#0f172a", roughness: 0.72 })
  );
  road.position.y = 0.02;
  scene.add(road);

  const stripeMat = new THREE.MeshBasicMaterial({ color: "#facc15" });
  for (let z = -66; z <= 66; z += 6) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 2.4), stripeMat);
    stripe.position.set(0, 0.03, z);
    scene.add(stripe);
  }

  // Deterministic blocky Roblox houses, trees, & streetlamps
  const rand = mulberry32(42069);
  const houseColors = ["#dc2626", "#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777"];
  const windowMat = new THREE.MeshBasicMaterial({ color: "#fef08a" });
  const roofMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7 });
  const poleMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.5, roughness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: "#fde047" });
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.85 });

  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -46 + Math.floor(i / 2) * 14;
    const w = 5.5 + rand() * 2.8;
    const h = 5.2 + rand() * 5.2;
    const d = 6.0 + rand() * 2.5;
    const x = side * (11.5 + w * 0.5);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: houseColors[i % houseColors.length], roughness: 0.65 })
    );
    body.position.set(x, h * 0.5, z);
    scene.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.7, d + 0.7), roofMat);
    roof.position.set(x, h + 0.35, z);
    scene.add(roof);

    for (let wy = 1.8; wy < h - 1.0; wy += 2.2) {
      for (let wz = -1.3; wz <= 1.3; wz += 2.6) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 1.0), windowMat);
        win.position.set(x - side * (w * 0.5 + 0.03), wy, z + wz);
        scene.add(win);
      }
    }

    // Roblox blocky tree between houses
    const treeX = side * 9.2;
    const treeZ = z + 6.8;
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.8, 0.9), trunkMat);
    trunk.position.set(treeX, 1.4, treeZ);
    const crown1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 3.2), leafMat);
    crown1.position.set(treeX, 3.6, treeZ);
    const crown2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 2.1), leafMat);
    crown2.position.set(treeX, 5.2, treeZ);
    scene.add(trunk, crown1, crown2);

    // Streetlamp
    const lampX = side * 5.6;
    const lampZ = z + 3.5;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.4, 0.24), poleMat);
    pole.position.set(lampX, 2.7, lampZ);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.75), bulbMat);
    bulb.position.set(lampX - side * 0.4, 5.3, lampZ);
    scene.add(pole, bulb);
  }

  // Stars & blocky clouds
  const starMat = new THREE.MeshBasicMaterial({ color: "#e2e8f0" });
  for (let s = 0; s < 36; s++) {
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), starMat);
    star.position.set((rand() - 0.5) * 110, 26 + rand() * 34, -40 - rand() * 45);
    scene.add(star);
  }

  const cloudMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.9 });
  const clouds = [];
  for (let c = 0; c < 10; c++) {
    const cg = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(7 + rand() * 4, 1.5, 4.5), cloudMat);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(4.5 + rand() * 3, 1.8, 3.5), cloudMat);
    b2.position.set(1.5, 0.8, 0);
    cg.add(b1, b2);
    const sideX = (c % 2 === 0 ? -1 : 1) * (14 + rand() * 22);
    cg.position.set(sideX, 24 + rand() * 9, -28 + rand() * 48);
    scene.add(cg);
    clouds.push({ group: cg, baseX: cg.position.x, speed: 0.35 + rand() * 0.4 });
  }

  // Moon group (supports color, scale, and eerie eyes for climax reveals!)
  const moonGroup = new THREE.Group();
  moonGroup.position.set(0, 29, -52);
  const moonMat = new THREE.MeshBasicMaterial({ color: "#fef9c3" });
  const moonMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), moonMat);
  const moonEyeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const moonPupilMat = new THREE.MeshBasicMaterial({ color: "#0b0f19" });
  const moonLeftEye = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.4), moonEyeMat);
  moonLeftEye.position.set(-1.8, 0.8, 4.1);
  const moonRightEye = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.4), moonEyeMat);
  moonRightEye.position.set(1.8, 0.8, 4.1);
  const moonLeftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.5), moonPupilMat);
  moonLeftPupil.position.set(-1.8, 0.7, 4.2);
  const moonRightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.5), moonPupilMat);
  moonRightPupil.position.set(1.8, 0.7, 4.2);
  const moonEyesGroup = new THREE.Group();
  moonEyesGroup.add(moonLeftEye, moonRightEye, moonLeftPupil, moonRightPupil);
  moonEyesGroup.visible = false;
  moonGroup.add(moonMesh, moonEyesGroup);
  scene.add(moonGroup);

  // Main actor rig
  const firstActor = (episode.beats && episode.beats[0]?.actor) || {};
  const actorRig = createBlockyCharacter(THREE, firstActor);
  scene.add(actorRig.root);

  function updateAt(t) {
    const state = evaluateEpisodeAtTime(episode, t);
    const beat = state.beat;
    if (!beat) return state;

    actorRig.shirtMat.color.set(beat.actor.shirt || "#2563eb");
    actorRig.pantsMat.color.set(beat.actor.pants || "#1e293b");
    actorRig.skinMat.color.set(beat.actor.skin || "#facc15");
    actorRig.hairMat.color.set(beat.actor.hair || "#1f2937");
    actorRig.root.scale.setScalar(state.actorScale);

    // Moon appearance
    if (beat.moon) {
      moonMat.color.set(beat.moon.color || "#fef9c3");
      moonGroup.scale.setScalar(beat.moon.scale || 1.0);
      moonEyesGroup.visible = Boolean(beat.moon.eyes);
    }

    // Walk cycle + mood expressions + head tilt
    const walkPhase = t * (beat.actor.walkSpeed || 0) * 5.0;
    const legSwing = (beat.actor.walkSpeed || 0) > 0.05 ? Math.sin(walkPhase) * 0.55 : 0;
    actorRig.leftLegPivot.rotation.x = legSwing;
    actorRig.rightLegPivot.rotation.x = -legSwing;
    actorRig.leftArmPivot.rotation.x = -legSwing * 0.85;
    actorRig.rightArmPivot.rotation.x = legSwing * 0.85;

    actorRig.headGroup.rotation.x = state.headTiltX;
    if (beat.actor.mood === "shocked" || beat.actor.mood === "panicked") {
      actorRig.leftArmPivot.rotation.x = -2.2 + Math.sin(t * 12) * 0.15;
      actorRig.rightArmPivot.rotation.x = -2.2 - Math.sin(t * 12) * 0.15;
      actorRig.mouth.scale.set(1.1, 2.6, 1);
      actorRig.headGroup.rotation.y = Math.sin(t * 9) * 0.05;
    } else if (beat.actor.mood === "smirk") {
      actorRig.mouth.scale.set(1.3, 0.8, 1);
      actorRig.headGroup.rotation.y = 0.22;
    } else {
      actorRig.mouth.scale.set(1, 1, 1);
      actorRig.headGroup.rotation.y = Math.sin(t * 1.4) * 0.07;
    }

    actorRig.root.position.set(0, 0, 2 - Math.sin(t * 0.35) * 2.5);

    for (const cl of clouds) {
      cl.group.position.x = cl.baseX + Math.sin(t * 0.12 * cl.speed) * 4;
    }

    // Camera presets
    const preset = beat.camera?.preset || "wide-town";
    const shakeAmt = beat.camera?.shake || 0;
    const sx = Math.sin(t * 47.0) * shakeAmt;
    const sy = Math.cos(t * 53.0) * shakeAmt;
    const charH = 4.4 * state.actorScale;
    const charZ = actorRig.root.position.z;

    camera.fov = beat.camera?.fov || 48;
    camera.updateProjectionMatrix();

    if (preset === "wide-town") {
      camera.position.set(lerp(-4.2, 4.2, state.progress) + sx, 4.2 + sy, charZ + 12.5);
      camera.lookAt(0, 3.0, charZ);
    } else if (preset === "close-up-face") {
      camera.position.set(1.2 + sx, 4.0 + sy, charZ + lerp(4.5, 3.5, state.progress));
      camera.lookAt(0, 3.7, charZ);
    } else if (preset === "dramatic-zoom") {
      camera.position.set(-1.4 + sx, 3.4 * state.actorScale + sy, charZ + lerp(7.8, 4.8, state.progress));
      camera.lookAt(0, 3.5 * state.actorScale, charZ);
    } else if (preset === "low-angle-tower") {
      camera.position.set(3.2 + sx, 1.5 + sy, charZ + 9.5);
      camera.lookAt(0, charH * 0.72, charZ);
    } else if (preset === "sky-titan") {
      camera.position.set(lerp(5.5, 8.5, state.progress) + sx, 2.2 + sy, charZ + 16.5);
      camera.lookAt(0, Math.min(26, charH * 0.78), charZ);
    } else if (preset === "mayor-closeup") {
      camera.position.set(-1.1 + sx, 3.9 + sy, charZ + 4.1);
      camera.lookAt(0, 3.85, charZ);
    } else if (preset === "rocket-up") {
      camera.position.set(2.0 + sx, lerp(2.0, 24.0, easeInOutCubic(state.progress)) + sy, charZ + 15.0);
      camera.lookAt(0, lerp(4.0, 34.0, state.progress), charZ);
    } else if (preset === "moon-reveal") {
      camera.position.set(0.8 + sx, lerp(2.2, 4.8, state.progress) + sy, charZ + 8.5);
      camera.lookAt(0, lerp(10.0, 27.0, easeInOutCubic(state.progress)), -46);
    }

    return state;
  }

  return { scene, camera, actorRig, moonGroup, updateAt };
}
