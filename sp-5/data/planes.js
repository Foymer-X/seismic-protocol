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
//  materialSwaps  cambiar el material de un objeto del .glb por otro material del mismo .glb:
//              [{ node: 'Cubo.005', material: 'verde' }]                 (todo el objeto)
//              [{ node: 'Cubo.005', from: 'blanco', material: 'verde' }]  (solo esa parte)
//  markers     puntos con nombre a donde caminan los personajes.
//  actors      personajes del plano y su punto inicial.
// ============================================================

const CAM = { pos: [0, 3.4, 11], target: [0, 1.3, 0], fov: 40 };

// Exterior: calle y andenes más largos + la imagen de la ciudad repetida en capas hacia atrás
// (cada capa más grande, más arriba y más clara por la distancia). Se usa en las 4 vistas de la calle.
const SKY = 'city-skyline-in-grey-colors-png', SKY2 = 'city-skyline-in-grey-colors-png.001';
const EXTERIOR_EXTRAS = {
  planes: [
    { from: [-90, 4.63], to: [130, 7.93], y: -0.585, material: 'pavimento' },   // calle (continúa a los lados)
    { from: [-90, 7.93], to: [130, 40], y: -0.17, material: 'anden' },          // andén de enfrente (hacia la cámara)
    { from: [-90, -60], to: [130, 4.63], y: -0.17, material: 'anden' },         // piso detrás y a los lados de los edificios
  ],
  copies: [
    { node: SKY,  offset: [-8, 1.5, -14], scale: 1.35, haze: 0.18 },
    { node: SKY2, offset: [8, 1.5, -14],  scale: 1.35, haze: 0.18 },
    { node: SKY,  offset: [-22, 4.5, -30], scale: 1.9, haze: 0.35 },
    { node: SKY2, offset: [14, 4.5, -30],  scale: 1.9, haze: 0.35 },
    { node: SKY,  offset: [-4, 9, -50],   scale: 2.6, haze: 0.55 },
    { node: SKY2, offset: [30, 9, -50],   scale: 2.6, haze: 0.55 },
  ],
};
const EXTERIOR_FOG = { color: '#a4a8ad', near: 22, far: 110 };   // neblina de lluvia: lo lejano se funde con el cielo

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
    // materialSwaps: [{ node: 'Cubo.005', from: 'blanco', material: 'verde' }],   // ejemplo: puertas del armario en verde
    props: [
      { id: 'desk',   node: 'Cubo.006' },                              // escritorio
      { id: 'bag',    node: 'mochila boceto', visibleIf: s => !s.bag.taken },   // la maleta (desaparece al agarrarla)
      { id: 'closet', node: ['Cubo.004', 'Cubo.005'] },                // armario y sus puertas
      { id: 'bed',    node: ['Plano subdividido', 'Cubo.008'] },       // cobija + base de la cama
    ],
    markers: {
      center:   [-1.0, 0, 1.3],
      aisle:    [-1.05, 0, 0.0],      // paso entre la cama y la pared izquierda (para no atravesar la cama)
      desk:     [-0.75, 0, -1.35],
      bed:      [0.45, 0, 1.5],
      bedTop:   [1.05, 0.5, 0.15],    // acostado: cabeza hacia la almohada (derecha)
      closet:   [0.3, 0, -1.3],       // frente al armario, entre el escritorio y la cama
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
      // Dentro de la maleta: corrida a la derecha para que la tapa (a la izquierda) no tape los objetos.
      bagArea: { x: [-1.25, -0.77], z: [-2.42, -1.98], y: 0.78 },
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
      leftAisle:[-3.0, 0, 0.2],       // paso entre el mueble de la izquierda y la silla verde
      center:   [-2.4, 0, 2.3],
      mom:      [-3.5, 0, 1.0],
      dog:      [4.7, 0.2, 2.5],      // sobre su cama
      front:    [0.4, 0, 2.3],
      dogCall:  [3.25, 0, 2.5],       // junto a la cama del perro (sin pisarla)
      dogFront: [3.3, 0, 1.05],       // frente a la cama del perro (para no pasar por encima)
      exitIn:   [4.6, 0, 0.85],
      exit:     [6.4, 0, 0.95],
    },
    actors: {
      hero: { at: 'fromRoom' },
      mom:  { at: 'mom' },
      dog:  { at: 'dog' },
    },
  },

  // ---------------- PASILLO DEL ASCENSOR ----------------
  // Modelo real (pasillo.glb). Se recorre de IZQUIERDA a DERECHA:
  // primero el ascensor (Cubo.001 + Plano), después la salida de emergencia (Cubo.002).
  hall: {
    dust: true,
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 1.0,
    shadows: { light: 'Light.001', mapSize: 1024 },
    background: '#000000',
    shell: { asset: 'hall_shell' },
    props: [
      // Cabina del ascensor: cae junto con la mamá (acción "drop" en data/story.js)
      { id: 'elevator', node: ['Cubo.001'] },          // solo la cabina (el panel de metal 'Plano' sobre la puerta se queda en la pared)
      // Puerta de la salida de emergencia (escaleras)
      { id: 'stairs',   node: 'Cubo.002' },
    ],
    markers: {
      entry:        [-6.3, 0, 2.3],     // fuera de cuadro, a la izquierda
      entryB:       [-7.1, 0, 2.3],
      start:        [-4.3, 0, 2.3],
      elevatorNear: [-2.6, 0, 1.4],
      elevator:     [-2.0, 0, 0.6],     // frente a la puerta del ascensor
      elevatorIn:   [-2.3, 0, -1.0],    // dentro de la cabina (mamá)
      elevatorIn2:  [-1.5, 0, -0.7],    // dentro de la cabina (tú)
      stairs:       [1.6, 0, 1.7],      // frente a la salida de emergencia (sin tocar la hoja de la puerta)
      stairsIn:     [2.1, 0, -0.8],     // atravesando la puerta
    },
    actors: {
      hero: { at: 'entry' },
      mom:  { at: 'entryB', visible: false },
      dog:  { at: 'entryB', visible: false },
    },
  },

  // ---------------- INTERIOR DEL ASCENSOR (final ascensor) ----------------
  // Modelo real (ascensor.glb): la cabina, su luz y la cámara. Los tres van adentro;
  // al final todo tiembla y la cabina cae fuera del cuadro con ellos (acción "drop").
  elevator: {
    camera: 'model',
    lights: 'model',
    ambient: 0.25,
    toneMapping: 'agx',
    exposure: 1.0,
    background: '#000000',
    shell: { asset: 'elevator_final' },
    props: [
      { id: 'cabin', node: ['Cubo.001', 'Plano', 'Light.003'] },
    ],
    markers: { mom: [-0.6, 0, -1.1], hero: [0.1, 0, -0.8], dog: [0.7, 0, -0.5] },
    actors: { mom: { at: 'mom' }, hero: { at: 'hero' }, dog: { at: 'dog' } },
  },

  // ---------------- EDIFICIO COMPLETO (minijuego de escape) ----------------
  // Sin modelo propio, js/minigames/qte.js construye un edificio provisional con
  // CONFIG.qte.floors pisos de escaleras en zigzag + el pasillo final.
  // Con el modelo real (asset 'building_shell'), define aquí "path": la lista de puntos
  // por donde camina el personaje, en orden, desde arriba hasta la salida. Ejemplo:
  //   path: [[-3, 15, 0.7], [3, 12, 0.7], [4, 12, 0.7], [4, 12, -0.7], ...],
  building: {
    dust: { area: [12, 7, 10], follow: true },
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 1.0,
    background: '#000000',
    shell: { asset: 'building_shell' },
    // Recorrido (metros): sale por la puerta del tramo más alto, baja los 8 tramos en zigzag
    // (adelante hacia la derecha, atrás hacia la izquierda), cruza el marco de abajo y sigue de frente
    // por el pasillo, esquivando los escombros, hasta la salida.
    path: [
      [-0.9, 15.94, 7.8],  [0.25, 15.94, 7.8],  [0.3, 15.94, 10.4],              // sale por la puerta de arriba
      [0.7, 15.94, 10.4],  [5.0, 13.97, 10.4],  [5.45, 13.97, 10.4], [5.45, 13.97, 7.6],   // tramo 1 y descanso
      [5.0, 13.97, 7.6],   [0.75, 12.0, 7.6],   [0.25, 12.0, 7.6],   [0.3, 12.0, 10.4],    // tramo 2
      [0.7, 12.0, 10.4],   [5.0, 10.02, 10.4],  [5.45, 10.02, 10.4], [5.45, 10.02, 7.6],   // tramo 3
      [5.0, 10.02, 7.6],   [0.75, 8.04, 7.6],   [0.25, 8.04, 7.6],   [0.3, 8.04, 10.4],    // tramo 4
      [0.7, 8.04, 10.4],   [5.0, 6.06, 10.4],   [5.45, 6.06, 10.4],  [5.45, 6.06, 7.6],    // tramo 5
      [5.0, 6.06, 7.6],    [0.75, 4.1, 7.6],    [0.25, 4.1, 7.6],    [0.3, 4.1, 10.4],     // tramo 6
      [0.7, 4.1, 10.4],    [5.0, 2.12, 10.4],   [5.45, 2.12, 10.4],  [5.45, 2.12, 7.6],    // tramo 7
      [5.0, 2.12, 7.6],    [0.75, -0.06, 7.6],                                              // tramo 8
      [0.0, -0.06, 7.8],   [-0.7, 0.0, 7.8],                                                // marco de la puerta de abajo (índice 33)
      [-1.6, 0.15, 7.6],   [-3.4, 0.15, 7.0],                                               // entra al pasillo
      [-3.6, 0.15, -6.4],  [-4.1, 0.15, -8.3],  [-4.1, 0.15, -10.5],                        // de frente hasta la salida
    ],
    // Cámara que sigue al personaje: de lado en las escaleras y detrás de él en el pasillo.
    follow: {
      offset: [1.0, 2.4, 9.0], look: [0, 0.9, 0], fov: 40, smooth: 2.5,
      clampX: [0.8, 4.4],          // en la escalera la cámara no pasa detrás de las paredes de los lados
      zones: [
        { from: 33, offset: [0.4, 2.6, 5.4], look: [0, 1.1, -4], fov: 52,     // pasillo: detrás, mirando al frente
          companionDistance: 1.1, companionSide: [0.9, 0, 0], pair: false },   // DETRÁS y un poco a la derecha (no tapa al niño), sin ir de la mano
      ],
    },
    props: [],
    markers: {},
    actors: { hero: { at: null }, mom: { at: null, visible: false }, dog: { at: null, visible: false } },
  },

  // ---------------- CALLE ----------------
  street: {
    // Modelo real (exterior.glb) iluminado con el HDRI del cielo nublado (como en Blender).
    // Cámara como la imagen de referencia 1: baja, de frente al edificio de la izquierda (Cubo.001)
    // y al del centro (Cubo), con el hueco y la ciudad al fondo entre los dos.
    weather: 'rain',
    rain: { center: [8.0, 0, 7], area: [30, 14, 16] },   // la lluvia se centra donde mira esta cámara
    camera: { pos: [7.5, 1.6, 18], target: [8.0, 3.2, 0], fov: 48 },   // un poco más lejos y centrada: se ven los 3 edificios
    lights: 'model', ambient: 0,
    toneMapping: 'agx', exposure: 0.7,
    environment: { asset: 'env_street', background: true, lighting: true, intensity: 1 },
    background: '#8a8d91',
    shell: { asset: 'exterior_shell' },
    extras: EXTERIOR_EXTRAS, fog: EXTERIOR_FOG,
    props: [
      // Edificio del centro de los tres (Cubo): se hace clic para volver a buscar
      { id: 'rubble', node: 'Cubo', labelAt: [9.0, 3.4, 2.8] },   // el letrero va a media altura (siempre visible)
      // Camión de bomberos (partes del modelo). wheels = ruedas que giran al moverse.
      { id: 'truck', node: ['Cubo.012', 'Cubo.013', 'Cilindro', 'Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'],
        wheels: ['Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'] },
    ],
    markers: {
      start:     [3.4, -0.15, 3.4],     // frente al hueco entre los dos edificios (más a la izquierda)
      startB:    [2.5, -0.15, 3.7],
      rubble:    [7.2, -0.15, 3.0],     // hacia la abertura del edificio del centro
      help:      [11.5, -0.15, 3.9],    // sale por la derecha, hacia el camión de bomberos
      n1: [-0.8, -0.15, 3.9], n2: [0.0, -0.15, 4.2], n3: [8.6, -0.15, 3.9], n4: [9.4, -0.15, 4.2],
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
    // Modelo real (exterior.glb) iluminado con el HDRI del cielo nublado (como en Blender).
    weather: 'rain',
    camera: { pos: [15.5, 2.4, 13.0], target: [17.0, 1.4, 1.8], fov: 45 },
    lights: 'model', ambient: 0,
    toneMapping: 'agx', exposure: 0.7,
    environment: { asset: 'env_street', background: true, lighting: true, intensity: 1 },
    background: '#8a8d91',
    shell: { asset: 'exterior_shell' },
    extras: EXTERIOR_EXTRAS, fog: EXTERIOR_FOG,
    props: [
      // Camión de bomberos (partes del modelo). wheels = ruedas que giran al moverse.
      { id: 'truck', node: ['Cubo.012', 'Cubo.013', 'Cilindro', 'Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'],
        wheels: ['Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'] },
    ],
    markers: {
      enter:   [8.0, -0.15, 4.3],
      enterB:  [7.0, -0.15, 4.3],
      hero:    [12.4, -0.15, 4.2],
      heroB:   [11.4, -0.15, 4.35],
      ff:      [21.1, -0.15, 2.7],      // a la izquierda de su camión
      inj1:    [14.2, -0.15, 3.3],      // heridos en fila frente al edificio
      inj2:    [15.8, -0.15, 3.3],
      inj3:    [17.4, -0.15, 3.3],
      inj4:    [19.0, -0.15, 3.3],
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


  // ---------------- EL BOMBERO SE VA EN SU CAMIÓN (sin objetos o si fallas) ----------------
  // Corte de cámara: solo el bombero y su camión. Se sube y el camión sale en reversa (acción "drive").
  // Con el modelo real del camión, pon su .glb en 'truck' (data/assets.js): debe mirar hacia +x (la derecha).
  ff_truck: {
    // Sin objetos o si fallas: el bombero se sube y el camión sale en reversa hacia la derecha.
    // Los demás quedan en su lugar de la conversación; los heridos mal atendidos se van en el camión.
    // Modelo real (exterior.glb) iluminado con el HDRI del cielo nublado (como en Blender).
    weather: 'rain',
    camera: { pos: [18.4, 2.8, 15.5], target: [19.0, 1.4, 1.5], fov: 47 },
    lights: 'model', ambient: 0,
    toneMapping: 'agx', exposure: 0.7,
    environment: { asset: 'env_street', background: true, lighting: true, intensity: 1 },
    background: '#8a8d91',
    shell: { asset: 'exterior_shell' },
    extras: EXTERIOR_EXTRAS, fog: EXTERIOR_FOG,
    props: [
      // Camión de bomberos (partes del modelo). wheels = ruedas que giran al moverse.
      { id: 'truck', node: ['Cubo.012', 'Cubo.013', 'Cilindro', 'Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'],
        wheels: ['Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'] },
    ],
    markers: {
      hero:    [12.4, -0.15, 4.2],
      heroB:   [11.4, -0.15, 4.35],
      ff:      [21.1, -0.15, 2.7],      // a la izquierda de su camión
      inj1:    [14.2, -0.15, 3.3],      // heridos en fila frente al edificio
      inj2:    [15.8, -0.15, 3.3],
      inj3:    [17.4, -0.15, 3.3],
      inj4:    [19.0, -0.15, 3.3],
      door:    [23.6, -0.15, 1.35],     // puerta de la cabina
      away:    [48, -0.15, -1.0],       // sale en reversa por la derecha
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


  // ---------------- MINIJUEGO DE AYUDA (plano cercano de los heridos) ----------------
  aid: {
    // Modelo real (exterior.glb) iluminado con el HDRI del cielo nublado (como en Blender).
    weather: 'rain',
    camera: { pos: [16.4, 2.7, 10.8], target: [16.4, 0.8, 3.0], fov: 50 },
    lights: 'model', ambient: 0,
    toneMapping: 'agx', exposure: 0.7,
    environment: { asset: 'env_street', background: true, lighting: true, intensity: 1 },
    background: '#8a8d91',
    shell: { asset: 'exterior_shell' },
    extras: EXTERIOR_EXTRAS, fog: EXTERIOR_FOG,
    props: [
      // Camión de bomberos (partes del modelo). wheels = ruedas que giran al moverse.
      { id: 'truck', node: ['Cubo.012', 'Cubo.013', 'Cilindro', 'Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'],
        wheels: ['Cilindro.001', 'Cilindro.002', 'Cilindro.003', 'Cilindro.004'] },
      // La maleta (el mismo dibujo de la habitación del niño)
      { id: 'openBag', sprite: true, asset: 'bag_sketch', pos: [12.9, -0.15, 4.55] },
    ],
    // Dónde quedan los objetos de la maleta en el piso (de izquierda a derecha)
    aidItems: { from: [14.0, -0.15, 4.6], to: [21.4, -0.15, 4.6] },
    markers: {
      hero:    [12.2, -0.15, 3.7],
      heroB:   [11.5, -0.15, 3.9],
      ff:      [21.1, -0.15, 2.7],      // a la izquierda de su camión
      inj1:    [14.2, -0.15, 3.3],      // heridos en fila frente al edificio
      inj2:    [15.8, -0.15, 3.3],
      inj3:    [17.4, -0.15, 3.3],
      inj4:    [19.0, -0.15, 3.3],
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
    // Modelo real (pasillo_despues.glb): el piso de abajo, lleno de escombros.
    // El niño entra por la izquierda; quien quedó atrapado está en el centro, un poco a la derecha.
    dust: true,
    camera: 'model',
    lights: 'model',
    ambient: 0.35,
    toneMapping: 'agx',
    exposure: 1.0,
    background: '#000000',
    shell: { asset: 'replica_shell' },
    props: [],
    markers: {
      entry:   [-5.8, 0, 2.35],     // fuera de cuadro, a la izquierda
      hero:    [0.25, 0, 2.3],      // pasa entre el montón del fondo y las piedras de adelante
      trapped: [1.45, 0, 1.3],      // centro, un poco a la derecha (entre las rocas)
    },
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
