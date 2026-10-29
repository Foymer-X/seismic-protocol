# Seismic Protocol — Plantilla (Fase 3 + escenarios reales + tutoriales, revisión 2)

Experiencia web interactiva sobre qué hacer durante un terremoto.
Three.js para los escenarios 2.5D y HTML/CSS para la interfaz. No necesita instalar nada.

## Cómo abrirlo

Los navegadores **no permiten** abrir esta experiencia con doble clic sobre `index.html`, porque bloquean los módulos y los modelos 3D desde archivos locales. Para verla:

1. Abre la carpeta `seismic-protocol` en **VS Code**.
2. Instala la extensión **Live Server** (de Ritwick Dey).
3. Haz clic derecho sobre `index.html` y elige **"Open with Live Server"**.

Para publicarla, sube la carpeta completa al servidor tal como está.

## Dónde se cambia cada cosa

| Quiero cambiar…                                    | Archivo |
|----------------------------------------------------|---------|
| Modelos 3D, sprites 2D, animaciones, HDRI, sonidos | `data/assets.js` |
| Tipografías, colores e imágenes de la interfaz      | `css/theme.css` |
| Posición y tamaño de los elementos de la interfaz   | `css/ui.css` |
| Diálogos, narración y textos de botones             | `data/texts.js` |
| Objetos de la maleta (útiles e inútiles)            | `data/items.js` |
| Heridos y el objeto que necesita cada uno           | `data/injured.js` |
| Títulos, explicaciones y diseño de los 7 finales    | `data/endings.js` |
| Mensajes de bien/mal de las pantallas finales       | `data/feedback.js` |
| Escenarios: cámara, luces, HDRI, props y puntos     | `data/planes.js` |
| El flujo de la historia (decisiones y rutas)        | `data/story.js` |
| Reloj, velocidades, escape (QTE), contador de finales, modo prueba | `js/config.js` |

Normalmente **no hace falta tocar** nada en `js/core/`, `js/ui/` ni `vendor/`.

---

## Guía para poner el arte real

Mientras un recurso tenga `src: null`, se dibuja un **marcador provisional**. Para usar el arte real, copia el archivo en `assets/` y escribe su ruta en `data/assets.js`.

En **modo prueba**, la tecla **E** abre un plano de ejemplos donde puedes ver cada formato funcionando con los archivos de `assets/ejemplos/`: un modelo con su propia luz, un fondo HDRI y tres personajes animados de tres formas distintas. Úsalo como referencia.

### Modelos 3D con luces (Blender → .glb)

1. Ubica el piso en **y = 0** y usa **1 unidad = 1 metro**. El eje +Z apunta hacia la cámara.
2. Exporta con **File → Export → glTF 2.0**, en formato **glTF Binary (.glb)**.
   - Activa **Include → Punctual Lights** si quieres llevar las luces de Blender.
   - En **Lighting Mode**, elige **Standard**.
3. Conecta el archivo en `data/assets.js`:
   ```js
   room_shell: { type: 'model', src: 'assets/models/habitacion.glb', lightScale: 1 },
   ```
   Si las luces se ven muy fuertes o muy débiles, ajusta `lightScale` (por ejemplo `0.05` o `10`).
4. En el plano (`data/planes.js`), elige qué luces usar:
   - `lights: 'model'` usa **solo** las luces del .glb y apaga las provisionales.
   - `lights: 'default'` usa las luces provisionales, más las del modelo si trae.

**Recomendación:** en los computadores del colegio rinde mucho mejor **hornear la iluminación** en Blender (Bake) dentro de las texturas y no exportar luces. Se ve igual y pesa menos. Con luces horneadas usa `lights: 'none'` o `'default'`.

**Escenario completo en un solo .glb:** puedes conectar los objetos clicables por su **nombre en Blender**, sin exportarlos por separado:
```js
// data/planes.js → plano room
shell: { asset: 'room_shell' },
props: [
  { id: 'bed',    node: 'Cama' },      // la malla "Cama" del .glb es el objeto "Ir a dormir"
  { id: 'closet', node: 'Armario' },
  { id: 'desk',   node: 'Escritorio' },
],
```
Luego ajusta los `markers` (puntos de caminata) para que coincidan con tu modelo.

### Escenarios ya conectados (Fase de personalización)

