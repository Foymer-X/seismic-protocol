// ============================================================
//  HISTORIA — el diagrama de flujo convertido en datos
//
//  TIPOS DE NODO
//   menu     → pantalla de inicio.                     { type:'menu', next }
//   card     → tarjeta de capítulo en negro.           { type:'card', style, title, subtitle, next, timer? }
//              style: 'chapter' | 'escape' | 'zero' | 'plain'
//   scene    → ocurre en un plano 3D.                  { type:'scene', plane, place?, show?, hide?, shake?,
//                                                        music?, timer?, actions?, choices? | next }
//   minigame → minijuego.                              { type:'minigame', plane, game, results:{...} }
//   branch   → decide automáticamente según el estado. { type:'branch', cases:[{ if, go }], else }
//   ending   → pantalla final.                         { type:'ending', ending }
//
//  ACCIONES (se ejecutan en orden; las opciones aparecen cuando todas terminan)
//   { say: 'idTexto' }                 diálogo (clic para avanzar)
//   { move: 'hero', to: 'marcador' }   caminar hasta un marcador del plano
//   { move: 'hero', to: '@mom' }       caminar hasta otro personaje (se detiene a un paso de él)
//   { follow: 'mom' } / { unfollow: 'mom' }   el personaje empieza / deja de seguir al protagonista
//                                      (el acompañante elegido sigue al protagonista automáticamente
//                                       en cada plano nuevo; usa follow: false en el nodo para evitarlo)
//   { wait: 1.5 }                      esperar segundos
//   { show: 'mom' } / { hide: 'mom' }  mostrar u ocultar personaje o prop
//   { pose: 'hero', as: 'lying' }      cambiar pose/animación ('idle', 'walk', 'lying', ...)
//   { place: { hero: 'marcador' } }    poner instantáneamente
//   { shake: 0.4 }                     intensidad del temblor (0 = quieto)
//   { sound: 'sfx_collapse' }          sonido del manifiesto
//   { set: s => { ... } }              modificar el estado
//
//  OPCIONES (choices)
//   { label: 'idTexto', at: 'idPropOPersonaje' }   → se hace clic sobre el objeto 3D
//   { label: 'idTexto', ui: { x, y, arrow } }      → botón HTML (coordenadas 1920×1080)
//   if: s => bool        (opcional) solo aparece si se cumple
//   set: s => {...}      (opcional) modifica el estado
//   actions: [...]       (opcional) animaciones antes de continuar
//   go: 'idNodo'
//
//  Personajes dinámicos: '$companion' (a quien llevas) y '$left' (a quien dejaste).
//  timer: 'start' | 'stop' arranca o detiene el reloj.
//  checkpoint: 'antes' | 'terremoto' | 'despues' → inicio de sección (para "Reintentar sección").
// ============================================================
import { bagComplete, canHelp } from '../js/core/GameState.js';

