// SONIDO: música, ambiente (temblor, lluvia) y efectos, con Web Audio.
// - Los archivos y volúmenes están en data/assets.js (sección AUDIO). Se generan con tools/sonido.py.
// - music(key): cambia la música con un fundido cruzado. Las músicas se repiten sin corte (loopLength).
// - play(key): efecto suelto, o sonido en bucle si el asset tiene loop: true (temblor, lluvia).
// - El botón de sonido (y la tecla M) silencia todo; la preferencia se recuerda en este navegador.
// Los navegadores no dejan sonar nada hasta el primer clic o tecla: se activa solo en ese momento.
const MUTE_KEY = 'seismic.muted';

export class AudioManager {
  constructor(assets) {
    this.assets = assets;
    this.buffers = new Map();
    this.loops = new Map();        // key → { src, gain }
    this.currentMusic = null;
    this.musicVoice = null;        // { key, gain, sources: [], next, timer }
    this.shake = 0;
    this.muted = false;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* sin almacenamiento */ }
    this.listeners = new Set();

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.ctx = null; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.groups = {};
    for (const g of ['music', 'amb', 'sfx']) {
      this.groups[g] = this.ctx.createGain();
      this.groups[g].connect(this.master);
    }
    // decodifica todo en segundo plano
    this.ready = Promise.all([...(assets.audio || new Map()).entries()].map(async ([key, a]) => {
      try { this.buffers.set(key, await this.ctx.decodeAudioData(a.data.slice(0))); }
      catch (err) { console.warn(`[Audio] No se pudo decodificar "${key}"`, err); }
    })).then(() => { if (this.pendingMusic) { const k = this.pendingMusic; this.pendingMusic = null; this.currentMusic = null; this.music(k); } });

    // activar el audio con el primer gesto
    const unlock = () => {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (this.ctx.state === 'running') { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  def(key) { return this.assets.manifest?.[key] || this.assets.sound(key)?.def || {}; }

  // ---------- efectos ----------
  play(key) {
    if (!this.ctx) return;
    const d = this.def(key);
    if (d.loop && d.group === 'amb') return this.startLoop(key);
    const buf = this.buffers.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (d.vary) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * d.vary;
    const g = this.ctx.createGain();
    g.gain.value = d.volume ?? 1;
    src.connect(g).connect(this.groups[d.group === 'music' ? 'music' : 'sfx']);
    src.start();
  }

  // ---------- ambiente en bucle (temblor, lluvia) ----------
  startLoop(key) {
    if (this.loops.has(key)) return;
    const buf = this.buffers.get(key), d = this.def(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.loopStart = 0.03; src.loopEnd = buf.duration - 0.03;      // evita el silencio que agrega el formato mp3
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this._loopTarget(key, d), now + 0.6);
    src.connect(g).connect(this.groups.amb);
    src.start(now, 0.03);
    this.loops.set(key, { src, gain: g, def: d });
  }

  stop(key, fade = 0.8) {
    const l = this.loops.get(key);
    if (!l) return;
    this._fadeOut(l.gain, fade, [l.src]);
    this.loops.delete(key);
  }

  _loopTarget(key, d) {
    const v = d.volume ?? 1;
    return d.followShake ? v * Math.min(1, this.shake / 0.45) : v;
  }

  // El temblor suena según la sacudida de la cámara (Stage.shake). Se llama en cada cuadro.
  setShake(v) {
    if (!this.ctx || Math.abs(v - this.shake) < 0.01) return;
    this.shake = v;
    for (const [key, l] of this.loops) if (l.def.followShake) l.gain.gain.setTargetAtTime(this._loopTarget(key, l.def), this.ctx.currentTime, 0.25);
  }

  // ---------- música ----------
  // Cambia la música de fondo (null = silencio). También detiene los sonidos en bucle (temblor, lluvia).
  music(key) {
    if (this.currentMusic === key) return;
    this._stopAmb();
    this._stopMusic(2.0);                  // la canción anterior se apaga con un fundido (no se corta)
    this.currentMusic = key;
    if (!key || !this.ctx) return;
    if (!this.buffers.has(key)) { this.pendingMusic = key; return; }
    const d = this.def(key), buf = this.buffers.get(key);
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    // las canciones con inicio marcado (sin bucle, sincronizadas con el reloj) entran de una vez
    gain.gain.linearRampToValueAtTime(d.volume ?? 1, now + (d.loop === false ? 0.02 : 1.2));
    gain.connect(this.groups.music);
    const voice = { key, gain, sources: [], next: now + 0.02 };
    const L = d.loopLength || buf.duration;
    const schedule = () => {
      // programa la siguiente vuelta un poco antes de que termine la actual (el eco se superpone: sin corte)
      while (voice.next < this.ctx.currentTime + 1.5 && !voice.done) {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.start(Math.max(voice.next, this.ctx.currentTime));
        voice.sources.push(src);
        src.onended = () => { voice.sources = voice.sources.filter(s => s !== src); };
        voice.next += L;
        if (d.loop === false) voice.done = true;     // canción que suena una sola vez (terremoto)
      }
    };
    schedule();
    voice.timer = setInterval(schedule, 500);
    this.musicVoice = voice;
  }

  _stopMusic(fade) {
    const v = this.musicVoice;
    if (!v) return;
    clearInterval(v.timer);
    this._fadeOut(v.gain, fade, v.sources);
    this.musicVoice = null;
  }

  _stopAmb() { for (const k of [...this.loops.keys()]) this.stop(k); }

  stopLoops() {
    this._stopAmb();
    this._stopMusic(2.0);
    this.currentMusic = null;
    this.pendingMusic = null;
  }

  _fadeOut(gainNode, fade, sources) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, g = gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
    for (const s of sources) { try { s.stop(now + fade + 0.05); } catch { /* ya detenido */ } }
    setTimeout(() => gainNode.disconnect(), (fade + 0.3) * 1000);
  }

  // ---------- silencio ----------
  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* sin almacenamiento */ }
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.08);
      if (!this.muted) this.ctx.resume().catch(() => {});
    }
    for (const fn of this.listeners) fn(this.muted);
  }

  toggleMuted() { this.setMuted(!this.muted); return this.muted; }
  onMuteChange(fn) { this.listeners.add(fn); fn(this.muted); }
}
