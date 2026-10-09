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
  // ---------------- HABITACIÓN (modelo real: assets/models/habitacion.glb) ----------------
  // La cámara y las luces vienen del .glb. Antes del sismo la luz es cálida (como se exportó);
  // en el terremoto se usa el preset "terremoto" (luz fría), igual que en cuarto-terremoto.glb.
  room: {
    dust: true,
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 0.85,
    shadows: { light: 'Light.001', mapSize: 1024 },
    lightPresets: {
      terremoto: { 'Light': [0.119, 0.157, 1.0], 'Light.001': [0.488, 0.655, 1.0] },
    },
    background: '#000000',
    shell: { asset: 'room_shell' },
    props: [
      { id: 'desk',   node: 'Cubo.006' },                              // escritorio
      { id: 'bag',    node: 'mochila boceto', visibleIf: s => !s.bag.taken },   // la maleta (desaparece al agarrarla)
      { id: 'closet', node: ['Cubo.004', 'Cubo.005'] },                // armario y sus puertas
      { id: 'bed',    node: ['Plano subdividido', 'Cubo.008'] },       // cobija + base de la cama
    ],
    markers: {
      center:   [-1.0, 0, 1.3],
      desk:     [-0.75, 0, -1.35],
      bed:      [0.45, 0, 1.5],
      bedTop:   [0.8, 0.5, 0.15],
      closet:   [1.45, 0, -0.55],
      exit:     [-0.2, 0, 3.8],
      momStand: [0.1, 0, 1.75],
    },
    actors: {
      hero: { at: 'center' },
      mom:  { at: 'exit', visible: false },
    },
  },

  // ---------------- MINIJUEGO MALETA (modelo real: habitacion_maleta.glb, cámara cenital) ----------------
  packing: {
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 1.0,
    background: '#000000',
    shell: { asset: 'packing_shell' },
    props: [
      { id: 'openBag', node: 'Cubo' },          // la maleta abierta sobre el escritorio
    ],
    // Dónde quedan los objetos sobre el escritorio (metros) y de qué tamaño se ven.
    packing: {
      surfaceY: 0.74,
      itemHeight: 0.2,
      slots: [
        [-0.5, -2.42], [-0.25, -2.42], [0.0, -2.42], [0.25, -2.42],
        [-0.5, -2.13], [-0.25, -2.13], [0.0, -2.13], [0.25, -2.13],
        [-0.5, -1.84], [-0.25, -1.84], [0.0, -1.84], [0.25, -1.84],
      ],
    },
    markers: {},
    actors: {},
  },

  // ---------------- INTERIOR DEL ARMARIO (modelo real: armario.glb) ----------------
  closet: {
    camera: 'model',
    lights: 'model',
    ambient: 0.25,
    toneMapping: 'agx',
    exposure: 1.0,
    background: '#000000',
    shell: { asset: 'closet_shell' },
    props: [],
    markers: { center: [0, 0, 0.2] },
    actors: { hero: { at: 'center' } },
  },

  // ---------------- SALA (modelo real: sala.glb) ----------------
  // Entra por la puerta de la izquierda (su cuarto) y sale por la de la derecha.
  living: {
    dust: true,
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 1.0,
    shadows: { light: 'Light.001', mapSize: 1024 },
    background: '#000000',
    shell: { asset: 'living_shell' },
    props: [],
    markers: {
      fromRoom: [-3.9, 0, -2.4],
      center:   [-2.0, 0, 2.2],
      mom:      [-3.5, 0, 1.0],
      dog:      [4.7, 0.2, 2.5],      // sobre su cama
      front:    [0.4, 0, 2.45],
      exitIn:   [4.6, 0, 0.95],
      exit:     [6.4, 0, 0.95],
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
