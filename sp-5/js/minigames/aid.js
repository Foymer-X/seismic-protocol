// MINIJUEGO: AYUDA A LOS HERIDOS (en 3D)
// Los objetos de tu maleta están en el piso. Arrastra cada uno hasta la persona que lo necesita.
// Sobre cada herido flota su condición. Se puede cambiar un objeto de persona antes de confirmar.
// Un solo intento. Contrato: run(ctx) → 'success' | 'fail'
import { INJURED } from '../../data/injured.js';
import { ITEM_BY_ID } from '../../data/items.js';
import { Actor } from '../core/Actor.js';
import { Drag, glide } from '../core/Drag.js';
import * as THREE from 'three';


export async function run(ctx) {
  const { root, state, plane, stage, ui, text, audio } = ctx;

  root.innerHTML = `
    <div class="mg-hud-title">${text('aid_title')}</div>
    <div class="mg-hud-hint">${text('aid_hint')}</div>
    <button class="mg-complete mg-hud-complete" hidden>${text('complete_selection')}</button>`;
  const btn = root.querySelector('.mg-complete');

  // ---- Heridos y su condición (etiqueta flotante, como en el wireframe) ----
  const people = INJURED.map(inj => {
    const actor = plane.get(inj.actor);
    const icon = inj.icon ? `<span class="cond-icon" style="background-image:url('${inj.icon}')"></span>` : `<span class="cond-icon">!</span>`;
    const label = ui.addLabel(`${icon}<span class="cond-text">${inj.condition}</span>`, null, 'condition-label');
    label.anchor = actor.object3d;
    label.offsetY = 10;
    return { inj, actor, label, item: null };
  });
  ui.updateLabels(stage);

  // ---- Objetos de la maleta en el piso, frente a ti ----
  // Dónde quedan en el piso: data/planes.js → aidItems: { from, to } (o la fila provisional)
  const ids = state.bag.items;
  const zone = plane.def.aidItems || { from: [-3.4, 0, 2.3], to: [5.0, 0, 2.3] };
  const A = new THREE.Vector3(...zone.from), B = new THREE.Vector3(...zone.to);
  const floorY = A.y;
  const n = Math.max(ids.length, 1);
  const maxStep = 1.2 / Math.max(A.distanceTo(B), 0.01);                 // como mucho 1.2 m entre objetos
  const span = Math.min(1, maxStep * (n - 1));
  const items = ids.map((id, i) => {
    const item = ITEM_BY_ID[id];
    const a = new Actor(`item_${id}`, `item_${id}`, ctx.assets, { label: item.name });
    a.item = item;
    const k = n === 1 ? 0.5 : (0.5 - span / 2) + span * (i / (n - 1));
    a.home = A.clone().lerp(B, k);
    a.position.copy(a.home);
    a.mesh.rotation.x = -0.35;
    plane.scene.add(a.object3d);
    if (!a.isPlaceholder) a.nameLabel = ui.itemLabel(item.name, a.mesh);   // nombre siempre visible
    return a;
  });
  ctx.onCleanup(() => items.forEach(a => { plane.scene.remove(a.object3d); if (a.nameLabel) ui.removeLabel(a.nameLabel); }));
  ui.updateLabels(stage);

  // ¿Sobre qué persona se suelta? Se mide en pantalla (donde está el puntero vs. el cuerpo de cada
  // herido), así funciona igual con cualquier cámara. DROP_PX = qué tan cerca hay que soltarlo.
  const DROP_PX = 130;
  const personAt = p => {
    const sp = stage.project(p);                     // el punto del piso cae justo bajo el puntero
    let best = null, bestD = DROP_PX;
    for (const person of people) {
      const top = stage.screenPosOf(person.actor.object3d, 'top');
      const bottom = stage.screenPosOf(person.actor.object3d, 'bottom');
      if (!top || !bottom) continue;
      const y = Math.min(Math.max(sp.y, top.y), bottom.y);   // distancia al "cuerpo" (de la cabeza a los pies)
      const d = Math.hypot(sp.x - (top.x + bottom.x) / 2, (sp.y - y) * 0.7);
      if (d < bestD) { best = person; bestD = d; }
    }
    return best;
  };

  function refresh() {
    for (const person of people) {
      const filled = !!person.item;
      person.label.el.classList.toggle('filled', filled);
      person.label.el.querySelector('.cond-text').textContent =
        person.inj.condition + (filled ? ` → ${person.item.item.name}` : '');
    }
    btn.hidden = people.some(p => !p.item);
  }

  const drag = new Drag(stage, ui, {
    items: () => items,
    surfaceY: floorY,
    lift: 0.4,
    nameOf: a => a.item.name,
    onStart: a => {
      // si estaba asignado a alguien, se libera
      for (const person of people) if (person.item === a) person.item = null;
      a.object3d.scale.setScalar(1);
      refresh();
    },
    onMove: (a, p) => {
      const target = personAt(p);
      for (const person of people) person.actor.setHighlight(person === target);
    },
    onDrop: (a, p) => {
      for (const person of people) person.actor.setHighlight(false);
      audio.play('sfx_drop');
      const target = personAt(p);
      if (!target) { glide(a, a.home, 1); refresh(); return; }
      if (target.item && target.item !== a) glide(target.item, target.item.home, 1);   // el anterior vuelve al piso
      target.item = a;
      const pp = target.actor.position;
      glide(a, new THREE.Vector3(pp.x + 0.45, floorY, pp.z + 0.5), 0.8);
      refresh();
    },
  });
  ctx.onCleanup(() => { drag.destroy(); people.forEach(p => ui.removeLabel(p.label)); });
  refresh();

  ctx.expose?.({ people, items, btn });   // para la demostración del tutorial

  await new Promise(resolve => { btn.onclick = resolve; });
  const ok = people.every(p => p.item && p.item.item.id === p.inj.needs);
  // quiénes quedaron bien atendidos (los demás se van en el camión si fallas)
  state.aidOk = people.filter(p => p.item && p.item.item.id === p.inj.needs).map(p => p.inj.actor);
  state.decisions.aid = ok ? 'success' : 'fail';

  // Resultado: los bien atendidos cambian a su dibujo de "después" (tag helped) y sale un aviso
  // con cuántas personas atendiste bien. Luego sigue la secuencia que corresponda.
  if (!ctx.demo) {
    btn.hidden = true;
    people.forEach(p => ui.removeLabel(p.label));
    const n = state.aidOk.length;
    const box = document.createElement('div');
    box.className = `aid-result ${ok ? 'ok' : 'bad'}`;
    box.innerHTML = `<div class="aid-result-title">${text(ok ? 'aid_result_ok' : 'aid_result_bad')}</div>
      <div class="aid-result-sub">${text('aid_result_count').replace('{n}', n).replace('{total}', people.length)}</div>`;
    root.appendChild(box);
    audio.play(ok ? 'sfx_ok' : 'sfx_bad');
    await ctx.wait(3.6);
  }
  return ok ? 'success' : 'fail';
}
