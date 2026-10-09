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
export class Dust {
  constructor(scene, center, { count = 500, area = [16, 5, 7], color = '#8a8178', size = 0.06 } = {}) {
    this.area = area;
    this.center = center.clone();
    this.parts = Array.from({ length: count }, () => ({ alive: false, x: 0, y: 0, z: 0, v: 0 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.acc = 0;
  }

  // intensity: 0 (quieto) … 1+ (temblor fuerte)
  update(dt, intensity) {
    const rate = Math.max(0, intensity - 0.15) * 260;      // partículas por segundo
    this.acc += rate * dt;
    for (const part of this.parts) {
      if (this.acc < 1) break;
      if (part.alive) continue;
      part.alive = true;
      part.x = (Math.random() - 0.5) * this.area[0];
      part.z = (Math.random() - 0.5) * this.area[2];
      part.y = this.area[1];
      part.v = 1.2 + Math.random() * 1.8;
      this.acc -= 1;
    }
    this.acc = Math.min(this.acc, 5);
    const p = this.points.geometry.attributes.position.array;
    const c = this.center;
    this.parts.forEach((part, i) => {
      if (part.alive) {
        part.y -= part.v * dt;
        part.x += Math.sin(part.y * 3 + i) * dt * 0.3;
        if (part.y <= 0.02) part.alive = false;
      }
      p[i * 3] = c.x + part.x;
      p[i * 3 + 1] = part.alive ? c.y + part.y : -100;
      p[i * 3 + 2] = c.z + part.z;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