| Plano | Archivo | Notas |
|-------|---------|-------|
| Habitación (antes y terremoto) | `assets/models/habitacion.glb` | Un solo modelo. En el terremoto solo cambia el color de las luces (`lightPresets.terremoto`). |
| Minijuego de la maleta | `assets/models/habitacion_maleta.glb` | Cámara cenital. Los objetos se ubican en `packing.slots`. |
| Interior del armario | `assets/models/armario.glb` | |
| Sala | `assets/models/sala.glb` | Entra por la puerta izquierda y sale por la derecha. (Versión con la mesa con UV nuevo.) |
| Pasillo | `assets/models/pasillo.glb` | Se recorre de izquierda a derecha. Ascensor = `Cubo.001` + `Plano`; salida de emergencia = `Cubo.002`. La cabina cae con la mamá. |
| Final del ascensor | `assets/models/ascensor.glb` | Mamá, hijo y perro adentro; todo tiembla, la luz parpadea y la cabina cae fuera del cuadro. |
| Exterior (calle, bombero, minijuego, salida del camión) | `assets/models/exterior.glb` | Escala 0.25 (se modeló más grande; así el camión mide ≈ 9 m). Sin luces propias: lo ilumina el HDRI `assets/hdri/calle.hdr` (fondo y luz). Edificio de la puerta (`Cubo.011`) = buscar al compañero; camión = `Cubo.012`, `Cubo.013`, `Cilindro…` (ruedas `Cilindro.001`–`004`). Las imágenes de relieve se pasaron a WebP (13 MB → 3 MB). |
| Piso de abajo (réplica) | `assets/models/pasillo_despues.glb` | Volver por quien quedó atrapado. El niño entra por la izquierda; la mamá o el perro están en el centro, un poco a la derecha. Durante la réplica cae polvo y escombro. |

Cómo quedó configurado cada uno (en `data/planes.js` y `data/assets.js`):

- `camera: 'model'`: usa la cámara exportada desde Blender.
- `lights: 'model'` + `ambient`: usa las luces del .glb, más un poco de luz de relleno.
- `toneMapping: 'agx'` + `exposure`: el mismo procesado de color de Blender (AgX). Sube o baja `exposure` para aclarar u oscurecer el plano.
- `shadows: { light: 'Light.001' }`: sombras de una sola luz. Se apagan en todo el juego con `CONFIG.quality.shadows = false`.
- `scale: 0.4` en `assets.js`: 1 unidad de Blender ≈ 40 cm, así que con esta escala todo queda en metros.
- `lightScale`: ajusta la intensidad de las luces exportadas.
- `materials`: corrige colores que Blender no exporta (el verde hecho con nodos) y pone texturas (ver abajo).
- `materialSwaps` (en el plano): cambia el material de un objeto por otro que ya exista en el modelo. Ejemplo: `materialSwaps: [{ node: 'Cubo.005', from: 'blanco', material: 'verde' }]`.
- Objetos clicables por su nombre de Blender. Ejemplo: `{ id: 'bed', node: ['Plano subdividido', 'Cubo.008'] }`.

### Texturas (imágenes) sobre los materiales

Las imágenes van en `assets/textures/` y se conectan en `data/assets.js`, en `MATERIALES_CASA` (compartido por todos los escenarios):

| Material | Imagen de color | Relieve | Cómo se pega |
|----------|-----------------|---------|--------------|
| `paredes*` (todo lo que empiece por "paredes": paredes, paredes.001…, incluida la matera) | `paredes_diff.jpg` | `paredes_disp.jpg` | Proyección por el mundo (`projection: 'box'`), un mosaico cada 1.6 m (`tile`). No depende del UV. |
| `madera*` | la que trae el .glb | `madera_disp.jpg` | Sigue el UV y la transformación de la madera de Blender. |
| `verde`, `verde.0*` | verde plano | `madera_disp.jpg` | Igual que la madera. |
| `piso1`, `ladrillo` (pasillo) | las que trae el .glb | la imagen "disp" del .glb | En Blender la "disp" estaba conectada como normal: `bumpFromNormal` la usa como relieve. Proyección por el mundo (la baldosa rotada 45°). |

Opciones de cada material: `map` (color), `bumpMap` + `bumpScale` (relieve con imagen de altura, la `_disp`), `normalMap` (la `_nor_gl`), `roughnessMap`, `repeat: [x, y]`, `projection: 'box'` + `tile` + `rotation`. Más fuerte o más suave el relieve: sube o baja `bumpScale`. Más grande o más pequeña la textura: sube o baja `tile`.

### Objetos de la maleta

Imágenes en `assets/sprites/objetos/` (512×512, fondo transparente), recortadas de la lámina completa que enviaron: los **12 objetos** (agua, cobija, torniquete, vendajes, silbato, linterna, medicamentos, control, guayos, balón, álbum y teléfono). Para cambiar uno, reemplaza su PNG con el mismo nombre.

