// Motor de la historia: recorre los nodos de data/story.js, ejecuta las acciones,
// muestra las opciones y decide el siguiente paso.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Plane, setVisible } from './Plane.js';
import { Progress } from './Progress.js';
import { Tutorial, SKIP } from './Tutorial.js';
import { createState, companionId, leftBehindId, companionName, leftBehindName } from './GameState.js';

const wait = s => new Promise(r => setTimeout(r, s * 1000));

export class StoryEngine {
  constructor({ story, planes, endings, feedback, texts, assets, stage, ui, timer, audio, minigames }) {
    Object.assign(this, { story, planesDef: planes, endings, feedback, texts, assets, stage, ui, timer, audio, minigames });
    this.planes = new Map();   // planos ya construidos
    this.current = null;       // plano activo
    this.run = 0;              // cada salto de nodo invalida lo que quedó pendiente
    this.nodeId = null;
    this.state = createState();
    this.checkpoints = {};     // sección → { node, state }
    this.section = null;       // sección actual ('antes' | 'terremoto' | 'despues')
    this.cleanups = [];        // tareas para limpiar al salir de un minijuego
    this.progress = new Progress(Object.keys(endings).length);

    timer.onTick = s => ui.clock(timer.running, s);
    timer.onZero = () => this.goto(this.story.onTimeout);
  }

  start() { this.goto(this.story.start); }

  // ---------- Textos con tokens ----------
  format(str, vars = {}) {
    if (typeof str !== 'string') return str;
    const s = this.state;
    const left = s.companion ? leftBehindName(s) : '';
    const comp = s.companion ? companionName(s) : '';
    let out = str
      .replaceAll('{dejado}', left)
      .replaceAll('{Dejado}', left.charAt(0).toUpperCase() + left.slice(1))
      .replaceAll('{acompanante}', comp)
      .replaceAll('{atrapado}', s.companion === 'perro' ? 'atrapada' : 'atrapado');   // la madre / el perro
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
    return out;
  }

  text(id, vars) { return this.format(this.texts[id] ?? id, vars); }

  // Traduce '$companion' / '$left' al personaje real.
  actorId(id) {
    if (id === '$companion') return companionId(this.state);
    if (id === '$left') return leftBehindId(this.state);
    return id;
  }

  // ---------- Navegación ----------
  async goto(id) {
    const run = ++this.run;
    this.runCleanups();
    this.ui.clearAll();
    this.stage.clearHotspots();
    this.current?.stopAll();
    await this.exec(id, run);
  }

  alive(run) { return run === this.run; }

  runCleanups() {
    const list = this.cleanups;
    this.cleanups = [];
    for (const fn of list) { try { fn(); } catch (e) { console.error(e); } }
  }

  async exec(id, run) {
    const node = this.story.nodes[id];
    if (!node) { console.error(`[Story] El nodo "${id}" no existe.`); return; }
    this.nodeId = id;

    if (node.checkpoint) {
      this.section = node.checkpoint;
      this.checkpoints[node.checkpoint] = { node: id, state: structuredClone(this.state) };
    }
    if (node.set) node.set(this.state);
    if (node.timer === 'stop') { this.timer.stop(); this.ui.clock(false); }
    this.updateDebug();

    switch (node.type) {
      case 'menu': return this.execMenu(node, run);
      case 'card': return this.execCard(node, run);
      case 'scene': return this.execScene(node, run);
      case 'minigame': return this.execMinigame(node, run);
      case 'branch': return this.execBranch(node, run);
      case 'tutorial': return this.execTutorial(node, run);
      case 'ending': return this.execEnding(node, run);
      default: console.error(`[Story] Tipo de nodo desconocido: ${node.type}`);
    }
  }

  next(id, run) {
    if (!this.alive(run) || !id) return;
    return this.goto(id);
  }

  // ---------- Tipos de nodo ----------
  async execMenu(node, run) {
    this.timer.stop();
    this.ui.clock(false);
    this.audio.stopLoops();
    this.stage.shake = 0;
    this.current = null;
    this.ui.setBlack();
    this.state = createState();
    this.checkpoints = {};
    this.section = null;
    this.updateDebug();
    await this.ui.menu();
    this.next(node.next, run);
  }

