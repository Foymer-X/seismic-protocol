// BORDES NEGROS ESTILO CARICATURA (contorno de los modelos 3D).
// Por defecto en todos los escenarios con modelo (CONFIG.quality.outline). En data/planes.js → outline:
//   false                         → sin bordes en ese escenario
//   { nodes: ['Cubo'] }           → solo esas piezas
//   { contourOnly: ['Esfera*'] }  → esas piezas solo llevan su silueta (sin líneas internas): para formas redondeadas
//   { thickness: 0.9 }            → grosor propio del escenario
// Cómo funciona: 1) se dibuja la escena; 2) se dibujan los modelos guardando hacia dónde mira cada punto
// (normal), su distancia y si lleva borde; 3) donde la distancia salta (silueta) o la superficie dobla de
// golpe (arista marcada en Blender) se pinta una línea suave. Todo lo que está delante (la tapa de la
// maleta, un personaje) tapa la línea. Los personajes 2D y las imágenes con transparencia no llevan borde.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const OCC = 3, LINE = 2, CONT = 4;     // capas: tapa / con borde completo / solo silueta

const match = (name, list) => (list || []).some(p => {
  const n = THREE.PropertyBinding.sanitizeNodeName(p);
  return p.endsWith('*') ? name.startsWith(THREE.PropertyBinding.sanitizeNodeName(p.slice(0, -1))) : name === n;
});

// Marca qué mallas llevan borde. Se llama al construir el plano.
export function markOutline(plane) {
  const cfg = plane.def.outline;
  plane.outlineOn = false;
  if (cfg === false || !plane.shellModel) return;
  const opts = typeof cfg === 'object' ? cfg : {};
  const roots = [plane.shellModel, ...(plane.extraObjects || [])];
  const lineRoots = new Set();
  if (opts.nodes) for (const n of opts.nodes) { const o = plane.shellModel.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (o) lineRoots.add(o); }
  for (const r of roots) r.traverse(o => {
    if (!o.isMesh) return;
    if ([].concat(o.material).some(m => m.transparent || m.alphaTest > 0)) return;   // imágenes con transparencia
    o.layers.enable(OCC);
    let inLine = !opts.nodes;
    if (opts.nodes) for (let p = o; p; p = p.parent) if (lineRoots.has(p)) { inLine = true; break; }
    if (!inLine) return;
    let contour = false;
    for (let p = o; p && !contour; p = p.parent) contour = match(p.name, opts.contourOnly);
    o.layers.enable(contour ? CONT : LINE);
  });
  plane.outlineOn = true;
  plane.outlineOpts = opts;
}

// Material del paso de "normales": color = dirección de la superficie, alfa = tipo de borde.
function passMaterial(flag) {
  return new THREE.ShaderMaterial({
    uniforms: { flag: { value: flag } },
    vertexShader: `varying vec3 vN;
      void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float flag; varying vec3 vN;
      void main() { gl_FragColor = vec4(normalize(vN) * 0.5 + 0.5, flag); }`,
    side: THREE.DoubleSide,
    depthFunc: THREE.LessEqualDepth,
  });
}