- **Nombre de cada objeto**: texto con contorno debajo de cada uno, siempre visible (en la mesa, dentro de la maleta y en el minijuego del bombero). Tamaño: `--size-item-label` en `css/theme.css`. Las tarjetas provisionales no lo muestran porque ya traen el nombre dibujado.
- **Dentro de la maleta** los objetos se acomodan en `packing.bagArea` (`data/planes.js`). Está corrida a la derecha para que la tapa no los tape; para moverla, cambia los rangos `x` y `z` (en metros).

### Personajes y props 2D animados (tipo GIF)

Three.js **no reproduce GIF animados**: de un GIF solo muestra el primer cuadro. Hay que exportar la animación en uno de estos tres formatos, que el motor sí soporta:

| Formato | Cuándo usarlo | Ejemplo |
|---------|---------------|---------|
| **Hoja de sprites** (PNG con todos los cuadros en una cuadrícula) | La opción más liviana. Recomendada. | `assets/ejemplos/hoja_sprites.png` |
| **Cuadros sueltos** (PNG numerados) | Si tu programa exporta cuadro por cuadro. | `assets/ejemplos/cuadros/` |
| **Video WebM con transparencia** | Animaciones largas o muy detalladas (After Effects, etc.). | `assets/ejemplos/video_alfa.webm` |

Las tres opciones se configuran así; el ejemplo completo está en `data/assets.js`:
```js
hero: { type: 'sprite', src: 'assets/sprites/nino.png', height: 1.6,
        sheet: { cols: 4, rows: 3, anims: { idle: { row: 0, frames: 4, fps: 6 },
                                             walk: { row: 1, frames: 4, fps: 10 },
                                             lying:{ row: 2, frames: 1, fps: 1 } } } },
```
- El motor usa las animaciones **idle** (quieto), **walk** (caminar) y **lying** (acostado).
- Dibuja a los personajes **mirando a la derecha**: el motor los voltea solo cuando caminan a la izquierda.
- `height` es la altura del personaje en metros dentro de la escena.
- Para convertir un GIF a hoja de sprites o a cuadros PNG sirven herramientas gratuitas como ezgif.com (opción *GIF to sprite sheet* o *Split GIF*).

### Animaciones de los personajes (After Effects → hojas WebP)
Las secuencias PNG de After Effects (24 fps) se convierten con `python tools/sprites.py "carpeta/Animaciones"`:
recorta cada cuadro, iguala la escala de cada personaje, quita cuadros repetidos y guarda una hoja WebP por
animación en `assets/sprites/chars/` (≈7,6 MB en total en vez de 160 MB). El script escribe `data/sprites.js`;
no hace falta editarlo a mano.

- Los dibujos miran a la izquierda (`faces: 'left'` en `data/assets.js`); el código los voltea al caminar.
- Variantes automáticas (etiquetas en `data/assets.js → tags`):
  - **Protagonista:** tranquilo en "antes", asustado desde el terremoto; con maleta solo si la empacó y la lleva;
    **de la mano con la mamá** cuando ella lo sigue (antes de la etapa "después"). Mientras caminan de la mano,
    la mamá se oculta (va dibujada en la animación) y al detenerse aparece a su lado.
    Quieto durante el terremoto: **llorando** (`idle_cry`, de "Prota llorando quieto").
  - **Mamá:** quieta / hablando (cuando su diálogo empieza por "Mamá:") / asustada (desde el terremoto).
    Caminando sola desde el terremoto: `walk_scared` (de "Madre caminando"). En "antes" no tiene caminata
    propia: se desplaza con la animación quieta y un pequeño rebote.
  - **Rex:** quieto / caminando / caminando asustado.
- **Tamaño:** `CONFIG.characterScale` (js/config.js) agranda por igual a niño, mamá y Rex (1.4 → la mamá queda
  casi a la altura de las puertas). No afecta objetos ni marcadores provisionales.
- Quien habla en un diálogo ("Mamá: …") se voltea hacia el protagonista, y él hacia ella.
- En el pasillo final del escape (zona con `pair: false` en data/planes.js) caminan separados y el
  acompañante va detrás.
- Para agregar una animación nueva (por ejemplo `walk` de la mamá), se añade en `CHARS` de `tools/sprites.py`
  con el nombre correspondiente y se vuelve a correr el script.

### Rendimiento (`CONFIG.quality`)
- `adaptive: true`: si el juego no alcanza ~45 cuadros por segundo, baja la nitidez automáticamente
  (hasta `minPixelRatio`, 60 %) y la vuelve a subir si sobra rendimiento. Es lo que más ayuda en el escape.
- `maxPixelRatio: 1` en computadores lentos con pantalla de alta densidad.
- `shadows: false` (sombras apagadas).
- Al entrar a cada escenario, mientras la pantalla está en negro, se compilan los materiales y se suben las
  texturas (incluidas todas las animaciones), para evitar tirones la primera vez que aparece algo.

