// ============================================================
//  FINALES
//  death: true → primero se muestra la pantalla de muerte (calavera).
//  cause: explicación principal del final (por qué moriste / qué lograste).
//  image: ilustración del final (null = marcador provisional). Es el nombre de un cuadro de la hoja de finales
//         (assets/endings/finales.webp, se genera con tools/finales.py) o la ruta de una imagen suelta.
//         En los finales normales flota (con borde blanco tipo sticker) donde estaba el círculo;
//         imageFit: 'contain' la muestra completa (por defecto la recorta para llenar el recuadro).
//         En el final bueno (layout 'special') va grande abajo a la derecha, cortada por el borde de la pantalla.
//  layout: 'standard' (fondo negro, círculo) o 'special' (diseño propio del final bueno).
//  retry: false → solo muestra "Volver al inicio" (sin "Reintentar sección").
// ============================================================

export const ENDINGS = {
  escondite: {
    title: 'final escondite', death: true, image: 'escondite', imageFit: 'contain',
    cause: 'El armario es un espacio cerrado y frágil: puede caerte encima y nadie sabría dónde buscarte. Durante el sismo, agáchate, cúbrete y sujétate lejos de ventanas y objetos que puedan caer; cuando pase el movimiento, evacúa por la ruta segura.',
  },
  ascensor: {
    title: 'final ascensor', death: true, image: null,
    cause: 'Nunca uses el ascensor durante ni después de un sismo: puede quedarse sin energía, atascarse o desplomarse. Evacúa siempre por las escaleras.',
  },
  escombros: {
    title: 'final bajo escombros', death: true, image: 'escombros', imageFit: 'contain',
    cause: 'No alcanzaste a salir y quedaste atrapado bajo los escombros sin una maleta de emergencia completa. Sin agua, abrigo, silbato ni linterna, no pudiste resistir ni pedir ayuda hasta el rescate.',
  },
  rescatado: {
    title: 'final rescatado', death: false, image: null,
    cause: 'No alcanzaste a salir, pero tu maleta de emergencia completa te salvó: con agua y abrigo resististe, con la linterna y el silbato los rescatistas pudieron encontrarte.',
  },
  replica: {
    title: 'final réplica', death: true, image: null,
    cause: 'Volviste a entrar solo a un edificio dañado. Después de un sismo vienen réplicas que pueden derrumbar lo que quedó en pie: nunca regreses a una estructura afectada; pide ayuda a los organismos de rescate.',
  },
  neutral: {
    title: 'final neutral', death: false, image: 'neutral', imageFit: 'contain',
    cause: 'Sobreviviste, pero sin los suministros adecuados no pudiste ayudar a los heridos y el bombero tuvo que irse. Solo lograste salvar a uno de tus compañeros.',
  },
  bueno: {
    title: 'final bueno', death: false, image: 'bueno', layout: 'special', retry: false,
    cause: 'Saliste a tiempo, buscaste ayuda y usaste tu maleta de emergencia para atender a los heridos. Gracias a eso, los rescatistas lograron salvar a {dejado}.',
  },
};
