// Carga de recursos del manifiesto (data/assets.js).
// Todo lo que tenga src: null (o falle al cargar) se reemplaza por un marcador provisional.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { CONFIG } from '../config.js';

export class Assets {
  constructor(manifest) {
    this.manifest = manifest;
    this.models = new Map();
    this.textures = new Map();     // imagen principal de un sprite
    this.anims = new Map();        // key → { animName: { kind, textures | video, ... } }
    this.audio = new Map();
    this.environments = new Map();
  }

  async preload(onProgress = () => {}) {
    const jobs = [];
    const gltf = new GLTFLoader();
    const tex = new THREE.TextureLoader();
    const hdr = new HDRLoader();

    const loadTex = async url => {
      const t = await tex.loadAsync(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;          // sprites inclinados (objetos sobre la mesa) sin verse borrosos
      return t;
    };

    // Texturas de materiales (map / bumpMap…), compartidas entre modelos
    const texCache = new Map();
    texCache.load = (url, srgb) => {
      const k = url + (srgb ? '|s' : '');
      if (!texCache.has(k)) texCache.set(k, tex.loadAsync(url).then(t => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;   // texturas nítidas en pisos y paredes vistos de lado
        return t;
      }));
      return texCache.get(k);
    };

    for (const [key, a] of Object.entries(this.manifest)) {
      if (!a || (a.debugOnly && !CONFIG.debug)) continue;
      if (a.type === 'model' && a.src) {
        jobs.push([key, async () => {
          const g = await gltf.loadAsync(a.src);
          await applyMaterialOverrides(g.scene, a.materials, key, texCache);
          this.models.set(key, g);
        }]);
      }
      if (a.type === 'sprite') {
        if (a.src) jobs.push([key, async () => this.textures.set(key, await loadTex(a.src))]);
        // Animaciones por cuadros sueltos o video
        for (const [name, an] of Object.entries(a.anims || {})) {
          if (an.sheet) {
            // hoja WebP generada (data/sprites.js): un solo archivo por animación
            jobs.push([`${key}.${name}`, async () => {
              const t = await loadTex(an.sheet);
              t.generateMipmaps = false;
              t.minFilter = THREE.LinearFilter;     // sin mipmaps: los cuadros vecinos no se mezclan
              this._setAnim(key, name, { kind: 'sheet', texture: t, ...an, loop: an.loop !== false });
            }]);
          } else if (an.frames) {
            const urls = Array.isArray(an.frames)
              ? an.frames
              : Array.from({ length: an.count }, (_, i) => an.frames.replace('{i}', String(i + (an.start ?? 1)).padStart(an.pad ?? 1, '0')));
            jobs.push([`${key}.${name}`, async () => {
              const textures = await Promise.all(urls.map(loadTex));
              this._setAnim(key, name, { kind: 'frames', textures, fps: an.fps ?? 10, loop: an.loop !== false });
            }]);
          } else if (an.video) {
            jobs.push([`${key}.${name}`, async () => {
              const el = await loadVideo(an.video, an.loop !== false);
              const t = new THREE.VideoTexture(el);
              t.colorSpace = THREE.SRGBColorSpace;
              this._setAnim(key, name, { kind: 'video', texture: t, el });
            }]);
          }
        }
      }
      if (a.type === 'environment' && a.src) {
        jobs.push([key, async () => {
          const t = /\.hdr$/i.test(a.src) ? await hdr.loadAsync(a.src) : await loadTex(a.src);
          t.mapping = THREE.EquirectangularReflectionMapping;
          this.environments.set(key, t);
        }]);
      }
      if (a.type === 'audio' && a.src) {
        // se descarga como datos; AudioManager los decodifica (Web Audio) para poder mezclar y hacer fundidos
        jobs.push([key, async () => {
          const r = await fetch(a.src);
          if (!r.ok) throw new Error(`${a.src}: ${r.status}`);
          this.audio.set(key, { def: a, data: await r.arrayBuffer() });
        }]);
      }
    }

    let done = 0;
    await Promise.all(jobs.map(async ([key, fn]) => {
      try { await fn(); }
      catch (err) { console.warn(`[Assets] No se pudo cargar "${key}". Se usará un marcador provisional.`, err); }
      onProgress(++done / jobs.length);
    }));
    if (!jobs.length) onProgress(1);
  }

