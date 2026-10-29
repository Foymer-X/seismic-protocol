// Efectos ambientales de un plano: lluvia y polvo que cae con el temblor.
// Se activan desde data/planes.js:  weather: 'rain'  ·  dust: true  ·  fog: { color, near, far }
import * as THREE from 'three';
import { EFFECTS } from '../../data/effects.js';

// ---------- Lluvia ----------
export class Rain {
  constructor(scene, center, { count = 1400, area = [26, 14, 12], speed = 16, color = '#c8d2dc', opacity = 0.55, wind = 2.5 } = {}) {
    this.area = area; this.speed = speed; this.wind = wind;
    this.center = center.clone();
    const len = 0.45;
    const pos = new Float32Array(count * 6);
    this.drops = [];
    for (let i = 0; i < count; i++) {
      const d = { x: this._r(0), y: Math.random() * area[1], z: this._r(2), v: speed * (0.8 + Math.random() * 0.4) };
      this.drops.push(d);
    }
    this.len = len;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.update(0);
  }

  _r(axis) { return (Math.random() - 0.5) * this.area[axis]; }

  update(dt) {
    const p = this.lines.geometry.attributes.position.array;
    const c = this.center, wx = this.wind / this.speed;
    this.drops.forEach((d, i) => {
      d.y -= d.v * dt;
      d.x += this.wind * dt;
      if (d.y < 0) { d.y = this.area[1]; d.x = this._r(0); d.z = this._r(2); }
      if (d.x > this.area[0] / 2) d.x -= this.area[0];
      const o = i * 6;
      p[o] = c.x + d.x; p[o + 1] = d.y; p[o + 2] = c.z + d.z;
      p[o + 3] = c.x + d.x - wx * this.len; p[o + 4] = d.y + this.len; p[o + 5] = c.z + d.z;
    });
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}

// ---------- Polvo que cae del techo mientras tiembla ----------
// Textura de un punto redondo y suave para las partículas.
let _dot = null;
function roundDot() {
  if (_dot) return _dot;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

export class Dust {
  // Polvo fino + trozos de escombro que caen del techo mientras tiembla.
  // size: tamaño del polvo (en metros); los trozos son "chunkScale" veces más grandes.
  constructor(scene, center, { count = 700, area = [16, 5, 7], color = '#d9d0c3', size = 0.06,
                               chunks = 90, chunkColor = '#7a7068', chunkScale = 2.6, rate = 420 } = {}) {
    this.area = area;
    this.center = center.clone();
    this.rate = rate;
    this.layers = [
      this._layer(scene, count, color, size, [1.2, 3.0], 0.9),
      this._layer(scene, chunks, chunkColor, size * chunkScale, [3.0, 5.5], 1.0, 0.12),
    ];
  }

  _layer(scene, count, color, size, speed, opacity, share = 1) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, transparent: true, opacity, depthWrite: false, toneMapped: false,
      map: roundDot(), alphaTest: 0.05,                     // partículas redondas (no cuadradas)
    }));
    points.frustumCulled = false;
    scene.add(points);
    return { points, speed, share, acc: 0, parts: Array.from({ length: count }, () => ({ alive: false, x: 0, y: 0, z: 0, v: 0 })) };
  }

  // intensity: 0 (quieto) … 1+ (temblor fuerte)
  update(dt, intensity) {
    const c = this.center;
    for (const L of this.layers) {
      L.acc += Math.max(0, intensity - 0.15) * this.rate * L.share * dt;     // partículas por segundo
      for (const part of L.parts) {
        if (L.acc < 1) break;
        if (part.alive) continue;
        part.alive = true;
        part.x = (Math.random() - 0.5) * this.area[0];
        part.z = (Math.random() - 0.5) * this.area[2];
        part.y = this.area[1] * (0.85 + Math.random() * 0.15);
        part.v = L.speed[0] + Math.random() * (L.speed[1] - L.speed[0]);
        L.acc -= 1;
      }
      L.acc = Math.min(L.acc, 5);
      const p = L.points.geometry.attributes.position.array;
      L.parts.forEach((part, i) => {
        if (part.alive) {
          part.v += dt * 2.5;                                   // acelera un poco al caer
          part.y -= part.v * dt;
          part.x += Math.sin(part.y * 3 + i) * dt * 0.3;
          if (part.y <= 0.02) part.alive = false;
        }
        p[i * 3] = c.x + part.x;
        p[i * 3 + 1] = part.alive ? c.y + part.y : -100;
        p[i * 3 + 2] = c.z + part.z;
      });
      L.points.geometry.attributes.position.needsUpdate = true;
    }
  }
}

