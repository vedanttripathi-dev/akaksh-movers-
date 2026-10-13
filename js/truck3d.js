/* ============================================================================
   3D HERO — WebGL moving truck
   ============================================================================
   A real-time lit truck in the hero, built with Three.js.

   WHAT THIS IS, HONESTLY
   ----------------------
   The truck is built procedurally from primitives in this file, with physically
   based materials and an environment map for reflections. It is genuinely 3D —
   real geometry, real lighting, real shadows, and it responds to the pointer.

   It is NOT a photoscanned or professionally modelled vehicle, because no
   licensed GLB model was supplied with this project and inventing one is not
   possible. If you buy or commission a model, there is a drop-in path for it:

       1. Put the file at  assets/3d/truck.glb  (compressed, ideally Draco or
          Meshopt, under about 1.5 MB).
       2. Set MODEL_URL below to '/assets/3d/truck.glb'.
       3. That is all — the loader, the lighting, the shadow plane, the
          animation and every fallback already handle it.

   See README.md § Replacing the 3D truck with a real model.

   PERFORMANCE RULES ENFORCED HERE
   -------------------------------
     * Three.js is imported dynamically by this module, so the ~670 KB is only
       fetched on devices that passed the capability check in main.js.
     * Device pixel ratio is capped at 2 — above that the gain is invisible
       and the cost is quadratic.
     * Shadows are switched off below 900 px wide, where they cost the most
       and show the least.
     * The render loop STOPS when the hero scrolls out of view and when the
       browser tab is hidden. An idle 3D hero must not drain a phone battery.
     * `dispose()` releases geometries, materials, render targets and the
       WebGL context.
     * WebGL context loss is handled: the poster image comes back rather than
       the visitor being left with a black rectangle.
   ========================================================================== */

/** Set this to a .glb path to use a real model instead of the built one. */
const MODEL_URL = null;

/* Palette.
   Deliberately restrained: a premium vehicle reads as dark, deep paint with
   bright metal catching the light, not as large areas of saturated colour.
   The brand blue is used as an accent on trim and lights only — making the
   whole cab primary blue is exactly what makes a render look like a toy. */
/* Note on how dark these can go: the hero backdrop is near-black, so paint
   darker than roughly #38 reads as a silhouette and the whole model
   disappears. These are deliberately lifted to sit ABOVE the background
   while still looking like deep, expensive paint rather than grey plastic. */
const COLOUR = {
  cargo: 0x2f4763,      // navy-slate body, clearly above the backdrop
  cargoTrim: 0x7e93ab,  // brushed steel rails
  cab: 0x24384f,        // deeper navy metallic
  cabAccent: 0xf0b154,  // amber stripe, the one warm line on the vehicle
  glass: 0x121f2e,
  tyre: 0x0d151e,
  rim: 0xa9b8c9,
  chrome: 0xdde6ef,
  lamp: 0xfff4de,       // headlamps stay warm white; cold lamps look dead
};