  _setAnim(key, name, data) {
    if (!this.anims.has(key)) this.anims.set(key, {});
    this.anims.get(key)[name] = data;
  }

  def(key) { return this.manifest[key] || null; }

  // Devuelve una copia del modelo 3D (con sus luces, si las trae) o null.
  model(key) {
    const g = this.models.get(key);
    if (!g) return null;
    const obj = g.scene.clone(true);
    const a = this.manifest[key];
    if (a.scale) obj.scale.setScalar(a.scale);
    if (a.rotationY) obj.rotation.y = THREE.MathUtils.degToRad(a.rotationY);
    if (a.position) obj.position.set(...a.position);
    obj.traverse(o => {
      if (o.isMesh) { o.castShadow = !!a.castShadow; o.receiveShadow = !!a.receiveShadow; }
      if (o.isLight && a.lightScale) o.intensity *= a.lightScale;   // ajustar intensidad de luces exportadas
    });
    obj.userData.animations = g.animations;
    return obj;
  }

  texture(key) { return this.textures.get(key) || null; }
  animsOf(key) { return this.anims.get(key) || null; }
  environment(key) { return this.environments.get(key) || null; }
  sound(key) { return this.audio.get(key) || null; }   // { def, data } (ver AudioManager)
}

// Corrige materiales por nombre (data/assets.js → materials). Útil cuando Blender no exporta
// un color hecho con nodos, o para ponerle una textura (imagen) a un material.
//   Clave: nombre exacto del material, o 'nombre*' para todos los que empiecen así (paredes, paredes.001…).
//   Valor: '#color' o {
//     color, roughness, metalness, emissive,
//     map: false | 'assets/textures/x_diff.jpg',        ← color (false = quitar la imagen)
//     bumpMap: 'assets/textures/x_disp.jpg', bumpScale,  ← relieve a partir de una imagen de altura (disp)
//     normalMap: 'assets/textures/x_nor_gl.jpg',         ← relieve con mapa normal (OpenGL)
//     roughnessMap: 'assets/textures/x_rough.jpg',
//     bumpFromNormal: true,  ← el .glb trae una imagen "disp" conectada como normal: la usa como relieve
//     projection: 'box', tile: 1.5, rotation: 45   ← ignora el UV del modelo y pega la imagen por el mundo,
//                                       un mosaico cada 1.5 m (ideal para paredes y pisos)
//     repeat: [x, y]          ← repeticiones sobre el UV del modelo (si no se usa projection) }
async function applyMaterialOverrides(root, overrides, key, texCache) {
  if (!overrides) return;
  const find = name => {
    if (overrides[name] !== undefined) return overrides[name];
    for (const k of Object.keys(overrides)) if (k.endsWith('*') && name.startsWith(k.slice(0, -1))) return overrides[k];
    return undefined;
  };
  // Claves '@Nodo:material' → solo ese material DENTRO de ese objeto (y sus hijos). Se clona el material para
  // que el resto del modelo no cambie. Ejemplo: '@Cubo.001:paredes': P.ladrillo()  (un edificio en ladrillo).
  for (const k of Object.keys(overrides)) {
    if (!k.startsWith('@')) continue;
    const [nodeName, matName] = k.slice(1).split(':');
    const node = root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nodeName));
    if (!node) { if (CONFIG.debug) console.info(`[Assets] ${key}: no existe el objeto "${nodeName}"`); continue; }
    const hit = n => matName.endsWith('*') ? n.startsWith(matName.slice(0, -1)) : n === matName;
    const cache = new Map();
    node.traverse(o => {
      if (!o.isMesh) return;
      const swap = m => {
        if (!hit(m.name)) return m;
        if (!cache.has(m)) { const c = m.clone(); c.name = k; cache.set(m, c); }
        return cache.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    });
  }
  const mats = new Set();
  root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) mats.add(m); });
  const used = new Set();
  for (const m of mats) {
    const ov = find(m.name);
    if (ov === undefined) continue;
    used.add(Object.keys(overrides).find(k => overrides[k] === ov));
    const cfg = typeof ov === 'string' ? { color: ov } : ov;
    const ref = m.map;                                   // transformación original del UV (antes de quitar la imagen)
    if (cfg.color) m.color.set(cfg.color);
    if (cfg.roughness != null) m.roughness = cfg.roughness;
    if (cfg.metalness != null) m.metalness = cfg.metalness;
    if (cfg.emissive) m.emissive.set(cfg.emissive);
    if (cfg.bumpFromNormal && m.normalMap) {
      m.bumpMap = m.normalMap.clone();
      if (ref) copyUvTransform(ref, m.bumpMap);
      m.normalMap = null;
    }
    const slots = [['map', true], ['bumpMap', false], ['normalMap', false], ['roughnessMap', false]];
    for (const [slot, srgb] of slots) {
      const v = cfg[slot];
      if (v === false) { m[slot] = null; continue; }
      if (typeof v !== 'string') continue;
      let t = await texCache.load(v, srgb);
      if (cfg.projection !== 'box' && cfg.projection !== 'triplanar') {
        t = t.clone();
        if (cfg.repeat) t.repeat.set(...cfg.repeat);
        else if (ref && slot !== 'map') copyUvTransform(ref, t);   // el relieve sigue la veta de la imagen original
      }
      m[slot] = t;
    }
    if (cfg.bumpScale != null) m.bumpScale = cfg.bumpScale;
    if (cfg.projection === 'box' || cfg.projection === 'triplanar')
      useBoxProjection(m, cfg.tile ?? 1.5, cfg.rotation ?? 0, cfg.blend ?? 32);   // blend < 20 = mezcla suave (más lenta)
    if (cfg.map !== undefined && cfg.map !== false && !cfg.color) m.color.set('#ffffff');
    m.needsUpdate = true;
  }
  const missing = Object.keys(overrides).filter(k => !used.has(k));
  if (missing.length && CONFIG.debug) console.info(`[Assets] ${key}: estos materiales no están en el modelo: ${missing.join(', ')}`);
}

