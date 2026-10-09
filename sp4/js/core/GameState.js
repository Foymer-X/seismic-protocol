// Estado de una partida: todas las decisiones que afectan los finales.
import { ITEMS, ITEM_BY_ID } from '../../data/items.js';
import { AID_REQUIRED_ITEMS } from '../../data/injured.js';

export function createState() {
  return {
    bag: {
      made: false,     // ¿hizo la maleta en la etapa "antes"?
      items: [],       // ids de objetos metidos
      taken: false,    // ¿la agarró al salir de la habitación?
    },
    companion: null,   // 'madre' | 'perro'  (a quién se llevó)
    decisions: {
      quake: null,     // 'escape' | 'closet'
      hall: null,      // 'stairs' | 'elevator'  (solo ruta del perro; con la madre siempre 'stairs')
      street: null,    // 'reenter' | 'help'
      aid: null,       // 'success' | 'fail' | 'blocked'
    },
    timedOut: false,   // el reloj llegó a 0
    qteFails: 0,
    ending: null,
  };
}

// ---------- Consultas sobre el estado (se usan en story.js y feedback.js) ----------

export const hasBag = s => s.bag.made && s.bag.taken;

export const uselessInBag = s => s.bag.items.map(id => ITEM_BY_ID[id]).filter(i => i && !i.useful);

export const missingUseful = s => ITEMS.filter(i => i.useful && !s.bag.items.includes(i.id));

// Maleta completa: todos los útiles, ningún inútil, y la llevas contigo.
export const bagComplete = s => hasBag(s) && missingUseful(s).length === 0 && uselessInBag(s).length === 0;

// Puede jugar el minijuego del bombero: lleva maleta, sin inútiles y con los 4 objetos de los heridos.
export const canHelp = s =>
  hasBag(s) && uselessInBag(s).length === 0 && AID_REQUIRED_ITEMS.every(id => s.bag.items.includes(id));

// Nombres para los textos dinámicos.
export const companionName = s => (s.companion === 'madre' ? 'tu madre' : 'tu perro');
export const leftBehindName = s => (s.companion === 'madre' ? 'tu perro' : 'tu madre');
export const leftBehindId = s => (s.companion === 'madre' ? 'dog' : 'mom');
export const companionId = s => (s.companion === 'madre' ? 'mom' : 'dog');
