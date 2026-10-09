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
      return t;
    };

    for (const [key, a] of Object.entries(this.manifest)) {
      if (!a || (a.debugOnly && !CONFIG.debug)) continue;
      if (a.type === 'model' && a.src) {
        jobs.push([key, async () => {
          const g = await gltf.loadAsync(a.src);
          applyMaterialOverrides(g.scene, a.materials, key);
          this.models.set(key, g);
        }]);
      }
      if (a.type === 'sprite') {
        if (a.src) jobs.push([key, async () => this.textures.set(key, await loadTex(a.src))]);
        // Animaciones por cuadros sueltos o video
        for (const [name, an] of Object.entries(a.anims || {})) {
          if (an.frames) {
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
        jobs.push([key, async () => {
          const el = new Audio(a.src);
          el.preload = 'auto';
          el.loop = !!a.loop;
          el.volume = a.volume ?? 1;
          this.audio.set(key, el);
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
  sound(key) { return this.audio.get(key) || null; }
}

// Corrige materiales por nombre (data/assets.js → materials). Útil cuando Blender no exporta
// un color hecho con nodos. Valor: '#color' o { color, map: false, roughness, metalness, emissive }.
function applyMaterialOverrides(root, overrides, key) {
  if (!overrides) return;
  const seen = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      const ov = overrides[m.name];
      if (!ov || seen.has(m)) continue;
      seen.add(m);
      const cfg = typeof ov === 'string' ? { color: ov } : ov;
      if (cfg.color) m.color.set(cfg.color);
      if (cfg.map === false) m.map = null;
      if (cfg.roughness != null) m.roughness = cfg.roughness;
      if (cfg.metalness != null) m.metalness = cfg.metalness;
      if (cfg.emissive) m.emissive.set(cfg.emissive);
      m.needsUpdate = true;
    }
  });
  const missing = Object.keys(overrides).filter(n => ![...seen].some(m => m.name === n));
  if (missing.length && CONFIG.debug) console.info(`[Assets] ${key}: estos materiales no están en el modelo: ${missing.join(', ')}`);
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
