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
  // Etapa terremoto: textos cortos (el reloj dura 64 s)
  quake_wake: '*¡Está temblando! Despiertas de golpe.',
  call_dog: '*Tomas a tu madre de la mano. Tu perro no viene...',
  call_mom: '*Cargas a tu perro. Tu madre no te escucha...',
  mom_almost_elevator: '*Tu madre casi entra al ascensor: “¡Por las escaleras, mamá!”',
  mom_in_elevator: '*Tu madre, en pánico, corrió al ascensor.',
  elevator_collapsed: '*¡El ascensor cayó con tu madre dentro! Sigue viva, atrapada.',
  closet_inside: '*Te encierras en el armario. Afuera todo se cae...',
  elevator_inside: '*Entras al ascensor. Las luces parpadean...',
  zero_collapse: '*Se acabó el tiempo. El edificio colapsa.',

  // ---------- ETAPA DESPUÉS ----------
  street_left_behind: '*Afuera llueve. Tus vecinos lloran junto a sus familias. {Dejado} sigue {atrapado} en el edificio.',
  replica_inside: '*Entras solo entre los escombros y encuentras a {dejado}... pero ocurre una réplica.',
  ff_no_supplies: 'Bombero: Me quedé sin suministros y estas personas necesitan atención. ¿Me ayudas con lo que traes?',
  ff_leaves: '*Sin los suministros adecuados, el bombero se lleva en su camión a los heridos que no pudieron ser atendidos a un centro con provisiones, y no puede ayudarte a sacar a {dejado}.',
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
  qte_trapped: '¡Quedaste atrapado!',
  qte_ring: 'toca',
  qte_now: '¡Ahora!',          // mini tutorial del escape: el momento exacto de tocar

  // ---------- INTERFAZ ----------
  prompt: '¿Qué vas a hacer?',
  start: 'Iniciar Partida',
  retry_menu: 'Volver al inicio',

  // Cierre UNGRD (después de un final, al volver al inicio). En <b>…</b> va el título de cada tarjeta.
  // Pendiente: que la UNGRD revise estos textos antes de publicar.
  prepare_title: 'Ahora, prepárate de verdad',
  prepare_sub: 'Lo que hiciste en el juego también lo puedes hacer en tu casa y en tu colegio.',
  prepare_items: [
    '<b>Arma tu maleta de emergencia</b>Agua, linterna, silbato, botiquín, cobija y copias de tus documentos, en un lugar fácil de alcanzar.',
    '<b>Haz tu plan familiar de emergencias</b>Acuerda con tu familia las rutas de evacuación, un punto de encuentro y cómo se van a comunicar.',
    '<b>Participa en los simulacros</b>Practica cómo protegerte y evacuar en tu colegio y en tu casa. Lo que se practica, se recuerda.',
  ],
  prepare_line: 'En caso de emergencia, llama a la línea nacional',
  prepare_next: 'Continuar',
  prepare_credits: 'Seismic Protocol · Una experiencia educativa de la Unidad Nacional para la Gestión del Riesgo de Desastres (UNGRD)<br>Diseño: Juan Fernando Arcos Sánchez y María José Giraldo Bernal',
  retry_section: 'Reintentar: {seccion}',
  complete_selection: 'completar selección',
  endings_unlocked: 'Finales desbloqueados: {n} de {total}',
  pack_warn_title: '¿Estás seguro?',
  pack_warn_text: 'Llevar objetos que no son necesarios, o dejar por fuera objetos importantes, puede traer consecuencias importantes más adelante en la historia.',
  pack_warn_review: 'Revisar la maleta',
  pack_warn_confirm: 'Confirmar de todos modos',
  aid_result_ok: '¡Lo hiciste bien!',
  aid_result_bad: 'No lo hiciste bien',
  aid_result_count: 'Atendiste bien a {n} de {total} personas',
  menu_endings: '{n}/{total}',            // contador del menú (cuadro arriba a la derecha)
  menu_endings_label: 'finales',
  menu_endings_reset: 'Shift + R: borrar finales',   // ayuda visible debajo del cuadro
  menu_endings_all_label: '¡completo!',
  menu_reset_confirm: 'Presiona Shift + R otra vez para borrar los finales desbloqueados',
  menu_reset_done: 'Se borraron los finales desbloqueados',

  // Introducción (después de "Iniciar Partida"). Una pantalla por elemento: text = id del texto,
  // scene = escena visual (js/ui/IntroScenes.js: 'city', 'characters', 'choice' o nada).
  intro_pages: [
    { text: 'intro_1', scene: 'city' },
    { text: 'intro_2', scene: 'characters' },
    { text: 'intro_3', scene: 'choice' },
  ],
  intro_1: 'El 10 de agosto, un fuerte terremoto sacudió a Colombia.\nMiles de familias tuvieron que decidir qué hacer en cuestión de segundos.\nEsta historia es ficticia, pero está basada en lo que se vivió ese día.',
  intro_2: 'Carlos vive con su mamá y su perro en un edificio de apartamentos.\nLa noche anterior, su mamá le pidió algo sencillo: preparar una maleta de emergencia, “por si acaso”.',
  intro_3: 'Seismic Protocol es una experiencia de opción múltiple: en cada momento eliges qué hacer.\nCada decisión cambia la historia, y hay 7 finales posibles.\nPiensa bien… pero no demasiado: en un terremoto, el tiempo corre.',
  intro_opt_take: 'Llevar la maleta',
  intro_opt_leave: 'Dejar la maleta',
  intro_next: 'Continuar',
  intro_start: 'Comenzar',
  intro_skip: 'Saltar introducción',

  // Nombres de las secciones (para el botón de reintentar)
  section_antes: 'antes',
  section_terremoto: 'terremoto',
  section_despues: 'después',

  // ---------- TUTORIALES "¡ATENTO!" ----------
  tut_attention: '¡ATENTO!',
  tut_badge: 'DEMOSTRACIÓN',
  tut_skip: 'Saltar',
  tut_continue: 'Continuar',
  tut_click_next: 'Clic para continuar ▸',
  tut_your_turn: '¡Tu turno!',

  // 1) Al empezar: decisiones en el escenario
  tut_title_choices: 'Así se toman las decisiones',
  tut_choices_1: 'En esta historia tú decides qué hacer, directamente en el escenario.',
  tut_choices_2: 'Cuando aparezca «¿Qué vas a hacer?», pasa el mouse sobre las opciones y haz clic en la que elijas.',
  tut_choices_3: 'Tu personaje hará lo que elegiste. Cada decisión cambia la historia.',
  tut_opt_desk: 'Ordenar el escritorio',
  tut_opt_bed: 'Tender la cama',

  // 2) Maleta de emergencia
  tut_title_packing: 'Así se arma la maleta de emergencia',
  tut_pack_1: 'Arrastra los objetos de la mesa hasta la maleta abierta.',
  tut_pack_2: '¿Te equivocaste? Arrástralo fuera de la maleta para sacarlo.',
  tut_pack_3: 'Cuando estés listo, oprime «completar selección».',

  // 3) Reloj del terremoto
  tut_title_timer: 'El tiempo corre',
  tut_timer_1: 'Cuando aparezca «ESCAPA» empieza a correr un reloj de 1:30, en tiempo real.',
  tut_timer_2: 'El reloj no se detiene mientras lees o decides. Si llega a 0 antes de que salgas, quedarás atrapado.',
  tut_timer_3: 'Aun así, tómate un momento: lee bien las opciones y piensa antes de elegir. Cada decisión cuenta.',

  // 4) Escaleras
  tut_title_qte: 'Así se esquivan los escombros',
  tut_qte_1: 'Mientras bajas, caen escombros desde arriba. Aparecerá un botón «toca».',
  tut_qte_2: 'Oprímelo justo cuando el círculo de afuera se cierre sobre el botón.',
  tut_qte_ok: '¡Así esquivas el escombro!',
  tut_qte_3: 'Si lo oprimes antes o después de tiempo...',
  tut_qte_4: '...el escombro te golpea y avanzas más lento por unos segundos. ¡Y el reloj sigue corriendo!',

  // 5) Ayudar a los heridos
  tut_title_aid: 'Así se ayuda a los heridos',
  tut_aid_1: 'Lee con cuidado lo que le pasa a cada persona.',
  tut_aid_2: 'Arrastra el objeto adecuado hasta la persona que lo necesita.',
  tut_aid_3: 'Si cambias de opinión, llévalo a otra persona o devuélvelo al piso.',
  tut_aid_4: 'Cuando cada persona tenga su objeto, oprime «completar selección». Solo tienes un intento: elige bien.',
  tut_aid_no_items: 'No tienes los objetos adecuados para iniciar el minijuego.',
};
