// ============================================================
//  MANIFIESTO DE RECURSOS — aquí se cambian los assets
//
//  Si "src" es null se dibuja un MARCADOR PROVISIONAL (caja o tarjeta).
//  Para usar el arte real, copia el archivo en assets/ y pon su ruta.
//  En el plano de ejemplos (modo prueba, tecla E) puedes ver cada tipo funcionando
//  con los archivos de assets/ejemplos/.
//
//  ── MODELOS 3D (.glb) ─────────────────────────────────────────
//   { type: 'model', src: 'assets/models/cama.glb',
//     scale: 1, rotationY: 0, position: [0,0,0],
//     castShadow: false, receiveShadow: false,
//     lightScale: 1 }            ← multiplica la intensidad de las luces que traiga el .glb
//   Las luces exportadas desde Blender (Point, Spot, Sun) se importan solas.
//   Para usarlas sin las luces provisionales, pon lights: 'model' en el plano (data/planes.js).
//
//  ── SPRITES 2D (personajes y props planos, estilo Paper Mario) ──
//   Imagen fija:      { type: 'sprite', src: 'assets/sprites/perro.png', height: 0.8 }
//   Hoja de sprites:  { type: 'sprite', src: 'assets/sprites/nino.png', height: 1.6,
//                       sheet: { cols: 4, rows: 3, anims: {
//                         idle: { row: 0, frames: 4, fps: 6 },
//                         walk: { row: 1, frames: 4, fps: 10 },
//                         lying:{ row: 2, frames: 1, fps: 1 } } } }   (filas contadas desde arriba)
//   Cuadros sueltos:  { type: 'sprite', height: 1.6, anims: {
//                         idle: { frames: 'assets/sprites/nino/idle_{i}.png', count: 4, fps: 6 },
//                         walk: { frames: 'assets/sprites/nino/walk_{i}.png', count: 8, fps: 10 } } }
//                       ({i} va de 1 a count; usa pad: 2 para 01, 02… y start: 0 para empezar en 0)
//   Video con alfa:   { type: 'sprite', height: 1.6, anims: {
//                         idle: { video: 'assets/sprites/nino/idle.webm' },
//                         walk: { video: 'assets/sprites/nino/walk.webm' } } }
//                       (WebM VP9 con transparencia: funciona en Chrome, Edge y Firefox de escritorio)
//   Un GIF no se puede usar directo: conviértelo a hoja de sprites, cuadros PNG o WebM.
//   Animaciones que usa el motor: idle, walk, lying (acostado). Las imágenes miran a la DERECHA.
//
//  ── FONDOS / ILUMINACIÓN HDRI ──────────────────────────────────
//   { type: 'environment', src: 'assets/hdri/calle.hdr' }   (.hdr, o .jpg/.png panorámico 2:1)
//   Se conecta en el plano: environment: { asset: 'env_street', background: true, lighting: true }
//
//  ── AUDIO ──────────────────────────────────────────────────────
//   { type: 'audio', src: 'assets/audio/colapso.mp3', volume: 1, loop: false }
// ============================================================

