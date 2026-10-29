// Personaje o prop 2D dentro del espacio 3D (estilo Paper Mario):
// un plano con imagen que se mueve por el escenario.
//
// Formas de animar un sprite (ver data/assets.js):
//   · hoja de sprites:     sheet: { cols, rows, anims: { walk: { row, frames, fps } } }
//   · cuadros sueltos:     anims: { walk: { frames: 'assets/sprites/nino/walk_{i}.png', count: 8, fps: 10 } }
//   · video con alfa:      anims: { walk: { video: 'assets/sprites/nino/walk.webm' } }
//   · imagen fija:         solo src
//   · hojas WebP generadas: anims: SPRITES.hero (data/sprites.js) → { idle: { sheet, cols, rows, count, fps, w, h, ax, ay } }
//     w/h = tamaño del cuadro en metros; ax/ay = punto de apoyo (pies) dentro del cuadro.
//
// Variantes por etiquetas (tags): con def.tagOrder = ['mom', 'bag', 'scared'] y las etiquetas activas,
// 'walk' se resuelve a la animación más específica que exista: walk_mom_bag_scared → walk_bag_scared → … → walk.
// Si no existe ninguna 'walk_*', usa la variante de 'idle' con rebote. Las etiquetas las pone el motor
// (StoryEngine.updateLooks) según def.tags en data/assets.js.
import * as THREE from 'three';
import { placeholderSpriteTexture } from './Assets.js';
import { CONFIG } from '../config.js';

const ZERO = new THREE.Vector3();

export class Actor {
  constructor(id, assetKey, assets, overrides = {}) {
    this.id = id;
    const def = { ...(assets.def(assetKey) || { height: 1.6, label: id }), ...overrides };
    this.def = def;
    // CONFIG.characterScale agranda por igual a los personajes con animaciones (no a objetos ni marcadores)
    this.scaleK = def.anims && !def.static ? (CONFIG.characterScale ?? 1) : 1;
    this.height = (def.height ?? 1.6) * this.scaleK;

    // ---- Texturas y modo de animación ----
    const single = assets.texture(assetKey);
    this.multi = assets.animsOf(assetKey);          // animaciones por cuadros/video
    this.sheet = single && def.sheet ? def.sheet : null;
    let texture, aspect;

    if (this.multi) {
      // cada actor usa su propia copia de las hojas (offset/repeat independientes)
      this.multi = Object.fromEntries(Object.entries(this.multi).map(([k, a]) => {
        if (a.kind !== 'sheet') return [k, a];
        const tex = a.texture.clone();
        tex.repeat.set(1 / a.cols, 1 / a.rows);
        tex.needsUpdate = true;
        return [k, { ...a, texture: tex }];
      }));
      const first = this.multi.idle || Object.values(this.multi)[0];
      texture = first.kind === 'frames' ? first.textures[0] : first.texture;
      aspect = first.kind === 'video' ? first.el.videoWidth / first.el.videoHeight
        : first.kind === 'sheet' ? first.w / first.h
        : texture.image.width / texture.image.height;
    } else if (single) {
      texture = single.clone();
      const img = texture.image;
      const fw = img.width / (this.sheet ? this.sheet.cols : 1);
      const fh = img.height / (this.sheet ? this.sheet.rows : 1);
      aspect = fw / fh;
      if (this.sheet) texture.repeat.set(1 / this.sheet.cols, 1 / this.sheet.rows);
      texture.needsUpdate = true;
    } else {
      aspect = def.aspect ?? (def.placeholder === 'card' ? 1 : this.height < 1 ? 1.3 : 0.5);
      texture = placeholderSpriteTexture(def.label || id, def.color, aspect, def.placeholder || 'figure');
    }
    this.isPlaceholder = !single && !this.multi;
    this.texture = texture;
    this.width = this.height * aspect;
    this.faceSign = def.faces === 'left' ? -1 : 1;   // los dibujos que miran a la izquierda se invierten
    this.tags = new Set();
    this.clip = null;           // animación de hoja que se está mostrando (con w, h, ax, ay)

    this.object3d = new THREE.Group();
    this.object3d.name = id;
    this.object3d.userData.actor = this;

    this.material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);   // se escala en _applyVisual
    this.mesh.position.y = this.height / 2;
    this.object3d.add(this.mesh);

    // Sombra suave para que se sienta apoyado en el piso.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(this.width, 0.4) * 0.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.shadow.scale.y = 0.45;
    if (def.noShadow) this.shadow.visible = false;
    this.object3d.add(this.shadow);

