// MINIJUEGO: HACER LA MALETA (en 3D)
// Los objetos están sobre la mesa. Se arrastran a la maleta abierta para meterlos
// y fuera de ella para sacarlos. "Completar selección" aparece con el primer objeto.
// Contrato: run(ctx) → 'done'
import { ITEMS } from '../../data/items.js';
import { Actor } from '../core/Actor.js';
import { Drag, glide } from '../core/Drag.js';
import * as THREE from 'three';

const TABLE_Y = 1.0;        // altura de la superficie de la mesa
const IN_BAG_SCALE = 0.62;  // tamaño de los objetos dentro de la maleta

export async function run(ctx) {
  const { root, state, plane, stage, ui, text, audio } = ctx;

  // ---- HUD (HTML) ----
  root.innerHTML = `
    <div class="mg-hud-title">${text('packing_title')}</div>
    <div class="mg-hud-hint">${text('packing_hint')}</div>
    <div class="mg-hud-counter"></div>
    <button class="mg-complete mg-hud-complete" hidden>${text('complete_selection')}</button>`;
  const counter = root.querySelector('.mg-hud-counter');
  const btn = root.querySelector('.mg-complete');

  // ---- Maleta: zona donde se sueltan los objetos ----
  const bag = plane.get('openBag');
  const bagPos = bag.object3d.position.clone();
  const bagSize = bag.def.size || [2.2, 0.5, 1.4];
  const insideBag = p => Math.abs(p.x - bagPos.x) < bagSize[0] / 2 + 0.15 && Math.abs(p.z - bagPos.z) < bagSize[2] / 2 + 0.15;

  // ---- Objetos sobre la mesa (orden mezclado) ----
  const items = [...ITEMS].sort(() => Math.random() - 0.5);
  const xs = [1.8, 2.75, 3.7];
  const homes = [];
  for (const side of [-1, 1]) for (const z of [-1.3, 0.05]) for (const x of xs) homes.push(new THREE.Vector3(side * x, TABLE_Y, z - 0.3));

  const actors = items.map((item, i) => {
    const a = new Actor(`item_${item.id}`, `item_${item.id}`, ctx.assets, { label: item.name });
    a.item = item;
    a.home = homes[i];
    a.position.copy(a.home);
    a.mesh.rotation.x = -0.45;           // inclinado hacia la cámara
    a.shadow.visible = false;
    plane.scene.add(a.object3d);
    return a;
  });
  ctx.onCleanup(() => actors.forEach(a => plane.scene.remove(a.object3d)));

  const chosen = new Set();
  // Si el jugador ya había armado la maleta (por ejemplo al reintentar), se respeta.
  for (const id of state.bag.items) chosen.add(id);

  // Acomoda los objetos de la maleta apilados y más pequeños.
  function layoutBag() {
    const inBag = actors.filter(a => chosen.has(a.item.id));
    inBag.forEach((a, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const target = new THREE.Vector3(
        bagPos.x - 0.72 + col * 0.48,
        TABLE_Y + 0.12 + row * 0.1,
        bagPos.z - 0.36 + row * 0.34,
      );
      glide(a, target, IN_BAG_SCALE);
    });
    counter.textContent = text('packing_counter', { n: chosen.size });
    btn.hidden = chosen.size === 0;     // el botón aparece con al menos 1 objeto
  }
  for (const a of actors) if (chosen.has(a.item.id)) a.object3d.scale.setScalar(IN_BAG_SCALE);
  layoutBag();

  const drag = new Drag(stage, ui, {
    items: () => actors,
    surfaceY: TABLE_Y,
    lift: 0.35,
    nameOf: a => a.item.name,
    onStart: a => a.object3d.scale.setScalar(1),
    onMove: (a, p) => bag.setHighlight(insideBag(p)),
    onDrop: (a, p) => {
      bag.setHighlight(false);
      audio.play('sfx_drop');
      if (insideBag(p)) chosen.add(a.item.id);
      else {
        chosen.delete(a.item.id);
        glide(a, a.home, 1);
      }
      layoutBag();
    },
  });
  ctx.onCleanup(() => { drag.destroy(); bag.setHighlight(false); });

  await new Promise(resolve => { btn.onclick = resolve; });
  state.bag.made = true;
  state.bag.items = ITEMS.map(i => i.id).filter(id => chosen.has(id));
  return 'done';
}
