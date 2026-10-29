// ESCENAS VISUALES DE LA INTRODUCCIÓN (data/texts.js → intro_pages: [{ text, scene }]).
//   city        → cielo nublado que se mueve + edificios 2D en 4 capas (profundidad) + degradado
//   characters  → Carlos, su mamá y su perro con sus animaciones de "quieto"
//   choice      → Carlos en el centro y dos opciones: la maleta / la maleta "prohibida"
// Cada escena devuelve una función para limpiarla (detiene las animaciones).
import { SPRITES } from '../../data/sprites.js';

const PX_PER_M = 340;   // tamaño de los personajes en pantalla (píxeles de la base 1920×1080 por metro)

// Dibuja una animación de hoja (data/sprites.js) en un <canvas>, con los pies en (x, y).
function spriteCanvas(parent, clip, { x, y, scale = 1, flip = false }) {
  const img = new Image();
  img.src = clip.sheet;
  const W = clip.w * PX_PER_M * scale, H = clip.h * PX_PER_M * scale;
  const c = document.createElement('canvas');
  c.className = 'intro-sprite';
  c.width = Math.round(W); c.height = Math.round(H);
  c.style.width = `${W}px`; c.style.height = `${H}px`;
  const ax = flip ? 1 - clip.ax : clip.ax;
  c.style.left = `${x - ax * W}px`;
  c.style.top = `${y - clip.ay * H}px`;
  if (flip) c.style.transform = 'scaleX(-1)';
  parent.appendChild(c);
  const ctx = c.getContext('2d');
  let raf = 0;
  const t0 = performance.now();
  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (!img.complete || !img.naturalWidth) return;
    const fw = img.naturalWidth / clip.cols, fh = img.naturalHeight / clip.rows;
    const f = Math.floor((performance.now() - t0) / 1000 * clip.fps) % clip.count;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, (f % clip.cols) * fw, Math.floor(f / clip.cols) * fh, fw, fh, 0, 0, c.width, c.height);
  };
  draw();
  return () => cancelAnimationFrame(raf);
}

function shadow(parent, x, y, w) {
  const s = document.createElement('div');
  s.className = 'intro-shadow';
  s.style.left = `${x - w / 2}px`; s.style.top = `${y - 10}px`; s.style.width = `${w}px`;
  parent.appendChild(s);
}

export const INTRO_SCENES = {
  city(stage) {
    stage.classList.add('scene-city');
    stage.innerHTML = `
      <div class="intro-sky"></div>
      ${[1, 2, 3, 4].map(i => `<div class="intro-layer l${i}" style="background-image:url('assets/intro/edificios_${i}.webp');background-size:auto 100%"></div>`).join('')}
      <div class="intro-gradient"></div>`;
    return () => {};
  },

  characters(stage) {
    stage.classList.add('scene-black');
    const floor = 720;
    const stops = [
      spriteCanvas(stage, SPRITES.mom.idle, { x: 660, y: floor, flip: true }),    // mira hacia Carlos
      spriteCanvas(stage, SPRITES.hero.idle, { x: 960, y: floor }),
      spriteCanvas(stage, SPRITES.dog.idle, { x: 1270, y: floor }),
    ];
    shadow(stage, 660, floor, 230); shadow(stage, 960, floor, 200); shadow(stage, 1270, floor, 250);
    stage.querySelectorAll('.intro-shadow').forEach(s => stage.prepend(s));
    return () => stops.forEach(f => f());
  },

  choice(stage, t) {
    stage.classList.add('scene-black');
    const floor = 620;
    shadow(stage, 960, floor, 220);
    const stop = spriteCanvas(stage, SPRITES.hero.idle, { x: 960, y: floor, scale: 1.15 });
    const opt = (cls, label, extra) => {
      const d = document.createElement('div');
      d.className = `intro-option ${cls}`;
      d.innerHTML = `<div class="intro-option-art"><img src="assets/sprites/maleta.png" alt="">${extra}</div>
        <div class="hotspot-label intro-option-label">${label}</div>`;
      stage.appendChild(d);
    };
    opt('left', t('intro_opt_take'), '');
    opt('right', t('intro_opt_leave'), '<span class="intro-forbidden"></span>');
    return stop;
  },
};
