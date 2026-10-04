// Reloj de la etapa TERREMOTO. Corre en tiempo real (no se pausa con diálogos ni fundidos).
export class Timer {
  constructor() {
    this.running = false;
    this.endAt = 0;
    this.remaining = 0;
    this.onTick = () => {};
    this.onZero = () => {};
  }

  start(seconds) {
    this.running = true;
    this.endAt = performance.now() + seconds * 1000;
    this.remaining = seconds;
    this.onTick(this.remaining);
  }

  stop() { this.running = false; }

  // Para pruebas: fija los segundos restantes.
  set(seconds) {
    if (!this.running) return;
    this.endAt = performance.now() + seconds * 1000;
  }

  update() {
    if (!this.running) return;
    this.remaining = Math.max(0, (this.endAt - performance.now()) / 1000);
    this.onTick(this.remaining);
    if (this.remaining <= 0) {
      this.running = false;
      this.onZero();
    }
  }
}

export function formatTime(sec) {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
