import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type UsbSceneController = {
  configure: (visible: boolean, reduced: boolean) => void;
  openCap: (open: boolean) => void;
  turn: () => void;
  reset: () => void;
  dispose: () => void;
};

/** Loaded only when the product stage approaches the viewport. */
export function createUsbScene(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  onFailure: () => void,
): UsbSceneController {
  let renderer: THREE.WebGLRenderer | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let model: THREE.Object3D | undefined;
  let cap: THREE.Object3D | undefined;
  let frame = 0, previous = 0, visible = false, reduced = true;
  let disposed = false, failed = false, loaded = false, presented = false;
  let yaw = 0, targetYaw = 0, pitch = 0, targetPitch = 0;
  let hoverX = 0, hoverY = 0, targetHoverX = 0, targetHoverY = 0;
  let capAmount = 0, targetCap = 0;
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number; touch: boolean } | null = null;
  const abort = new AbortController();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .001, 10);
  const pose = new THREE.Group();
  const display = new THREE.Group();
  display.rotation.x = Math.PI / 2;
  display.rotation.z = -.10;
  pose.add(display);
  scene.add(pose);
  const cameraPosition = new THREE.Vector3(.073, .033, .137);
  const target = new THREE.Vector3();

  function stop() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function invalidate() {
    if (!frame && loaded && !disposed && !failed && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function fail() {
    if (disposed || failed) return;
    failed = true;
    stop();
    disposeResources();
    onFailure();
  }
  function approach(value: number, goal: number, amount: number) {
    return reduced || Math.abs(goal - value) < .0003 ? goal : THREE.MathUtils.lerp(value, goal, amount);
  }
  function render(now: number) {
    frame = 0;
    if (!renderer || !loaded || disposed || failed || !visible || document.hidden) return;
    const dt = Math.min((now - previous) / 1000 || 1 / 60, .05);
    previous = now;
    const amount = 1 - Math.exp(-12 * dt);
    yaw = approach(yaw, targetYaw, amount);
    pitch = approach(pitch, targetPitch, amount);
    hoverX = approach(hoverX, targetHoverX, amount);
    hoverY = approach(hoverY, targetHoverY, amount);
    capAmount = approach(capAmount, targetCap, amount);
    pose.rotation.set(pitch + hoverX, yaw + hoverY, 0);
    if (cap) cap.position.z = -.026 * capAmount;
    target.set(0, .013 * capAmount, 0);
    camera.position.copy(cameraPosition).multiplyScalar(1 + capAmount * .36).add(target);
    camera.lookAt(target);
    try {
      renderer.render(scene, camera);
      if (!presented && !failed) { presented = true; onReady(); }
    } catch { fail(); return; }
    if (yaw !== targetYaw || pitch !== targetPitch || hoverX !== targetHoverX || hoverY !== targetHoverY || capAmount !== targetCap) invalidate();
  }
  function resize() {
    if (!renderer || disposed || failed) return;
    // Measure layout size, so the CSS entrance cannot distort the camera aspect.
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Cap the backing buffer on high-density phones; there is no continuous render loop.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    invalidate();
  }
  function pointerDown(event: PointerEvent) {
    if (!loaded || failed || (event.pointerType === "mouse" && event.button !== 0) || !event.isPrimary) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: targetYaw, pitch: targetPitch, touch: event.pointerType === "touch" };
    targetHoverX = targetHoverY = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = "true";
  }
  function pointerMove(event: PointerEvent) {
    if (!loaded || failed) return;
    if (drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      // pan-y lets the browser take over vertical phone gestures and cancel this drag.
      if (drag.touch && Math.abs(dy) > Math.abs(dx)) return;
      targetYaw = drag.yaw + dx / Math.max(canvas.clientWidth, 1) * Math.PI * 2;
      if (!drag.touch) targetPitch = THREE.MathUtils.clamp(drag.pitch + dy / Math.max(canvas.clientHeight, 1) * .9, -.65, .65);
      invalidate();
    } else if (!reduced && event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const box = canvas.getBoundingClientRect();
      targetHoverX = (event.clientY - box.top - box.height / 2) / box.height * .10;
      targetHoverY = (event.clientX - box.left - box.width / 2) / box.width * .18;
      invalidate();
    }
  }
  function endDrag() {
    if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
    drag = null;
    delete canvas.dataset.dragging;
  }
  function calm() { endDrag(); targetHoverX = targetHoverY = 0; invalidate(); }
  function contextLost(event: Event) { event.preventDefault(); fail(); }
  function visibility() { calm(); if (document.hidden) stop(); else invalidate(); }
  const sizeObserver = new ResizeObserver(resize);
  const timeout = window.setTimeout(() => { abort.abort(); fail(); }, 20000);

  function disposeModel(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    });
    for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    for (const texture of textures) {
      texture.dispose();
      if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
    }
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
  function disposeResources() {
    clearTimeout(timeout);
    abort.abort();
    sizeObserver.disconnect();
    canvas.removeEventListener("webglcontextlost", contextLost);
    if (model) { disposeModel(model); display.remove(model); model = undefined; }
    environment?.dispose(); environment = undefined;
    renderer?.dispose(); renderer?.forceContextLoss(); renderer = undefined;
  }

  try {
    const context = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "low-power" });
    if (!context) throw new Error("No graphics context");
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.debug.onShaderError = fail;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    try { environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; }
    finally { room.dispose(); pmrem.dispose(); }
    scene.environmentIntensity = .7;
    for (const [colour, intensity, position] of [
      ["#fff7ee", 2, [-.10, .08, .16]],
      ["#c6e3ff", 1, [.10, .03, -.04]],
      ["#ffffff", .4, [.02, -.08, .12]],
    ] as const) {
      const light = new THREE.DirectionalLight(colour, intensity);
      light.position.set(position[0], position[1], position[2]); scene.add(light);
    }
    canvas.addEventListener("webglcontextlost", contextLost);
    sizeObserver.observe(canvas);
    resize();
    void (async () => {
      try {
        const response = await fetch("/models/kingston-exodia-g2-128gb.glb", { signal: abort.signal });
        if (!response.ok) throw new Error("Model unavailable");
        const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/models/");
        if (disposed || failed) { disposeModel(gltf.scene); return; }
        model = gltf.scene;
        cap = model.getObjectByName("Cap");
        if (!cap) throw new Error("Incomplete model");
        display.add(model);
        loaded = true;
        clearTimeout(timeout);
        invalidate();
      } catch { fail(); }
    })();
  } catch { fail(); }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", calm);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("pointerleave", () => { targetHoverX = targetHoverY = 0; invalidate(); }, { signal: abort.signal });
  window.addEventListener("blur", calm);
  document.addEventListener("visibilitychange", visibility);

  return {
    configure(show, preferReduced) {
      visible = show; reduced = preferReduced;
      if (reduced || !visible) { endDrag(); targetHoverX = targetHoverY = 0; }
      if (visible) invalidate(); else stop();
    },
    openCap(open) { targetCap = open ? 1 : 0; invalidate(); },
    turn() { targetYaw += Math.PI / 2; targetPitch = 0; targetHoverX = targetHoverY = 0; invalidate(); },
    reset() { targetYaw = targetPitch = targetCap = targetHoverX = targetHoverY = 0; endDrag(); invalidate(); },
    dispose() {
      disposed = true; stop(); endDrag(); disposeResources();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", calm);
      canvas.removeEventListener("lostpointercapture", endDrag);
      window.removeEventListener("blur", calm);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
