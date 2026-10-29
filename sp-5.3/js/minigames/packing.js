// MINIJUEGO: HACER LA MALETA (en 3D)
// Los objetos están sobre la mesa. Se arrastran a la maleta abierta para meterlos
// y fuera de ella para sacarlos. "Completar selección" aparece con el primer objeto.
// Contrato: run(ctx) → 'done'
import { ITEMS } from '../../data/items.js';
import { Actor } from '../core/Actor.js';
import { Drag, glide } from '../core/Drag.js';
import * as THREE from 'three';

const IN_BAG_SCALE = 0.7;   // tamaño de los objetos dentro de la maleta

// Valores por defecto (mesa provisional). Con un escenario real se configuran en
// data/planes.js → packing: { surfaceY, itemHeight, slots: [[x, z], ...],
//                             bagArea: { x: [min, max], z: [min, max], y } }   ← dónde se acomodan dentro de la maleta
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
    // nombre del objeto (las tarjetas provisionales ya lo traen dibujado)
    if (!a.isPlaceholder) a.nameLabel = ui.itemLabel(item.name, a.mesh);
    return a;
  });
  ctx.onCleanup(() => actors.forEach(a => { plane.scene.remove(a.object3d); if (a.nameLabel) ui.removeLabel(a.nameLabel); }));
  ui.updateLabels(stage);

  const chosen = new Set();
  // Si el jugador ya había armado la maleta (por ejemplo al reintentar), se respeta.
  for (const id of state.bag.items) chosen.add(id);

  // Acomoda los objetos de la maleta apilados y más pequeños.
  // Zona interior de la maleta: la de data/planes.js (bagArea) o una calculada de su tamaño.
  const area = cfg.bagArea || {
    x: [bagBox.min.x + bagSize[0] * 0.17, bagBox.max.x - bagSize[0] * 0.17],
    z: [bagBox.min.z + bagSize[2] * 0.2, bagBox.max.z - bagSize[2] * 0.2],
    y: bagBox.min.y + bagSize[1] * 0.4,
  };
  function layoutBag() {
    const inBag = actors.filter(a => chosen.has(a.item.id));
    const cols = 4, rows = Math.max(1, Math.ceil(inBag.length / cols));
    inBag.forEach((a, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const target = new THREE.Vector3(
        area.x[0] + (col / (cols - 1)) * (area.x[1] - area.x[0]),
        (area.y ?? TABLE_Y) + row * cfg.itemHeight * 0.1,
        (area.z[0] + area.z[1]) / 2 + (row - (rows - 1) / 2) * Math.min(0.2, (area.z[1] - area.z[0]) / Math.max(rows - 1, 1)),
      );
      glide(a, target, IN_BAG_SCALE);
    });
    for (const a of actors) a.nameLabel?.el.classList.toggle('small', chosen.has(a.item.id));
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
    onStart: a => { audio.play('sfx_pick'); a.object3d.scale.setScalar(1); },
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

  // Para la demostración del tutorial (js/tutorials/demos.js)
  ctx.expose?.({ actors, btn, area, bag });

  // Al confirmar: si sobran objetos inútiles o faltan útiles, advertencia general con dos opciones.
  await new Promise(resolve => {
    btn.onclick = () => {
      const wrong = ITEMS.some(i => !i.useful && chosen.has(i.id));
      const missing = ITEMS.some(i => i.useful && !chosen.has(i.id));
      if (ctx.demo || (!wrong && !missing)) return resolve();
      const modal = document.createElement('div');
      modal.className = 'mg-warning';
      modal.innerHTML = `<div class="mg-warning-box">
          <div class="mg-warning-title">${text('pack_warn_title')}</div>
          <p>${text('pack_warn_text')}</p>
          <div class="mg-warning-buttons">
            <button class="mg-warning-review">${text('pack_warn_review')}</button>
            <button class="mg-warning-confirm">${text('pack_warn_confirm')}</button>
          </div></div>`;
      root.appendChild(modal);
      btn.hidden = true;
      modal.querySelector('.mg-warning-review').onclick = () => { modal.remove(); btn.hidden = chosen.size === 0; };
      modal.querySelector('.mg-warning-confirm').onclick = () => { modal.remove(); resolve(); };
    };
  });
  state.bag.made = true;
  state.bag.items = ITEMS.map(i => i.id).filter(id => chosen.has(id));
  return 'done';
}