function copyUvTransform(from, to) {
  to.offset.copy(from.offset); to.repeat.copy(from.repeat);
  to.center.copy(from.center); to.rotation = from.rotation;
  to.matrixAutoUpdate = from.matrixAutoUpdate;
  if (!from.matrixAutoUpdate) to.matrix.copy(from.matrix);
}

// Proyección TRIPLANAR en coordenadas del mundo: la imagen se pega desde los tres ejes y se mezcla
// según hacia dónde mira cada cara. Así la textura queda del mismo tamaño en paredes, pisos, escaleras
// y muebles inclinados, sin importar cómo venga el UV del modelo (o aunque no tenga UV).
//   tile = metros que ocupa un mosaico de la imagen · rotation = giro en grados
//   blend = qué tan suave es la mezcla entre ejes (alto = cortes de caja; 4 = suave)
function useBoxProjection(m, tile, rotationDeg, blend = 6) {
  m.userData.boxTile = { value: 1 / tile };
  const r = THREE.MathUtils.degToRad(rotationDeg);
  m.userData.boxRot = { value: new THREE.Vector2(Math.cos(r), Math.sin(r)) };
  m.userData.boxBlend = { value: blend };
  m.customProgramCacheKey = () => 'triplanar';
  m.onBeforeCompile = sh => {
    sh.uniforms.boxTile = m.userData.boxTile;
    sh.uniforms.boxRot = m.userData.boxRot;
    sh.uniforms.boxBlend = m.userData.boxBlend;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBoxPos;\nvarying vec3 vBoxNrm;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvBoxPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvBoxNrm = normalize(mat3(modelMatrix) * objectNormal);');
    const fn = `varying vec3 vBoxPos;
varying vec3 vBoxNrm;
uniform float boxTile;
uniform vec2 boxRot;
uniform float boxBlend;
vec2 boxR(vec2 uv) { return vec2(uv.x * boxRot.x - uv.y * boxRot.y, uv.x * boxRot.y + uv.y * boxRot.x); }
// normal de la CARA (no la suavizada): en paredes y pisos que comparten vértices la normal suavizada
// se inclina cerca de las esquinas y la mezcla dibujaba diagonales.
vec3 boxW() {
  vec3 fn = cross(dFdx(vBoxPos), dFdy(vBoxPos));
  vec3 n = dot(fn, fn) > 1e-12 ? normalize(fn) : normalize(vBoxNrm);
  vec3 w = pow(abs(n), vec3(boxBlend)); return w / (w.x + w.y + w.z);
}
// Rápido: en caras rectas (casi todas: paredes, pisos, techos) se lee la imagen UNA sola vez;
// solo en caras inclinadas se mezclan los tres ejes.
vec4 triTexAt(sampler2D t, vec3 wp, vec3 w) {
  vec3 p = wp * boxTile;
  if (boxBlend < 20.0) {     // mezcla suave solo si se pide (blend bajo) y la cara es inclinada
    if (w.y > 0.97) return texture2D(t, boxR(p.xz));
    if (w.x > 0.97) return texture2D(t, boxR(p.zy));
    if (w.z > 0.97) return texture2D(t, boxR(p.xy));
    return texture2D(t, boxR(p.zy)) * w.x + texture2D(t, boxR(p.xz)) * w.y + texture2D(t, boxR(p.xy)) * w.z;
  }
  // por defecto: un solo eje (el que más mira la cara) → una sola lectura por píxel
  return w.y >= w.x && w.y >= w.z ? texture2D(t, boxR(p.xz)) : (w.x >= w.z ? texture2D(t, boxR(p.zy)) : texture2D(t, boxR(p.xy)));
}
vec4 triTex(sampler2D t) { return triTexAt(t, vBoxPos, boxW()); }`;
    const bump = THREE.ShaderChunk.bumpmap_pars_fragment.replace(/vec2 dHdxy_fwd\(\) \{[\s\S]*?return vec2\( dBx, dBy \);\s*\}/,
      `vec2 dHdxy_fwd() {
    // una sola lectura de la altura y su variación entre píxeles vecinos (más barato que leer 3 veces)
    float H = bumpScale * triTex(bumpMap).x;
    return vec2(dFdx(H), dFdy(H));
  }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + fn)
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'triTex( map )'))
      .replace('#include <bumpmap_pars_fragment>', bump)
      .replace('#include <roughnessmap_fragment>', THREE.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )', 'triTex( roughnessMap )'));
  };
}

function loadVideo(src, loop) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    el.src = src; el.loop = loop; el.muted = true; el.playsInline = true; el.preload = 'auto';
    el.addEventListener('loadeddata', () => resolve(el), { once: true });
    el.addEventListener('error', () => reject(new Error(`video ${src}`)), { once: true });
  });
}

// ---------- Marcadores provisionales ----------

// style 'figure': silueta (personajes) · style 'card': tarjeta con nombre (objetos)
export function placeholderSpriteTexture(label, color = '#ffffff', aspect = 0.5, style = 'figure') {
  const h = 512, w = Math.round(h * aspect);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.lineWidth = 8;
  g.strokeStyle = '#000';
  g.fillStyle = color;

  if (style === 'card') {
    roundRect(g, 6, 6, w - 12, h - 12, 40); g.fill(); g.stroke();
    g.fillStyle = '#000';
    g.font = `bold ${Math.round(Math.min(w, h) * 0.42)}px sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((label || '?').charAt(0), w / 2, h * 0.42);
    g.font = `bold ${Math.round(Math.min(w, h) * 0.11)}px sans-serif`;
    g.fillText(label || '', w / 2, h * 0.82, w - 30);
  } else {
    const r = Math.min(w * 0.28, h * 0.13);
    g.beginPath(); g.arc(w / 2, r + 10, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath();
    g.moveTo(w / 2, r * 2 + 18);
    g.lineTo(w - 8, h - 70);
    g.lineTo(8, h - 70);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#000';
    g.font = `bold ${Math.round(w * 0.16)}px sans-serif`;
    g.textAlign = 'center';
    g.fillText(label || '', w / 2, h - 22, w - 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Caja con bordes negros.
export function placeholderBox(size = [1, 1, 1], color = '#cccccc') {
  const [w, h, d] = size;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x000000 })));
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

// Camión provisional (mira hacia +x): caja, cabina con ventana y cuatro ruedas.
export function placeholderTruck(size = [6, 2.6, 2.2], color = '#d32f2f') {
  const [w, h, d] = size;
  const g = new THREE.Group();
  const wheelR = h * 0.17;
  const body = placeholderBox([w * 0.68, h * 0.82, d], color);
  body.position.set(-w * 0.16, wheelR, 0);
  const cab = placeholderBox([w * 0.3, h * 0.66, d * 0.96], color);
  cab.position.set(w * 0.34, wheelR, 0);
  const glass = placeholderBox([w * 0.02, h * 0.24, d * 0.8], '#1d2a35');
  glass.position.set(w * 0.49, wheelR + h * 0.36, 0);
  const side = placeholderBox([w * 0.16, h * 0.22, 0.03], '#1d2a35');   // ventana de la puerta
  side.position.set(w * 0.36, wheelR + h * 0.38, d * 0.49);
  g.add(body, cab, glass, side);
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.35, 18);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 1 });
  for (const x of [-w * 0.32, w * 0.3]) for (const z of [-d / 2, d / 2]) {
    const wh = new THREE.Mesh(wheelGeo, wheelMat);
    wh.rotation.x = Math.PI / 2;
    wh.position.set(x, wheelR, z);
    wh.userData.wheel = true;
    g.add(wh);
  }
  return g;
}

