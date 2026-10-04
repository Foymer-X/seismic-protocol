// Construye un plano (escenario) a partir de data/planes.js.
import * as THREE from 'three';
import { Actor } from './Actor.js';
import { placeholderBox, placeholderOpenBox } from './Assets.js';
import { Rain, Dust } from './Effects.js';

export class Plane {
  constructor(id, def, assets) {
    this.id = id;
    this.def = def;
    this.assets = assets;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(def.background || '#000');

    const cam = def.camera;
    this.camera = new THREE.PerspectiveCamera(cam.fov || 40, 16 / 9, 0.1, 400);
    this.cameraBase = new THREE.Vector3(...cam.pos);
    this.cameraTarget = new THREE.Vector3(...cam.target);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.cameraTarget);

    this._buildLights(def.lights || 'default');
    this._buildEnvironment(def.environment);
    this.shellModel = this._buildShell(def.shell);

    this.markers = {};
    for (const [k, v] of Object.entries(def.markers || {})) this.markers[k] = new THREE.Vector3(...v);

    // Props: 3D (modelo, parte de un modelo, o marcador) o sprites 2D
    this.props = {};
    for (const p of def.props || []) {
      let entity;
      if (p.sprite) {
        entity = new Actor(p.id, p.asset, assets);
      } else {
        let obj = null;
        if (p.node && this.shellModel) obj = this.shellModel.getObjectByName(p.node);   // objeto dentro del escenario .glb
        if (!obj && p.asset) obj = assets.model(p.asset);
        if (!obj) {
          obj = p.shape === 'cabin' ? placeholderOpenBox(p.size, p.color, '#141414', 'front')
              : p.shape === 'openTop' ? placeholderOpenBox(p.size, p.color, '#141414', 'top')
              : placeholderBox(p.size, p.color);
        }
        entity = { id: p.id, object3d: obj, isProp: true, fromShell: !!(p.node && obj.parent) };
        entity.setHighlight = on => highlightObject(obj, on);
      }
      entity.def = { ...entity.def, ...p };
      if (!entity.fromShell) {
        entity.object3d.position.set(...(p.pos || [0, 0, 0]));
        if (p.node && !entity.fromShell) console.warn(`[Plane ${id}] No encontré "${p.node}" dentro del escenario; uso un marcador.`);
        if (p.rotY) entity.object3d.rotation.y = THREE.MathUtils.degToRad(p.rotY);
        this.scene.add(entity.object3d);
      }
      entity.homePosition = entity.object3d.position.clone();
      this.props[p.id] = entity;
    }

    // Efectos ambientales
    this.shake = 0;
    const center = this.cameraTarget.clone().setY(0);
    if (def.fog) this.scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
    this.rain = def.weather === 'rain' ? new Rain(this.scene, center, def.rain) : null;
    this.dust = def.dust ? new Dust(this.scene, center, typeof def.dust === 'object' ? def.dust : undefined) : null;

    // Personajes
    this.actors = {};
    for (const id of Object.keys(def.actors || {})) {
      const a = new Actor(id, id, assets);
      this.scene.add(a.object3d);
      this.actors[id] = a;
    }
  }

  _buildLights(mode) {
    // 'default' = luces suaves provisionales · 'model' = solo las luces que traiga el .glb · 'none'
    if (mode !== 'default') return;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(3, 8, 6);
    this.scene.add(sun);
  }

  _buildEnvironment(env) {
    if (!env) return;
    const tex = this.assets.environment(env.asset);
    if (!tex) return;
    if (env.background !== false) {
      this.scene.background = tex;
      this.scene.backgroundBlurriness = env.blur ?? 0;
      this.scene.backgroundIntensity = env.backgroundIntensity ?? 1;
    }
    if (env.lighting !== false) {
      this.scene.environment = tex;
      this.scene.environmentIntensity = env.intensity ?? 1;
    }
  }

  _buildShell(shell) {
    if (!shell) return null;
    const model = shell.asset ? this.assets.model(shell.asset) : null;
    if (model) { this.scene.add(model); return model; }

    const { width: w, depth: d, height: h } = shell;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: shell.floor, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: shell.wall, roughness: 1 });
    if (shell.back !== false) {
      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      back.position.set(0, h / 2, -d / 2);
      this.scene.add(back);
      const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0 }));
      line.position.set(0, 0.02, -d / 2);
      this.scene.add(line);
    }
    if (shell.sides) {
      for (const s of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
        side.rotation.y = -s * Math.PI / 2;
        side.position.set(s * w / 2, h / 2, 0);
        this.scene.add(side);
      }
    }
    return null;
  }

  // Deja el plano como al inicio (posiciones y visibilidad de data/planes.js).
  reset(state) {
    this.cameraBase.set(...this.def.camera.pos);
    this.cameraTarget.set(...this.def.camera.target);
    for (const [id, cfg] of Object.entries(this.def.actors || {})) {
      const a = this.actors[id];
      a.unfollow();
      a.stop();
      a.setPose('idle');
      a.position.copy(this.markers[cfg.at] || new THREE.Vector3());
      a.object3d.visible = cfg.visible !== false;
      a.trail = [];
      a.face(cfg.face || 'right');
    }
    for (const p of Object.values(this.props)) {
      p.object3d.visible = !p.def.hidden;
      p.object3d.position.copy(p.homePosition);
    }
    this.refreshVisibility(state);
  }

  refreshVisibility(state) {
    for (const p of Object.values(this.props)) {
      if (typeof p.def.visibleIf === 'function') p.object3d.visible = !!p.def.visibleIf(state);
    }
  }

  get(id) { return this.actors[id] || this.props[id] || null; }

  marker(name) {
    const m = this.markers[name];
    if (!m) console.warn(`[Plane ${this.id}] marcador "${name}" no existe`);
    return m ? m.clone() : new THREE.Vector3();
  }

  update(dt) {
    this.rain?.update(dt);
    if (this.dust) {
      if (this.def.dust.follow) this.dust.center.set(this.cameraTarget.x, this.cameraTarget.y - 1.4, 0);  // sigue a la cámara
      this.dust.update(dt, this.shake);
    }
    for (const a of Object.values(this.actors)) a.update(dt);
    for (const p of Object.values(this.props)) p.update?.(dt);
    for (const fn of this.extraUpdates || []) fn(dt);
  }

  stopAll() {
    for (const a of Object.values(this.actors)) a.stop();
  }
}

function highlightObject(obj, on) {
  obj.traverse(o => {
    if (o.isMesh && o.material && 'emissive' in o.material) {
      if (!o.userData.ownMaterial) { o.material = o.material.clone(); o.userData.ownMaterial = true; }
      o.material.emissive.set(on ? 0x665500 : 0x000000);
    }
  });
}