  async execCard(node, run) {
    await this.ui.fadeOut();
    if (!this.alive(run)) return;
    if (!this.timer.running) this.ui.clock(false);
    this.ui.showCard(node, s => this.format(s));
    if (node.sound) this.audio.play(node.sound);
    if (node.timer === 'start') this.timer.start(CONFIG.quakeSeconds);   // el reloj corre desde esta pantalla
    await wait(CONFIG.chapterCardSeconds);
    if (!this.alive(run)) return;
    this.ui.hideCard();
    this.ui.clock(this.timer.running, this.timer.remaining);
    this.next(node.next, run);
  }

  async enterPlane(planeId, node, run) {
    let plane = this.planes.get(planeId);
    if (!plane) {
      plane = new Plane(planeId, this.planesDef[planeId], this.assets);
      this.planes.set(planeId, plane);
    }
    const changing = plane !== this.current;
    if (changing) {
      await this.ui.fadeOut();                // cambio de plano: fundido a negro
      if (!this.alive(run)) return null;
      plane.reset(this.state);
      this.stage.setPlane(plane);
      this.current = plane;
    } else {
      plane.refreshVisibility(this.state);
    }

    // Ajustes del nodo
    if (node.place) this.doPlace(node.place);
    for (const id of node.hide || []) this.setVisible(id, false);
    for (const id of node.show || []) this.setVisible(id, true);
    if (node.shake != null) this.stage.shake = node.shake;
    if (node.music !== undefined) this.audio.music(node.music);
    if (node.lights !== undefined) plane.setLightPreset(node.lights);

    // El acompañante (madre o perro) sigue al protagonista en cada plano nuevo.
    if (changing && this.state.companion && node.follow !== false) {
      const comp = plane.actors[companionId(this.state)], hero = plane.actors.hero;
      if (comp && hero) { comp.object3d.visible = true; comp.follow(hero); }
    }

    await this.ui.fadeIn();                    // sale del negro (si venía de fundido o tarjeta)
    return this.alive(run) ? plane : null;
  }

  async execScene(node, run) {
    const plane = await this.enterPlane(node.plane, node, run);
    if (!plane) return;
    if (!(await this.runActions(node.actions, run))) return;

    if (node.choices?.length) {
      const choice = await this.choose(node, run);
      if (!choice || !this.alive(run)) return;
      choice.set?.(this.state);
      this.updateDebug();
      if (!(await this.runActions(choice.actions, run))) return;
      return this.next(choice.go, run);
    }
    this.next(node.next, run);
  }

  async execMinigame(node, run) {
    const plane = await this.enterPlane(node.plane, node, run);
    if (!plane) return;
    const game = this.minigames[node.game];
    if (!game) { console.error(`[Story] Minijuego "${node.game}" no registrado.`); return; }
    const abort = new AbortController();
    this.cleanups.push(() => abort.abort());
    const ctx = this.minigameContext(plane, abort, this.cleanups);
    let result;
    try { result = await game.run(ctx); }
    catch (err) { if (!abort.signal.aborted) console.error(err); return; }
    if (!this.alive(run)) return;
    this.runCleanups();
    this.ui.closeMinigame();
    this.updateDebug();
    const target = node.results?.[result];
    if (!target) console.error(`[Story] El minijuego devolvió "${result}" pero no hay destino en results.`);
    this.next(target, run);
  }

  // Contexto que recibe cada minijuego. "cleanups" es la lista donde se anotan las tareas de limpieza.
  minigameContext(plane, abort, cleanups, extra = {}) {
    return {
      state: this.state, ui: this.ui, root: this.ui.minigameRoot(), stage: this.stage, plane,
      timer: this.timer, audio: this.audio, assets: this.assets, engine: this,
      signal: abort.signal,
      text: (id, vars) => this.text(id, vars),
      // tareas por frame y limpieza automática al terminar o al interrumpirse
      addUpdate: fn => { const off = this.stage.addUpdate(fn); cleanups.push(off); return off; },
      onCleanup: fn => cleanups.push(fn),
      ...extra,
    };
  }

