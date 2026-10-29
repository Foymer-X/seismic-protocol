// BORDES NEGROS ESTILO CARICATURA (contorno de los modelos 3D).
// Por defecto en todos los escenarios con modelo (CONFIG.quality.outline). En data/planes.js → outline:
//   false                         → sin bordes en ese escenario
//   { nodes: ['Cubo'] }           → solo esas piezas
//   { contourOnly: ['Esfera*'] }  → esas piezas solo llevan su silueta (sin líneas internas)
//   { thickness: 0.9 }            → grosor propio del escenario
//   { crease: 30 }                → ángulo mínimo (grados) para que una arista lleve línea
//
// Cómo funciona (los bordes son geometría de verdad, así que lo que está delante siempre los tapa):
//  1) SILUETA — "casco invertido": cada pieza cerrada se dibuja otra vez, en negro, solo por su cara de
//     atrás e inflada unos píxeles en pantalla. Lo que sobresale alrededor de la pieza es el contorno.
//  2) ARISTAS — líneas de ancho fijo en píxeles sobre los dobleces del modelo. Solo se marcan las aristas
//     "duras" (sombreado plano en Blender) con un ángulo mayor a `crease`; las superficies suavizadas
//     (cilindros, esferas, cojines) no llevan rayas internas, solo su silueta.
// Los personajes 2D y las imágenes con transparencia no llevan borde.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CONFIG } from '../config.js';

const match = (name, list) => (list || []).some(p => {
  const n = THREE.PropertyBinding.sanitizeNodeName(p);
  return p.endsWith('*') ? name.startsWith(THREE.PropertyBinding.sanitizeNodeName(p.slice(0, -1))) : name === n;
});
const noRay = () => {};

// ---------- análisis de la geometría (se hace una vez por geometría) ----------
const geoCache = new Map();   // `${uuid}|${crease}` → { closed, hull: bool, edges: Float32Array }

function analyze(geo, creaseDeg) {
  const key = geo.uuid + '|' + creaseDeg;
  if (geoCache.has(key)) return geoCache.get(key);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const idx = geo.index ? geo.index.array : null;
  const nTri = (idx ? idx.length : pos.count) / 3;
  const vi = (t, k) => idx ? idx[t * 3 + k] : t * 3 + k;
  // vértices soldados por posición
  const weld = new Int32Array(pos.count), keyOf = new Map();
  const q = v => Math.round(v * 1e4);
  for (let i = 0; i < pos.count; i++) {
    const k = q(pos.getX(i)) + ',' + q(pos.getY(i)) + ',' + q(pos.getZ(i));
    let w = keyOf.get(k); if (w === undefined) { w = keyOf.size; keyOf.set(k, w); }
    weld[i] = w;
  }
  // normales de cara y normal promedio por posición (para inflar el casco sin abrir grietas en las esquinas)
  const fn = new Float32Array(nTri * 3), pn = new Float32Array(keyOf.size * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    a.fromBufferAttribute(pos, vi(t, 0)); b.fromBufferAttribute(pos, vi(t, 1)); c.fromBufferAttribute(pos, vi(t, 2));
    c.sub(b); b.sub(a); b.cross(c);                         // normal × 2·área
    for (let k = 0; k < 3; k++) { const w = weld[vi(t, k)] * 3; pn[w] += b.x; pn[w + 1] += b.y; pn[w + 2] += b.z; }
    b.normalize(); fn[t * 3] = b.x; fn[t * 3 + 1] = b.y; fn[t * 3 + 2] = b.z;
  }
  const hn = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const w = weld[i] * 3; c.set(pn[w], pn[w + 1], pn[w + 2]);
    if (c.lengthSq() < 1e-12 && nor) c.fromBufferAttribute(nor, i);
    c.normalize(); hn[i * 3] = c.x; hn[i * 3 + 1] = c.y; hn[i * 3 + 2] = c.z;
  }
  geo.setAttribute('hullNormal', new THREE.BufferAttribute(hn, 3));
  // aristas: cada arista (por posición) con sus caras
  const edges = new Map();
  for (let t = 0; t < nTri; t++) for (let k = 0; k < 3; k++) {
    const i0 = vi(t, k), i1 = vi(t, (k + 1) % 3), w0 = weld[i0], w1 = weld[i1];
    if (w0 === w1) continue;
    const ek = w0 < w1 ? w0 * 4294967296 + w1 : w1 * 4294967296 + w0;
    let e = edges.get(ek); if (!e) { e = { i0, i1, f: [] }; edges.set(ek, e); }
    e.f.push(t, i0, i1);
  }
  const cosCrease = Math.cos(THREE.MathUtils.degToRad(creaseDeg)), cosSharp = Math.cos(THREE.MathUtils.degToRad(75));
  const n0 = new THREE.Vector3(), n1 = new THREE.Vector3();
  const sameNormal = (i, j) => {
    if (!nor) return false;
    n0.fromBufferAttribute(nor, i); n1.fromBufferAttribute(nor, j); return n0.dot(n1) > 0.999;
  };
  const out = []; let boundary = 0;
  for (const e of edges.values()) {
    const nf = e.f.length / 3;
    let line = false;
    if (nf === 1) { boundary++; line = true; }               // borde abierto (canto de una pared, tela)
    else if (nf === 2) {
      const [t0, a0, a1, t1, b0, b1] = e.f;
      const dot = fn[t0 * 3] * fn[t1 * 3] + fn[t0 * 3 + 1] * fn[t1 * 3 + 1] + fn[t0 * 3 + 2] * fn[t1 * 3 + 2];
      // ¿la arista está "partida" (sombreado plano)? los vértices de cada lado tienen normales distintas
      const hard = !(sameNormal(a0, b1) && sameNormal(a1, b0)) && !(sameNormal(a0, b0) && sameNormal(a1, b1));
      line = dot < cosSharp || (hard && dot < cosCrease);
    } else line = true;                                       // más de dos caras: unión de piezas
    if (line) {
      a.fromBufferAttribute(pos, e.i0); b.fromBufferAttribute(pos, e.i1);
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const res = { closed: boundary <= edges.size * 0.004, edges: new Float32Array(out) };
  geoCache.set(key, res);
  return res;
}

// ---------- materiales ----------
let hullMat = null;
const lineMats = new Set();
function getHullMaterial() {
  if (hullMat) return hullMat;
  hullMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: new THREE.Color('#141414') },
      px: { value: new THREE.Vector2(0.002, 0.002) },        // grosor en coordenadas de recorte
    }]),
    vertexShader: `
      attribute vec3 hullNormal;
      uniform vec2 px;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec4 clip = projectionMatrix * mvPosition;
        vec3 nv = normalize(normalMatrix * hullNormal);
        vec2 d = (projectionMatrix * vec4(nv, 0.0)).xy;
        float l = length(d);
        if (l > 1e-5) clip.xy += d / l * px * clip.w;
        gl_Position = clip;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 color;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <fog_fragment>
      }`,
    side: THREE.BackSide,
    fog: true,
  });
  return hullMat;
}