// =====================================================================================
// EFECTOS CON HOJAS DE CUADROS (secuencias de After Effects → tools/secuencias.py → data/effects.js)
// Más livianos que las partículas: una imagen animada en vez de cientos de puntos calculados cada cuadro.
// =====================================================================================

const cellOf = (fx, f) => {
  const c = f % fx.cols, r = Math.floor(f / fx.cols);
  return [c, r];
};

// Capa a PANTALLA COMPLETA, encima del escenario 3D (y debajo de diálogos y etiquetas).
export class ScreenSheet {
  constructor(name, { opacity = 1, speed = 1 } = {}) {
    this.fx = EFFECTS[name];
    this.base = opacity; this.speed = speed;
    this.t = Math.random() * 10; this.frame = -1; this.k = -1;
    const el = this.el = document.createElement('div');
    el.className = `fx-layer fx-${name}`;
    el.style.backgroundImage = `url("${this.fx.sheet}")`;
    el.style.backgroundSize = `${this.fx.cols * 100}% ${this.fx.rows * 100}%`;
    el.hidden = true;
    document.querySelector('#fx-layers')?.appendChild(el);
  }

  // k: intensidad 0–1 (multiplica la opacidad; 0 = no se dibuja)
  update(dt, k = 1) {
    const fx = this.fx;
    this.t += dt * this.speed;
    const f = Math.floor(this.t * fx.fps) % fx.count;
    if (f !== this.frame) {
      this.frame = f;
      const [c, r] = cellOf(fx, f);
      this.el.style.backgroundPosition = `${fx.cols > 1 ? (c / (fx.cols - 1)) * 100 : 0}% ${fx.rows > 1 ? (r / (fx.rows - 1)) * 100 : 0}%`;
    }
    const kk = Math.round(Math.max(0, Math.min(1, k)) * 50) / 50;
    if (kk !== this.k) { this.k = kk; this.el.style.opacity = this.base * kk; }
  }

  setActive(on) { this.el.hidden = !on; }
  dispose() { this.el.remove(); }
}

// Capa en el MUNDO 3D: un plano vertical con la animación repetida en mosaico (tile = metros por mosaico).
// Va detrás de los modelos (los edificios la tapan) y delante de lo que esté más lejos (ciudad del fondo).
export class WorldSheet {
  constructor(scene, name, { center = [0, 20, -15], width = 140, height = 60, tile = 24, opacity = 0.6 } = {}) {
    const fx = this.fx = EFFECTS[name];
    this.t = Math.random() * 10; this.frame = -1;
    const tex = new THREE.TextureLoader().load(fx.sheet);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const tileH = tile * fx.h / fx.w;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex }, opacity: { value: opacity },
        cell: { value: new THREE.Vector4(0, 0, 1 / fx.cols, 1 / fx.rows) },
        tiles: { value: new THREE.Vector2(width / tile, height / tileH) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float opacity; uniform vec4 cell; uniform vec2 tiles; varying vec2 vUv;
        void main() {
          vec2 uv = clamp(fract(vUv * tiles), 0.003, 0.997);            // sin tomar píxeles del cuadro vecino
          vec4 c = texture2D(map, cell.xy + uv * cell.zw);
          gl_FragColor = vec4(c.rgb, c.a * opacity);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.mat);
    this.mesh.position.set(...center);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    scene.add(this.mesh);
  }

  update(dt) {
    const fx = this.fx;
    this.t += dt;
    const f = Math.floor(this.t * fx.fps) % fx.count;
    if (f === this.frame) return;
    this.frame = f;
    const [c, r] = cellOf(fx, f);
    // la textura se carga volteada (flipY): la fila 0 de la hoja queda arriba
    this.mat.uniforms.cell.value.set(c / fx.cols, 1 - (r + 1) / fx.rows, 1 / fx.cols, 1 / fx.rows);
  }

  setActive() {}
}
