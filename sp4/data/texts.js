// ============================================================
//  TEXTOS DE LA HISTORIA (diálogos, narración, etiquetas)
//  Tokens que se reemplazan automáticamente:
//    {dejado}      → "tu madre" / "tu perro"  (a quien dejaste atrás)
//    {Dejado}      → igual, con mayúscula inicial
//    {acompanante} → a quien llevas contigo
//    {atrapado}    → "atrapada" (madre) / "atrapado" (perro)
//  "Nombre: texto" muestra el nombre de quien habla resaltado.
//  Un texto que empieza por "*" se muestra como narración (cursiva).
// ============================================================

export const TEXTS = {
  // ---------- ETAPA ANTES ----------
  mom_reminder: 'Mamá: Hijo, recuerda hacer la MALETA DE EMERGENCIA que llevo días pidiéndote. Uno nunca sabe cuándo la va a necesitar.',
  hero_sleep: '*Te acuestas a dormir.',

  // ---------- ETAPA TERREMOTO ----------
  quake_wake: '*¡Está temblando! Te despiertas de golpe y todo a tu alrededor se sacude.',
  call_dog: '*Tomas de la mano a tu madre y tratas de llamar a tu perro, pero no viene...',
  call_mom: '*Cargas a tu perro y llamas a tu madre, pero ella está en pánico y no te escucha...',
  mom_almost_elevator: '*Tu madre, en pánico, estuvo a punto de entrar al ascensor. La sujetaste a tiempo: “¡Por las escaleras, mamá!”',
  mom_in_elevator: '*Tu madre, presa del pánico, corrió al ascensor antes de que pudieras detenerla.',
  elevator_collapsed: '*El ascensor se desplomó con tu madre dentro. Sigue con vida, atrapada entre los escombros.',
  closet_inside: '*Te encierras en el armario. Afuera todo cruje y se cae...',
  elevator_inside: '*Entras a la cabina con tu madre. Las luces parpadean y el ascensor se sacude...',
  zero_collapse: '*Se acabó el tiempo. El edificio colapsa.',

  // ---------- ETAPA DESPUÉS ----------
  street_left_behind: '*Afuera llueve. Tus vecinos lloran junto a sus familias. {Dejado} sigue {atrapado} en el edificio.',
  replica_inside: '*Entras solo entre los escombros y encuentras a {dejado}... pero ocurre una réplica.',
  ff_no_supplies: 'Bombero: Me quedé sin suministros y estas personas necesitan atención. ¿Me ayudas con lo que traes?',
  ff_leaves: '*Sin los suministros adecuados, el bombero debe llevar a los heridos a urgencias y no puede ayudarte a sacar a {dejado}.',
  ff_thanks: 'Bombero: ¡Gracias! Ellos ya están a salvo. Ahora vamos por {dejado}.',

  // ---------- ETIQUETAS DE OPCIONES ----------
  opt_make_bag: 'Realizar maleta de emergencia',
  opt_sleep: 'Ir a dormir',
  opt_grab_bag: 'Agarrar maleta',
  opt_escape: 'ESCAPAR',
  opt_closet: 'Esconderse en el armario',
  opt_take_mom: 'Llevar a tu madre',
  opt_take_dog: 'Llevar a tu perro',
  opt_elevator: 'Ir por tu madre al ascensor',
  opt_stairs: 'Bajar por las escaleras',
  opt_search: 'Buscar a {dejado}',
  opt_help: 'Buscar ayuda',

  // ---------- MINIJUEGOS ----------
  packing_title: 'Realiza la maleta de emergencia',
  packing_hint: 'Arrastra los objetos a la maleta. Para sacar uno, arrástralo fuera.',
  packing_counter: 'Objetos en la maleta: {n}',
  aid_title: 'Asigna el objeto que necesite cada persona',
  aid_hint: 'Arrastra cada objeto de tu maleta hasta la persona que lo necesita.',
  qte_title: 'Toca en el momento indicado',
  qte_hit: '¡Bien!',
  qte_miss: '¡Te golpeaste!',
  qte_ring: 'toca',

  // ---------- INTERFAZ ----------
  prompt: '¿Qué vas a hacer?',
  start: 'Iniciar Partida',
  retry_menu: 'Volver al inicio',
  retry_section: 'Reintentar: {seccion}',
  complete_selection: 'completar selección',
  endings_unlocked: 'Finales desbloqueados: {n} de {total}',

  // Nombres de las secciones (para el botón de reintentar)
  section_antes: 'antes',
  section_terremoto: 'terremoto',
  section_despues: 'después',
};
