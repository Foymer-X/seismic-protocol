// ============================================================
//  OBJETOS DEL MINIJUEGO DE LA MALETA
//  useful: true  → objeto útil (la maleta completa necesita TODOS los útiles)
//  useful: false → objeto inútil (con uno solo, no puedes jugar el minijuego del bombero)
//  icon: ruta a una imagen (PNG/SVG). Si es null se dibuja un marcador provisional.
//  why: explicación que aparece en la pantalla final.
// ============================================================

export const ITEMS = [
  // ---------- ÚTILES ----------
  { id: 'agua',        name: 'Agua',        useful: true,  icon: null, why: 'Sin agua no resistes mucho tiempo atrapado o esperando ayuda.' },
  { id: 'cobija',      name: 'Cobija',      useful: true,  icon: null, why: 'Te protege del frío y la lluvia y ayuda a evitar la hipotermia.' },
  { id: 'torniquete',  name: 'Torniquete',  useful: true,  icon: null, why: 'Sirve para detener un sangrado abundante en brazos o piernas que no para con presión.' },
  { id: 'vendajes',    name: 'Vendajes',    useful: true,  icon: null, why: 'Cubren y protegen heridas para que no queden expuestas.' },
  { id: 'silbato',     name: 'Silbato',     useful: true,  icon: null, why: 'Permite pedir ayuda sin gastar la voz si quedas atrapado.' },
  { id: 'linterna',    name: 'Linterna',    useful: true,  icon: null, why: 'Después de un sismo suele faltar la luz eléctrica.' },
  { id: 'medicamentos',name: 'Medicamentos',useful: true,  icon: null, why: 'Los tratamientos de tu familia no pueden interrumpirse en una emergencia.' },

  // ---------- INÚTILES ----------
  { id: 'control',     name: 'Control de Play',  useful: false, icon: null, why: 'No sirve en una emergencia y ocupa espacio.' },
  { id: 'guayos',      name: 'Guayos de fútbol', useful: false, icon: null, why: 'Ocupan espacio y pesan; no ayudan a sobrevivir.' },
  { id: 'balon',       name: 'Balón de fútbol',  useful: false, icon: null, why: 'Ocupa espacio que necesitas para suministros.' },
  { id: 'album',       name: 'Álbum de fotos',   useful: false, icon: null, why: 'Tiene valor sentimental, pero no te ayuda a sobrevivir.' },
  { id: 'telefono',    name: 'Teléfono viejo',   useful: false, icon: null, why: 'Un teléfono sin uso no te sirve; lo importante es tu celular cargado.' },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
