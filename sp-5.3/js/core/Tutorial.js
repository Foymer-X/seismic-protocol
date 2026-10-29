// TUTORIALES: pantalla "¡ATENTO!" + una demostración que se juega sola.
// Una mano animada mueve el puntero, pasa por encima de las opciones, arrastra objetos y oprime
// botones usando los mismos minijuegos del juego (con una copia del estado: la partida no cambia).
// El botón "Saltar" corta solo el tutorial que se está viendo. El reloj del terremoto se pausa.
// Las demostraciones están en js/tutorials/demos.js y los textos en data/texts.js (tut_...).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { DEMOS } from '../tutorials/demos.js';

export const SKIP = Symbol('saltar');
const $ = sel => document.querySelector(sel);
const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Tutorial {
  constructor(engine, run) {
    this.engine = engine;
    this.run = run;
    this.ui = engine.ui;
    this.stage = engine.stage;
    this.cleanups = [];
    this.cancelled = false;
    this._cancelP = new Promise((_, reject) => {
      this._cancel = () => { if (!this.cancelled) { this.cancelled = true; reject(SKIP); } };
    });
    this._cancelP.catch(() => {});
    // si el motor salta a otro nodo (menú, pruebas), la demostración se corta
    this._watch = this.stage.addUpdate(() => { if (!engine.alive(run)) this._cancel(); });
    this.hand = new Hand(this);
    this.framed = false;
  }

  // ---------- ventana de la demostración ----------
  // Las posiciones del juego (1920×1080) se ven encogidas dentro de la ventana: toScreen / fromScreen.
  get k() { return this.framed ? CONFIG.tutorial.frameScale : 1; }
  get cy() { return this.framed ? CONFIG.tutorial.frameCenterY : 540; }
  toScreen(p) { return { x: 960 + (p.x - 960) * this.k, y: this.cy + (p.y - 540) * this.k }; }
  fromScreen(p) { return { x: 960 + (p.x - 960) / this.k, y: 540 + (p.y - this.cy) / this.k }; }
  setFramed(on) {
    this.framed = on;
    const root = document.documentElement.style;
    root.setProperty('--tut-k', CONFIG.tutorial.frameScale);
    root.setProperty('--tut-cy', `${CONFIG.tutorial.frameCenterY}px`);
    $('#viewport').classList.toggle('tut-framed', on);
    $('#tut-frame').hidden = !on;
    $('#tut-header').hidden = !on;
  }

  // ---------- utilidades para las demostraciones ----------
  t(id, vars) { return this.engine.text(id, vars); }
  until(p) { return Promise.race([p, this._cancelP]); }
  wait(s) { return this.until(new Promise(r => setTimeout(r, s * 1000))); }
  waitFor(cond) {
    return this.until(new Promise(resolve => {
      const off = this.stage.addUpdate(() => { if (cond()) { off(); resolve(); } });
      this.cleanups.push(off);
    }));
  }
  addUpdate(fn) { const off = this.stage.addUpdate(fn); this.cleanups.push(off); return off; }

  // Entra a un plano para la demostración (siempre lo arma de cero).
  async enter(planeId, opts = {}) {
    this.engine.current = null;
    const plane = await this.until(this.engine.enterPlane(planeId, opts, this.run));
    if (!plane) throw SKIP;
    return plane;
  }

  // Arranca un minijuego en modo demostración. Devuelve lo que el minijuego expone (ctx.expose).
  async minigame(game, extra = {}) {
    const abort = new AbortController();
    this.cleanups.push(() => abort.abort());
    let exposeFn;
    const ready = new Promise(r => (exposeFn = r));
    const ctx = this.engine.minigameContext(this.engine.current, abort, this.cleanups, { demo: true, expose: o => exposeFn(o), ...extra });
    const result = this.engine.minigames[game].run(ctx).catch(err => { if (!abort.signal.aborted) console.error(err); });
    const api = await this.until(ready);
    api.result = result;
    return api;
  }

  // Posiciones en pantalla (1920×1080)
  posOf(objects, where = 'center') { return this.stage.screenPosOf(objects, where) || { x: 960, y: 540 }; }
  // Punto en pantalla que de verdad cae SOBRE el objeto (para pasar el mouse o hacer clic).
  posOfEntity(entity) {
    const objs = entity.pickTargets || entity.parts || [entity.object3d];
    const box = new THREE.Box3();
    for (const o of objs) box.expandByObject(o);
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z])
      corners.push(this.stage.project(new THREE.Vector3(x, y, z)));
    const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const ray = new THREE.Raycaster();
    let best = null, bestD = Infinity;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
      const x = x0 + (x1 - x0) * i / 10, y = y0 + (y1 - y0) * j / 10;
      ray.setFromCamera(new THREE.Vector2(x / CONFIG.baseWidth * 2 - 1, -(y / CONFIG.baseHeight) * 2 + 1), this.stage.labelCam);
      if (!ray.intersectObjects(objs, true).length) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    return best || { x: cx, y: cy };
  }
  project(v) { return this.stage.project(v instanceof THREE.Vector3 ? v : new THREE.Vector3(...v)); }
  elPos(el) {
    const ui = $('#ui').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = CONFIG.baseWidth / ui.width;
    return this.fromScreen({ x: (r.left + r.width / 2 - ui.left) * k, y: (r.top + r.height / 2 - ui.top) * k });
  }

  // Espera a que el jugador lea: muestra "Clic para continuar" bajo la explicación hasta un clic o Espacio/Enter.
  // (pruebas de usabilidad: las explicaciones avanzaban demasiado rápido)
  next() {
    const el = $('#tut-caption');
    el.dataset.next = this.t('tut_click_next');
    el.classList.add('wait');
    return this.until(new Promise(resolve => {
      const done = e => {
        if (e.type === 'keydown' && ![' ', 'Enter'].includes(e.key)) return;
        if (e.target?.closest?.('#tut-skip, #btn-sound')) return;
        window.removeEventListener('pointerdown', done, true);
        window.removeEventListener('keydown', done, true);
        el.classList.remove('wait');
        this.ui.audio?.play('sfx_click');
        resolve();
      };
      setTimeout(() => {          // un instante para que no se salte por un clic anterior
        window.addEventListener('pointerdown', done, true);
        window.addEventListener('keydown', done, true);
      }, 250);
      this.cleanups.push(() => { window.removeEventListener('pointerdown', done, true); window.removeEventListener('keydown', done, true); el.classList.remove('wait'); });
    }));
  }

  // Explicación debajo de la ventana.
  caption(text) {
    const el = $('#tut-caption');
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
  }

  // ---------- secuencia completa ----------
  async play(node) {
    const root = $('#tutorial');
    root.hidden = false;
    const skip = $('#tut-skip');
    skip.textContent = this.t(node.notice ? 'tut_continue' : 'tut_skip');
    skip.onclick = () => this._cancel();
    $('#tut-badge').textContent = this.t('tut_badge');

    // 1) ¡ATENTO! (pantalla completa)
    root.classList.add('card-mode');
    await this.until(this.ui.fadeOut());
    this.ui.showCard({ style: 'attention', title: this.t('tut_attention'), subtitle: this.t(node.notice || node.title) });
    await this.wait(node.notice ? CONFIG.tutorial.noticeSeconds : CONFIG.tutorial.attentionSeconds);
    if (node.notice) return;          // aviso sin demostración
    this.ui.hideCard();

    // 2) Demostración en una ventana, con "¡ATENTO!" arriba
    root.classList.remove('card-mode');
    $('#tut-header-title').textContent = this.t('tut_attention');
    $('#tut-header-sub').textContent = this.t(node.title);
    this.setFramed(true);
    $('#tut-badge').hidden = false;
    await DEMOS[node.demo](this);

    // 3) ¡Tu turno! (sobre negro; la demostración se desarma detrás)
    this.caption(null);
    this.hand.hide();
    $('#tut-badge').hidden = true;
    await this.until(this.ui.fadeOut());
    this.clearDemo();
    this.setFramed(false);
    const flash = $('#tut-flash');
    flash.textContent = this.t('tut_your_turn');
    flash.hidden = false;
    flash.classList.remove('enter'); void flash.offsetWidth; flash.classList.add('enter');
    await this.wait(1.3);
  }

  // Quita todo lo de la demostración (minijuego, opciones, reloj de muestra…).
  clearDemo() {
    for (const fn of this.cleanups.splice(0).reverse()) { try { fn(); } catch (e) { console.error(e); } }
    this.ui.closeMinigame();
    this.ui.clearChoices();
    this.stage.clearHotspots();
    this.ui.clock(false);
    this.engine.current?.stopAll();
  }

  async cleanup() {
    if (!this.cancelled) { this.cancelled = true; this._cancel = () => {}; }
    this._watch();
    this.clearDemo();
    this.ui.hideCard();
    this.hand.hide();
    this.caption(null);
    for (const id of ['#tut-badge', '#tut-flash']) $(id).hidden = true;
    this.setFramed(false);
    $('#tutorial').classList.remove('card-mode');
    $('#tutorial').hidden = true;
    if (this.engine.alive(this.run)) await this.ui.fadeOut();   // el siguiente paso empieza desde negro
  }
}