    this.anim = null; this.animTime = 0;
    this.moving = null;
    this.currentSpeed = 0;
    // seguimiento
    this.leader = null;
    this.trail = [];          // recorrido del líder: [{ p: Vector3, s: distancia acumulada }]
    this.trailS = 0;          // posición del seguidor sobre el recorrido del líder
    this.setAnim('idle');

    // Estado visual (giro tipo "carta", rebote al caminar, respiración)
    this.facingSign = 1;
    this.flip = 1;
    this.hiK = 1;
    this.lying = false;
    this.t = Math.random() * 10;
    this.hasOwnWalk = this.hasAnim('walk');
    this.isStatic = def.placeholder === 'card' || !!def.static;
    this._applyVisual(0);     // tamaño correcto desde el inicio (aunque nadie llame update)
  }

  get position() { return this.object3d.position; }

  // ---------- Animación ----------
  setAnim(name, force = false) {
    if (this.anim === name && !force) return;
    if (this.anim !== name) this.animTime = 0;
    const prev = this.multi?.[this.animKey];
    this.anim = name;
    if (this.multi) {
      const key = this._resolve(name);
      const a = this.multi[key];
      if (!a) return;
      if (prev?.kind === 'video' && prev !== a) prev.el.pause();
      this.animKey = key;
      this.ownWalk = name !== 'walk' || key.startsWith('walk');
      this.clip = a.kind === 'sheet' ? a : null;
      if (a.kind === 'video') { this.material.map = a.texture; a.el.currentTime = 0; a.el.play().catch(() => {}); }
      else if (a.kind === 'sheet') { this.material.map = a.texture; this._sheetFrame(a, 0); }
      else this.material.map = a.textures[0];
      this.material.needsUpdate = true;
    } else this._applySheetFrame(0);
  }

  // Nombre real de la animación según las etiquetas activas (ver arriba).
  _resolve(name) {
    const order = (this.def.tagOrder || []).filter(t => this.tags.has(t));
    const subsets = [];
    for (let m = (1 << order.length) - 1; m >= 0; m--) subsets.push(order.filter((_, i) => m & (1 << (order.length - 1 - i))));
    subsets.sort((a, b) => b.length - a.length);
    for (const base of name === 'idle' ? ['idle'] : [name, 'idle']) {
      for (const sub of subsets) {
        const k = sub.length ? `${base}_${sub.join('_')}` : base;
        if (this.multi[k]) return k;
      }
    }
    return Object.keys(this.multi)[0];
  }

  // Cambia las etiquetas (asustado, con maleta, de la mano…) y actualiza la animación si hace falta.
  setTags(list) {
    const next = new Set(list);
    if (next.size === this.tags.size && [...next].every(t => this.tags.has(t))) return;
    this.tags = next;
    if (this.multi) this.setAnim(this.anim, true);
  }

  _sheetFrame(a, f) {
    const col = f % a.cols, row = Math.floor(f / a.cols);
    a.texture.offset.set(col / a.cols, 1 - (row + 1) / a.rows);
  }

  _applySheetFrame(frame) {
    if (!this.sheet) return;
    const a = this.sheet.anims?.[this.anim] || this.sheet.anims?.idle || { row: 0, frames: 1 };
    const col = frame % a.frames;
    this.texture.offset.set(col / this.sheet.cols, 1 - (a.row + 1) / this.sheet.rows);
  }

  hasAnim(name) {
    return !!(this.multi?.[name] || this.sheet?.anims?.[name]);
  }

  // opts.head: 'left' | 'right' → hacia dónde queda la cabeza al acostarse (pose 'lying')
  setPose(name, opts = {}) {
    if (opts.head) this.lyingHead = opts.head;
    if (this.hasAnim(name)) {
      this.lying = false;
      this.setAnim(name);
      return;
    }
    // Sin animación propia: "lying" acuesta el plano.
    this.lying = name === 'lying';
    this.shadow.visible = !this.lying && !this.def.noShadow;
    this.setAnim(this.lying ? 'idle' : name);
  }

  face(dir) {
    if (this.isPlaceholder) return; // el marcador es simétrico y así su nombre no queda al revés
    this.facingSign = dir === 'left' ? -1 : 1;
    if (!CONFIG.anim.flipTurn) this.flip = this.facingSign;
  }

  // Aplica giro, rebote, respiración y resaltado a la imagen.
  _applyVisual(dt) {
    const A = CONFIG.anim;
    this.t += dt;
    if (this.flip !== this.facingSign) {
      const step = dt * 9;
      this.flip = this.flip < this.facingSign ? Math.min(this.facingSign, this.flip + step) : Math.max(this.facingSign, this.flip - step);
    }
    let sx = (Math.abs(this.flip) < 0.06 ? 0.06 * Math.sign(this.flip || 1) : this.flip) * this.faceSign;
    let sy = 1, bob = 0, rz = 0;
    if (this.lying) {
      rz = this.lyingHead === 'right' ? -Math.PI / 2 : Math.PI / 2;
    } else if (!this.isStatic) {
      const walking = this.anim === 'walk' && this.currentSpeed > 0;
      const ownWalk = this.multi ? this.ownWalk : this.hasOwnWalk;
      if (walking && A.walkBob && !ownWalk) {
        const ph = this.t * 11;
        bob = Math.abs(Math.sin(ph)) * this.height * 0.05;
        rz = Math.sin(ph) * 0.06;
      } else if (!walking && A.idleBreath && (!this.clip || this.clip.count <= 1)) {   // las hojas animadas ya traen su respiración
        sy = 1 + Math.sin(this.t * 2.2) * 0.012;
      }
    }
    const k = this.hiK, c = this.clip;
    const W = c ? c.w * this.scaleK : this.width, H = c ? c.h * this.scaleK : this.height;
    const ax = c ? c.ax : 0.5, ay = c ? c.ay : 1;      // punto de apoyo dentro del cuadro
    this.mesh.scale.set(sx * k * W, sy * k * H, 1);
    this.mesh.rotation.z = rz;
    if (this.lying) this.mesh.position.set(0, W / 2 + 0.05, 0);
    else this.mesh.position.set((0.5 - ax) * W * sx * k, (ay - 0.5) * H * sy * k + bob, 0);
  }

  // ---------- Movimiento propio ----------
  moveTo(target, speed = CONFIG.walkSpeed * CONFIG.pace.walk, speedFn) {
    this.stop();
    return new Promise(resolve => {
      this.moving = { target: target.clone(), speed, speedFn, resolve };
      if (this.lying) this.setPose('idle');
      this.stopGrace = 0;
      this.setAnim('walk');           // si ya venía caminando, la animación sigue sin reiniciarse
    });
  }

  stop() {
    if (this.moving) {
      const r = this.moving.resolve;
      this.moving = null;
      this.setAnim('idle');
      this.resync();
      r();
    }
  }

  // ---------- Seguimiento (acompañante) ----------
  follow(leader, distance = CONFIG.followDistance * this.scaleK) {
    this.leader = leader;
    this.followDistance = distance;
    this.followSide = null;
    this._side?.set(0, 0, 0);
    this.resync();
  }

  unfollow() { this.leader = null; }

  // Reinicia el recorrido: desde donde está el seguidor hasta donde está el líder.
  resync() {
    if (!this.leader) return;
    const a = this.position.clone(), b = this.leader.position.clone();
    this.leader.trail = [{ p: a, s: 0 }, { p: b, s: a.distanceTo(b) }];
    this.trailS = 0;
  }

  _recordTrail() {
    const t = this.trail;
    if (!t.length) return;
    const last = t[t.length - 1];
    const d = last.p.distanceTo(this.position);
    if (d > 0.04) t.push({ p: this.position.clone(), s: last.s + d });
  }

  _pointAt(trail, s) {
    for (let i = 1; i < trail.length; i++) {
      if (trail[i].s >= s) {
        const a = trail[i - 1], b = trail[i];
        const k = (s - a.s) / Math.max(b.s - a.s, 1e-6);
        return a.p.clone().lerp(b.p, k);
      }
    }
    return trail[trail.length - 1].p.clone();
  }

  _updateFollow(dt) {
    const L = this.leader;
    const trail = L.trail;
    if (trail.length < 2) return;
    const total = trail[trail.length - 1].s;
    const targetS = total - this.followDistance;
    // followSide (opcional): desplazamiento lateral en metros, para caminar AL LADO del líder
    // (por ejemplo, en un pasillo con la cámara detrás). Se ajusta suavemente.
    if (!this._side) this._side = new THREE.Vector3();
    const wantSide = this.followSide || ZERO;
    if (this._side.distanceToSquared(wantSide) > 1e-6) {
      const prev = this._side.clone();
      this._side.lerp(wantSide, Math.min(1, dt * 2.5));
      this.position.add(this._side.clone().sub(prev));
    }
    if (targetS > this.trailS + 0.01) {
      const speed = Math.max(L.currentSpeed, CONFIG.walkSpeed * CONFIG.pace.walk * 0.6) * 1.2;
      const before = this.position.clone();
      this.trailS = Math.min(targetS, this.trailS + speed * dt);
      this.position.copy(this._pointAt(trail, this.trailS)).add(this._side);
      const dx = this.position.x - before.x;
      if (Math.abs(dx) > 0.002) this.face(dx < 0 ? 'left' : 'right');
      this.currentSpeed = speed;
      this.followIdle = 0;
      this.setAnim('walk');
    } else {
      this.currentSpeed = 0;
      this.followIdle = (this.followIdle || 0) + dt;
      if (this.anim === 'walk' && this.followIdle > 0.15) this.setAnim('idle');
    }
  }

  update(dt) {
    if (this.moving) {
      const m = this.moving;
      const pos = this.position;
      const to = m.target.clone().sub(pos);
      const dist = to.length();
      const speed = m.speed * (m.speedFn ? m.speedFn() : 1);
      const step = speed * dt;
      this.currentSpeed = speed;
      // solo se voltea si el movimiento es claramente lateral (subir/bajar en pantalla no lo gira)
      if (Math.abs(to.x) > 0.01 && Math.abs(to.x) > 0.35 * Math.abs(to.z)) this.face(to.x < 0 ? 'left' : 'right');
      if (dist <= step) {
        pos.copy(m.target);
        this.moving = null;
        this.currentSpeed = 0;
        this.stopGrace = 0.15;        // si enseguida sigue otro tramo, no pasa por "quieto" (evita tirones)
        this.stopFrames = 0;
        this._recordTrail();
        this.resync();
        m.resolve();
      } else {
        pos.add(to.multiplyScalar(step / dist));
        this._recordTrail();
      }
    } else if (this.leader && this.object3d.visible) {
      this._updateFollow(dt);
    } else {
      this.currentSpeed = 0;
    }
    // termina la pausa corta: ahora sí, quieto
    if (!this.moving && this.stopGrace > 0) {
      this.stopGrace -= dt;
      this.stopFrames++;
      // al menos 0,15 s y 3 cuadros (en computadores lentos un cuadro puede durar más que la pausa)
      if (this.stopGrace <= 0 && this.stopFrames >= 3) {
        this.stopGrace = 0;
        if (this.anim === 'walk' && !this.leader) this.setAnim('idle');
      } else if (this.stopGrace <= 0) this.stopGrace = 1e-6;
    }

    // Avance de cuadros
    if (this.multi) {
      const a = this.multi[this.animKey];
      if (a?.kind === 'sheet' && a.count > 1) {
        // los pasos van al ritmo de la caminata (etapa terremoto: un poco más rápido)
        this.animTime += dt * (this.animKey.startsWith('walk') ? CONFIG.pace.walk : 1);
        let f = Math.floor(this.animTime * a.fps);
        f = a.loop === false ? Math.min(f, a.count - 1) : f % a.count;
        this._sheetFrame(a, f);
      } else if (a?.kind === 'frames' && a.textures.length > 1) {
        this.animTime += dt;
        let f = Math.floor(this.animTime * a.fps);
        f = a.loop ? f % a.textures.length : Math.min(f, a.textures.length - 1);
        if (this.material.map !== a.textures[f]) { this.material.map = a.textures[f]; }
      }
    } else if (this.sheet) {
      const a = this.sheet.anims?.[this.anim];
      if (a && a.frames > 1) {
        this.animTime += dt;
        this._applySheetFrame(Math.floor(this.animTime * (a.fps || 8)));
      }
    }
    this._updateFade(dt);
    this._applyVisual(dt);
  }

  // Aparecer / desaparecer con un fundido suave (acciones show / hide de la historia).
  fadeVisible(v, dur = 0.45) {
    if (v && this.object3d.visible && !this.fade) return;
    if (!v && !this.object3d.visible) return;
    if (v) { this.object3d.visible = true; this._setOpacity(0); }
    this.fade = { from: v ? 0 : this._opacity ?? 1, to: v ? 1 : 0, t: 0, dur };
  }

  resetFade() { this.fade = null; this._setOpacity(1); }

  _setOpacity(k) {
    this._opacity = k;
    this.material.opacity = k;
    this.shadow.material.opacity = 0.22 * k;
  }

  _updateFade(dt) {
    const f = this.fade;
    if (!f) return;
    f.t = Math.min(f.dur, f.t + dt);
    this._setOpacity(f.from + (f.to - f.from) * (f.t / f.dur));
    if (f.t >= f.dur) {
      this.fade = null;
      if (f.to === 0) { this.object3d.visible = false; this._setOpacity(1); }
    }
  }

  setHighlight(on) {
    this.material.color.set(on ? 0xffe066 : 0xffffff);
    this.hiK = on ? 1.08 : 1;
    this._applyVisual(0);
  }
}