### Materiales: propuesta vs. original (`CONFIG.materials`)

- Interior del edificio (pasillo, escaleras, piso de abajo): paredes verdes (`VERDE_EDIFICIO`) y piso de madera;
  la maceta del pasillo sigue blanca. El escritorio de la maleta (cuarto y armado) es blanco.
- Calle: edificio de la izquierda en ladrillo, el principal en verde; calle de asfalto oscuro con línea blanca,
  distinta del andén. Para cambiar el material de UN objeto: clave `'@Objeto:material'` en `data/assets.js`
  (por ejemplo `'@Cubo.001:paredes': P.ladrillo()`).
- `'propuesta'` (por defecto): texturas propias sin costuras (`assets/textures/propuesta/`, generadas con
  `python tools/texturas.py`): pañete, madera del piso, pintura, tela, baldosa, ladrillo, concreto, asfalto y metal.
  Cada una trae color, relieve y rugosidad. Se pegan con **proyección triplanar** por el mundo, así que no dependen
  del UV de Blender (que en casi todos los modelos venía comprimido o no existía).
- `'original'`: como venían de Blender con los ajustes anteriores. Para comparar sin tocar código: `index.html?mat=original`.
- Colores y tamaño de cada material: `data/assets.js` → `PROP_CASA`, `PROP_PASILLO`, `PROP_ESCAPE`, `PROP_RUINAS`, `PROP_EXTERIOR`
  (`color` tiñe las texturas de detalle; `tile` = metros por mosaico).

### Exterior más lleno (`extras` en data/planes.js)
- `EXTERIOR_EXTRAS.planes`: calle y andenes más largos con el mismo material del modelo.
- `EXTERIOR_EXTRAS.copies`: la imagen de la ciudad repetida en capas hacia atrás (más grande, más arriba y
  más clara con `haze`). `EXTERIOR_FOG`: neblina de lluvia para que lo lejano se funda con el cielo.
- Letrero de una opción en un punto fijo: `labelAt: [x, y, z]` en el prop (por ejemplo, el edificio del centro).

### Introducción y contador de finales
- Después de "Iniciar Partida" aparece la introducción (nodo `intro` en data/story.js). `data/texts.js` →
  `intro_pages`: cada pantalla tiene `text` (id del texto) y `scene` (escena visual de `js/ui/IntroScenes.js`):
  `city` (cielo que se mueve + edificios en 4 capas, `assets/intro/`), `characters` (Carlos, mamá y perro),
  `choice` (Carlos con la maleta y la maleta "prohibida"). Botones "Continuar" y "Saltar introducción".
- En el menú, arriba a la derecha, un cuadro pequeño con "X/7 finales" aparece después del primer final y se vuelve
  dorado con los 7. Se guarda en el navegador (`CONFIG.rememberEndings`).
- **Shift + R dos veces en el menú** borra los finales desbloqueados (útil en computadores compartidos). La ayuda se ve debajo del cuadro.

### Bordes negros estilo caricatura

- **Apagados por defecto** (pesan en computadores lentos). Para verlos: `index.html?bordes=1`.
- Activos en todos los escenarios con modelo. Grosor, color y qué tan marcada debe ser una arista:
  `CONFIG.quality.outline` (`enabled: false` los apaga en todo el juego).
- Por escenario (data/planes.js → `outline`): `false` (sin bordes), `{ thickness }`, `{ nodes: [...] }` (solo esas
  piezas) o `{ contourOnly: ['Esfera*'] }` (solo silueta, para formas redondeadas que se vean rayadas).
- Son geometría real (js/core/Outline.js), así que lo que está delante siempre las tapa:
  · Silueta = "casco invertido": cada pieza cerrada se dibuja otra vez en negro, inflada unos píxeles, por detrás.
  · Aristas = líneas de ancho fijo en píxeles en los dobleces del modelo de más de `crease` grados (30 por defecto).
- Respetan el sombreado de Blender: en superficies con "Shade Smooth" (cilindros, cojines) no hay rayas internas,
  solo la silueta; las aristas con sombreado plano llevan línea. Si una pieza se ve muy rayada, márcala con
  Shade Smooth en Blender o ponla en `contourOnly`.

### Nitidez

- Tope general: `CONFIG.quality.maxPixelRatio` = 1. Cada escenario puede tener su tope en data/planes.js
  (`maxPixelRatio`): en la etapa "después" (calle, bombero, camión, ruinas) es 0.8 para que no se trabe.
- `CONFIG.quality.renderScale` (1.25): se dibuja más fino que la pantalla. Si un escenario va lento, la nitidez baja
  hasta `minScale` (85 %) y vuelve al máximo en el siguiente escenario.

### Ritmo del terremoto y escape