// Mano animada que simula el mouse sobre el canvas y los botones.
class Hand {
  constructor(tut) {
    this.tut = tut;
    this.el = $('#tut-hand');
    this.x = 960; this.y = 600;
    this.down = false;
  }

  show(x = this.x, y = this.y) { this.el.hidden = false; this.setPos(x, y, false); }
  hide() { this.el.hidden = true; this.el.classList.remove('grab'); }

  // x, y: coordenadas del juego (1920×1080); en pantalla se dibuja dentro de la ventana.
  setPos(x, y, emit = true) {
    this.x = x; this.y = y;
    const s = this.tut.toScreen({ x, y });
    this.el.style.left = `${s.x}px`;
    this.el.style.top = `${s.y}px`;
    if (emit) this.pointer('pointermove');
  }

  // Mueve la mano hasta p = { x, y } (coordenadas 1920×1080).
  async moveTo(p, seconds = 0.8) {
    if (this.el.hidden) this.show();
    const x0 = this.x, y0 = this.y;
    const dur = seconds / (CONFIG.tutorial.handSpeed || 1);
    let t = 0;
    await this.tut.until(new Promise(resolve => {
      const off = this.tut.stage.addUpdate(dt => {
        t = Math.min(dur, t + dt);
        const k = dur > 0 ? ease(t / dur) : 1;
        this.setPos(x0 + (p.x - x0) * k, y0 + (p.y - y0) * k);
        if (t >= dur) { off(); resolve(); }
      });
      this.tut.cleanups.push(off);
    }));
  }

