// Renderizador único de Three.js: muestra el plano activo, el temblor de cámara
// y detecta clics/hover sobre los objetos interactivos (raycasting).
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Stage {
  constructor(canvas, viewport) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.quality.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = CONFIG.quality.shadows;   // sombras de los escenarios (data/planes.js → shadows)
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.plane = null;
    this.shake = 0;
    this.time = 0;
    this.updaters = new Set(); // funciones llamadas cada frame: fn(dt)

    this.labelCam = new THREE.PerspectiveCamera(); // cámara sin temblor: las etiquetas no vibran
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hotspots = [];        // { entity, onClick }
    this.hovered = null;

    canvas.addEventListener('pointermove', e => this._onMove(e));
    canvas.addEventListener('click', e => this._onClick(e));

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this._frame());
  }

  // Ajusta el área 16:9 (1920×1080 base) a la ventana, con franjas negras.
  resize() {
    const ar = CONFIG.baseWidth / CONFIG.baseHeight;
    let w = window.innerWidth, h = window.innerHeight;
    if (w / h > ar) w = h * ar; else h = w / ar;
    this.viewport.style.width = `${w}px`;
    this.viewport.style.height = `${h}px`;
    this.renderer.setSize(w, h, false);
    this.scale = w / CONFIG.baseWidth;
    document.documentElement.style.setProperty('--ui-scale', this.scale);
  }

  // Agrega una función que corre cada frame. Devuelve otra función para quitarla (segura de llamar varias veces).
  addUpdate(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  // Coordenadas normalizadas del puntero sobre el canvas.
  ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  // Punto del mundo bajo el puntero sobre un plano horizontal a la altura y.
  pointerOnFloor(e, y = 0) {
    if (!this.plane) return null;
    this.raycaster.setFromCamera(this.ndc(e), this.labelCam);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit) ? hit : null;
  }

  // Objeto (de una lista) bajo el puntero.
  pickFrom(e, objects) {
    if (!this.plane) return null;
    this.raycaster.setFromCamera(this.ndc(e), this.labelCam);
    const hits = this.raycaster.intersectObjects(objects, true);
    for (const hit of hits) {
      let o = hit.object;
      while (o) { if (objects.includes(o)) return o; o = o.parent; }
    }
    return null;
  }

  setPlane(plane) {
    this.setHover(null);
    this.plane = plane;
    // Procesado de color por plano (AgX = igual que Blender)
    const tm = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping }[plane.def.toneMapping];
    this.renderer.toneMapping = tm ?? THREE.NoToneMapping;
    this.renderer.toneMappingExposure = plane.def.exposure ?? 1;
    this.introT = 0;     // pequeño acercamiento de cámara al entrar a un plano
  }

  _frame() {
    const now = performance.now();
    // tope alto: en computadores lentos el movimiento sigue al ritmo del reloj real
    const dt = Math.min((now - this.last) / 1000, 0.5);
    this.last = now;
    this.time += dt;
    const p = this.plane;
    if (p) {
      p.shake = this.shake;
      p.update(dt);
      this.labelCam.copy(p.camera);
      this.labelCam.position.copy(p.cameraBase);
      this.labelCam.lookAt(p.cameraTarget);
      this.labelCam.updateMatrixWorld();
      // Temblor: ruido suave sobre la posición base de la cámara.
      const s = this.shake * 0.12;
      const t = this.time * 28;
      // acercamiento suave al entrar (CONFIG.cameraIntro)
      this.introT = Math.min(1, (this.introT ?? 1) + dt / 1.4);
      const e = 1 - Math.pow(1 - this.introT, 3);
      const intro = CONFIG.cameraIntro ? (1 - e) * 0.08 : 0;
      const back = p.cameraBase.clone().sub(p.cameraTarget).multiplyScalar(intro);
      p.camera.position.set(
        p.cameraBase.x + back.x + (Math.sin(t * 1.1) + Math.sin(t * 2.3)) * s,
        p.cameraBase.y + back.y + (Math.sin(t * 1.7) + Math.cos(t * 2.9)) * s * 0.7,
        p.cameraBase.z + back.z
      );
      p.camera.lookAt(p.cameraTarget);
      p.camera.rotation.z += Math.sin(t * 0.9) * s * 0.05;
      this.renderer.render(p.scene, p.camera);
    }
    for (const fn of [...this.updaters]) {
      try { fn(dt); } catch (err) { console.error('[Stage] error en actualización', err); }
    }
  }

  // ---------- Interacción ----------
  setHotspots(list) {
    this.clearHotspots();
    this.hotspots = list;
  }

  clearHotspots() {
    this.setHover(null);
    this.hotspots = [];
    this.canvas.style.cursor = 'default';
  }

  _pick(e) {
    if (!this.plane || !this.hotspots.length) return null;
    this.raycaster.setFromCamera(this.ndc(e), this.labelCam);
    const targetsOf = h => h.entity.pickTargets || [h.entity.object3d];
    const objs = this.hotspots.flatMap(targetsOf);
    const hits = this.raycaster.intersectObjects(objs, true);
    for (const hit of hits) {
      let o = hit.object;
      while (o) {
        const h = this.hotspots.find(x => targetsOf(x).includes(o));
        if (h) return h;
        o = o.parent;
      }
    }
    return null;
  }

  _onMove(e) {
    const h = this._pick(e);
    this.setHover(h);
  }

  setHover(h) {
    if (this.hovered === h) return;
    if (this.hovered) { this.hovered.entity.setHighlight?.(false); this.hovered.onHover?.(false); }
    this.hovered = h;
    if (h) { h.entity.setHighlight?.(true); h.onHover?.(true); }
    this.canvas.style.cursor = h ? 'pointer' : 'default';
  }

  _onClick(e) {
    const h = this._pick(e);
    if (h) h.onClick();
  }

  // Posición en pantalla (coordenadas 1920×1080) de un objeto (o lista de objetos):
  // where = 'top' (tope), 'bottom' (base, borde de adelante) o 'center'.
  screenPosOf(object3d, where = 'top') {
    if (!this.plane) return null;
    const box = new THREE.Box3();
    for (const o of [].concat(object3d)) box.expandByObject(o);
    if (box.isEmpty()) return null;
    const top = box.getCenter(new THREE.Vector3());
    if (where === 'top') top.y = box.max.y;
    if (where === 'bottom') { top.y = box.min.y; top.z = box.max.z; }
    return this.project(top);
  }

  // Punto del mundo → coordenadas de pantalla 1920×1080.
  project(v) {
    const top = v.clone();
    top.project(this.labelCam);
    return {
      x: (top.x + 1) / 2 * CONFIG.baseWidth,
      y: (1 - top.y) / 2 * CONFIG.baseHeight,
    };
  }
}
