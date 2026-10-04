// Reproduce los sonidos del manifiesto. Si un sonido no tiene archivo, simplemente no suena.
export class AudioManager {
  constructor(assets) {
    this.assets = assets;
    this.currentMusic = null;
    this.loops = new Set();
  }

  play(key) {
    const el = this.assets.sound(key);
    if (!el) return;
    if (el.loop) {
      this.loops.add(el);
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      const c = el.cloneNode();
      c.volume = el.volume;
      c.play().catch(() => {});
    }
  }

  // Cambia la música de fondo (null = silencio). También detiene sonidos en bucle.
  music(key) {
    if (this.currentMusic === key) return;
    this.stopLoops();
    this.currentMusic = key;
    if (key) this.play(key);
  }

  stopLoops() {
    for (const el of this.loops) { el.pause(); }
    this.loops.clear();
    this.currentMusic = null;
  }
}