// Caja abierta por el frente (cabina de ascensor, maleta abierta…): fondo, lados, piso y techo.
export function placeholderOpenBox(size = [2, 2.6, 1.4], color = '#6e6e6e', inside = '#1b1b1b', open = 'front') {
  const [w, h, d] = size;
  const group = new THREE.Group();
  const inMat = new THREE.MeshStandardMaterial({ color: inside, roughness: 1, side: THREE.DoubleSide });
  const frameMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const t = 0.08;
  const parts = [
    [[w, h, t], [0, h / 2, -d / 2]],          // fondo
    [[t, h, d], [-w / 2, h / 2, 0]],          // lado izq
    [[t, h, d], [w / 2, h / 2, 0]],           // lado der
    [[w, t, d], [0, t / 2, 0]],               // piso
  ];
  if (open === 'front') parts.push([[w, t, d], [0, h - t / 2, 0]]); // techo
  for (const [s, p] of parts) {
    const geo = new THREE.BoxGeometry(...s);
    const m = new THREE.Mesh(geo, open === 'top' ? frameMat : inMat);
    m.position.set(...p);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0 })));
    group.add(m);
  }
  if (open === 'front') {
    // marco exterior: dos laterales y un dintel (sin puerta)
    const side = (x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, h + 0.3, 0.14), frameMat); m.position.set(x, (h + 0.3) / 2, d / 2); return m; };
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, 0.14), frameMat);
    top.position.set(0, h + 0.15, d / 2);
    group.add(side(-w / 2 - 0.1), side(w / 2 + 0.1), top);
  }
  return group;
}
