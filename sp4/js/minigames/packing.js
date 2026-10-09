// MINIJUEGO: HACER LA MALETA (en 3D)
// Los objetos están sobre la mesa. Se arrastran a la maleta abierta para meterlos
// y fuera de ella para sacarlos. "Completar selección" aparece con el primer objeto.
// Contrato: run(ctx) → 'done'
import { ITEMS } from '../../data/items.js';
import { Actor } from '../core/Actor.js';
import { Drag, glide } from '../core/Drag.js';
import * as THREE from 'three';

const IN_BAG_SCALE = 0.62;  // tamaño de los objetos dentro de la maleta

// Valores por defecto (mesa provisional). Con un escenario real se configuran en
// data/planes.js → packing: { surfaceY, itemHeight, slots: [[x, z], ...] }
const DEFAULTS = {
  surfaceY: 1.0,
  itemHeight: 0.6,
  slots: (() => {
    const out = [];
    for (const side of [-1, 1]) for (const z of [-1.6, -0.25]) for (const x of [1.8, 2.75, 3.7]) out.push([side * x, z]);
    return out;
  })(),
};

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

  const cfg = { ...DEFAULTS, ...(plane.def.packing || {}) };
  const TABLE_Y = cfg.surfaceY;

  // ---- Maleta: zona donde se sueltan los objetos (medida del modelo) ----
  const bag = plane.get('openBag');
  const bagBox = new THREE.Box3();
  for (const o of bag.parts || [bag.object3d]) bagBox.expandByObject(o);
  const bagPos = bagBox.getCenter(new THREE.Vector3());
  const bagSizeV = bagBox.getSize(new THREE.Vector3());
  const bagSize = [bagSizeV.x, bagSizeV.y, bagSizeV.z];
  const margin = cfg.itemHeight * 0.4;
  const insideBag = p => Math.abs(p.x - bagPos.x) < bagSize[0] / 2 + margin && Math.abs(p.z - bagPos.z) < bagSize[2] / 2 + margin;

  // Inclinación de las tarjetas para que miren a la cámara.
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(plane.camera.quaternion);
  const tilt = -Math.atan2(-fwd.y, -fwd.z);

  // ---- Objetos sobre la mesa (orden mezclado) ----
  const items = [...ITEMS].sort(() => Math.random() - 0.5);
  const homes = cfg.slots.map(([x, z]) => new THREE.Vector3(x, TABLE_Y, z));

  const actors = items.map((item, i) => {
    const a = new Actor(`item_${item.id}`, `item_${item.id}`, ctx.assets, { label: item.name, height: cfg.itemHeight });
    a.item = item;
    a.home = homes[i % homes.length];
    a.position.copy(a.home);
    a.mesh.rotation.x = tilt;            // inclinado hacia la cámara
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
        bagPos.x - bagSize[0] * 0.33 + col * bagSize[0] * 0.22,
        bagBox.min.y + bagSize[1] * 0.4 + row * cfg.itemHeight * 0.15,
        bagPos.z - bagSize[2] * 0.25 + row * bagSize[2] * 0.24,
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
    lift: cfg.itemHeight * 0.6,
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
