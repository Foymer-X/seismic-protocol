// DEMOSTRACIONES de los tutoriales "¡ATENTO!" (se juegan solas con una mano animada).
// Cada una recibe "t" (js/core/Tutorial.js) con: enter, minigame, caption, wait, waitFor,
// hand.moveTo / hand.click / hand.drag, posOf, posOfEntity, project, elPos y t(idTexto).
// t.next() espera un clic del jugador ("Clic para continuar") antes de pasar a la siguiente explicación.
// Los textos están en data/texts.js (claves tut_...).
import { CONFIG } from '../config.js';

export const DEMOS = {
  // 1) Cómo tomar decisiones: dos opciones en el escenario y se elige una.
  async choices(t) {
    const plane = await t.enter('room', { place: { hero: 'center' }, shake: 0, lights: null, follow: false });
    t.caption(t.t('tut_choices_1'));
    await t.wait(2.8);

    const picked = t.engine.choose({
      prompt: 'prompt',
      choices: [
        { label: 'tut_opt_desk', at: 'desk' },
        { label: 'tut_opt_bed', at: 'bed' },
      ],
    }, t.run);
    await t.wait(0.5);
    await t.next();
    t.caption(t.t('tut_choices_2'));
    t.hand.show(1450, 950);
    await t.hand.moveTo(t.posOfEntity(plane.get('bed')), 1.1);     // pasa por encima: se resalta
    await t.wait(1.0);
    await t.hand.moveTo(t.posOfEntity(plane.get('desk')), 0.9);
    await t.wait(0.9);
    await t.hand.click();                                          // clic sobre el escritorio
    await t.until(picked);
    t.hand.hide();
    await t.next();
    t.caption(t.t('tut_choices_3'));
    await t.until(t.engine.doMove('hero', 'desk'));
    await t.wait(1.8);
    await t.next();                                                // espera el clic antes de "¡Tu turno!"
  },

  // 2) Cómo hacer la maleta: arrastrar objetos, sacar uno y completar la selección.
  async packing(t) {
    await t.enter('packing', {});
    const g = await t.minigame('packing');
    const pick = id => g.actors.find(a => a.item.id === id) || g.actors[0];
    const bagPoint = (dx = 0) => t.project([(g.area.x[0] + g.area.x[1]) / 2 + dx, g.area.y, (g.area.z[0] + g.area.z[1]) / 2]);

    t.caption(t.t('tut_pack_1'));
    await t.wait(1.2);
    const a1 = pick('linterna'), a2 = pick('balon');
    t.hand.show(1500, 950);
    await t.hand.moveTo(t.posOf(a1.mesh), 0.9);
    await t.wait(0.3);
    await t.hand.drag(bagPoint(-0.08), 1.1);
    await t.wait(0.6);
    await t.hand.moveTo(t.posOf(a2.mesh), 0.9);
    await t.wait(0.3);
    await t.hand.drag(bagPoint(0.08), 1.1);
    await t.wait(1.0);

    await t.next();
    t.caption(t.t('tut_pack_2'));
    await t.wait(1.2);
    await t.hand.moveTo(t.posOf(a2.mesh), 0.8);
    await t.wait(0.3);
    await t.hand.drag(t.project(a2.home), 1.1);
    await t.wait(1.2);

    await t.next();
    t.caption(t.t('tut_pack_3'));
    await t.wait(0.8);
    await t.hand.moveTo(t.elPos(g.btn), 1.0);
    await t.wait(0.5);
    await t.hand.click(g.btn);
    await t.wait(1.2);
    await t.next();                                                // espera el clic antes de "¡Tu turno!"
  },

  // 3) El reloj del terremoto y las decisiones: tómate tu tiempo.
  async timer(t) {
    const plane = await t.enter('room', { place: { hero: 'bed' }, shake: 0.3, lights: 'terremoto', follow: false });
    plane.get('hero').setPose('idle');
    let secs = CONFIG.quakeSeconds;
    t.ui.clock(true, secs);
    t.addUpdate(dt => { secs = Math.max(0, secs - dt); t.ui.clock(true, secs); });

    t.caption(t.t('tut_timer_1'));
    t.hand.show(1250, 700);
    await t.hand.moveTo({ x: 1030, y: 170 }, 1.0);                // señala el reloj
    await t.wait(3.4);
    await t.next();
    t.caption(t.t('tut_timer_2'));
    await t.wait(3.8);

    t.engine.choose(t.engine.story.nodes.room_quake, t.run);       // las opciones del terremoto (sin elegir)
    await t.wait(0.4);
    await t.next();
    t.caption(t.t('tut_timer_3'));
    const labels = [...document.querySelectorAll('#labels .hotspot-label, #labels .choice-button')];
    for (const el of labels) {
      await t.hand.moveTo(t.elPos(el), 1.0);
      await t.wait(1.1);
    }
    await t.wait(1.6);
    await t.next();                                                // espera el clic antes de "¡Tu turno!"
  },

  // 4) Escaleras: cuándo oprimir "toca" (un acierto y un error).
  async qte(t) {
    await t.enter('building', {});
    const g = await t.minigame('qte');
    const Q = g.Q;
    t.caption(t.t('tut_qte_1'));

    const r1 = await t.until(g.nextRing());
    t.hand.show(1500, 950);
    await t.hand.moveTo(t.elPos(r1.el), 0.45);
    t.caption(t.t('tut_qte_2'));
    await t.waitFor(() => r1.t >= Q.ringDuration - 0.03);         // justo cuando el anillo se cierra
    await t.hand.click(r1.el);
    t.caption(t.t('tut_qte_ok'));
    await t.wait(1.2);

    const r2 = await t.until(g.nextRing());
    g.stopRings();                                                 // la demostración solo usa dos
    t.caption(t.t('tut_qte_3'));
    await t.hand.moveTo(t.elPos(r2.el), 0.4);
    await t.waitFor(() => r2.t >= 0.5);                            // demasiado pronto
    await t.hand.click(r2.el);
    await t.wait(1.0);
    t.caption(t.t('tut_qte_4'));
    await t.wait(3.0);
  },

  // 5) Ayudar a los heridos: leer cada condición y llevar el objeto a la persona.
  async aid(t) {
    await t.enter('aid', { place: { hero: 'hero', $companion: 'heroB' } });
    const g = await t.minigame('aid');
    t.caption(t.t('tut_aid_1'));
    t.hand.show(960, 980);
    for (const p of g.people) {
      await t.hand.moveTo(t.elPos(p.label.el), 0.7);
      await t.wait(0.8);
    }
    await t.next();
    t.caption(t.t('tut_aid_2'));
    const it = g.items.find(a => a.item.id === 'linterna') || g.items[0];
    const target = g.people[1] || g.people[0];
    await t.hand.moveTo(t.posOf(it.mesh), 0.8);
    await t.wait(0.3);
    await t.hand.drag(t.posOf(target.actor.object3d, 'bottom'), 1.2);
    await t.wait(1.4);
    await t.next();
    t.caption(t.t('tut_aid_3'));
    await t.hand.moveTo(t.posOf(it.mesh), 0.7);
    await t.wait(0.3);
    await t.hand.drag(t.project(it.home), 1.1);
    await t.wait(1.0);
    await t.next();
    t.caption(t.t('tut_aid_4'));
    await t.hand.moveTo({ x: 1690, y: 1010 }, 0.9);              // donde aparece "Completar selección"
    await t.wait(3.2);
    await t.next();                                                // espera el clic antes de "¡Tu turno!"
  },
};