function makeLineMaterial() {
  const m = new LineMaterial({ color: 0x141414, linewidth: 1.5, worldUnits: false, fog: true });
  // las líneas se acercan un poquito a la cámara para no pelear con la superficie que las lleva
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace(
      'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
      'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );\n\t\t\tstart.xyz *= 0.9985; end.xyz *= 0.9985;');
  };
  lineMats.add(m);
  return m;
}

// Marca qué mallas llevan borde y les crea su casco y sus líneas. Se llama al construir el plano.
export function markOutline(plane) {
  const cfg = plane.def.outline;
  plane.outlineOn = false;
  if (cfg === false || !plane.shellModel || CONFIG.quality.outline?.enabled === false) return;
  const opts = typeof cfg === 'object' ? cfg : {};
  const O = CONFIG.quality.outline || {};
  let crease = opts.crease ?? O.crease ?? 30;
  if (crease < 1) crease = 30;                     // valores del sistema anterior (0–1)
  const roots = [plane.shellModel, ...(plane.extraObjects || [])];
  const lineRoots = new Set();
  if (opts.nodes) for (const n of opts.nodes) { const o = plane.shellModel.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) lineRoots.add(o); }
  const meshes = [];
  for (const r of roots) r.traverse(o => { if (o.isMesh && !o.userData.outlinePart) meshes.push(o); });
  const lineMat = makeLineMaterial();
  plane.outlineParts = [];
  for (const o of meshes) {
    const mats = [].concat(o.material);
    if (mats.some(m => m.transparent || m.alphaTest > 0)) continue;   // imágenes con transparencia
    let inLine = !opts.nodes;
    if (opts.nodes) for (let p = o; p; p = p.parent) if (lineRoots.has(p)) { inLine = true; break; }
    if (!inLine) continue;
    let contour = false;
    for (let p = o; p && !contour; p = p.parent) contour = match(p.name, opts.contourOnly);
    const info = analyze(o.geometry, crease);
    // 1) silueta: solo piezas cerradas y de una cara (si no, se verían las caras de atrás en negro)
    if (info.closed && mats[0].side === THREE.FrontSide) {
      const hull = new THREE.Mesh(o.geometry, getHullMaterial());
      hull.userData.outlinePart = true; hull.raycast = noRay;
      hull.renderOrder = o.renderOrder;
      o.add(hull); plane.outlineParts.push(hull);
    }
    // 2) aristas
    if (!contour && info.edges.length) {
      const g = new LineSegmentsGeometry().setPositions(info.edges);
      const lines = new LineSegments2(g, lineMat);
      lines.userData.outlinePart = true; lines.raycast = noRay;
      o.add(lines); plane.outlineParts.push(lines);
    }
  }
  plane.outlineMat = lineMat;
  plane.outlineOn = true;
  plane.outlineOpts = opts;
}

export class Outline {
  constructor(renderer) {
    this.renderer = renderer;
    this.size = new THREE.Vector2();
  }

  // Ajusta grosor y color a la resolución actual y dibuja la escena (los bordes ya son parte de ella).
  render(plane, camera) {
    const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    const O = CONFIG.quality.outline || {}, P = plane.outlineOpts || {};
    const k = (P.thickness ?? O.thickness ?? 1) * Math.max(1, this.size.y / 1080);
    const color = O.color || '#141414';
    const h = getHullMaterial();
    const silPx = 1.9 * k;                        // la silueta, un poco más gruesa que las aristas internas
    h.uniforms.px.value.set(2 * silPx / this.size.x, 2 * silPx / this.size.y);
    h.uniforms.color.value.set(color);
    const m = plane.outlineMat;
    if (m) {
      m.resolution.set(this.size.x, this.size.y);
      m.linewidth = 1.35 * k;
      m.color.set(color);
    }
    r.render(plane.scene, camera);
  }
}
