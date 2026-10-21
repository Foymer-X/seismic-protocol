// MINIJUEGO: ESCAPE (QTE) — varios pisos de escaleras + el pasillo hasta la salida.
// El personaje avanza solo por el recorrido; caen escombros y aparece un anillo "toca".
// Hay que hacer clic cuando el anillo exterior se cierra sobre el botón.
// Si fallas, vas más lento durante CONFIG.qte.slowdownSeconds.
// El reloj sigue corriendo: si llega a 0, el motor salta solo al final correspondiente.
// Contrato: run(ctx) → 'escaped'
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { companionId } from '../core/GameState.js';
import { placeholderBox } from '../core/Assets.js';

export async function run(ctx) {
  const { root, state, plane, stage, engine, text, audio, signal } = ctx;
  const Q = CONFIG.qte;

  // ---- Recorrido: el de data/planes.js (modelo real) o uno provisional generado ----
  let path;
  if (plane.def.path) path = plane.def.path.map(p => new THREE.Vector3(...p));
  else {
    if (!plane.userData) plane.userData = {};
    if (!plane.userData.generated) plane.userData.generated = buildPlaceholderBuilding(plane, Q);
    path = plane.userData.generated;
  }

  // ---- HUD ----
  root.innerHTML = `<div class="mg-hud-title">${text('qte_title')}</div><div class="qte-msg" hidden></div>`;
  const msg = root.querySelector('.qte-msg');
  let msgTimer;
  const flash = t => { msg.textContent = t; msg.hidden = false; clearTimeout(msgTimer); msgTimer = setTimeout(() => (msg.hidden = true), 900); };

  // ---- Personajes ----
  const hero = plane.get('hero');
  hero.position.copy(path[0]);
  const comp = state.companion ? plane.get(companionId(state)) : null;
  if (comp) {
    const back = path[0].clone().sub(path[1]).setY(0).normalize().multiplyScalar(CONFIG.followDistance);
    comp.position.copy(path[0]).add(back);
    comp.object3d.visible = true;
    comp.follow(hero);
  }

  // ---- Ralentización ----
  let slowUntil = 0;
  const speedFn = () => (performance.now() < slowUntil ? Q.slowdownFactor : 1);

  // ---- Cámara que sigue al personaje ----
  // Con el modelo real: data/planes.js → follow: { offset, look, fov, zones: [{ from, offset, look, fov }] }
  //   offset = dónde va la cámara respecto al personaje; look = a dónde mira (respecto al personaje).
  //   zones: desde el punto "from" del recorrido se usa otra cámara (por ejemplo, detrás de él en el pasillo).
  // Sin "follow" (edificio provisional): de lado, como siempre.
  const F = plane.def.follow;
  const camOffset = plane.cameraBase.clone().sub(plane.cameraTarget);
  const camFor = () => {
    let c = F;
    for (const z of F.zones || []) if (currentIndex >= z.from) c = { ...F, clampX: null, ...z };
    return c;
  };
  const wantBase = new THREE.Vector3(), wantTarget = new THREE.Vector3();
  const aim = () => {
    const h = hero.position;
    if (!F) { wantTarget.set(h.x, h.y + 1.4, 0); wantBase.copy(wantTarget).add(camOffset); return null; }
    const c = camFor();
    wantBase.set(h.x + c.offset[0], h.y + c.offset[1], h.z + c.offset[2]);
    if (c.clampX) wantBase.x = Math.min(c.clampX[1], Math.max(c.clampX[0], wantBase.x));   // no salirse del cubo de la escalera
    wantTarget.set(h.x + c.look[0], h.y + c.look[1], h.z + c.look[2]);
    return c;
  };
  const sideVec = new THREE.Vector3();
  ctx.addUpdate(dt => {
    const c = aim();
    // en zonas con companionSide (pasillo con la cámara detrás) el acompañante camina al lado
    if (comp && c) {
      comp.followSide = c.companionSide ? sideVec.set(...c.companionSide) : null;
      if (c.companionDistance != null) comp.followDistance = c.companionDistance;
    }
    plane.noPair = true;    // en todo el escape corren por separado (de la mano, la mamá atravesaba las paredes)
    const k = F ? 1 - Math.exp(-dt * (F.smooth ?? 2.5)) : 0.12;
    plane.cameraTarget.lerp(wantTarget, k);
    plane.cameraBase.lerp(wantBase, k);
    if (c?.fov && Math.abs(plane.camera.fov - c.fov) > 0.05) {
      plane.camera.fov += (c.fov - plane.camera.fov) * k;
      plane.camera.updateProjectionMatrix();
    }
  });
  let currentIndex = 0;
  aim();
  plane.cameraTarget.copy(wantTarget);
  plane.cameraBase.copy(wantBase);
  if (F?.fov) { plane.camera.fov = F.fov; plane.camera.updateProjectionMatrix(); }

  // ---- Anillos "toca" y escombros ----
  // El escombro tarda un poco MÁS que el anillo en caer: cuando hay que tocar, todavía está
  // claramente arriba del personaje. Si fallas, el golpe se ve cuando el escombro llega abajo.
  const FALL_HEIGHT = 7;                          // metros sobre el piso al aparecer
  const HEAD = (hero.height || 1.6) * 0.95;       // altura de la cabeza (ahí golpea si no lo esquivas)
  const fallTime = Q.ringDuration + Q.debrisLag;  // segundos hasta tocar el piso
  let elapsed = 0, nextRing = Q.firstRing ?? 1.2, ring = null, done = false, noMoreRings = false;
  const ringWaiters = [];
  ctx.addUpdate(dt => {
    if (done) return;
    elapsed += dt;
    if (!ring && !noMoreRings && elapsed >= nextRing) { ring = spawnRing(); ringWaiters.splice(0).forEach(fn => fn(ring)); }
    if (ring) updateRing(ring, dt);
  });
  // Para la demostración del tutorial: espera al siguiente anillo.
  ctx.expose?.({ nextRing: () => new Promise(r => ringWaiters.push(r)), stopRings: () => (noMoreRings = true), Q });

  function spawnRing() {
    // el escombro cae sobre la cabeza: donde va a estar el personaje cuando llegue abajo
    const land = pointAhead(Q.speed * speedFn() * fallTime);
    const debris = makeRock(0.42);
    debris.position.set(land.x, land.y + FALL_HEIGHT, land.z);
    plane.scene.add(debris);
    // gira mientras cae (eje y velocidad al azar)
    debris.userData.spin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    debris.userData.spinSpeed = 3 + Math.random() * 3;

    const el = document.createElement('button');
    el.className = 'qte-ring';
    el.innerHTML = `<span class="qte-outer"></span><span>${text('qte_ring')}</span>`;
    const sp = stage.project(land.clone().add(new THREE.Vector3(0, 2.4, 0))) || { x: 960, y: 400 };
    el.style.left = `${Math.min(1700, Math.max(220, sp.x + (Math.random() - 0.5) * 260))}px`;
    el.style.top = `${Math.min(820, Math.max(240, sp.y))}px`;
    root.appendChild(el);
    const r = { el, outer: el.querySelector('.qte-outer'), debris, land, t: 0, resolved: false, vx: 0 };
    el.onclick = e => { e.stopPropagation(); resolveRing(r, Math.abs(r.t - Q.ringDuration) <= Q.ringWindow); };
    return r;
  }

  // Punto del recorrido "dist" metros más adelante del personaje (sigue curvas y escaleras).
  function pointAhead(dist) {
    const pos = hero.position.clone();
    let i = Math.min(currentIndex + 1, path.length - 1);
    while (dist > 0 && i < path.length) {
      const seg = path[i].clone().sub(pos);
      const L = seg.length();
      if (L >= dist) return pos.addScaledVector(seg, dist / L);
      dist -= L; pos.copy(path[i]); i++;
    }
    return pos;
  }

  function updateRing(r, dt) {
    r.t += dt;
    // mientras cae, apunta a donde va a estar tu cabeza (si te ralentizas, se ajusta)
    if (!r.landed && !(r.resolved && r.ok)) {
      const left = Math.max(0, fallTime - r.t);
      const target = pointAhead(Q.speed * speedFn() * left);
      r.land.lerp(target, Math.min(1, dt * 8));
      r.debris.position.x = r.land.x;
      r.debris.position.z = r.land.z;
    }
    if (!r.resolved) {
      const k = Math.max(0, 1 - r.t / Q.ringDuration);          // 1 → 0 cuando se cierra
      r.outer.style.transform = `scale(${1 + k * 1.8})`;
      if (r.t > Q.ringDuration + Q.ringWindow) resolveRing(r, false);
    }
    // caída con aceleración: llega a la altura de la cabeza en fallTime y luego sigue al piso
    const f = Math.min(1, r.t / fallTime);
    const headY = r.land.y + HEAD;
    if (f < 1) r.debris.position.y = headY + (FALL_HEIGHT - HEAD) * (1 - f * f);
    else r.debris.position.y = Math.max(r.land.y, r.debris.position.y - dt * 7);
    if (r.debris.visible) r.debris.rotateOnAxis(r.debris.userData.spin, dt * r.debris.userData.spinSpeed);
    if (f >= 1 && !r.landed) {
      r.landed = true;
      if (r.resolved && !r.ok) { shatter(r.debris); hit(); }   // no lo esquivaste: aquí te golpea y se rompe
    }
    if (r.landed && r.resolved && r.t - Math.max(r.resolvedAt, fallTime) > 0.5) {
      plane.scene.remove(r.debris);
      r.el.remove();
      ring = null;
      nextRing = elapsed + Q.ringEvery;
    }
  }

  function resolveRing(r, ok) {
    if (r.resolved) return;
    r.resolved = true; r.ok = ok; r.resolvedAt = r.t;
    r.el.classList.add(ok ? 'ok' : 'fail');
    r.el.onclick = null;
    if (ok) { audio.play('sfx_ok'); flash(text('qte_hit')); shatter(r.debris); }   // lo esquivaste: se rompe en el aire
    else { state.qteFails++; engine.updateDebug(); if (r.landed) { shatter(r.debris); hit(); } }
  }

  function hit() {
    audio.play('sfx_hit');
    flash(text('qte_miss'));
    slowUntil = performance.now() + Q.slowdownSeconds * 1000;
    const prev = stage.shake;
    stage.shake = 1.2;
    setTimeout(() => { if (!signal.aborted) stage.shake = prev; }, 350);
  }

  // ---- Pedazos: el escombro se fragmenta y los pedazos se desvanecen ----
  const shards = [];
  function shatter(rock) {
    if (!rock.visible) return;
    rock.visible = false;
    const base = rock.getWorldPosition(new THREE.Vector3());
    const mat = rock.userData.mat;
    for (let i = 0; i < 14; i++) {
      const m = mat.clone(); m.transparent = true;
      const piece = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.12, 0), m);
      piece.position.copy(base).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4));
      piece.scale.set(1, 0.6 + Math.random() * 0.6, 1);
      const v = piece.position.clone().sub(base).normalize().multiplyScalar(2 + Math.random() * 3);
      v.y += 2 + Math.random() * 2;
      plane.scene.add(piece);
      shards.push({ piece, v, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(10), t: 0, life: 0.9 + Math.random() * 0.5 });
    }
  }
  ctx.addUpdate(dt => {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.t += dt;
      s.v.y -= 9.8 * dt;
      s.piece.position.addScaledVector(s.v, dt);
      s.piece.rotation.x += s.spin.x * dt; s.piece.rotation.y += s.spin.y * dt;
      s.piece.material.opacity = Math.max(0, 1 - Math.max(0, s.t - 0.25) / (s.life - 0.25));
      if (s.t >= s.life) { plane.scene.remove(s.piece); s.piece.geometry.dispose(); s.piece.material.dispose(); shards.splice(i, 1); }
    }
  });

  ctx.onCleanup(() => {
    done = true;
    for (const s of shards.splice(0)) plane.scene.remove(s.piece);
    if (ring) { plane.scene.remove(ring.debris); ring.el.remove(); }
    hero.stop();
  });

  // ---- Recorrido completo ----
  for (let i = 1; i < path.length; i++) {
    if (signal.aborted) return;
    currentIndex = i - 1;
    await hero.moveTo(path[i], Q.speed, speedFn);
  }
  done = true;
  return 'escaped';
}

