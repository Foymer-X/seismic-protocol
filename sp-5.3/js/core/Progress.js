// Contador de finales desbloqueados. Se guarda en el navegador si CONFIG.rememberEndings es true.
import { CONFIG } from '../config.js';

const KEY = 'seismic-protocol:finales';

export class Progress {
  constructor(total, ids = null) {
    this.total = total;
    this.ids = ids ? new Set(ids) : null;   // solo cuentan los finales que existen
    this.unlocked = new Set();
    if (CONFIG.rememberEndings) {
      try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach(id => this.unlocked.add(id)); }
      catch { /* sin almacenamiento disponible: se cuenta solo en esta sesión */ }
    }
  }

  unlock(id) {
    this.unlocked.add(id);
    if (CONFIG.rememberEndings) {
      try { localStorage.setItem(KEY, JSON.stringify([...this.unlocked])); } catch { /* ignorar */ }
    }
  }

  get count() { return this.ids ? [...this.unlocked].filter(id => this.ids.has(id)).length : this.unlocked.size; }

  // Para pruebas: borra el progreso.
  reset() {
    this.unlocked.clear();
    try { localStorage.removeItem(KEY); } catch { /* ignorar */ }
  }
}