- **Reloj de 64 s.** En la etapa terremoto todo va un poco más rápido (`CONFIG.quakePace`: caminatas ×1,3 con los
  pasos acelerados igual, pausas ×0,6 y texto ×1,6). Los textos de esa etapa son de una línea.
- **Escape con un mini tutorial relámpago** (unos 2 s, sin pausar el reloj): "Toca en el momento indicado" en el centro
  y un ejemplo del botón cerrándose y tocándose a tiempo (`CONFIG.qte.intro`). El escape es más rápido (`CONFIG.qte.speed` 4,3 → unos 21 s sin fallar) y con **3 vidas** (corazones):
  cada escombro que te golpea quita una y te frena unos segundos; sin vidas quedas atrapado (igual que si el reloj
  llega a 0: final bajo escombros o rescatado según la maleta).
- **Tutoriales:** cada explicación espera un clic ("Clic para continuar", o Espacio/Enter) antes de pasar a la siguiente.
- **Opciones:** aparecen una tras otra y brillan unas veces para que ninguna pase desapercibida.

### Heridos, maleta y escape

- Gente de fondo en la calle: niño y bebé (`vecino_nino`, `vecino_bebe` en assets/sprites/heridos/), con menos
  saturación para que se mezclen con el ambiente lluvioso.
- Heridos: `assets/sprites/heridos/<id>_antes.webp` y `_despues.webp`. Al confirmar el minijuego, los bien
  atendidos cambian a su dibujo de "después" y sale "¡Lo hiciste bien!" / "No lo hiciste bien" con cuántos atendiste bien.
- Maleta: si al confirmar sobran objetos o faltan útiles, sale una advertencia general (textos `pack_warn_*`).
- Escape: los escombros son rocas que giran al caer y se rompen en pedazos que se desvanecen.

### Fondos HDRI (por ejemplo, el cielo de la etapa "después")

1. Copia el archivo `.hdr` en `assets/hdri/`. También sirve una imagen panorámica `.jpg`, que es más liviana. Con resolución **2K** es suficiente.
2. Regístralo en `data/assets.js`:
   ```js
   env_street: { type: 'environment', src: 'assets/hdri/calle.hdr' },
   ```
3. Actívalo en el plano (en `street`, `street_ff` y `aid` ya está escrito y comentado):
   ```js
   environment: { asset: 'env_street', background: true, lighting: true, intensity: 1, blur: 0 },
   ```
   - `background` muestra el HDRI como fondo.
   - `lighting` ilumina los modelos con él.
   - `blur` desenfoca el fondo (de 0 a 1).

### Edificio del escape (escaleras y pasillo)

Modelo real: `assets/models/escape.glb` (en `building_shell`), ya **sin las escaleras duplicadas** (se quitaron `Cubo.011`–`Cubo.014` y `Cubo.019`–`Cubo.022`, copias exactas de los tramos). Si se vuelve a exportar desde Blender, bórralas antes.

- **Recorrido** (`data/planes.js → building.path`, en metros): sale por el marco de la puerta del tramo más alto, baja los 8 tramos en zigzag (los de adelante hacia la derecha, los de atrás hacia la izquierda, girando en cada descanso), cruza el marco de la puerta de abajo y sigue **de frente** por el pasillo esquivando los escombros hasta la salida. Mide ≈ 90 m.
- **Cámara** (`building.follow`): sigue al personaje. En las escaleras va de lado (`offset`, sin salirse del cubo de la escalera: `clampX`); desde el punto 33 del recorrido (el marco de abajo) pasa suavemente a ir **detrás** de él mirando hacia la salida (`zones`). En el pasillo el acompañante camina a su lado (`companionSide`) para que no lo tape.
- **Velocidad** (`CONFIG.qte.speed: 3.0`): unos 30 s de recorrido sin fallar; cada "toca" fallado cuesta unos 3 s (5 s al 40 % de velocidad).
- Las puertas grandes del pasillo (`Cubo.001`, `Cubo.002`) son las del ascensor: solo decoración.

### Efectos de ambiente (lluvia, polvo, niebla)

- **Lluvia y escombros que caen** son secuencias de After Effects convertidas en hojas de cuadros
  (`python tools/secuencias.py "carpeta"` → `assets/fx/*.webp` + `data/effects.js`). Son más livianas que las partículas.
  - Lluvia: una capa a pantalla completa delante de todo (`rain.front.opacity` en data/planes.js).
    Opcional: una segunda capa en el mundo 3D, detrás de los edificios (`rain.back: true` o
    `{ center, width, height, tile, opacity }`).
  - Escombros: a pantalla completa en los escenarios con `dust`; se ven más mientras más fuerte tiembla.
  - Para comparar con las partículas de antes: `index.html?fx=particulas`.

