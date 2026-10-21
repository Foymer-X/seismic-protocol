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

// Texturas compartidas por todos los escenarios (assets/textures/).
// 'paredes*' = todo material cuyo nombre empiece por "paredes" (paredes, paredes.001…).
import { SPRITES } from './sprites.js';
import { CONFIG } from '../js/config.js';
import { hasBag } from '../js/core/GameState.js';

const MATERIALES_CASA = {
  'paredes*':  { map: 'assets/textures/paredes_diff.jpg', bumpMap: 'assets/textures/paredes_disp.jpg',
                 bumpScale: 1.5, projection: 'box', tile: 1.6 },   // un mosaico de pañete cada 1.6 m
  'madera*':   { bumpMap: 'assets/textures/madera_disp.jpg', bumpScale: 2 },   // relieve de la veta (sigue el UV de Blender)
  'verde':     { color: '#3f7a37', map: false, bumpMap: 'assets/textures/madera_disp.jpg', bumpScale: 2 },  // madera verde
  'verde.0*':  { color: '#3f7a37', map: false, bumpMap: 'assets/textures/madera_disp.jpg', bumpScale: 2 },
  'verde.tela':     '#3f7f3a',   // telas verdes (cobija, sofá, cama del perro)
  'verde.tela.001': '#3f7f3a',
};


// ---------- PROPUESTA DE MATERIALES (CONFIG.materials = 'propuesta') ----------
// Texturas generadas con tools/texturas.py (assets/textures/propuesta/), sin costuras.
// Todas se pegan con proyección TRIPLANAR por el mundo (ignoran el UV de Blender, que en casi todos
// los modelos venía comprimido o ausente): tile = metros por mosaico.
// Las texturas de "detalle" (pañete, pintura, tela, concreto, metal) son casi grises y el color lo da 'color'.
// (las *_rug.webp de rugosidad existen pero no se usan: cuestan rendimiento y casi no se notan)
const ROUGH = { madera_piso: 0.65, baldosa: 0.45, metal: 0.5, asfalto: 0.9, concreto: 0.92, tela: 0.95, pintura: 0.6, panete: 0.9, ladrillo: 0.85 };
const T = n => ({ map: `assets/textures/propuesta/${n}_col.webp`, bumpMap: `assets/textures/propuesta/${n}_alt.webp`,
                  roughness: ROUGH[n] ?? 0.85, projection: 'triplanar',
                  normalMap: false });   // quita el mapa normal del .glb (con su UV dañado dibujaba líneas)