  // Tutorial "¡ATENTO!" + demostración automática (js/core/Tutorial.js). El reloj se pausa.
  async execTutorial(node, run) {
    const timerWasRunning = this.timer.running;
    if (timerWasRunning) this.timer.pause();
    this.ui.clock(false);
    const realState = this.state;
    const demoState = structuredClone(realState);       // la demostración no cambia la partida
    node.demoState?.(demoState);
    this.state = demoState;
    const tut = new Tutorial(this, run);
    try { await tut.play(node); }
    catch (err) { if (err !== SKIP) console.error(err); else if (CONFIG.debug) console.log('[Tutorial] saltado', node.demo || node.notice); }
    finally {
      await tut.cleanup();
      if (this.state === demoState) this.state = realState;
    }
    if (!this.alive(run)) return;
    this.current = null;                                 // el siguiente plano se arma de cero
    this.stage.shake = 0;
    if (timerWasRunning) { this.timer.resume(); }
    this.updateDebug();
    this.next(node.next, run);
  }

  async execBranch(node, run) {
    const hit = (node.cases || []).find(c => c.if(this.state));
    this.next(hit ? hit.go : node.else, run);
  }

  async execEnding(node, run) {
    this.timer.stop();
    this.ui.clock(false);
    this.audio.stopLoops();
    this.state.ending = node.ending;
    this.progress.unlock(node.ending);
    const ending = this.endings[node.ending];
    if (ending.death) this.audio.play('sfx_death');
    await this.ui.fadeOut();
    this.stage.shake = 0;
    if (!this.alive(run)) return;

    const s = this.state;
    const feedback = this.feedback
      .filter(r => r.when(s))
      .map(r => ({ ok: r.ok, icon: r.icon, text: this.format(typeof r.text === 'function' ? r.text(s) : r.text) }));
    const progress = this.text('endings_unlocked', { n: this.progress.count, total: this.progress.total });
    const cp = this.section && this.checkpoints[this.section];
    const retryLabel = ending.retry !== false && cp
      ? this.text('retry_section', { seccion: this.text(`section_${this.section}`) })
      : null;

    const choice = await this.ui.ending({
      ending: { ...ending, title: this.format(ending.title) },
      cause: this.format(ending.cause), feedback, progress, retryLabel,
    });
    if (!this.alive(run)) return;

    if (choice === 'section' && cp) {
      // Reintentar desde el inicio de la sección con el estado que tenías al llegar a ella.
      this.state = structuredClone(cp.state);
      this.current = null;
      this.ui.setBlack();
      return this.next(cp.node, run);
    }
    this.next('menu', run);
  }

  // ---------- Acciones ----------
  async runActions(actions = [], run) {
    for (const a of actions) {
      if (!this.alive(run)) return false;
      await this.action(a);
      this.updateDebug();
    }
    return this.alive(run);
  }

  async action(a) {
    const plane = this.current;
    if (a.say) return this.ui.dialog(this.text(a.say));
    if (a.wait) return wait(a.wait);
    if (a.move) return this.doMove(a.move, a.to, a.speed);
    if (a.show) return [].concat(a.show).forEach(id => this.setVisible(id, true));
    if (a.hide) return [].concat(a.hide).forEach(id => this.setVisible(id, false));
    if (a.pose) return plane.get(this.actorId(a.pose))?.setPose(a.as, { head: a.head });
    if (a.place) return this.doPlace(a.place);
    if (a.follow) {
      const f = plane.get(this.actorId(a.follow));
      f.object3d.visible = true;
      return f.follow(plane.get(this.actorId(a.leader || 'hero')));
    }
    if (a.unfollow) return plane.get(this.actorId(a.unfollow))?.unfollow();
    if (a.drop) return this.doDrop(a);
    if (a.drive) return this.doDrive(a);          // (antes que "shake": drop también trae shake)
    if (a.shake != null) { this.stage.shake = a.shake; return; }
    if (a.sound) return this.audio.play(a.sound);
    if (a.set) return a.set(this.state);
    console.warn('[Story] Acción no reconocida', a);
  }