> Polvo y escombro (`dust: true`): con los modelos reales el tamaño se calcula solo según la distancia de la cámara (unos 6 px de polvo y trozos de escombro más grandes). Cae más mientras más fuerte tiembla. Para cambiarlo: `dust: { size, color, chunks, chunkColor, rate }` en el plano.

Se activan por plano en `data/planes.js`:
- `weather: 'rain'` → lluvia. Ajustes opcionales: `rain: { count, speed, wind, color, opacity }`. Está activa en la calle (`street`, `street_ff`, `aid`).
- `dust: true` → cae polvo del techo mientras tiembla; a más temblor, más polvo.
- `fog: { color, near, far }` → niebla o atmósfera.

El sonido de la lluvia se conecta en `sfx_rain`, dentro de `data/assets.js`.

### Interfaz, tipografías y finales

- **Calavera y círculo roto de los finales:** son dibujos provisionales en SVG, hechos según el wireframe y ubicados dentro de `index.html`.
  - Para cambiar la calavera, pon tu imagen en `--image-skull` y `--skull-svg-display: none` en `theme.css`.
  - Para cambiar el círculo de cada final, usa el campo `image` en `endings.js`.

- **Tipografías y colores:** se cambian en `css/theme.css`.
- **Imagen del círculo de cada final:** campo `image` en `data/endings.js`.
- **Final bueno:** tiene su propio diseño (`layout: 'special'`). Su ilustración y su fondo se cambian con `--image-special-illustration` y `--image-special-bg` en `theme.css`, o con `image` en `endings.js`.
- **Íconos de objetos, heridos y retroalimentación:** campo `icon` en `items.js`, `injured.js` y `feedback.js`.
- **Retroalimentación de los finales:** sin barra de desplazamiento; si hay muchas líneas la lista se alarga y los botones bajan. Tamaño de los círculos ✓/✗: `--size-fb-icon` en `theme.css`.
- **Ilustraciones de los finales:** todas van en UNA hoja (`assets/endings/finales.webp`), generada con
  `python tools/finales.py "carpeta"` a partir de PNG con fondo transparente (`final_<id>.png`). El campo `image` de
  `data/endings.js` es el nombre del cuadro ('escombros', 'neutral', 'bueno').
  - Bajo escombros: completa dentro del círculo (`imageFit: 'contain'`). Neutral: recortada y centrada en Carlos.
  - Final bueno: grande abajo a la derecha, cortada por el borde; la pantalla entra con un fundido desde negro.
  - Para agregar otro final: su PNG en la carpeta, una línea en `ARTE` (tools/finales.py) y `image: '<id>'`.

### Identidad UNGRD (Manual de Identidad Visual 2024)

- **Logo:** `assets/ungrd/ungrd_h_blanco.webp` (versión a una tinta en negativo, blanco sobre negro, del manual) en el
  menú, la carga y el cierre. También están las versiones a color (`ungrd_h.webp`, `ungrd_v.webp`) para fondos blancos.
- **Colores:** `--ungrd-yellow` #ffcd00, `--ungrd-navy` #213362 y la franja tricolor (`--flag-*`) en `css/theme.css`.
  Se usan en acentos: barra de carga, "¡ATENTO!", números y franja de la pantalla de cierre.
- **Tipografía:** Nunito Sans (la principal del manual) para textos e interfaz, en `assets/fonts/`. Los títulos grandes
  conservan la tipografía condensada del juego.
- **Cierre "Ahora, prepárate de verdad":** aparece al terminar un final y pulsar "Volver al inicio". Tres acciones
  (maleta, plan familiar, simulacros), la línea 123 y los créditos. Textos: `prepare_*` en `data/texts.js`
  (pendiente: revisión de la UNGRD).

### Sonido

- **Canciones del equipo:** menú (`music_menu`), antes (`music_antes`, "día") y terremoto (`music_terremoto`).
  - La del terremoto suena UNA vez y arranca junto con el reloj (tarjeta "ESCAPA"): el reloj dura 64 s
    (`quakeSeconds`), así que el 0 cae en la última campanada (1:04).
  - La de "antes" se apaga con el fundido a negro de la tarjeta TERREMOTO (`music: null` en esa tarjeta).
  - Cuando una canción deja de sonar, baja con un fundido de 2 s (no se corta).
- **Generados con `tools/sonido.py`** (8 bits suave, originales): música de "después" y del final, temblor, lluvia y
  efectos (botones, letras, agarrar/soltar, aciertos/fallos, derrumbes, camión, tarjetas, muerte, fanfarria).