const P = {
  panete:   (color, tile = 2.0) => ({ ...T('panete'), color, tile, bumpScale: 1.2 }),
  pintura:  (color, tile = 1.2) => ({ ...T('pintura'), color, tile, bumpScale: 0.5 }),
  tela:     (color, tile = 0.6) => ({ ...T('tela'), color, tile, bumpScale: 0.8 }),
  concreto: (color, tile = 2.4) => ({ ...T('concreto'), color, tile, bumpScale: 1.6 }),
  metal:    (color, tile = 1.2) => ({ ...T('metal'), color, tile, bumpScale: 0.6, metalness: 0.35 }),
  madera:   (tile = 1.6) => ({ ...T('madera_piso'), color: '#ffffff', tile, bumpScale: 1.4 }),
  baldosa:  (tile = 1.6, rotation = 45) => ({ ...T('baldosa'), color: '#ffffff', tile, rotation, bumpScale: 1.2 }),
  ladrillo: (tile = 1.0) => ({ ...T('ladrillo'), color: '#ffffff', tile, bumpScale: 1.6 }),
  asfalto:  (tile = 4.0) => ({ ...T('asfalto'), color: '#ffffff', tile, bumpScale: 1.0 }),
};
// Paleta de la casa (cálida, tonos del dibujo de los personajes)
const PROP_CASA = {
  'paredes*':   P.panete('#f1e8da'),
  'madera*':    P.madera(),
  'verde':      P.pintura('#4c7d46'), 'verde.0*': P.pintura('#4c7d46'),
  'verde.tela': P.tela('#4f8547'), 'verde.tela.001': P.tela('#4f8547'),
  'blanco*':    P.pintura('#ede6da'),
  'negro*':     P.pintura('#2e2c2b', 1.0),
  'ventana':    P.pintura('#b8532c'),
  'metal*':     P.metal('#7a7f84'),
};
const PROP_PASILLO = { ...PROP_CASA, 'piso1': P.baldosa(), 'ladrillo*': P.ladrillo() };
const PROP_ESCAPE = { ...PROP_PASILLO, 'paredes*': P.concreto('#ddd7cc', 2.4), 'metal*': P.metal('#6f757a') };
const PROP_RUINAS = { ...PROP_PASILLO, 'paredes*': P.concreto('#e6dfd3', 2.0) };   // piso de abajo, después del sismo
const PROP_EXTERIOR = {
  'paredes*':   P.concreto('#d2ccc2', 3.0),
  'pavimento':  P.asfalto(4.0),
  'anden':      P.concreto('#b9b3a9', 1.5),
  'ladrillo*':  P.ladrillo(1.0),
  'metal':      P.metal('#8a8f94'),
  'blanco':     P.pintura('#e8e4dc'),
  'rojo':       { ...P.pintura('#9e1d1b', 1.0), metalness: 0.15 },
};
// Elige entre los materiales originales (como los entregó Blender + ajustes) y la propuesta.
const MAT = (original, propuesta) => (CONFIG.materials === 'propuesta' ? propuesta : original);


// Sprite de un herido: imagen "antes" y "despues" (assets/sprites/heridos/). aspect = ancho/alto de cada imagen.
const heridoSprite = (id, height, aspectAntes, aspectDespues, label) => ({
  type: 'sprite', src: null, height, label, faces: 'left', color: '#d9e4ff',
  anims: {
    idle:        { sheet: `assets/sprites/heridos/${id}_antes.webp`, cols: 1, rows: 1, count: 1, fps: 1, w: height * aspectAntes, h: height, ax: 0.5, ay: 1 },
    idle_helped: { sheet: `assets/sprites/heridos/${id}_despues.webp`, cols: 1, rows: 1, count: 1, fps: 1, w: height * aspectDespues, h: height, ax: 0.5, ay: 1 },
  },
  tagOrder: ['helped'],
  tags: { helped: c => (c.state.aidOk || []).includes(id) },
});

