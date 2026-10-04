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

  // Al entrar a un plano la cámara hace un acercamiento suave.
  cameraIntro: true,

  // Velocidad de caminata de los personajes (unidades 3D por segundo).
  walkSpeed: 2.8,

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
    speed: 2.3,               // velocidad del personaje durante el escape
    slowdownSeconds: 5,       // si fallas un "toca", vas más lento durante estos segundos
    slowdownFactor: 0.4,      // multiplicador de velocidad mientras estás ralentizado
    ringEvery: 3.2,           // cada cuántos segundos aparece un "toca"
    ringDuration: 1.4,        // segundos que tarda el anillo en cerrarse
    ringWindow: 0.35,         // margen (en segundos) alrededor del cierre para acertar
  },

  // Modo de pruebas: panel con el nodo actual y atajos de teclado.
  //   T = dejar el reloj en 5 s  ·  R = menú  ·  E = plano de ejemplos de assets
  // Pon false antes de publicar.
  debug: true,
};
