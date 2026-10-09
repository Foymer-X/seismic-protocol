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

  // ---- Cámara que sigue al personaje (de lado) ----
  const camOffset = plane.cameraBase.clone().sub(plane.cameraTarget);
  ctx.addUpdate(() => {
    const h = hero.position;
    const tgt = new THREE.Vector3(h.x, h.y + 1.4, 0);
    plane.cameraTarget.lerp(tgt, 0.12);
    plane.cameraBase.copy(plane.cameraTarget).add(camOffset);
  });
  plane.cameraTarget.set(hero.position.x, hero.position.y + 1.4, 0);
  plane.cameraBase.copy(plane.cameraTarget).add(camOffset);

  // ---- Anillos "toca" y escombros ----
  let currentIndex = 0;
  let elapsed = 0, nextRing = 1.6, ring = null, done = false;
  ctx.addUpdate(dt => {
    if (done) return;
    elapsed += dt;
    if (!ring && elapsed >= nextRing) ring = spawnRing();
    if (ring) updateRing(ring, dt);
  });

  function spawnRing() {
    // el escombro cae un poco adelante del personaje
    const i = Math.min(currentIndex + 1, path.length - 1);
    const ahead = path[i].clone().sub(hero.position).setY(0);
    const dir = ahead.lengthSq() > 0 ? ahead.normalize() : new THREE.Vector3(1, 0, 0);
    const land = hero.position.clone().addScaledVector(dir, 1.6);
    const debris = placeholderBox([0.7, 0.5, 0.7], '#555');
    debris.position.set(land.x, land.y + 6, land.z);
    plane.scene.add(debris);

    const el = document.createElement('button');
    el.className = 'qte-ring';
    el.innerHTML = `<span class="qte-outer"></span><span>${text('qte_ring')}</span>`;
    const sp = stage.screenPosOf(debris) || { x: 960, y: 400 };
    el.style.left = `${Math.min(1700, Math.max(220, sp.x + (Math.random() - 0.5) * 300))}px`;
    el.style.top = `${Math.min(860, Math.max(260, sp.y + 120))}px`;
    root.appendChild(el);
    const r = { el, outer: el.querySelector('.qte-outer'), debris, land, t: 0, resolved: false };
    el.onclick = e => { e.stopPropagation(); resolveRing(r, Math.abs(r.t - Q.ringDuration) <= Q.ringWindow); };
    return r;
  }

  function updateRing(r, dt) {
    r.t += dt;
    if (!r.resolved) {
      const k = Math.max(0, 1 - r.t / Q.ringDuration);          // 1 → 0 cuando se cierra
      r.outer.style.transform = `scale(${1 + k * 1.8})`;
      // el escombro cae justo al cerrarse el anillo
      const fall = Math.min(1, r.t / Q.ringDuration);
      r.debris.position.y = r.land.y + 6 * (1 - fall * fall);
      if (r.t > Q.ringDuration + Q.ringWindow) resolveRing(r, false);
    } else {
      // el escombro termina de caer o sale despedido
      r.debris.position.y = Math.max(r.land.y, r.debris.position.y - dt * 8);
      if (r.ok) r.debris.position.x += dt * 6;
      if (r.t - r.resolvedAt > 0.6) {
        plane.scene.remove(r.debris);
        r.el.remove();
        ring = null;
        nextRing = elapsed + Q.ringEvery;
      }
    }
  }

  function resolveRing(r, ok) {
    if (r.resolved) return;
    r.resolved = true; r.ok = ok; r.resolvedAt = r.t;
    r.el.classList.add(ok ? 'ok' : 'fail');
    r.el.onclick = null;
    if (ok) { audio.play('sfx_ok'); flash(text('qte_hit')); }
    else {
      audio.play('sfx_hit');
      flash(text('qte_miss'));
      state.qteFails++;
      slowUntil = performance.now() + Q.slowdownSeconds * 1000;
      const prev = stage.shake;
      stage.shake = 1.2;
      setTimeout(() => { if (!signal.aborted) stage.shake = prev; }, 350);
      engine.updateDebug();
    }
  }

  ctx.onCleanup(() => {
    done = true;
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