  // Caída de un objeto del escenario junto con personajes (cabina del ascensor):
  //   { drop: 'elevator', with: ['mom'], rattle: 1.2, distance: 6, shake: 1 }
  // Primero todo tiembla de forma errática y cada vez más fuerte durante "rattle" segundos,
  // luego cae con gravedad "distance" metros y queda oculto.
  doDrop(a) {
    const plane = this.current;
    const ents = [a.drop, ...[].concat(a.with || [])].map(id => plane.get(this.actorId(id))).filter(Boolean);
    const items = [];
    const v = new THREE.Vector3();
    for (const e of ents) {
      e.stop?.(); e.unfollow?.();
      const objs = e.isProp ? e.parts : [e.object3d];
      for (const o of objs) {
        const k = o.parent ? 1 / o.parent.getWorldScale(v).y : 1;   // metros → unidades locales
        items.push({ o, k, home: o.position.clone(), e });
      }
    }
    // luces que caen con el objeto: parpadean mientras tiembla
    const lights = [];
    for (const it of items) it.o.traverse(o => { if (o.isLight) lights.push({ l: o, base: o.intensity }); });
    const rattle = a.rattle ?? 1.2, dist = a.distance ?? 6, g = 9.8;
    const fall = Math.sqrt((2 * dist) / g);
    const baseShake = this.stage.shake;
    let t = 0;
    return new Promise(resolve => {
      const stop = this.stage.addUpdate(dt => {
        if (this.current !== plane) { stop(); return resolve(); }
        t += dt;
        let dy = 0, jx = 0, jy = 0, jz = 0;
        if (t < rattle) {
          const amp = 0.015 + 0.06 * (t / rattle) ** 1.5;           // cada vez más fuerte
          jx = (Math.random() - 0.5) * amp * 2;
          jy = (Math.random() - 0.5) * amp;
          jz = (Math.random() - 0.5) * amp * 0.6;
          this.stage.shake = Math.max(baseShake, (a.shake ?? 1) * (0.4 + 0.6 * t / rattle));
          for (const L of lights) L.l.intensity = L.base * (Math.random() < 0.18 ? 0.15 : 0.8 + Math.random() * 0.4);
        } else {
          const ft = Math.min(t - rattle, fall);
          dy = 0.5 * g * ft * ft;
          if (a.sound && !items.soundPlayed) { items.soundPlayed = true; this.audio.play(a.sound); }
        }
        for (const it of items) {
          it.o.position.set(it.home.x + jx * it.k, it.home.y + (jy - dy) * it.k, it.home.z + jz * it.k);
        }
        if (t >= rattle && !items.lit) { items.lit = true; lights.forEach(L => (L.l.intensity = L.base)); }
        if (t >= rattle + fall) {
          stop();
          lights.forEach(L => (L.l.intensity = L.base));
          for (const e of ents) setVisible(e, false);
          this.stage.shake = a.after ?? 0.3;
          resolve();
        }
      });
    });
  }

  // Un vehículo (o cualquier prop) se desplaza hasta un marcador, arrancando despacio:
  //   { drive: 'truck', to: 'away', seconds: 3, idle: 0.8 }
  // "idle": segundos de motor encendido (vibra) antes de moverse. Las ruedas giran solas.
  doDrive(a) {
    const plane = this.current;
    const e = plane.get(this.actorId(a.drive));
    if (!e) return;
    const obj = e.object3d;
    const from = obj.position.clone();
    const to = plane.marker(a.to).setY(from.y);
    const idle = a.idle ?? 0.8, dur = a.seconds ?? 3;
    const wheels = [];
    obj.traverse(o => { if (o.userData.wheel) wheels.push(o); });
    let t = 0, last = from.clone();
    return new Promise(resolve => {
      const stop = this.stage.addUpdate(dt => {
        if (this.current !== plane) { stop(); return resolve(); }
        t += dt;
        const shakeY = (Math.random() - 0.5) * 0.03;
        if (t < idle) { obj.position.set(from.x, from.y + shakeY, from.z); return; }
        const k = Math.min(1, (t - idle) / dur);
        obj.position.lerpVectors(from, to, k * k).y += shakeY * 0.5;    // acelera (ease-in)
        const moved = obj.position.x - last.x;
        last.copy(obj.position);
        for (const w of wheels) w.rotation.y += moved / 0.45;
        if (k >= 1) { stop(); resolve(); }
      });
    });
  }

