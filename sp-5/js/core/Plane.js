// Construye un plano (escenario) a partir de data/planes.js.
import * as THREE from 'three';
import { Actor } from './Actor.js';
import { placeholderBox, placeholderOpenBox, placeholderTruck } from './Assets.js';
import { Rain, Dust } from './Effects.js';
import { markOutline } from './Outline.js';

// Blender exporta "Cubo.006" y Three.js lo renombra "Cubo006" ("Plano subdividido" → "Plano_subdividido").
// Así en data/planes.js se pueden escribir los nombres tal como aparecen en Blender.
const nodeName = n => THREE.PropertyBinding.sanitizeNodeName(n);

export class Plane {
  constructor(id, def, assets) {
    this.id = id;
    this.def = def;
    this.assets = assets;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(def.background || '#000');

    this._buildLights(def.lights || 'default', def.ambient);
    this._buildEnvironment(def.environment);
    this.shellModel = this._buildShell(def.shell);
    this.scene.updateMatrixWorld(true);
    this.shellBox = this.shellModel ? new THREE.Box3().setFromObject(this.shellModel) : null;

    this._applyMaterialSwaps(def.materialSwaps);
    this._buildExtras(def.extras);
    markOutline(this);                 // bordes negros (data/planes.js → outline)
    this._setupCamera(def.camera);
    this._setupModelLights();

    this.markers = {};
    for (const [k, v] of Object.entries(def.markers || {})) this.markers[k] = new THREE.Vector3(...v);

    // Props: 3D (modelo, parte del escenario .glb, o marcador) o sprites 2D
    this.props = {};
    for (const p of def.props || []) {
      let entity;
      if (p.sprite) {
        entity = new Actor(p.id, p.asset, assets);
      } else {
        // objeto(s) dentro del escenario .glb, por su nombre de Blender
        const names = p.node ? [].concat(p.node) : [];
        const found = this.shellModel ? names.map(n => this.shellModel.getObjectByName(nodeName(n))).filter(Boolean) : [];
        if (names.length && found.length < names.length) {
          console.warn(`[Plane ${id}] No encontré ${names.filter((n, i) => !found[i]).join(', ')} dentro del escenario.`);
        }
        let obj = found[0] || null;
        if (!obj && p.asset) obj = assets.model(p.asset);
        if (!obj) {
          obj = p.shape === 'cabin' ? placeholderOpenBox(p.size, p.color, '#141414', 'front')
              : p.shape === 'openTop' ? placeholderOpenBox(p.size, p.color, '#141414', 'top')
              : p.shape === 'truck' ? placeholderTruck(p.size, p.color)
              : placeholderBox(p.size, p.color);
        }
        const parts = found.length ? found : [obj];
        entity = { id: p.id, object3d: obj, parts, isProp: true, fromShell: found.length > 0 };
        entity.pickTargets = parts;
        entity.setHighlight = on => parts.forEach(o => highlightObject(o, on));
      }
      entity.def = { ...entity.def, ...p };
      if (!entity.fromShell) {
        entity.object3d.position.set(...(p.pos || [0, 0, 0]));
        if (p.rotY) entity.object3d.rotation.y = THREE.MathUtils.degToRad(p.rotY);
        this.scene.add(entity.object3d);
      }
      entity.homePosition = entity.object3d.position.clone();
      if (p.labelAt) entity.labelAt = new THREE.Vector3(...p.labelAt);   // dónde va el letrero de la opción
      entity.partHomes = (entity.parts || []).map(o => o.position.clone());   // para devolver piezas que se movieron (caída, camión)
      entity.partQuats = (entity.parts || []).map(o => { const q = []; o.traverse(c => q.push([c, c.quaternion.clone()])); return q; });
      this.props[p.id] = entity;
    }

    // Efectos ambientales (centrados en el escenario)
    this.shake = 0;
    const center = this.shellBox ? this.shellBox.getCenter(new THREE.Vector3()).setY(0) : this.cameraTarget.clone().setY(0);
    if (def.fog) this.scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
    // def.rain.center: [x, y, z] para centrar la lluvia donde mira la cámara (si no, el centro del modelo)
    const rainCenter = def.rain?.center ? new THREE.Vector3(...def.rain.center) : center;
    this.rain = def.weather === 'rain' ? new Rain(this.scene, rainCenter, def.rain) : null;
    let dustCfg = typeof def.dust === 'object' ? { ...def.dust } : {};
    if (def.dust && this.shellBox && !dustCfg.area) {
      const s = this.shellBox.getSize(new THREE.Vector3());
      dustCfg.area = [s.x * 0.9, s.y * 0.95, s.z * 0.9];
    }
    if (def.dust && dustCfg.size == null) {
      // tamaño según qué tan lejos está la cámara: el polvo se ve de unos 6 px (base 1080) en cualquier escenario
      // (three.js dibuja cada punto de size * altoPantalla / (2 · distancia) píxeles)
      const dist = this.camera.position.distanceTo(this.cameraTarget);
      dustCfg.size = (6 * 2 * dist) / 1080;
    }
    this.dust = def.dust ? new Dust(this.scene, center, dustCfg) : null;

    // Personajes
    this.actors = {};
    for (const id of Object.keys(def.actors || {})) {
      const a = new Actor(id, id, assets);
      this.scene.add(a.object3d);
      this.actors[id] = a;
    }
  }

