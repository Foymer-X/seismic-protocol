// ============================================================
//  RETROALIMENTACIÓN DE LAS PANTALLAS FINALES
//  Cada regla se evalúa al llegar a un final. Si "when" devuelve true,
//  aparece una línea con su ícono: ok:true (bien) u ok:false (mal).
//  text puede ser un texto o una función que recibe el estado.
// ============================================================
import { uselessInBag, missingUseful, hasBag } from '../js/core/GameState.js';

const list = arr => arr.map(i => i.name.toLowerCase()).join(', ');

export const FEEDBACK_RULES = [
  // ---------- MALETA ----------
  { id: 'no_bag_made', ok: false, icon: null,
    when: s => !s.bag.made,
    text: 'No hiciste la maleta de emergencia. Tenerla lista con anticipación puede salvarte la vida.' },

  { id: 'bag_not_taken', ok: false, icon: null,
    when: s => s.bag.made && !s.bag.taken && s.decisions.quake === 'escape',
    text: 'Hiciste la maleta, pero no la llevaste al salir. Guárdala en un lugar visible y cerca de la salida.' },

  { id: 'useless_items', ok: false, icon: null,
    when: s => s.bag.made && uselessInBag(s).length > 0,
    text: s => `Metiste objetos inútiles: ${list(uselessInBag(s))}. Ocupan espacio que necesitas para suministros.` },

  { id: 'missing_useful', ok: false, icon: null,
    when: s => s.bag.made && missingUseful(s).length > 0,
    text: s => `Te faltaron objetos útiles: ${list(missingUseful(s))}.` },

  { id: 'bag_complete', ok: true, icon: null,
    when: s => s.bag.made && missingUseful(s).length === 0 && uselessInBag(s).length === 0,
    text: 'Tu maleta de emergencia estaba completa: solo objetos útiles.' },

  // ---------- TERREMOTO ----------
  { id: 'closet', ok: false, icon: null,
    when: s => s.decisions.quake === 'closet',
    text: 'Te encerraste en el armario: un lugar cerrado donde nadie puede encontrarte.' },

  { id: 'escaped_room', ok: true, icon: null,
    when: s => s.decisions.quake === 'escape',
    text: 'No te encerraste: buscaste la salida.' },

  { id: 'helped_mom', ok: true, icon: null,
    when: s => s.companion === 'madre',
    text: 'Tomaste de la mano a tu madre y evitaste que entrara al ascensor por el pánico.' },

  { id: 'elevator', ok: false, icon: null,
    when: s => s.decisions.hall === 'elevator',
    text: 'Entraste al ascensor. En un sismo los ascensores pueden atascarse o desplomarse.' },

  { id: 'stairs', ok: true, icon: null,
    when: s => s.decisions.hall === 'stairs',
    text: 'Bajaste por las escaleras: la ruta de evacuación segura.' },

  { id: 'qte_good', ok: true, icon: null,
    when: s => !s.timedOut && s.decisions.hall === 'stairs' && s.qteFails === 0 && s.decisions.street,
    text: 'Esquivaste todos los escombros mientras bajabas.' },

  { id: 'qte_hits', ok: false, icon: null,
    when: s => s.qteFails > 0,
    text: s => s.qteFails === 1
      ? 'Te golpeó un escombro mientras escapabas y perdiste tiempo.'
      : `Te golpearon ${s.qteFails} escombros mientras escapabas y perdiste tiempo.` },

  { id: 'timeout', ok: false, icon: null,
    when: s => s.timedOut,
    text: 'No alcanzaste a salir del edificio a tiempo.' },

  // ---------- DESPUÉS ----------
  { id: 'reenter', ok: false, icon: null,
    when: s => s.decisions.street === 'reenter',
    text: 'Volviste a entrar solo a un edificio dañado. Las réplicas pueden derrumbarlo.' },

  { id: 'sought_help', ok: true, icon: null,
    when: s => s.decisions.street === 'help',
    text: 'Buscaste ayuda de un rescatista en lugar de arriesgarte solo.' },

  { id: 'aid_blocked', ok: false, icon: null,
    when: s => s.decisions.aid === 'blocked',
    text: s => !hasBag(s)
      ? 'No tenías tu maleta de emergencia para ayudar a los heridos.'
      : uselessInBag(s).length
        ? 'Llevabas objetos inútiles en la maleta y no tenías espacio para lo que los heridos necesitaban.'
        : 'Tu maleta no tenía los suministros que necesitaban los heridos.' },

  { id: 'aid_fail', ok: false, icon: null,
    when: s => s.decisions.aid === 'fail',
    text: 'No le diste a cada herido el objeto que necesitaba.' },

  { id: 'aid_success', ok: true, icon: null,
    when: s => s.decisions.aid === 'success',
    text: 'Atendiste correctamente a los cuatro heridos.' },
];