export const STORY = {
  start: 'menu',
  onTimeout: 'zero',   // a dónde ir si el reloj llega a 0

  nodes: {
    // =================== INICIO ===================
    menu: { type: 'menu', next: 'card_antes' },

    // =================== ETAPA ANTES ===================
    card_antes: { type: 'card', style: 'chapter', checkpoint: 'antes', title: 'antes', subtitle: '9 de agosto - 6:00 pm', next: 'room_intro' },

    room_intro: {
      type: 'scene', plane: 'room', music: 'music_antes', shake: 0,
      place: { hero: 'center' },
      actions: [
        { wait: 0.6 },
        { show: 'mom' },
        { move: 'mom', to: 'momStand' },
        { say: 'mom_reminder' },
        { move: 'mom', to: 'exit' },
        { hide: 'mom' },
      ],
      choices: [
        { label: 'opt_make_bag', at: 'desk',
          actions: [{ move: 'hero', to: 'desk' }],
          go: 'packing' },
        { label: 'opt_sleep', at: 'bed',
          set: s => { s.bag.made = false; },
          actions: [{ move: 'hero', to: 'bed' }],
          go: 'sleep' },
      ],
    },

    packing: {
      type: 'minigame', plane: 'packing', game: 'packing',
      results: { done: 'room_after_pack' },
    },

    room_after_pack: {
      type: 'scene', plane: 'room',
      place: { hero: 'desk' },
      actions: [{ wait: 0.4 }, { move: 'hero', to: 'bed' }],
      next: 'sleep',
    },

    sleep: {
      type: 'scene', plane: 'room',
      actions: [
        { place: { hero: 'bedTop' } },
        { pose: 'hero', as: 'lying' },
        { say: 'hero_sleep' },
        { wait: 0.8 },
      ],
      next: 'card_terremoto',
    },

    // =================== ETAPA TERREMOTO ===================
    card_terremoto: { type: 'card', style: 'chapter', checkpoint: 'terremoto', title: 'TERREMOTO', subtitle: '10 de agosto - 7:34 am', next: 'card_escapa' },
    card_escapa:    { type: 'card', style: 'escape', title: 'ESCAPA', timer: 'start', next: 'room_quake' },

    room_quake: {
      type: 'scene', plane: 'room', music: 'music_terremoto', shake: 0.35,
      actions: [
        { sound: 'sfx_quake' },
        { place: { hero: 'bed' } },
        { pose: 'hero', as: 'idle' },
        { say: 'quake_wake' },
      ],
      choices: [
        { label: 'opt_grab_bag', at: 'bag',
          if: s => s.bag.made,
          set: s => { s.bag.taken = true; s.decisions.quake = 'escape'; },
          actions: [{ move: 'hero', to: 'desk' }, { hide: 'bag' }, { move: 'hero', to: 'exit' }],
          go: 'living' },
        { label: 'opt_escape', ui: { x: 960, y: 900, arrow: 'down' },
          set: s => { s.decisions.quake = 'escape'; },
          actions: [{ move: 'hero', to: 'exit' }],
          go: 'living' },
        { label: 'opt_closet', at: 'closet',
          set: s => { s.decisions.quake = 'closet'; },
          actions: [{ move: 'hero', to: 'closet' }],
          go: 'closet_hide' },
      ],
    },

    closet_hide: {
      type: 'scene', plane: 'closet', timer: 'stop', shake: 0.5,
      actions: [{ say: 'closet_inside' }, { shake: 1 }, { sound: 'sfx_collapse' }, { wait: 1.5 }],
      next: 'end_escondite',
    },

    living: {
      type: 'scene', plane: 'living', shake: 0.3,
      place: { hero: 'fromRoom' },
      actions: [{ move: 'hero', to: 'center' }],
      choices: [
        { label: 'opt_take_mom', at: 'mom',
          set: s => { s.companion = 'madre'; s.decisions.hall = 'stairs'; },
          actions: [
            { move: 'hero', to: '@mom' },
            { say: 'call_dog' },
            { follow: 'mom' },
            { move: 'hero', to: 'exit' },
          ],
          go: 'hall_mom' },
        { label: 'opt_take_dog', at: 'dog',
          set: s => { s.companion = 'perro'; },
          actions: [
            { move: 'hero', to: '@dog' },
            { say: 'call_mom' },
            { follow: 'dog' },
            { move: 'hero', to: 'exit' },
          ],
          go: 'hall_dog' },
      ],
    },

    // Ruta MADRE: no hay elección; ella casi entra al ascensor, la ayudas y bajan por las escaleras.
    hall_mom: {
      type: 'scene', plane: 'hall', shake: 0.3,
      place: { hero: 'entry' },
      actions: [
        { move: 'hero', to: 'start' },
        { unfollow: 'mom' },
        { move: 'mom', to: 'elevatorNear' },
        { move: 'hero', to: '@mom' },
        { say: 'mom_almost_elevator' },
        { follow: 'mom' },
        { move: 'hero', to: 'stairs' },
        { move: 'hero', to: 'stairsIn' },
        { wait: 0.4 },
      ],
      next: 'qte',
    },

    // Ruta PERRO: la madre corre sola al ascensor y tú decides.
    hall_dog: {
      type: 'scene', plane: 'hall', shake: 0.3,
      place: { hero: 'entry', mom: 'start' }, show: ['mom'],
      actions: [
        { move: 'mom', to: 'elevator' },
        { move: 'mom', to: 'elevatorIn' },
        { move: 'hero', to: 'start' },
        { say: 'mom_in_elevator' },
      ],
      choices: [
        { label: 'opt_elevator', at: 'elevator',
          set: s => { s.decisions.hall = 'elevator'; },
          actions: [{ move: 'hero', to: 'elevator' }, { move: 'hero', to: 'elevatorIn' }, { wait: 0.4 }],
          go: 'elevator_death' },
        { label: 'opt_stairs', at: 'stairs',
          set: s => { s.decisions.hall = 'stairs'; },
          actions: [{ move: 'hero', to: 'stairs' }],
          go: 'hall_dog_collapse' },
      ],
    },

    hall_dog_collapse: {
      type: 'scene', plane: 'hall',
      actions: [
        { shake: 1 }, { sound: 'sfx_collapse' },
        { hide: ['mom', 'elevator'] }, { show: 'shaft' },
        { wait: 0.8 }, { shake: 0.3 },
        { say: 'elevator_collapsed' },
        { move: 'hero', to: 'stairsIn' },
        { wait: 0.4 },
      ],
      next: 'qte',
    },

    elevator_death: {
      type: 'scene', plane: 'elevator', timer: 'stop', shake: 0.4, follow: false,
      actions: [{ say: 'elevator_inside' }, { shake: 1.2 }, { sound: 'sfx_collapse' }, { wait: 1.5 }],
      next: 'end_ascensor',
    },

    // Minijuego de escape: varios pisos de escaleras + pasillo, en una sola secuencia. Usa el mismo reloj.
    qte: {
      type: 'minigame', plane: 'building', game: 'qte', shake: 0.25,
      results: { escaped: 'card_despues' },
    },

    // Se acabó el tiempo (en cualquier momento de la etapa terremoto).
    zero: {
      type: 'card', style: 'zero', title: '0', sound: 'sfx_collapse',
      set: s => { s.timedOut = true; },
      next: 'zero_branch',
    },
    zero_branch: {
      type: 'branch',
      cases: [{ if: s => bagComplete(s), go: 'end_rescatado' }],
      else: 'end_escombros',
    },

    // =================== ETAPA DESPUÉS ===================
    card_despues: { type: 'card', style: 'chapter', checkpoint: 'despues', title: 'después...', subtitle: '10 de agosto - 8:00 am', timer: 'stop', next: 'street' },

    street: {
      type: 'scene', plane: 'street', music: 'music_despues', shake: 0,
      place: { hero: 'start' },
      actions: [{ sound: 'sfx_rain' }, { wait: 0.8 }, { say: 'street_left_behind' }],
      choices: [
        { label: 'opt_search', at: 'rubble',
          set: s => { s.decisions.street = 'reenter'; },
          actions: [{ unfollow: '$companion' }, { move: 'hero', to: 'rubble' }],
          go: 'replica' },
        { label: 'opt_help', ui: { x: 1700, y: 760, arrow: 'right' },
          set: s => { s.decisions.street = 'help'; },
          actions: [{ move: 'hero', to: 'help' }],
          go: 'firefighter' },
      ],
    },

    replica: {
      type: 'scene', plane: 'rubble_inside', follow: false,
      place: { hero: 'entry', $left: 'trapped' }, show: ['$left'],
      actions: [
        { move: 'hero', to: 'hero' },
        { say: 'replica_inside' },
        { shake: 1.2 }, { sound: 'sfx_collapse' }, { wait: 1.6 },
      ],
      next: 'end_replica',
    },

    firefighter: {
      type: 'scene', plane: 'street_ff',
      place: { hero: 'enter', $companion: 'enterB' },
      actions: [
        { move: 'hero', to: 'hero' },
        { say: 'ff_no_supplies' },
      ],
      next: 'ff_branch',
    },

    ff_branch: {
      type: 'branch',
      cases: [{ if: s => canHelp(s), go: 'aid' }],
      else: 'ff_leave_blocked',
    },

    aid: {
      type: 'minigame', plane: 'aid', game: 'aid',
      place: { hero: 'hero', $companion: 'heroB' },
      results: { success: 'ff_thanks', fail: 'ff_leave' },
    },

    ff_leave_blocked: {
      type: 'scene', plane: 'street_ff',
      actions: [{ set: s => { s.decisions.aid = 'blocked'; } }],
      next: 'ff_leave',
    },

    ff_leave: {
      type: 'scene', plane: 'street_ff',
      place: { hero: 'hero', $companion: 'heroB' },
      actions: [
        { move: ['firefighter', 'injured1', 'injured2', 'injured3', 'injured4'], to: 'away' },
        { hide: ['firefighter', 'injured1', 'injured2', 'injured3', 'injured4', 'truck'] },
        { say: 'ff_leaves' },
      ],
      next: 'end_neutral',
    },

    ff_thanks: {
      type: 'scene', plane: 'street_ff',
      place: { hero: 'hero', $companion: 'heroB' },
      actions: [{ say: 'ff_thanks' }],
      next: 'card_horas',
    },

    card_horas: { type: 'card', style: 'plain', title: 'horas después...', next: 'end_bueno' },

    // =================== FINALES ===================
    end_escondite: { type: 'ending', ending: 'escondite' },
    end_ascensor:  { type: 'ending', ending: 'ascensor' },
    end_escombros: { type: 'ending', ending: 'escombros' },
    end_rescatado: { type: 'ending', ending: 'rescatado' },
    end_replica:   { type: 'ending', ending: 'replica' },
    end_neutral:   { type: 'ending', ending: 'neutral' },
    end_bueno:     { type: 'ending', ending: 'bueno' },

    // =================== EJEMPLOS DE ASSETS (solo modo de prueba: tecla E) ===================
    ejemplos: {
      type: 'scene', plane: 'ejemplos', shake: 0, prompt: '',
      actions: [
        { move: 'demo_sheet', to: 'aEnd' }, { move: 'demo_sheet', to: 'a' },
        { move: 'demo_video', to: 'cEnd' }, { move: 'demo_video', to: 'c' },
      ],
      choices: [
        { label: 'Volver al menú', ui: { x: 960, y: 980 }, go: 'menu' },
      ],
    },
  },
};
