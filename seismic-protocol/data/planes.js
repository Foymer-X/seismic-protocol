// ============================================================
//  PLANOS (escenarios). Cada cambio de plano usa fade out / fade in.
//  Dentro de un mismo plano los personajes se mueven con animación.
//
//  Coordenadas 3D: x = izquierda(-)/derecha(+), y = arriba, z = fondo(-)/cámara(+)
//
//  camera      { pos, target, fov }
//  shell       escenario base. Con asset y src en data/assets.js se usa el .glb;
//              si no, se dibuja piso + pared provisional (width, depth, height, floor, wall).
//  lights      'default' (luces provisionales) · 'model' (solo las luces del .glb) · 'none'
//  environment { asset: 'env_...', background: true, lighting: true, intensity: 1, blur: 0 }
//              fondo/iluminación HDRI o panorámica (ver data/assets.js)
//  props       objetos. pos = centro de la BASE del objeto.
//              size/color/shape → marcador provisional ('box' | 'cabin' (abierta al frente) | 'openTop')
//              node: 'NombreEnBlender' → usa ese objeto DENTRO del escenario .glb (shell)
//              sprite: true → objeto 2D (asset de tipo sprite)
//              visibleIf: (estado) => bool · hidden: true (empieza oculto)
//  weather     'rain' → lluvia (ajustes opcionales en rain: { count, speed, wind, color, opacity })
//  dust        true → cae polvo del techo mientras tiembla (más temblor = más polvo)
//  fog         { color, near, far } → niebla / atmósfera
//  markers     puntos con nombre a donde caminan los personajes.
//  actors      personajes del plano y su punto inicial.
// ============================================================

const CAM = { pos: [0, 3.4, 11], target: [0, 1.3, 0], fov: 40 };

