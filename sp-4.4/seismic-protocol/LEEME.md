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

---

## Cómo funciona

- **Reloj:** dura 1:30 (`quakeSeconds`) y corre en tiempo real desde la pantalla "ESCAPA", con un pulso cada segundo. Si llega a 0 en cualquier momento, el juego decide entre **final rescatado** (maleta completa y llevada) y **final bajo escombros**.
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