  // ---------- Cambiar el material de un objeto por otro material del mismo .glb ----------
  // materialSwaps: [{ node: 'Cubo.005', material: 'verde' }]               → todo el objeto
  //                [{ node: 'Cubo.005', from: 'blanco', material: 'verde' }] → solo la parte que usa "blanco"
  // Agregados al escenario sin tocar el .glb (data/planes.js → extras):
  //   planes: [{ from: [x0, z0], to: [x1, z1], y, material: 'nombre de material del modelo', uvTile }]
  //           → pisos que extienden el escenario con el mismo material (calles, andenes)
  //   copies: [{ node: 'nombre en Blender', offset: [dx, dy, dz], scale, haze }]
  //           → copias de una pieza (por ejemplo la imagen de la ciudad) más atrás / más arriba;
  //             haze aclara la copia para que se sienta lejana.
  _buildExtras(ex) {
    this.extraObjects = [];
    if (!ex || !this.shellModel) return;
    const mats = {};
    this.shellModel.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) mats[m.name] = mats[m.name] || m; });
    for (const p of ex.planes || []) {
      const [x0, z0] = p.from, [x1, z1] = p.to;
      const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
      const geo = new THREE.PlaneGeometry(w, d);
      const uv = geo.attributes.uv, k = p.uvTile || 4;           // para materiales con UV (modo original)
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / k, uv.getY(i) * d / k);
      const mesh = new THREE.Mesh(geo, mats[p.material] || new THREE.MeshStandardMaterial({ color: p.color || '#777' }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set((x0 + x1) / 2, p.y ?? 0, (z0 + z1) / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.extraObjects.push(mesh);
    }
    for (const c of ex.copies || []) {
      const src = this.shellModel.getObjectByName(nodeName(c.node));
      if (!src) { console.warn(`[Plane ${this.id}] extras: no encontré ${c.node}`); continue; }
      const cp = src.clone(true);
      src.matrixWorld.decompose(cp.position, cp.quaternion, cp.scale);
      cp.scale.multiplyScalar(c.scale ?? 1);
      cp.position.add(new THREE.Vector3(...(c.offset || [0, 0, 0])));
      cp.traverse(o => {
        if (!o.isMesh) return;
        o.material = [].concat(o.material).map(m => {
          const n = m.clone();
          if (c.haze && n.emissive) { n.emissive.set(c.hazeColor || '#b9bec4'); n.emissiveIntensity = c.haze; }
          return n;
        });
        if (o.material.length === 1) o.material = o.material[0];
      });
      this.scene.add(cp);
      this.extraObjects.push(cp);
    }
  }

  _applyMaterialSwaps(swaps) {
    if (!swaps?.length || !this.shellModel) return;
    const byName = {};
    this.shellModel.traverse(o => {
      if (o.isMesh) for (const m of [].concat(o.material)) byName[m.name] ??= m;
    });
    for (const sw of swaps) {
      const target = byName[sw.material];
      if (!target) { console.warn(`[Plane ${this.id}] No existe el material "${sw.material}" en el escenario.`); continue; }
      for (const n of [].concat(sw.node)) {
        const obj = this.shellModel.getObjectByName(nodeName(n));
        if (!obj) { console.warn(`[Plane ${this.id}] No encontré "${n}" para cambiarle el material.`); continue; }
        obj.traverse(o => {
          if (!o.isMesh) return;
          if (Array.isArray(o.material)) o.material = o.material.map(m => (!sw.from || m.name === sw.from ? target : m));
          else if (!sw.from || o.material.name === sw.from) o.material = target;
        });
      }
    }
  }

  // ---------- Cámara: escrita en planes.js o tomada del .glb ----------
  _setupCamera(cam) {
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400);
    let pos, target, fov;
    const fromModel = cam === 'model' || cam?.fromModel;
    const mcam = fromModel && this.shellModel ? findCamera(this.shellModel, cam?.fromModel) : null;
    if (mcam) {
      pos = mcam.getWorldPosition(new THREE.Vector3());
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(mcam.getWorldQuaternion(new THREE.Quaternion()));
      // punto al que mira: donde el rayo de la cámara cruza el centro del escenario
      const dist = this.shellBox ? pos.distanceTo(this.shellBox.getCenter(new THREE.Vector3())) : 10;
      target = pos.clone().addScaledVector(fwd, dist);
      fov = mcam.fov;
    } else {
      if (fromModel) console.warn(`[Plane ${this.id}] El escenario no trae cámara; uso una provisional.`);
      const c = fromModel ? { pos: [0, 3.4, 11], target: [0, 1.3, 0], fov: 40 } : cam;
      pos = new THREE.Vector3(...c.pos);
      target = new THREE.Vector3(...c.target);
      fov = c.fov || 40;
    }
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camHome = { pos: pos.clone(), target: target.clone() };
    this.cameraBase = pos.clone();
    this.cameraTarget = target.clone();
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  // ---------- Luces del .glb: presets de color y sombras ----------
  _setupModelLights() {
    this.modelLights = {};
    if (!this.shellModel) return;
    this.shellModel.traverse(o => { if (o.isLight) this.modelLights[o.name] = o; });
    for (const l of Object.values(this.modelLights)) l.userData.baseColor = l.color.clone();

    const sh = this.def.shadows;
    if (sh) {
      const light = this.modelLights[nodeName(sh.light)];
      if (!light) console.warn(`[Plane ${this.id}] No encontré la luz "${sh.light}" para las sombras.`);
      else {
        light.castShadow = true;
        light.shadow.mapSize.set(sh.mapSize || 1024, sh.mapSize || 1024);
        light.shadow.bias = sh.bias ?? -0.002;
        light.shadow.normalBias = sh.normalBias ?? 0.02;
        light.shadow.radius = sh.radius ?? 4;
        light.shadow.camera.near = 0.05;
        this.shellModel.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      }
    }
  }

  // Cambia el color de las luces del .glb según un preset de data/planes.js (lightPresets).
  setLightPreset(name) {
    const preset = name && this.def.lightPresets?.[name];
    for (const [n, l] of Object.entries(this.modelLights)) {
      const c = preset?.[n] ?? preset?.[Object.keys(preset || {}).find(k => nodeName(k) === n)];
      if (c) Array.isArray(c) ? l.color.setRGB(c[0], c[1], c[2]) : l.color.set(c);
      else l.color.copy(l.userData.baseColor);
    }
  }

  _buildLights(mode, ambient) {
    // 'default' = luces suaves provisionales · 'model' = solo las luces que traiga el .glb · 'none'
    if (ambient) this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, ambient));
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
    for (const a of Object.values(this.actors || {})) a.resetFade?.();
    this.noPair = false;
    this.cameraBase.copy(this.camHome.pos);
    this.cameraTarget.copy(this.camHome.target);
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
      setVisible(p, !p.def.hidden);
      p.object3d.position.copy(p.homePosition);
      (p.parts || []).forEach((o, i) => p.partHomes[i] && o.position.copy(p.partHomes[i]));
      (p.partQuats || []).forEach(list => list.forEach(([c, q]) => c.quaternion.copy(q)));
    }
    this.setLightPreset(null);
    this.refreshVisibility(state);
  }

  refreshVisibility(state) {
    for (const p of Object.values(this.props)) {
      if (typeof p.def.visibleIf === 'function') setVisible(p, !!p.def.visibleIf(state));
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
      if (this.def.dust.follow) this.dust.center.set(this.cameraTarget.x, this.cameraTarget.y - 1.4, this.def.shell?.asset ? this.cameraTarget.z : 0);  // sigue a la cámara
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

// Mostrar/ocultar un prop (con todas sus partes, si tiene varias).
export function setVisible(entity, v) {
  if (entity.parts) entity.parts.forEach(o => (o.visible = v));
  else entity.object3d.visible = v;
}

function findCamera(root, name) {
  let cam = null;
  root.traverse(o => {
    if (cam || !o.isCamera) return;
    if (!name || o.name === nodeName(name) || o.parent?.name === nodeName(name)) cam = o;
  });
  return cam;
}

function highlightObject(obj, on) {
  obj.traverse(o => {
    if (o.isMesh && o.material && 'emissive' in o.material) {
      if (!o.userData.ownMaterial) { o.material = o.material.clone(); o.userData.ownMaterial = true; }
      o.material.emissive.set(on ? 0x665500 : 0x000000);
    }
  });
}