export const ASSETS = {
  // ---------- PERSONAJES (sprites 2D) ----------
  // Animaciones de After Effects convertidas a hojas WebP (data/sprites.js, se regenera con la herramienta).
  // faces: 'left' → los dibujos miran a la izquierda. tagOrder / tags → variantes de cada animación:
  //   c = { state, section ('antes'|'terremoto'|'despues'), follows(id) → ¿ese personaje sigue al protagonista?,
  //         speaking → nombre de quien habla en el diálogo actual ('Mamá', …) }
  hero: {
    type: 'sprite', src: null, height: 1.0, color: '#f2f2f2', label: 'Protagonista',
    anims: SPRITES.hero, faces: 'left',
    tagOrder: ['mom', 'bag', 'scared'],
    tags: {
      scared: c => c.section === 'terremoto' || c.section === 'despues',
      bag: c => hasBag(c.state),
      mom: c => c.follows('mom') && c.section !== 'despues' && !c.noPair,   // de la mano con la mamá
    },
    // caminando de la mano: la mamá se oculta (va dibujada en la animación del protagonista)
    // y lo sigue a esta distancia para aparecer en el mismo sitio al detenerse.
    pair: { tag: 'mom', actor: 'mom', distance: 0.75 },
  },
  mom: {
    type: 'sprite', src: null, height: 1.75, color: '#f5d0e0', label: 'Mamá',
    anims: SPRITES.mom, faces: 'left', speaker: 'Mamá',
    tagOrder: ['talk', 'scared'],
    tags: {
      talk: c => c.speaking === 'Mamá',
      scared: c => c.section === 'terremoto' || c.section === 'despues',
    },
  },
  dog: {
    type: 'sprite', src: null, height: 0.6, color: '#f5e6c8', label: 'Perro',
    anims: SPRITES.dog, faces: 'left',
    tagOrder: ['scared'],
    tags: { scared: c => c.section === 'terremoto' || c.section === 'despues' },
  },
  firefighter: { type: 'sprite', src: null, height: 1.8, color: '#ffb199', label: 'Bombero' },
  // Heridos del minijuego del bombero (dibujos quietos con respiración suave).
  // 'antes' = como llegan; 'despues' (tag helped) = cuando los atendiste bien (al confirmar el minijuego).
  injured1: heridoSprite('injured1', 1.0, 0.738, 0.738, 'Herido 1'),   // niña con herida abierta en el brazo → con torniquete
  injured2: heridoSprite('injured2', 1.5, 0.410, 0.410, 'Herido 2'),   // hombre con raspón en la cabeza → con vendaje
  injured3: heridoSprite('injured3', 1.5, 0.540, 0.578, 'Rescatista'),   // trabajador deshidratado → hidratado
  injured4: heridoSprite('injured4', 1.5, 0.468, 0.480, 'Herido 4'),   // persona sin ropa bajo la lluvia → con cobija
  // vecinos en la calle (etapa después): llorando con sus familias
  neighbor1:   { type: 'sprite', src: null, height: 1.7, color: '#c9c9c9', label: 'Vecina' },
  neighbor2:   { type: 'sprite', src: null, height: 1.1, color: '#c9c9c9', label: 'Niño' },
  neighbor3:   { type: 'sprite', src: null, height: 1.75, color: '#c9c9c9', label: 'Vecino' },
  neighbor4:   { type: 'sprite', src: null, height: 1.6, color: '#c9c9c9', label: 'Vecina' },

  // ---------- OBJETOS DE LA MALETA (sprites 2D que se arrastran) ----------
  // El nombre de cada uno sale de data/items.js. Clave: item_<id del objeto>
  // Imágenes cuadradas (512×512, fondo transparente) recortadas de la lámina de objetos (los 12).
  item_agua:         { type: 'sprite', src: 'assets/sprites/objetos/agua.png', height: 0.6, static: true },
  item_cobija:       { type: 'sprite', src: 'assets/sprites/objetos/cobija.png', height: 0.6, static: true },
  item_torniquete:   { type: 'sprite', src: 'assets/sprites/objetos/torniquete.png', height: 0.6, static: true },
  item_vendajes:     { type: 'sprite', src: 'assets/sprites/objetos/vendajes.png', height: 0.6, static: true },
  item_silbato:      { type: 'sprite', src: 'assets/sprites/objetos/silbato.png', height: 0.6, static: true },
  item_linterna:     { type: 'sprite', src: 'assets/sprites/objetos/linterna.png', height: 0.6, static: true },
  item_medicamentos: { type: 'sprite', src: 'assets/sprites/objetos/medicamentos.png', height: 0.6, static: true },
  item_control:      { type: 'sprite', src: 'assets/sprites/objetos/control.png', height: 0.6, static: true },
  item_guayos:       { type: 'sprite', src: 'assets/sprites/objetos/guayos.png', height: 0.6, static: true },
  item_balon:        { type: 'sprite', src: 'assets/sprites/objetos/balon.png', height: 0.6, static: true },
  item_album:        { type: 'sprite', src: 'assets/sprites/objetos/album.png', height: 0.6, static: true },
  item_telefono:     { type: 'sprite', src: 'assets/sprites/objetos/telefono.png', height: 0.6, static: true },

  // ---------- PROPS 2D ----------
  bag_sketch:  { type: 'sprite', src: 'assets/sprites/maleta.png', height: 0.7, static: true, label: 'Maleta' },   // dibujo de la maleta (cuarto)
  bag_sprite:  { type: 'sprite', src: null, height: 0.55, color: '#ff4d6d', label: 'Maleta', static: true },

  // ---------- ESCENARIOS Y PROPS 3D ----------
  // Escenarios reales (Blender). 1 unidad de Blender ≈ 40 cm → scale 0.4 deja todo en metros.
  room_shell:     { type: 'model', src: 'assets/models/habitacion.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT(MATERIALES_CASA, PROP_CASA) },
  packing_shell:  { type: 'model', src: 'assets/models/habitacion_maleta.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT(MATERIALES_CASA, PROP_CASA) },
  closet_shell:   { type: 'model', src: 'assets/models/armario.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT(MATERIALES_CASA, PROP_CASA) },
  desk:           { type: 'model', src: null },
  bed:            { type: 'model', src: null },
  closet:         { type: 'model', src: null },
  window:         { type: 'model', src: null },
  packing_table:  { type: 'model', src: null },
  open_bag:       { type: 'model', src: null },   // maleta abierta (minijuegos)
  living_shell:   { type: 'model', src: 'assets/models/sala.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT(MATERIALES_CASA, PROP_CASA) },
  living_table:   { type: 'model', src: null },
  hall_shell:     { type: 'model', src: 'assets/models/pasillo.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT({ ...MATERIALES_CASA,
                      // Baldosa y ladrillo: en Blender la imagen "disp" quedó conectada como normal (bumpFromNormal la
                      // usa como relieve) y el mapeo no viene del UV, así que se proyectan por el mundo.
                      'piso1':    { bumpFromNormal: true, bumpScale: 1.5, projection: 'box', tile: 1.6, rotation: 45 },
                      'ladrillo': { bumpFromNormal: true, bumpScale: 1.5, projection: 'box', tile: 1.2 } }, PROP_PASILLO) },
  replica_shell:  { type: 'model', src: 'assets/models/pasillo_despues.glb', scale: 0.4, lightScale: 0.0016,   // piso de abajo, después del sismo
                    materials: MAT({ ...MATERIALES_CASA,
                      'piso1':    { bumpFromNormal: true, bumpScale: 1.5, projection: 'box', tile: 1.6, rotation: 45 },
                      'ladrillo': { bumpFromNormal: true, bumpScale: 1.5, projection: 'box', tile: 1.2 } }, PROP_RUINAS) },
  elevator_final: { type: 'model', src: 'assets/models/ascensor.glb', scale: 0.4, lightScale: 0.0016,
                    materials: MAT(undefined, { 'metal': P.metal('#8c9196', 1.0) }) },   // final del ascensor
  elevator_cabin: { type: 'model', src: null },   // cabina del ascensor, abierta y sin puerta
  stairs_door:    { type: 'model', src: null },   // acceso a las escaleras
  building_shell: { type: 'model', src: 'assets/models/escape.glb', scale: 0.4, lightScale: 0.0016,   // edificio del escape (8 tramos + pasillo)
                    materials: MAT({ ...MATERIALES_CASA,
                      'piso1': { bumpFromNormal: true, bumpScale: 1.5, projection: 'box', tile: 1.6, rotation: 45 } }, PROP_ESCAPE) },
  street_shell:   { type: 'model', src: null },
  // Exterior real (calle, ruinas y camión). Se modeló más grande: 0.25 deja el camión en ≈ 9 m.
  exterior_shell: { type: 'model', src: 'assets/models/exterior.glb', scale: 0.25,
                    materials: MAT({ 'paredes*': MATERIALES_CASA['paredes*'] }, PROP_EXTERIOR) },
  rubble:         { type: 'model', src: null },
  truck:          { type: 'model', src: null },   // camión del bombero (mirando a +x, la derecha)

  // ---------- FONDOS HDRI ----------
  env_street:     { type: 'environment', src: 'assets/hdri/calle.hdr' },   // cielo nublado de la etapa "después" (fondo y luz)

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
  sfx_truck:       { type: 'audio', src: null, volume: 0.8 },  // el camión del bombero arranca en reversa

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