// Roca irregular de escombro (concreto): icosaedro deformado con caras planas.
function makeRock(size) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const seen = new Map();          // mismos vértices → misma deformación (sin grietas)
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.7 + Math.random() * 0.5);
    v.multiplyScalar(seen.get(key));
    v.y *= 0.75;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const tone = 0.45 + Math.random() * 0.15;
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone * 1.05, tone, tone * 0.92), roughness: 0.95, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  g.add(mesh);
  g.userData.mat = mat;
  return g;
}

// Edificio provisional: escaleras en zigzag (vistas de lado) y el pasillo final.
function buildPlaceholderBuilding(plane, Q) {
  const g = new THREE.Group();
  const floorH = 3, run = 6, landing = 1.4, zf = 0.7, zb = -0.7;
  const topY = Q.floors * floorH;
  const pts = [];
  let x = -3, y = topY, z = zf;
  pts.push(new THREE.Vector3(x - 2.5, y, z));
  addBox(g, [run * 0.6, 0.2, 2.8], [x - 1.8, y - 0.1, 0], '#9e9e9e');            // descanso superior

  for (let k = 0; k < Q.floors; k++) {
    const dir = k % 2 === 0 ? 1 : -1;
    const zk = k % 2 === 0 ? zf : zb;
    if (k > 0) pts.push(new THREE.Vector3(x, y, zk));                            // cambia de tramo
    pts.push(new THREE.Vector3(x, y, zk));
    // escalones
    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const sx = x + dir * (s + 0.5) * (run / steps);
      const sy = y - (s + 1) * (floorH / steps);
      addBox(g, [run / steps + 0.02, floorH / steps, 1.2], [sx, sy, zk], s % 2 ? '#bdbdbd' : '#b0b0b0');
    }
    const x2 = x + dir * run, y2 = y - floorH;
    pts.push(new THREE.Vector3(x2, y2, zk));
    x = x2 + dir * landing; y = y2;
    pts.push(new THREE.Vector3(x, y, zk));
    addBox(g, [landing * 2 + 0.6, 0.2, 2.8], [x2 + dir * landing * 0.5, y - 0.1, 0], '#9e9e9e');   // descanso
    z = zk;
  }

  // pasillo hasta la salida (siempre hacia la derecha)
  const corridorZ = 1.3;
  pts.push(new THREE.Vector3(x, 0, corridorZ));
  const xEnd = x + Q.corridorLength;
  pts.push(new THREE.Vector3(xEnd, 0, corridorZ));
  addBox(g, [Q.corridorLength + 8, 0.2, 4], [x + Q.corridorLength / 2, -0.1, 0.6], '#a5a5a5');
  const door = placeholderBox([0.2, 2.6, 1.6], '#4caf50');
  door.position.set(xEnd + 0.9, 0, corridorZ);
  g.add(door);

  // pared de fondo
  const minX = -10, maxX = xEnd + 6;
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(maxX - minX, topY + 8),
    new THREE.MeshStandardMaterial({ color: '#e6e6e6', roughness: 1 })
  );
  wall.position.set((minX + maxX) / 2, (topY + 8) / 2 - 1, -1.6);
  g.add(wall);
  // líneas de cada piso en la pared
  for (let k = 0; k <= Q.floors; k++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0 }));
    line.position.set((minX + maxX) / 2, k * floorH, -1.55);
    g.add(line);
  }
  plane.scene.add(g);
  return pts;
}

function addBox(group, size, center, color) {
  const b = placeholderBox(size, color);
  b.position.set(center[0], center[1] - size[1] / 2, center[2]);
  group.add(b);
}