export async function initTruck3D(stage) {
  if (!stage) return null;

  /* ---------------------------------------------------------------- import */
  const THREE = await import('../vendor/three.module.min.js');
  const { RoomEnvironment } = await import('../vendor/RoomEnvironment.js');

  const wide = () => window.innerWidth >= 900;

  /* ---------------------------------------------------------------- renderer */
  const canvas = document.createElement('canvas');
  // The canvas is decorative: the hero's meaning is carried entirely by the
  // heading and copy beside it, and the poster image has the alt text.
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: wide(),
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true,
    });
  } catch (error) {
    // Nothing is appended, so the poster simply stays.
    throw new Error('WebGL renderer could not be created: ' + error.message);
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Lifted from 1.05: with dark paint and a dark backdrop, a low exposure
  // loses the form entirely and the truck reads as a flat silhouette.
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = wide();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  stage.append(canvas);

  /* ---------------------------------------------------------------- scene */
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    34, stage.clientWidth / Math.max(stage.clientHeight, 1), 0.1, 100
  );
  camera.position.set(6.4, 2.5, 7.2);
  camera.lookAt(0, 0.85, 0);

  /* --- Environment lighting -------------------------------------------
     RoomEnvironment is a tiny procedural studio: it gives the metal and
     paint something to reflect, which is most of what separates a premium
     render from a flat one. It costs no texture download. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  // A key light, purely for the shadow and a highlight along the roof.
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(5, 8, 4);
  if (wide()) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0012;
  }
  scene.add(key);

  // A warm rim light from behind, to lift the silhouette off the background
  // and pick out the amber trim. Kept warm against the navy paint on
  // purpose — a cool rim on a cool body flattens the whole model.
  const rim = new THREE.DirectionalLight(0xffd89a, 2.2);
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  // A soft fill from the camera side, so the near flank is not pure black.
  // Without this the dark paint swallows every panel line.
  const fill = new THREE.DirectionalLight(0xdfe9f3, 0.8);
  fill.position.set(7, 2, 6);
  scene.add(fill);

  // A faint bounce from below, standing in for light off the floor.
  const bounce = new THREE.HemisphereLight(0xe6eef6, 0x05101f, 0.55);
  scene.add(bounce);

  /* ---------------------------------------------------------------- materials */
  const made = [];                          // everything needing disposal

  function material(Ctor, options) {
    const m = new Ctor(options);
    made.push(m);
    return m;
  }

  const matCargo = material(THREE.MeshStandardMaterial, {
    color: COLOUR.cargo, metalness: 0.55, roughness: 0.42,
  });
  const matTrim = material(THREE.MeshStandardMaterial, {
    color: COLOUR.cargoTrim, metalness: 0.8, roughness: 0.3,
  });
  // Automotive paint: high metalness, low roughness, so the environment
  // map does the work and the panels pick up a clear highlight.
  const matCab = material(THREE.MeshStandardMaterial, {
    color: COLOUR.cab, metalness: 0.8, roughness: 0.2,
  });
  const matAccent = material(THREE.MeshStandardMaterial, {
    color: COLOUR.cabAccent, metalness: 0.5, roughness: 0.3,
    emissive: COLOUR.cabAccent, emissiveIntensity: 0.18,
  });
  const matGlass = material(THREE.MeshStandardMaterial, {
    color: COLOUR.glass, metalness: 1.0, roughness: 0.06,
  });
  const matTyre = material(THREE.MeshStandardMaterial, {
    color: COLOUR.tyre, metalness: 0.1, roughness: 0.9,
  });
  const matRim = material(THREE.MeshStandardMaterial, {
    color: COLOUR.rim, metalness: 0.95, roughness: 0.25,
  });
  const matChrome = material(THREE.MeshStandardMaterial, {
    color: COLOUR.chrome, metalness: 1.0, roughness: 0.18,
  });
  const matLamp = material(THREE.MeshStandardMaterial, {
    color: COLOUR.lamp, emissive: 0xfff3d0, emissiveIntensity: 0.9,
    metalness: 0.2, roughness: 0.3,
  });

  /* ---------------------------------------------------------------- geometry */
  const geoms = [];

  /**
   * A box with chamfered edges.
   *
   * This is the single biggest quality difference in the whole model. A
   * BoxGeometry has mathematically sharp edges, which do not exist on any
   * real manufactured object. Sharp edges catch no highlight, so every panel
   * meets its neighbour in a dead line and the result reads as a low-poly
   * game asset no matter how good the materials are.
   *
   * A chamfer gives each edge a narrow facet angled between the two faces.
   * That facet catches the key and rim lights and draws a bright line along
   * every corner — which is exactly what the eye uses to read something as
   * solid and manufactured.
   *
   * Very thin parts (ribs, stripes) fall back to a plain box: a chamfer
   * wider than the part itself produces inverted geometry.
   */
  function box(w, h, d) {
    const smallest = Math.min(w, h, d);
    let g;

    if (smallest < 0.14) {
      g = new THREE.BoxGeometry(w, h, d);
    } else {
      const r = Math.min(0.05, w * 0.3, h * 0.3);
      const bevel = Math.min(0.025, d * 0.2);
      const depth = d - bevel * 2;

      const shape = new THREE.Shape();
      const hw = w / 2;
      const hh = h / 2;
      shape.moveTo(-hw + r, -hh);
      shape.lineTo(hw - r, -hh);
      shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
      shape.lineTo(hw, hh - r);
      shape.quadraticCurveTo(hw, hh, hw - r, hh);
      shape.lineTo(-hw + r, hh);
      shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
      shape.lineTo(-hw, -hh + r);
      shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

      g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        curveSegments: 3,
      });
      // ExtrudeGeometry runs from z=0 forwards; recentre it on the origin so
      // it is a drop-in replacement for BoxGeometry.
      g.translate(0, 0, -depth / 2);
    }

    geoms.push(g);
    return g;
  }
  function cyl(rt, rb, h, seg) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    geoms.push(g);
    return g;
  }

  const truck = new THREE.Group();

  function add(geometry, mat, x, y, z, parent = truck) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = renderer.shadowMap.enabled;
    mesh.receiveShadow = renderer.shadowMap.enabled;
    parent.add(mesh);
    return mesh;
  }

  /* --- Cargo body --- */
  add(box(4.2, 2.1, 2.1), matCargo, -0.75, 1.5, 0);
  // Roof and lower rails, for a chamfered read rather than a plain box.
  add(box(4.26, 0.1, 2.16), matTrim, -0.75, 2.56, 0);
  add(box(4.26, 0.1, 2.16), matTrim, -0.75, 0.46, 0);
  // Shutter ribs on both sides.
  for (let i = 0; i < 7; i += 1) {
    const x = -2.6 + i * 0.6;
    add(box(0.05, 1.7, 0.03), matTrim, x, 1.5, 1.06);
    add(box(0.05, 1.7, 0.03), matTrim, x, 1.5, -1.06);
  }
  // Rear door frame.
  add(box(0.06, 1.9, 1.95), matTrim, -2.86, 1.5, 0);

  // A single brand-blue accent stripe along each flank. One restrained
  // flash of colour against the dark paint, rather than a coloured body.
  add(box(4.1, 0.1, 0.02), matAccent, -0.75, 0.74, 1.065);
  add(box(4.1, 0.1, 0.02), matAccent, -0.75, 0.74, -1.065);

  /* --- Cab --- */
  add(box(1.5, 1.7, 2.05), matCab, 1.65, 1.2, 0);
  // Windscreen, raked back slightly.
  const screen = add(box(0.08, 0.95, 1.8), matGlass, 2.36, 1.62, 0);
  screen.rotation.z = -0.18;
  // Side windows.
  add(box(0.9, 0.75, 0.06), matGlass, 1.62, 1.64, 1.03);
  add(box(0.9, 0.75, 0.06), matGlass, 1.62, 1.64, -1.03);
  // Bonnet and bumper.
  add(box(0.5, 0.55, 2.0), matCab, 2.6, 0.92, 0);
  add(box(0.3, 0.3, 2.1), matChrome, 2.86, 0.52, 0);
  // Headlights.
  add(box(0.1, 0.22, 0.4), matLamp, 2.96, 0.86, 0.72);
  add(box(0.1, 0.22, 0.4), matLamp, 2.96, 0.86, -0.72);
  // Exhaust stack behind the cab.
  add(cyl(0.07, 0.07, 1.5, 12), matChrome, 0.82, 1.6, -0.95);

  /* --- Silhouette detail -------------------------------------------------
     These parts are small, but they are what the eye reads as "a real
     vehicle" rather than "a box with wheels". The outline is what gets
     recognised first, so breaking up the roofline and the front end earns
     far more than extra detail painted on a flat side ever would. */

  // Roof air deflector, angled back over the gap to the cargo body.
  const deflector = add(box(1.05, 0.46, 1.85), matCab, 1.62, 2.18, 0);
  deflector.rotation.z = -0.32;

  // Side mirrors, on arms clear of the door.
  [1.16, -1.16].forEach((z) => {
    add(box(0.34, 0.05, 0.05), matChrome, 2.14, 1.86, z);
    const glass = add(box(0.06, 0.34, 0.16), matGlass, 2.31, 1.76, z);
    glass.rotation.y = 0.12 * Math.sign(z);
  });

  // Front grille slats.
  for (let i = 0; i < 3; i += 1) {
    add(box(0.05, 0.07, 1.42), matChrome, 2.87, 0.78 + i * 0.16, 0);
  }

  // Cab step under each door.
  [1.06, -1.06].forEach((z) => {
    add(box(0.62, 0.07, 0.14), matTrim, 1.62, 0.3, z);
  });

  // Mud flaps behind the rear axle.
  [1.0, -1.0].forEach((z) => {
    add(box(0.05, 0.48, 0.52), matTyre, -2.42, 0.26, z);
  });

  /* --- Chassis --- */
  add(box(5.6, 0.18, 1.7), matTrim, -0.35, 0.4, 0);

  /* --- Wheels -------------------------------------------------------- */
  const wheels = [];
  const tyreGeom = cyl(0.52, 0.52, 0.34, wide() ? 28 : 16);
  const rimGeom = cyl(0.24, 0.24, 0.36, wide() ? 20 : 12);

  function wheelPair(x) {
    [1.0, -1.0].forEach((z) => {
      const group = new THREE.Group();
      group.position.set(x, 0.52, z);

      const tyre = new THREE.Mesh(tyreGeom, matTyre);
      tyre.rotation.x = Math.PI / 2;
      tyre.castShadow = renderer.shadowMap.enabled;

      const hub = new THREE.Mesh(rimGeom, matRim);
      hub.rotation.x = Math.PI / 2;

      group.add(tyre, hub);
      truck.add(group);
      wheels.push(group);
    });
  }
  wheelPair(1.75);
  wheelPair(-0.55);
  wheelPair(-1.85);

  scene.add(truck);

  /* --- Shadow-catching floor -----------------------------------------
     ShadowMaterial draws only the shadow, so the floor stays transparent
     and the CSS background behind the canvas shows through. */
  if (renderer.shadowMap.enabled) {
    const floorGeom = new THREE.PlaneGeometry(40, 40);
    geoms.push(floorGeom);
    const floorMat = material(THREE.ShadowMaterial, { opacity: 0.38 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  /* ---------------------------------------------------------------- model hook */
  if (MODEL_URL) {
    try {
      const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(MODEL_URL);

      // Frame the supplied model to roughly the same footprint as the built
      // one, so the camera and lighting still suit it.
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const scale = 6.2 / Math.max(size.x, 0.001);

      gltf.scene.scale.setScalar(scale);
      gltf.scene.position.sub(centre.multiplyScalar(scale));
      gltf.scene.position.y += (size.y * scale) / 2;
      gltf.scene.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = renderer.shadowMap.enabled;
          node.receiveShadow = renderer.shadowMap.enabled;
        }
      });

      // Swap the procedural truck out for the real one.
      truck.visible = false;
      scene.add(gltf.scene);
    } catch (error) {
      // A missing or broken model must not break the hero.
      console.warn('[truck3d] MODEL_URL set but could not be loaded; using the built truck.', error);
    }
  }

  /* ---------------------------------------------------------------- interaction */
  // Pointer parallax, damped. Never grabs the pointer or blocks scrolling.
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  function onPointerMove(event) {
    const rect = stage.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }
  // Only on devices with a real pointer; on touch it would fight the scroll.
  const hasPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasPointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

  /* ---------------------------------------------------------------- loop */
  let running = false;
  let frame = 0;
  let visible = true;
  let disposed = false;
  const clock = new THREE.Clock();

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    if (disposed) return;
    frame = requestAnimationFrame(render);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // A slow, controlled presentation turn — not a spin.
    truck.rotation.y = -0.42 + Math.sin(t * 0.22) * 0.1;
    // The faintest suspension float, so the scene never looks frozen.
    truck.position.y = Math.sin(t * 0.9) * 0.012;

    // Wheels idle slowly, as if the truck is creeping forward.
    wheels.forEach((wheel) => { wheel.rotation.z -= dt * 0.55; });

    // Damped pointer parallax on the camera, not the model, so the lighting
    // stays put and only the viewpoint moves.
    pointer.x += (target.x - pointer.x) * 0.045;
    pointer.y += (target.y - pointer.y) * 0.045;
    camera.position.x = 6.4 + pointer.x * 0.85;
    camera.position.y = 2.5 - pointer.y * 0.45;
    camera.lookAt(0, 0.9, 0);

    renderer.render(scene, camera);
  }

  function start() {
    if (running || disposed) return;
    running = true;
    clock.getDelta();              // discard the gap since the last frame
    frame = requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  /* --- Only run while on screen and while the tab is in front. -------- */
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0.05 });
  io.observe(stage);

  function onVisibility() {
    if (document.hidden) stop();
    else if (visible) start();
  }
  document.addEventListener('visibilitychange', onVisibility);

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }
  window.addEventListener('resize', onResize);

  /* --- Context loss: fall back to the poster rather than a black box. -- */
  function onContextLost(event) {
    event.preventDefault();
    stop();
    stage.classList.remove('is-3d');
    stage.classList.add('is-static');
    console.warn('[truck3d] WebGL context lost; poster image restored.');
  }
  canvas.addEventListener('webglcontextlost', onContextLost);

  /* ---------------------------------------------------------------- dispose */
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();

    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    if (hasPointer) window.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    clearTimeout(resizeTimer);

    geoms.forEach((g) => g.dispose());
    made.forEach((m) => m.dispose());
    envTexture.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();

    stage.classList.remove('is-3d');
  }

  /* ---------------------------------------------------------------- go */
  resize();
  renderer.render(scene, camera);     // one frame before revealing, so the
                                      // cross-fade never shows an empty canvas
  stage.classList.add('is-3d');
  start();

  return { dispose, stop, start };
}