  async press() {
    this.el.classList.remove('press'); void this.el.offsetWidth; this.el.classList.add('press');
    await this.tut.wait(0.18);
  }

  // Clic: sobre un botón HTML (target) o sobre el escenario 3D en la posición actual.
  async click(target) {
    await this.press();
    if (target) { target.click(); return; }
    this.pointer('pointerdown');
    this.pointer('pointerup');
    this.pointer('click');
  }

  // Arrastra desde la posición actual hasta p.
  async drag(p, seconds = 1) {
    this.el.classList.add('grab');
    this.down = true;
    this.pointer('pointerdown');
    await this.tut.wait(0.12);
    await this.moveTo(p, seconds);
    await this.tut.wait(0.1);
    this.down = false;
    this.pointer('pointerup');
    this.el.classList.remove('grab');
  }

  // Evento de puntero simulado sobre el canvas en la posición de la mano.
  pointer(type) {
    const canvas = this.tut.stage.canvas;
    const r = canvas.getBoundingClientRect();
    const init = {
      clientX: r.left + (this.x / CONFIG.baseWidth) * r.width,
      clientY: r.top + (this.y / CONFIG.baseHeight) * r.height,
      bubbles: true, cancelable: true, button: 0, buttons: this.down ? 1 : 0,
      pointerId: 77, pointerType: 'mouse', isPrimary: true,
    };
    canvas.dispatchEvent(type === 'click' ? new MouseEvent('click', init) : new PointerEvent(type, init));
  }
}