  doPlace(map) {
    for (const [id, marker] of Object.entries(map)) {
      const e = this.current.get(this.actorId(id));
      if (e) { e.stop?.(); e.object3d.position.copy(this.current.marker(marker)); }
    }
    for (const a of Object.values(this.current.actors)) a.resync();
  }

  setVisible(id, v) {
    const e = this.current?.get(this.actorId(id));
    if (e) setVisible(e, v);
  }

  // Destino de una caminata: un marcador, o '@personaje' (se detiene a un paso de él).
  resolveTarget(to, mover) {
    if (to.startsWith('@')) {
      const other = this.current.get(this.actorId(to.slice(1)));
      const p = other.position.clone();
      const dir = mover.position.clone().sub(p).setY(0);
      if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
      return p.add(dir.normalize().multiplyScalar(CONFIG.followDistance));
    }
    return this.current.marker(to);
  }

  // Si caminan varios a la vez (sin seguimiento), los demás van un poco detrás.
  doMove(ids, to, speed = CONFIG.walkSpeed) {
    const list = [].concat(ids).map(id => this.current.get(this.actorId(id))).filter(Boolean);
    const lead = list[0];
    const target = this.resolveTarget(to, lead);
    const dir = target.clone().sub(lead.position).setY(0);
    const back = dir.lengthSq() > 0 ? dir.normalize().multiplyScalar(-CONFIG.followDistance) : new THREE.Vector3();
    return Promise.all(list.map((e, i) => {
      e.object3d.visible = true;
      return e.moveTo(target.clone().addScaledVector(back, i), speed);
    }));
  }

  // ---------- Opciones ----------
  choose(node, run) {
    const choices = node.choices.filter(c => !c.if || c.if(this.state));
    return new Promise(resolve => {
      const pick = c => {
        if (!this.alive(run) || picked) return;
        picked = true;
        this.audio.play('sfx_click');
        this.stage.clearHotspots();
        this.ui.clearChoices();
        resolve(c);
      };
      let picked = false;
      const hotspots = [];
      for (const c of choices) {
        const label = this.text(c.label);
        if (c.at) {
          const entity = this.current.get(this.actorId(c.at));
          if (!entity || !entity.object3d.visible) continue;
          const l = this.ui.addLabel(label, () => pick(c));
          l.anchor = entity.object3d;
          hotspots.push({ entity, onClick: () => pick(c), onHover: on => l.el.classList.toggle('hover', on) });
        } else if (c.ui) {
          this.ui.addButton(label, c.ui, () => pick(c));
        }
      }
      this.stage.setHotspots(hotspots);
      this.ui.updateLabels(this.stage);
      this.ui.prompt(node.prompt === undefined ? this.text('prompt') : this.text(node.prompt));
    });
  }

  // ---------- Pruebas ----------
  updateDebug() {
    if (!CONFIG.debug) return;
    const s = this.state;
    this.ui.debug(
      `nodo: ${this.nodeId} · sección: ${this.section || '—'}\n` +
      `maleta: ${s.bag.made ? 'hecha' : 'no'} · llevada: ${s.bag.taken ? 'sí' : 'no'}\n` +
      `objetos: ${s.bag.items.join(', ') || '—'}\n` +
      `acompañante: ${s.companion || '—'} · fallos QTE: ${s.qteFails}\n` +
      `decisiones: ${JSON.stringify(s.decisions)}\n` +
      `finales: ${this.progress.count}/${this.progress.total}\n` +
      `[T] reloj a 5 s · [R] menú · [E] ejemplos · [0] borrar finales · [X] ocultar panel`
    );
  }
}
