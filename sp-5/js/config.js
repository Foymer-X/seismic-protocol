// ============================================================
//  CONFIGURACIÓN GENERAL — valores ajustables sin tocar la lógica
// ============================================================

export const CONFIG = {
  // Resolución base de diseño (el wireframe es 1920×1080).
  baseWidth: 1920,
  baseHeight: 1080,

  // Duración de la etapa TERREMOTO en segundos (reloj en tiempo real).
  // Empieza a correr en la pantalla "ESCAPA".
  quakeSeconds: 90,

  // Duración de los fundidos entre planos (segundos).
  fadeSeconds: 0.6,

  // Calidad gráfica. En computadores lentos: shadows: false y maxPixelRatio: 1.
  quality: {
    shadows: false,       // sombras de la luz principal en los escenarios reales (true = encender)
    renderScale: 1,    // se dibuja al 125 % de la resolución de la pantalla y se reduce (más nítido; 1 = más rápido)
    maxPixelRatio: 1.5,     // tope de nitidez (en pantallas de alta densidad)
    adaptive: true,       // si un escenario va lento, baja la nitidez (vuelve al máximo en el siguiente escenario)
    minScale: 0.85,       // lo mínimo que puede bajar (85 % de la nitidez máxima)
    targetFps: 45,        // cuadros por segundo que intenta mantener
    autoLowDetail: true,  // si aun con la nitidez mínima va lento, quita el relieve de las texturas
    // Bordes negros estilo caricatura en los escenarios 3D (data/planes.js → outline para ajustar o quitar por escenario)
    //   thickness = grosor en píxeles (a 1080 p) · crease = qué tan marcada debe ser una arista para llevar línea (0–1)
    outline: { enabled: false, thickness: 1.0, color: '#141414', crease: 0.5 },
  },

  // Al entrar a un plano la cámara hace un acercamiento suave.
  cameraIntro: true,

  // Velocidad de caminata de los personajes (unidades 3D por segundo).
  walkSpeed: 2.8,

  // Materiales de los escenarios: 'propuesta' (texturas nuevas sin costuras, tools/texturas.py)
  // u 'original' (como venían de Blender). Para comparar sin tocar el código: abre index.html?mat=original
  materials: (typeof location !== 'undefined' && new URLSearchParams(location.search).get('mat')) || 'propuesta',

  // Tamaño de los personajes animados (protagonista, mamá, Rex). 1 = tamaño del dibujo
  // (niño 1,0 m, mamá 1,75 m, Rex 0,6 m). Súbelo o bájalo para que se vean más grandes o más pequeños.
  characterScale: 1.4,

  // Distancia a la que el acompañante (madre o perro) sigue al protagonista.
  followDistance: 1.0,

  // Tiempo que dura en pantalla una tarjeta de capítulo ("antes", "TERREMOTO"...).
  chapterCardSeconds: 2.2,

  // Velocidad del texto de los diálogos (letras por segundo). 0 = aparece completo.
  textSpeed: 45,

  // Animaciones automáticas de los personajes 2D.
  anim: {
    flipTurn: true,     // al cambiar de dirección giran como una carta (estilo Paper Mario)
    walkBob: true,      // rebote al caminar (solo si el sprite no tiene animación "walk" propia)
    idleBreath: true,   // respiración suave cuando están quietos
  },

  // Contador de finales desbloqueados.
  //   true  → se recuerda en este navegador aunque se cierre la página
  //   false → se reinicia cada vez que se abre la página
  //   (en computadores compartidos del colegio, false evita que se sumen los de otros estudiantes)
  rememberEndings: true,

  // Minijuego de escape (QTE): escaleras + pasillo, en una sola secuencia.
  qte: {
    floors: 5,                // pisos de escaleras que hay que bajar
    corridorLength: 22,       // largo del pasillo final hasta la salida
    speed: 3.0,               // velocidad del personaje durante el escape (recorrido real ≈ 90 m → unos 30 s sin fallar)
    slowdownSeconds: 5,       // si fallas un "toca", vas más lento durante estos segundos
    slowdownFactor: 0.4,      // multiplicador de velocidad mientras estás ralentizado
    firstRing: 1.2,           // segundos hasta el primer "toca"
    ringEvery: 1.2,           // pausa (segundos) entre un "toca" y el siguiente (antes 3.2: ahora salen más seguido)
    ringDuration: 1.4,        // segundos que tarda el anillo en cerrarse
    ringWindow: 0.35,         // margen (en segundos) alrededor del cierre para acertar
    debrisLag: 0.5,           // el escombro llega al piso esto DESPUÉS de que se cierra el anillo
                              // (al tocar, todavía está arriba del personaje)
  },

  // Tutoriales "¡ATENTO!" (data/story.js → nodos type: 'tutorial')
  tutorial: {
    attentionSeconds: 2.2,    // pantalla "¡ATENTO!" antes de la demostración
    noticeSeconds: 4,         // aviso sin demostración (por ejemplo: no tienes los objetos)
    handSpeed: 1,             // velocidad de la mano de la demostración (2 = el doble de rápido)
    frameScale: 0.66,         // tamaño de la ventana de la demostración (1 = pantalla completa)
    frameCenterY: 548,        // centro vertical de la ventana (base 1080; arriba queda "¡ATENTO!")
  },

  // Modo de pruebas: panel con el nodo actual y atajos de teclado.
  //   T = dejar el reloj en 5 s  ·  R = menú  ·  E = plano de ejemplos de assets
  // Pon false antes de publicar.
  debug: true,
};