- **Archivos y volúmenes:** sección AUDIO de `data/assets.js` (`assets/audio/*.mp3`).
- **Botón de sonido:** arriba a la derecha en todas las pantallas (o tecla **M**). Se recuerda en el navegador.
- Los navegadores no dejan sonar nada hasta el primer clic: la música del menú arranca al primer clic o tecla.

---

## Cómo funciona

- **Reloj:** dura 1:04 (`quakeSeconds`, sincronizado con la canción) y corre en tiempo real desde la pantalla "ESCAPA", con un pulso cada segundo. Si llega a 0 en cualquier momento, el juego decide entre **final rescatado** (maleta completa y llevada) y **final bajo escombros**.
- **Acompañante:** al elegir a la madre o al perro, ese personaje sigue al protagonista a una distancia fija (`followDistance`), por el mismo camino que él recorre.
- **Escape:** el personaje baja varios pisos y cruza el pasillo. Caen escombros y aparece el anillo "toca": hay que hacer clic cuando el aro exterior se cierra. Cada fallo te hace ir más lento durante 5 segundos. Los valores se ajustan en `CONFIG.qte`.
- **Maleta y heridos:** se juegan arrastrando los objetos en el escenario 3D.
- **Al perder:** aparecen dos botones, **Volver al inicio** y **Reintentar** la sección (terremoto o después). Reintentar conserva la maleta y el acompañante que tenías al empezar esa sección. El final bueno solo muestra "Volver al inicio".
- **Contador de finales:** cada final agrega una línea "Finales desbloqueados: X de 7".
  - Con `rememberEndings: true`, el conteo se guarda en el navegador aunque se cierre la página.
  - En computadores compartidos del colegio conviene ponerlo en `false`.

### Tutoriales "¡ATENTO!" (demostraciones que se juegan solas)

Antes de cada mecánica nueva aparece "¡ATENTO!" a pantalla completa y luego una **demostración automática** dentro de una ventana con borde blanco redondeado (con "¡ATENTO!" arriba, la explicación debajo y "Saltar" junto a ella): una mano mueve el puntero, pasa por encima de las opciones, arrastra objetos y oprime botones usando los mismos minijuegos del juego. La partida no cambia (la demostración usa una copia del estado) y el reloj del terremoto se **pausa** mientras dura. El botón **Saltar** (arriba a la derecha) corta solo el tutorial que se está viendo.

| Nodo (`data/story.js`) | Cuándo aparece | Demostración (`js/tutorials/demos.js`) |
|---|---|---|
| `tut_choices` | Después de "Iniciar Partida" | Dos opciones en el escenario; pasa por una y elige la otra. |
| `tut_packing` | Al elegir "Realizar maleta" | Mete dos objetos, saca uno y oprime "completar selección". |
| `tut_timer` | Entre "TERREMOTO" y "ESCAPA" | El reloj de 1:30 corriendo y las opciones del terremoto, sin elegir: "tómate un momento". |
| `tut_qte` | Antes de las escaleras | Un "toca" a tiempo (esquiva) y uno antes de tiempo (golpe y más lento). |
| `tut_aid` | Antes del minijuego del bombero | Lee cada condición, lleva un objeto a una persona y lo devuelve. |
| `tut_aid_blocked` | Si no tienes los objetos | Solo el aviso: "No tienes los objetos adecuados para iniciar el minijuego" (botón "Continuar"). |

- Textos: `data/texts.js` (claves `tut_…`). Tiempos, velocidad de la mano y tamaño/posición de la ventana (`frameScale`, `frameCenterY`): `CONFIG.tutorial` en `js/config.js`.
- Colores: `--color-attention` en `css/theme.css`. Para usar una imagen propia del puntero: `--image-tut-hand` (y `--tut-hand-svg-display: none`).
- Para quitar un tutorial, cambia el `next`/`go` que apunta a él por el nodo siguiente (por ejemplo `menu: { next: 'card_antes' }`).

### Escape: escombros y "toca" (`CONFIG.qte`)

- `ringEvery: 1.2`: pausa entre un "toca" y el siguiente (antes 3.2: ahora salen bastante más seguido). `firstRing`: espera hasta el primero.
- `debrisLag: 0.5`: el escombro llega a la altura de la cabeza medio segundo **después** de que se cierra el anillo, así que al tocar todavía está claramente arriba del personaje. Si fallas, el golpe (temblor, "¡Te golpeaste!" y la ralentización) se ve cuando llega a la cabeza.
- El escombro cae **sobre la cabeza**: apunta a donde va a estar el personaje cuando llegue abajo, siguiendo el recorrido (curvas y escaleras incluidas).
- La velocidad y el largo del recorrido se ajustan cuando llegue el modelo del edificio.

### El exterior (etapa "después")