export const ASSETS = {
  // ---------- PERSONAJES (sprites 2D) ----------
  hero:        { type: 'sprite', src: null, height: 1.6, color: '#f2f2f2', label: 'Protagonista' },
  mom:         { type: 'sprite', src: null, height: 1.75, color: '#f5d0e0', label: 'Mamá' },
  dog:         { type: 'sprite', src: null, height: 0.8, color: '#f5e6c8', label: 'Perro' },
  firefighter: { type: 'sprite', src: null, height: 1.8, color: '#ffb199', label: 'Bombero' },
  injured1:    { type: 'sprite', src: null, height: 1.65, color: '#d9e4ff', label: 'Herido 1' },
  injured2:    { type: 'sprite', src: null, height: 1.65, color: '#d9e4ff', label: 'Herido 2' },
  injured3:    { type: 'sprite', src: null, height: 1.7, color: '#d9e4ff', label: 'Rescatista' },
  injured4:    { type: 'sprite', src: null, height: 1.65, color: '#d9e4ff', label: 'Herido 4' },
  // vecinos en la calle (etapa después): llorando con sus familias
  neighbor1:   { type: 'sprite', src: null, height: 1.7, color: '#c9c9c9', label: 'Vecina' },
  neighbor2:   { type: 'sprite', src: null, height: 1.1, color: '#c9c9c9', label: 'Niño' },
  neighbor3:   { type: 'sprite', src: null, height: 1.75, color: '#c9c9c9', label: 'Vecino' },
  neighbor4:   { type: 'sprite', src: null, height: 1.6, color: '#c9c9c9', label: 'Vecina' },

  // ---------- OBJETOS DE LA MALETA (sprites 2D que se arrastran) ----------
  // El nombre de cada uno sale de data/items.js. Clave: item_<id del objeto>
  item_agua:         { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_cobija:       { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_torniquete:   { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_vendajes:     { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_silbato:      { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_linterna:     { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_medicamentos: { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_control:      { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_guayos:       { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_balon:        { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_album:        { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },
  item_telefono:     { type: 'sprite', src: null, height: 0.6, placeholder: 'card', color: '#e3f2fd' },

  // ---------- PROPS 2D ----------
  bag_sprite:  { type: 'sprite', src: null, height: 0.55, color: '#ff4d6d', label: 'Maleta', static: true },

  // ---------- ESCENARIOS Y PROPS 3D ----------
  room_shell:     { type: 'model', src: null },
  desk:           { type: 'model', src: null },
  bed:            { type: 'model', src: null },
  closet:         { type: 'model', src: null },
  window:         { type: 'model', src: null },
  packing_table:  { type: 'model', src: null },
  open_bag:       { type: 'model', src: null },   // maleta abierta (minijuegos)
  living_shell:   { type: 'model', src: null },
  living_table:   { type: 'model', src: null },
  hall_shell:     { type: 'model', src: null },
  elevator_cabin: { type: 'model', src: null },   // cabina del ascensor, abierta y sin puerta
  stairs_door:    { type: 'model', src: null },   // acceso a las escaleras
  building_shell: { type: 'model', src: null },   // edificio completo del escape (ver "path" en data/planes.js)
  street_shell:   { type: 'model', src: null },
  rubble:         { type: 'model', src: null },
  truck:          { type: 'model', src: null },

  // ---------- FONDOS HDRI ----------
  env_street:     { type: 'environment', src: null },   // cielo de la etapa "después"

  // ---------- AUDIO (opcional) ----------
  music_antes:     { type: 'audio', src: null, volume: 0.6, loop: true },
  music_terremoto: { type: 'audio', src: null, volume: 0.7, loop: true },
  music_despues:   { type: 'audio', src: null, volume: 0.6, loop: true },
  sfx_quake:       { type: 'audio', src: null, volume: 1, loop: true },
  sfx_rain:        { type: 'audio', src: null, volume: 0.6, loop: true },   // lluvia en la calle
  sfx_typing:      { type: 'audio', src: null, volume: 0.25 },             // letras del diálogo (opcional)
  sfx_collapse:    { type: 'audio', src: null, volume: 1 },
  sfx_click:       { type: 'audio', src: null, volume: 0.5 },
  sfx_death:       { type: 'audio', src: null, volume: 1 },
  sfx_hit:         { type: 'audio', src: null, volume: 1 },    // QTE fallado
  sfx_ok:          { type: 'audio', src: null, volume: 0.6 },  // QTE acertado
  sfx_drop:        { type: 'audio', src: null, volume: 0.5 },  // soltar un objeto

  // ---------- EJEMPLOS (assets/ejemplos/) — referencia de cada formato ----------
  // debugOnly: solo se cargan con CONFIG.debug = true
  demo_model:  { debugOnly: true, type: 'model', src: 'assets/ejemplos/modelo_con_luz.glb' },
  demo_env:    { debugOnly: true, type: 'environment', src: 'assets/ejemplos/cielo.hdr' },
  demo_sheet:  { debugOnly: true, type: 'sprite', src: 'assets/ejemplos/hoja_sprites.png', height: 1.5,
                 sheet: { cols: 4, rows: 2, anims: { idle: { row: 0, frames: 4, fps: 4 }, walk: { row: 1, frames: 4, fps: 8 } } } },
  demo_frames: { debugOnly: true, type: 'sprite', height: 1.5,
                 anims: { idle: { frames: 'assets/ejemplos/cuadros/idle_{i}.png', count: 4, fps: 4 },
                          walk: { frames: 'assets/ejemplos/cuadros/walk_{i}.png', count: 4, fps: 8 } } },
  demo_video:  { debugOnly: true, type: 'sprite', height: 1.5,
                 anims: { idle: { video: 'assets/ejemplos/video_alfa.webm' },
                          walk: { video: 'assets/ejemplos/video_alfa.webm' } } },
};