export const PLANES = {
  // ---------------- HABITACIÓN ----------------
  room: {
    dust: true,
    camera: CAM,
    background: '#000000',
    lights: 'default',
    shell: { asset: 'room_shell', width: 14, depth: 6.5, height: 5, floor: '#d9d9d9', wall: '#f4f4f4' },
    props: [
      { id: 'desk',   asset: 'desk',   pos: [-4.2, 0, -2.4], size: [2.4, 1.0, 1.1], color: '#bfbfbf' },
      { id: 'bag',    asset: 'bag_sprite', sprite: true, pos: [-4.2, 1.0, -2.2],
        visibleIf: s => s.bag.made && !s.bag.taken },
      { id: 'window', asset: 'window', pos: [-0.2, 2.4, -3.2], size: [1.8, 1.4, 0.1], color: '#a7c7e7' },
      { id: 'closet', asset: 'closet', pos: [3.6, 0, -2.6], size: [2.6, 3.2, 1.1], color: '#8c8c8c' },
      { id: 'bed',    asset: 'bed',    pos: [4.8, 0, 0.6], size: [2.0, 0.7, 2.8], color: '#b3b3b3' },
    ],
    markers: {
      center:   [0, 0, 0.8],
      desk:     [-4.2, 0, -1.3],
      bed:      [3.4, 0, 0.9],
      bedTop:   [4.8, 0.75, 0.6],
      closet:   [3.6, 0, -1.6],
      exit:     [0, 0, 5.5],
      momStand: [-1.4, 0, 1.0],
    },
    actors: {
      hero: { at: 'center' },
      mom:  { at: 'exit', visible: false },
    },
  },

  // ---------------- MINIJUEGO MALETA (mesa vista desde arriba) ----------------
  packing: {
    camera: { pos: [0, 6.9, 4.4], target: [0, 1.0, -0.5], fov: 40 },
    background: '#000000',
    lights: 'default',
    shell: { asset: 'room_shell', width: 14, depth: 8, height: 6, floor: '#cfcfcf', wall: '#f4f4f4' },
    props: [
      { id: 'table',   asset: 'packing_table', pos: [0, 0, -0.6], size: [10, 1.0, 3.6], color: '#bfbfbf' },
      { id: 'openBag', asset: 'open_bag',      pos: [0, 1.0, -0.5], size: [2.2, 0.5, 1.4], color: '#ff4d6d', shape: 'openTop' },
    ],
    markers: {},
    actors: {},
  },

  // ---------------- INTERIOR DEL ARMARIO ----------------
  closet: {
    camera: { pos: [0, 1.4, 4], target: [0, 1.0, 0], fov: 45 },
    background: '#000000',
    shell: { asset: null, width: 2.6, depth: 2, height: 3, floor: '#555555', wall: '#777777', sides: true },
    props: [],
    markers: { center: [0, 0, 0] },
    actors: { hero: { at: 'center' } },
  },

  // ---------------- SALA ----------------
  living: {
    dust: true,
    camera: CAM,
    background: '#000000',
    shell: { asset: 'living_shell', width: 15, depth: 6.5, height: 5, floor: '#d4d4d4', wall: '#f2f2f2' },
    props: [
      { id: 'column',   asset: null,           pos: [-3.0, 0, -2.6], size: [0.6, 5, 0.6], color: '#9e9e9e' },
      { id: 'table',    asset: 'living_table', pos: [0.2, 0, -0.6], size: [2.4, 0.8, 1.2], color: '#bdbdbd' },
      { id: 'roomDoor', asset: null,           pos: [-5.6, 0, -3.15], size: [1.3, 2.4, 0.1], color: '#7a7a7a' },
    ],
    markers: {
      fromRoom: [-5.6, 0, -2.2],
      center:   [-1.2, 0, 0.6],
      mom:      [-5.0, 0, 1.9],
      dog:      [3.0, 0, 1.8],
      exit:     [8.5, 0, 0.8],
    },
    actors: {
      hero: { at: 'fromRoom' },
      mom:  { at: 'mom' },
      dog:  { at: 'dog' },
    },
  },

  // ---------------- PASILLO DEL ASCENSOR ----------------
  hall: {
    dust: true,
    camera: CAM,
    background: '#000000',
    shell: { asset: 'hall_shell', width: 15, depth: 6, height: 5, floor: '#cfcfcf', wall: '#efefef' },
    props: [
      // Cabina abierta (sin puerta): la madre entra en ella.
      { id: 'elevator', asset: 'elevator_cabin', pos: [-3.8, 0, -2.2], size: [2.2, 2.8, 1.6], color: '#6e6e6e', shape: 'cabin' },
      { id: 'shaft',    asset: null,             pos: [-3.8, 0, -2.2], size: [2.2, 2.8, 1.6], color: '#050505', hidden: true },
      // Acceso abierto a las escaleras.
      { id: 'stairs',   asset: 'stairs_door',    pos: [3.8, 0, -2.4], size: [1.6, 2.6, 1.2], color: '#4caf50', shape: 'cabin' },
    ],
    markers: {
      entry:        [8.5, 0, 1.2],
      entryB:       [9.6, 0, 1.2],
      start:        [5.4, 0, 1.2],
      elevatorNear: [-2.0, 0, 0.2],
      elevator:     [-3.8, 0, -0.6],
      elevatorIn:   [-3.8, 0, -2.4],
      stairs:       [3.8, 0, -0.9],
      stairsIn:     [3.8, 0, -2.6],
    },
    actors: {
      hero: { at: 'entry' },
      mom:  { at: 'entryB', visible: false },
      dog:  { at: 'entryB', visible: false },
    },
  },

  // ---------------- INTERIOR DEL ASCENSOR (final ascensor) ----------------
  elevator: {
    camera: { pos: [0, 1.5, 4.2], target: [0, 1.1, 0], fov: 45 },
    background: '#000000',
    shell: { asset: null, width: 2.8, depth: 2.2, height: 3, floor: '#5c5c5c', wall: '#8a8a8a', sides: true },
    props: [],
    markers: { left: [-0.5, 0, 0], right: [0.5, 0, 0] },
    actors: { hero: { at: 'left' }, mom: { at: 'right' } },
  },

  // ---------------- EDIFICIO COMPLETO (minijuego de escape) ----------------
  // Sin modelo propio, js/minigames/qte.js construye un edificio provisional con
  // CONFIG.qte.floors pisos de escaleras en zigzag + el pasillo final.
  // Con el modelo real (asset 'building_shell'), define aquí "path": la lista de puntos
  // por donde camina el personaje, en orden, desde arriba hasta la salida. Ejemplo:
  //   path: [[-3, 15, 0.7], [3, 12, 0.7], [4, 12, 0.7], [4, 12, -0.7], ...],
  building: {
    dust: { area: [26, 7, 6], follow: true },
    camera: { pos: [0, 3.2, 11], target: [0, 1.4, 0], fov: 40 },
    background: '#111111',
    lights: 'default',
    shell: null,
    path: null,
    props: [],
    markers: {},
    actors: { hero: { at: null }, mom: { at: null, visible: false }, dog: { at: null, visible: false } },
  },

  // ---------------- CALLE ----------------
  street: {
    weather: 'rain',
    fog: { color: '#2a2e33', near: 12, far: 34 },
    camera: CAM,
    background: '#2a2e33',
    // environment: { asset: 'env_street', background: true, lighting: true },
    shell: { asset: 'street_shell', width: 18, depth: 8, height: 7, floor: '#8f9399', wall: '#4d5157' },
    props: [
      { id: 'rubble', asset: 'rubble', pos: [-0.6, 0, -2.6], size: [3.2, 2.4, 1.6], color: '#4d4d4d' },
    ],
    markers: {
      start:     [-4.0, 0, 1.4],
      startB:    [-5.0, 0, 1.4],
      rubble:    [-0.6, 0, -1.2],
      help:      [9.5, 0, 1.4],
      n1: [3.2, 0, -1.6], n2: [4.1, 0, -1.4], n3: [6.4, 0, -2.0], n4: [7.3, 0, -1.8],
    },
    actors: {
      neighbor1: { at: 'n1' }, neighbor2: { at: 'n2', face: 'left' },
      neighbor3: { at: 'n3' }, neighbor4: { at: 'n4', face: 'left' },
      hero: { at: 'start' },
      mom:  { at: 'startB', visible: false },
      dog:  { at: 'startB', visible: false },
    },
  },

  // ---------------- CALLE CON BOMBERO ----------------
  street_ff: {
    weather: 'rain',
    fog: { color: '#2a2e33', near: 12, far: 34 },
    camera: CAM,
    background: '#2a2e33',
    // environment: { asset: 'env_street', background: true, lighting: true },
    shell: { asset: 'street_shell', width: 18, depth: 8, height: 7, floor: '#9e9e9e', wall: '#5a5a5a' },
    props: [
      { id: 'truck', asset: 'truck', pos: [3.6, 0, -2.4], size: [6.0, 2.6, 2.2], color: '#d32f2f' },
    ],
    markers: {
      enter:   [-9.5, 0, 1.4],
      enterB:  [-10.5, 0, 1.4],
      hero:    [-4.2, 0, 1.4],
      heroB:   [-5.2, 0, 1.4],
      ff:      [-1.6, 0, 1.0],
      inj1:    [0.6, 0, 1.0],
      inj2:    [2.0, 0, 1.0],
      inj3:    [3.4, 0, 1.0],
      inj4:    [4.8, 0, 1.0],
      away:    [11, 0, 1.0],
    },
    actors: {
      hero:        { at: 'enter' },
      mom:         { at: 'enterB', visible: false },
      dog:         { at: 'enterB', visible: false },
      firefighter: { at: 'ff' },
      injured1:    { at: 'inj1' },
      injured2:    { at: 'inj2' },
      injured3:    { at: 'inj3' },
      injured4:    { at: 'inj4' },
    },
  },

  // ---------------- MINIJUEGO DE AYUDA (plano cercano de los heridos) ----------------
  aid: {
    weather: 'rain',
    fog: { color: '#2a2e33', near: 12, far: 34 },
    camera: { pos: [0, 3.8, 10.8], target: [0, 0.9, 0.4], fov: 40 },
    background: '#2a2e33',
    // environment: { asset: 'env_street', background: true, lighting: true },
    shell: { asset: 'street_shell', width: 18, depth: 8, height: 7, floor: '#9e9e9e', wall: '#5a5a5a' },
    props: [
      { id: 'truck',   asset: 'truck',    pos: [2.0, 0, -3.0], size: [7.0, 2.6, 1.6], color: '#d32f2f' },
      { id: 'openBag', asset: 'open_bag', pos: [-5.2, 0, 2.1], size: [1.6, 0.45, 1.0], color: '#ff4d6d', shape: 'openTop' },
    ],
    markers: {
      inj1: [-3.3, 0, -0.6], inj2: [-1.1, 0, -0.6], inj3: [1.1, 0, -0.6], inj4: [3.3, 0, -0.6],
      hero: [-6.0, 0, -0.2], heroB: [-7.0, 0, -0.2], ff: [5.8, 0, -0.6],
    },
    actors: {
      hero:        { at: 'hero' },
      mom:         { at: 'heroB', visible: false },
      dog:         { at: 'heroB', visible: false },
      firefighter: { at: 'ff' },
      injured1:    { at: 'inj1' },
      injured2:    { at: 'inj2' },
      injured3:    { at: 'inj3' },
      injured4:    { at: 'inj4' },
    },
  },

  // ---------------- DENTRO DE LOS ESCOMBROS (réplica) ----------------
  rubble_inside: {
    dust: true,
    camera: { pos: [0, 2.2, 7], target: [0, 1.0, 0], fov: 42 },
    background: '#000000',
    shell: { asset: null, width: 8, depth: 4, height: 4, floor: '#3d3d3d', wall: '#5c5c5c', sides: true },
    props: [
      { id: 'debris1', asset: 'rubble', pos: [-2.4, 0, -1.2], size: [1.8, 1.4, 1.2], color: '#2e2e2e' },
      { id: 'debris2', asset: 'rubble', pos: [2.6, 0, -1.0],  size: [1.6, 1.8, 1.2], color: '#2e2e2e' },
    ],
    markers: { entry: [-3.6, 0, 1.4], hero: [-0.8, 0, 0.6], trapped: [1.0, 0, 0.2] },
    actors: {
      hero: { at: 'entry' },
      mom:  { at: 'trapped', visible: false },
      dog:  { at: 'trapped', visible: false },
    },
  },

  // ---------------- EJEMPLOS DE ASSETS (solo modo de prueba, tecla E) ----------------
  // Muestra cómo se conectan: un .glb con su propia luz, un fondo HDRI y tres formas de animar 2D.
  ejemplos: {
    camera: { pos: [0, 2.4, 9], target: [0, 1.2, 0], fov: 42 },
    background: '#202020',
    lights: 'model',                                   // sin luces provisionales: ilumina la luz del .glb + el HDRI
    environment: { asset: 'demo_env', background: true, lighting: true, intensity: 0.6, blur: 0.15 },
    shell: { asset: null, width: 14, depth: 6, height: 5, floor: '#d0d0d0', wall: '#e8e8e8', back: false },
    props: [
      { id: 'demoModel', asset: 'demo_model', pos: [0, 0, -1.2], size: [1, 1, 1], color: '#888' },
    ],
    markers: { a: [-5, 0, 1.2], b: [-1.5, 0, 1.2], c: [2, 0, 1.2], aEnd: [-3, 0, 1.2], cEnd: [4.5, 0, 1.2] },
    actors: {
      demo_sheet:  { at: 'a' },
      demo_frames: { at: 'b' },
      demo_video:  { at: 'c' },
    },
  },
};
