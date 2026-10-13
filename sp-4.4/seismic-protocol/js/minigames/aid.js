// MINIJUEGO: AYUDA A LOS HERIDOS (en 3D)
// Los objetos de tu maleta están en el piso. Arrastra cada uno hasta la persona que lo necesita.
// Sobre cada herido flota su condición. Se puede cambiar un objeto de persona antes de confirmar.
// Un solo intento. Contrato: run(ctx) → 'success' | 'fail'
import { INJURED } from '../../data/injured.js';
import { ITEM_BY_ID } from '../../data/items.js';
import { Actor } from '../core/Actor.js';
import { Drag, glide } from '../core/Drag.js';
import * as THREE from 'three';

const DROP_RADIUS = 1.0;     // qué tan cerca de la persona hay que soltar el objeto

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
  const ids = state.bag.items;
  const startX = -3.4, step = Math.min(1.2, 8.4 / Math.max(ids.length, 1));
  const items = ids.map((id, i) => {
    const item = ITEM_BY_ID[id];
    const a = new Actor(`item_${id}`, `item_${id}`, ctx.assets, { label: item.name });
    a.item = item;
    a.home = new THREE.Vector3(startX + i * step, 0, 2.3);
    a.position.copy(a.home);
    a.mesh.rotation.x = -0.35;
    plane.scene.add(a.object3d);
    if (!a.isPlaceholder) a.nameLabel = ui.itemLabel(item.name, a.mesh);   // nombre siempre visible
    return a;
  });
  ctx.onCleanup(() => items.forEach(a => { plane.scene.remove(a.object3d); if (a.nameLabel) ui.removeLabel(a.nameLabel); }));
  ui.updateLabels(stage);

  const personAt = p => {
    let best = null, bestD = DROP_RADIUS;
    for (const person of people) {
      const pp = person.actor.position;
      const d = Math.hypot(p.x - pp.x, (p.z - pp.z) * 0.6);
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
    surfaceY: 0,
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
      glide(a, new THREE.Vector3(pp.x + 0.45, 0, pp.z + 0.5), 0.8);
      refresh();
    },
  });
  ctx.onCleanup(() => { drag.destroy(); people.forEach(p => ui.removeLabel(p.label)); });
  refresh();

  ctx.expose?.({ people, items, btn });   // para la demostración del tutorial

  await new Promise(resolve => { btn.onclick = resolve; });
  const ok = people.every(p => p.item && p.item.item.id === p.inj.needs);
  state.decisions.aid = ok ? 'success' : 'fail';
  return ok ? 'success' : 'fail';
}
