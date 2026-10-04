// Arrastrar y soltar objetos 2D sobre una superficie del escenario 3D (mesa, piso).
export class Drag {
  /**
   * @param stage  Stage
   * @param ui     UI (para el nombre del objeto al pasar el mouse)
   * @param opts   { items: () => Actor[], surfaceY: number, lift: number,
   *                 nameOf: actor => string, onStart, onMove(actor, point), onDrop(actor, point) }
   */
  constructor(stage, ui, opts) {
    this.stage = stage;
    this.ui = ui;
    this.opts = { lift: 0.25, ...opts };
    this.dragging = null;
    this.hovered = null;
    const c = stage.canvas;
    this._down = e => this.down(e);
    this._move = e => this.move(e);
    this._up = e => this.up(e);
    c.addEventListener('pointerdown', this._down);
    c.addEventListener('pointermove', this._move);
    c.addEventListener('pointerup', this._up);
    c.addEventListener('pointercancel', this._up);
  }

  destroy() {
    const c = this.stage.canvas;
    c.removeEventListener('pointerdown', this._down);
    c.removeEventListener('pointermove', this._move);
    c.removeEventListener('pointerup', this._up);
    c.removeEventListener('pointercancel', this._up);
    c.style.cursor = 'default';
    this.ui.tooltip(null);
  }

  _pick(e) {
    const items = this.opts.items().filter(a => a.object3d.visible);
    const obj = this.stage.pickFrom(e, items.map(a => a.object3d));
    return obj ? obj.userData.actor : null;
  }

  down(e) {
    const a = this._pick(e);
    if (!a) return;
    this.dragging = a;
    this.stage.canvas.setPointerCapture?.(e.pointerId);
    a.setHighlight(true);
    this.ui.tooltip(null);
    this.opts.onStart?.(a);
    this.move(e);
  }

  move(e) {
    const p = this.stage.pointerOnFloor(e, this.opts.surfaceY);
    if (this.dragging) {
      if (p) {
        this.dragging.position.set(p.x, this.opts.surfaceY + this.opts.lift, p.z);
        this.opts.onMove?.(this.dragging, p);
      }
      this.stage.canvas.style.cursor = 'grabbing';
      return;
    }
    // hover: resalta y muestra el nombre
    const a = this._pick(e);
    if (a !== this.hovered) {
      this.hovered?.setHighlight(false);
      this.hovered = a;
      a?.setHighlight(true);
    }
    this.stage.canvas.style.cursor = a ? 'grab' : 'default';
    if (a) {
      const pos = this.stage.screenPosOf(a.object3d);
      this.ui.tooltip(this.opts.nameOf?.(a), pos);
    } else this.ui.tooltip(null);
  }

  up(e) {
    if (!this.dragging) return;
    const a = this.dragging;
    this.dragging = null;
    a.setHighlight(false);
    const p = this.stage.pointerOnFloor(e, this.opts.surfaceY) || a.position.clone();
    this.opts.onDrop?.(a, p);
    this.stage.canvas.style.cursor = 'default';
  }
}

// Mueve un objeto suavemente a una posición (para "volver a su lugar").
export function glide(actor, target, scale = 1, seconds = 0.18) {
  const from = actor.position.clone();
  const s0 = actor.object3d.scale.x;
  const t0 = performance.now();
  return new Promise(resolve => {
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      const e = 1 - (1 - k) * (1 - k);
      actor.position.lerpVectors(from, target, e);
      actor.object3d.scale.setScalar(s0 + (scale - s0) * e);
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    step();
  });
}