- **Calle** (`street`): el niño sale por la puerta del edificio; clic en el edificio = volver a buscar al compañero, "Buscar ayuda" = hacia el camión. Vecinos en la acera.
- **Conversación** (`street_ff`): heridos en fila frente al edificio y el bombero a la izquierda de su camión.
- **Minijuego** (`aid`): los objetos quedan en el piso en `aidItems: { from, to }` (metros) y la maleta es el dibujo de la habitación del niño (`assets/sprites/maleta.png`). Para soltar un objeto sobre un herido se mide en pantalla, así funciona con cualquier cámara.
- **Salida del camión** (`ff_truck`): el bombero se sube y el camión real sale en reversa hacia la derecha con las ruedas girando (acción `drive` con `wheels` en el prop). Todos quedan en su lugar de la conversación, pero **los heridos mal atendidos no aparecen** (se van en el camión); si no tenías los objetos, no queda ninguno (`state.aidOk`).
- HDRI: `env_street` → `assets/hdri/calle.hdr` (convertido del .exr de 17 MB a .hdr de 4,5 MB, misma resolución 2K). Brillo: `exposure` en cada plano (0.7).

### Minijuego del bombero con objetos inútiles

Se puede jugar si llevas la maleta con los 4 objetos que necesitan los heridos, **aunque también lleves objetos inútiles**: esos aparecen en el piso como distracción. Al final, la retroalimentación dice que llevaste objetos equivocados (también en el final bueno). Si falta alguno de los 4, sale el aviso "No tienes los objetos adecuados". La regla está en `canHelp` (`js/core/GameState.js`).

### El bombero se va en su camión

Sin los objetos adecuados, o si fallas el minijuego, hay un corte al plano `ff_truck`: solo el bombero y su camión. El bombero se sube y el camión sale **en reversa** por la izquierda (acción `drive`). El camión es provisional (`shape: 'truck'`); el modelo real va en `truck` (`data/assets.js`) y debe mirar hacia +x (la derecha). Sonido opcional: `sfx_truck`.

Acción `drive` (`data/story.js`): `{ drive: 'truck', to: 'away', seconds: 3.2, idle: 0.9 }` — el motor vibra `idle` segundos, luego el objeto acelera hasta el marcador `to`; las ruedas del provisional giran solas.

### Recorridos en los escenarios reales

Los personajes caminan en línea recta entre marcadores, así que cada ruta tiene **puntos de paso** para no atravesar muebles: en la habitación `aisle` (entre la cama y la pared) y el armario se alcanza por el lado del escritorio; en la sala `leftAisle`, `dogCall` y `dogFront`; en el pasillo la salida de emergencia se cruza por el lado libre de la puerta. Al acostarse, el niño queda con la cabeza en la almohada: `{ pose: 'hero', as: 'lying', head: 'right' }`.

### Acción "drop" (caída de un objeto con personajes)

En `data/story.js`: `{ drop: 'elevator', with: ['mom'], rattle: 1.0, distance: 7, shake: 1, sound: 'sfx_collapse' }`.
Primero todo tiembla de forma errática y cada vez más fuerte durante `rattle` segundos (las luces que caen con el objeto parpadean), luego cae `distance` metros con gravedad y queda oculto. Al volver a entrar al plano todo regresa a su lugar.

### Animaciones automáticas (`js/config.js`)

| Opción | Qué hace |
|--------|----------|
| `textSpeed` | Letras por segundo de los diálogos. Con `0`, el texto aparece completo. El primer clic completa el texto y el segundo continúa. |
| `anim.flipTurn` | Los personajes 2D giran como una carta al cambiar de dirección, estilo Paper Mario. |
| `anim.walkBob` | Rebote al caminar. Solo aplica si el sprite no trae su propia animación `walk`. |
| `anim.idleBreath` | Respiración suave cuando el personaje está quieto. |
| `cameraIntro` | Acercamiento suave de la cámara al entrar a cada plano. |

### Textos

- En `data/texts.js`, el formato `"Nombre: texto"` muestra el nombre de quien habla en una etiqueta aparte.
- `{atrapado}` se cambia solo a "atrapada" o "atrapado" según si quedó atrás la madre o el perro.

## Modo de prueba

En `js/config.js`, `debug: true` activa los atajos de prueba. El panel con el estado de la partida empieza **oculto** y se muestra u oculta con la tecla **X**. Atajos de teclado:

| Tecla | Acción |
|-------|--------|
| **T** | Deja el reloj en 5 segundos |
| **R** | Vuelve al menú |
| **E** | Abre el plano de ejemplos de assets |
| **0** | Borra el contador de finales |
| **X** | Muestra u oculta el panel de pruebas |

Antes de publicar, pon `debug: false`. Así tampoco se cargan los archivos de ejemplo.
