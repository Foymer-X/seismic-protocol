# Seismic Protocol — Plantilla (Fase 3)

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
| Sala | `assets/models/sala.glb` | Entra por la puerta izquierda y sale por la derecha. |

Cómo quedó configurado cada uno (en `data/planes.js` y `data/assets.js`):

- `camera: 'model'`: usa la cámara exportada desde Blender.
- `lights: 'model'` + `ambient`: usa las luces del .glb, más un poco de luz de relleno.
- `toneMapping: 'agx'` + `exposure`: el mismo procesado de color de Blender (AgX). Sube o baja `exposure` para aclarar u oscurecer el plano.
- `shadows: { light: 'Light.001' }`: sombras de una sola luz. Se apagan en todo el juego con `CONFIG.quality.shadows = false`.
- `scale: 0.4` en `assets.js`: 1 unidad de Blender ≈ 40 cm, así que con esta escala todo queda en metros.
- `lightScale`: ajusta la intensidad de las luces exportadas.
- `materials`: corrige colores que Blender no exporta (el verde hecho con nodos).
- Objetos clicables por su nombre de Blender. Ejemplo: `{ id: 'bed', node: ['Plano subdividido', 'Cubo.008'] }`.

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

Sin modelo, el motor construye un edificio provisional con `CONFIG.qte.floors` pisos de escaleras en zigzag más el pasillo. Con el modelo real:

1. Conéctalo en `building_shell`.
2. En `data/planes.js → building`, escribe `path`: la lista de puntos por donde camina el personaje, en orden, desde lo más alto de las escaleras hasta la puerta de salida.

### Efectos de ambiente (lluvia, polvo, niebla)

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

En `js/config.js`, `debug: true` muestra un panel con el estado de la partida. Atajos de teclado:

| Tecla | Acción |
|-------|--------|
| **T** | Deja el reloj en 5 segundos |
| **R** | Vuelve al menú |
| **E** | Abre el plano de ejemplos de assets |
| **0** | Borra el contador de finales |

Antes de publicar, pon `debug: false`. Así tampoco se cargan los archivos de ejemplo.