export class Outline {
  constructor(renderer) {
    this.renderer = renderer;
    this.size = new THREE.Vector2();
    this.mats = { [OCC]: passMaterial(0), [LINE]: passMaterial(1), [CONT]: passMaterial(0.5) };
    this.composite = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tDepth: { value: null },
        tNormal: { value: null }, tNDepth: { value: null },
        texel: { value: new THREE.Vector2() },
        near: { value: 0.1 }, far: { value: 100 },
        thickness: { value: 1 }, lineColor: { value: new THREE.Color('#141414') },
        depthK: { value: 0.02 }, crease: { value: 0.5 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor, tDepth, tNormal, tNDepth;
        uniform vec2 texel; uniform float near, far, thickness, depthK, crease; uniform vec3 lineColor;
        varying vec2 vUv;
        float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        float ld(vec2 uv) { float d = texture2D(tNDepth, uv).x; return d < 1.0 ? lin(d) : far; }
        void main() {
          vec4 col = texture2D(tColor, vUv);
          vec4 cn = texture2D(tNormal, vUv);
          float dN = texture2D(tNDepth, vUv).x;
          float edge = 0.0;
          // solo en piezas con borde y donde no hay nada delante (personajes, lluvia…)
          if (cn.a > 0.25 && dN < 1.0 && abs(lin(texture2D(tDepth, vUv).x) - lin(dN)) < 0.03 * lin(dN)) {
            float c = lin(dN);
            vec3 n = cn.xyz * 2.0 - 1.0;
            vec2 dx = vec2(texel.x, 0.0) * thickness, dy = vec2(0.0, texel.y) * thickness;
            // silueta: segunda diferencia de la distancia (un piso o pared plana da ~0 aunque se vea de lado)
            float s1 = abs(ld(vUv - dx) + ld(vUv + dx) - 2.0 * c) / c;
            float s2 = abs(ld(vUv - dy) + ld(vUv + dy) - 2.0 * c) / c;
            float s3 = abs(ld(vUv - dx - dy) + ld(vUv + dx + dy) - 2.0 * c) / c;
            float s4 = abs(ld(vUv - dx + dy) + ld(vUv + dx - dy) - 2.0 * c) / c;
            edge = smoothstep(depthK, depthK * 2.5, max(max(s1, s2), max(s3, s4) * 0.7));
            // arista marcada (solo piezas con borde completo, no las de "solo silueta")
            if (cn.a > 0.75) {
              vec2 o[4]; o[0] = dx; o[1] = -dx; o[2] = dy; o[3] = -dy;
              for (int i = 0; i < 4; i++) {
                vec4 nb = texture2D(tNormal, vUv + o[i]);
                if (texture2D(tNDepth, vUv + o[i]).x >= 1.0) continue;
                float bend = 1.0 - dot(n, nb.xyz * 2.0 - 1.0);
                edge = max(edge, 0.9 * smoothstep(crease, crease + 0.25, bend));
              }
            }
          }
          gl_FragColor = vec4(mix(col.rgb, lineColor, edge), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false, toneMapped: true,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  _ensure() {
    const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    const { x: w, y: h } = this.size;
    if (this.main && this.main.width === w && this.main.height === h) return;
    this.main?.dispose(); this.normal?.dispose();
    this.main = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h) });
    this.normal = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) });
  }

  render(plane, camera) {
    const r = this.renderer, scene = plane.scene;
    this._ensure();
    // 1) escena completa
    r.setRenderTarget(this.main);
    r.render(scene, camera);
    // 2) modelos: normal + distancia + tipo de borde (primero todo lo que tapa, luego las piezas con borde)
    const bg = scene.background, fog = scene.fog, mask = camera.layers.mask, auto = r.autoClear;
    scene.background = null; scene.fog = null;
    r.setRenderTarget(this.normal);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.autoClear = false;
    for (const layer of [OCC, LINE, CONT]) {
      camera.layers.set(layer);
      scene.overrideMaterial = this.mats[layer];
      r.render(scene, camera);
    }
    r.autoClear = auto;
    camera.layers.mask = mask;
    scene.background = bg; scene.fog = fog; scene.overrideMaterial = null;
    // 3) composición con las líneas
    const u = this.composite.uniforms, O = CONFIG.quality.outline || {}, P = plane.outlineOpts || {};
    u.tColor.value = this.main.texture; u.tDepth.value = this.main.depthTexture;
    u.tNormal.value = this.normal.texture; u.tNDepth.value = this.normal.depthTexture;
    u.texel.value.set(1 / this.size.x, 1 / this.size.y);
    u.near.value = camera.near; u.far.value = camera.far;
    u.thickness.value = (P.thickness ?? O.thickness ?? 1) * Math.max(1, this.size.y / 1080);
    u.crease.value = P.crease ?? O.crease ?? 0.5;
    u.lineColor.value.set(O.color || '#141414');
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
