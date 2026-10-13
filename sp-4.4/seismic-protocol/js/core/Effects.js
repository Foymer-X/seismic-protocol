// Efectos ambientales de un plano: lluvia y polvo que cae con el temblor.
// Se activan desde data/planes.js:  weather: 'rain'  ·  dust: true  ·  fog: { color, near, far }
import * as THREE from 'three';

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
