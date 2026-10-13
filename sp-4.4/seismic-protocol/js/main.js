// Punto de entrada: arma todas las piezas y arranca la experiencia.
import { CONFIG } from './config.js';
import { Assets } from './core/Assets.js';
import { Stage } from './core/Stage.js';
import { Timer } from './core/Timer.js';
import { AudioManager } from './core/AudioManager.js';
import { StoryEngine } from './core/StoryEngine.js';
import { UI } from './ui/UI.js';

import { ASSETS } from '../data/assets.js';
import { PLANES } from '../data/planes.js';
import { STORY } from '../data/story.js';
import { TEXTS } from '../data/texts.js';
import { ENDINGS } from '../data/endings.js';
import { FEEDBACK_RULES } from '../data/feedback.js';

import * as packing from './minigames/packing.js';
import * as qte from './minigames/qte.js';
import * as aid from './minigames/aid.js';

async function boot() {
  const ui = new UI(TEXTS);
  const assets = new Assets(ASSETS);
  ui.loading(0);
  await assets.preload(p => ui.loading(p));
  ui.loading(1);

  const stage = new Stage(document.querySelector('#gl'), document.querySelector('#viewport'));
  const timer = new Timer();
  const audio = new AudioManager(assets);
  ui.audio = audio;

  const engine = new StoryEngine({
    story: STORY, planes: PLANES, endings: ENDINGS, feedback: FEEDBACK_RULES, texts: TEXTS,
    assets, stage, ui, timer, audio,
    minigames: { packing, qte, aid },
  });

  stage.addUpdate(() => timer.update());
  stage.addUpdate(() => ui.updateLabels(stage));

  if (CONFIG.debug) {
    window.addEventListener('keydown', e => {
      if (e.key === 't' || e.key === 'T') timer.set(5);
      if (e.key === 'r' || e.key === 'R') engine.goto('menu');
      if (e.key === 'e' || e.key === 'E') engine.goto('ejemplos');
      if (e.key === '0') { engine.progress.reset(); engine.updateDebug(); }
      if (e.key === 'x' || e.key === 'X') ui.toggleDebug();   // mostrar/ocultar el panel de pruebas
    });
    window.seismic = engine; // acceso desde la consola del navegador
  }

  engine.start();
}

boot().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend',
    `<pre class="fatal">Error al iniciar: ${err.message}\n\n¿Abriste el archivo con doble clic? Usa Live Server (ver LEEME.md).</pre>`);
});
