// Capa de interfaz HTML/CSS sobre el canvas (base 1920×1080, escalada).
// Aquí no hay estilos: todo el aspecto visual está en css/theme.css y css/ui.css.
import { CONFIG } from '../config.js';
import { formatTime } from '../core/Timer.js';

const $ = sel => document.querySelector(sel);
const wait = s => new Promise(r => setTimeout(r, s * 1000));

export class UI {
  constructor(texts) {
    this.texts = texts;
    this.root = $('#ui');
    this.fadeEl = $('#fade');
    this.black = true;               // la pantalla arranca en negro
    this.labels = [];                // etiquetas ancladas a objetos 3D
    this.lastSecond = null;
    this.fadeEl.style.transitionDuration = `${CONFIG.fadeSeconds}s`;
  }

  t(id) { return this.texts[id] ?? id; }

  // ---------- Fundidos ----------
  async fadeOut() {
    if (this.black) return;
    this.black = true;
    this.fadeEl.classList.add('on');
    await wait(CONFIG.fadeSeconds);
  }

  async fadeIn() {
    if (!this.black) return;
    this.black = false;
    this.fadeEl.classList.remove('on');
    await wait(CONFIG.fadeSeconds);
  }

  setBlack() { this.black = true; this.fadeEl.classList.add('on'); }

  // ---------- Carga ----------
  loading(progress) {
    $('#loading').hidden = progress >= 1;
    $('#loading-bar').style.width = `${Math.round(progress * 100)}%`;
  }

  // ---------- Menú ----------
  menu() {
    const el = $('#menu');
    el.hidden = false;
    const btn = $('#btn-start');
    btn.textContent = this.t('start');
    return new Promise(resolve => {
      btn.onclick = () => { el.hidden = true; resolve(); };
    });
  }

  // ---------- Tarjetas de capítulo ----------
  showCard({ style = 'chapter', title = '', subtitle = '' }, format = x => x) {
    const el = $('#card');
    el.className = `screen card card--${style}`;
    void el.offsetWidth;
    el.classList.add('enter');
    $('#card-title').textContent = format(title);
    $('#card-subtitle').textContent = format(subtitle);
    $('#card-clock-text').textContent = style === 'escape' ? formatTime(CONFIG.quakeSeconds) : (style === 'zero' ? '0' : '');
    el.hidden = false;
  }

  hideCard() { $('#card').hidden = true; }

  // ---------- Diálogo (texto que aparece letra por letra) ----------
  // Primer clic: muestra el texto completo. Segundo clic: continúa.
  dialog(text) {
    const el = $('#dialog');
    const p = $('#dialog-text');
    const narration = text.startsWith('*');
    let full = narration ? text.slice(1) : text;
    // "Mamá: texto" → nombre de quien habla en una etiqueta aparte
    const sp = !narration && full.match(/^([^:]{1,18}):\s+(.*)$/s);
    const speaker = $('#dialog-speaker');
    speaker.hidden = !sp;
    if (sp) { speaker.textContent = sp[1]; full = sp[2]; }
    el.classList.toggle('narration', narration);
    el.classList.remove('typing');
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');

    let shown = CONFIG.textSpeed > 0 ? 0 : full.length;
    p.textContent = full.slice(0, shown);
    let typer = null;
    if (shown < full.length) {
      el.classList.add('typing');
      typer = setInterval(() => {
        shown++;
        p.textContent = full.slice(0, shown);
        if (shown % 3 === 0 && full[shown - 1] !== ' ') this.audio?.play('sfx_typing');
        if (shown >= full.length) finishTyping();
      }, 1000 / CONFIG.textSpeed);
    }
    const finishTyping = () => {
      clearInterval(typer); typer = null;
      shown = full.length;
      p.textContent = full;
      el.classList.remove('typing');
    };

    return new Promise(resolve => {
      const advance = e => {
        e?.stopPropagation?.();
        if (typer) { finishTyping(); return; }
        cleanup();
        resolve();
      };
      const key = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(e); } };
      const cleanup = () => {
        clearTimeout(armTimer);
        clearInterval(typer);
        el.hidden = true;
        el.onclick = null;
        window.removeEventListener('keydown', key);
      };
      // pequeño retraso para que el clic que abrió el diálogo no lo cierre
      const armTimer = setTimeout(() => {
        el.onclick = advance;
        window.addEventListener('keydown', key);
      }, 150);
      this._dialogCancel = cleanup;
    });
  }

  // ---------- Opciones ----------
  prompt(text) {
    const el = $('#prompt');
    el.textContent = text || '';
    el.hidden = !text;
    if (text) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
  }

  addLabel(text, onClick, cls = '') {
    const el = document.createElement(onClick ? 'button' : 'div');
    el.className = `hotspot-label ${cls}`;
    el.innerHTML = text;
    if (onClick) el.onclick = onClick;
    $('#labels').appendChild(el);
    const label = { el, anchor: null, offsetY: 14 };
    this.labels.push(label);
    return label;
  }

  addButton(text, { x, y, arrow }, onClick) {
    const el = document.createElement('button');
    el.className = `choice-button ${arrow ? `arrow arrow--${arrow}` : ''}`;
    el.innerHTML = `<span>${text}</span>`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.onclick = onClick;
    $('#labels').appendChild(el);
    this.labels.push({ el, fixed: true });
    return el;
  }

  removeLabel(label) {
    label.el.remove();
    this.labels = this.labels.filter(l => l !== label);
  }

  updateLabels(stage) {
    for (const l of this.labels) {
      if (l.fixed || !l.anchor) continue;
      const p = stage.screenPosOf(l.anchor);
      if (!p) continue;
      l.el.style.left = `${p.x}px`;
      l.el.style.top = `${p.y - l.offsetY}px`;
    }
  }

  clearChoices() {
    $('#labels').innerHTML = '';
    this.labels = [];
    this.prompt('');
    this.tooltip(null);
  }

  // Texto flotante junto al puntero (nombre de un objeto al pasar el mouse).
  tooltip(text, pos) {
    const el = $('#tooltip');
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.hidden = false;
  }

  // ---------- Reloj (con pulso cada segundo) ----------
  clock(visible, seconds) {
    const el = $('#clock');
    el.hidden = !visible || !$('#card').hidden;   // en la tarjeta "ESCAPA" el reloj grande ocupa su lugar
    if (seconds == null) return;
    const txt = formatTime(seconds);
    $('#clock-text').textContent = txt;
    el.classList.toggle('urgent', seconds <= 15);
    el.classList.toggle('critical', seconds <= 10);
    // la tarjeta "ESCAPA" muestra el mismo reloj, ya corriendo
    const card = $('#card');
    if (!card.hidden && card.classList.contains('card--escape')) $('#card-clock-text').textContent = txt;

    const sec = Math.ceil(seconds);
    if (sec !== this.lastSecond) {
      this.lastSecond = sec;
      for (const p of document.querySelectorAll('.clock-pulse')) {
        p.classList.remove('beat'); void p.offsetWidth; p.classList.add('beat');
      }
    }
  }

  // ---------- Contenedor de minijuegos ----------
  minigameRoot() {
    const el = $('#minigame');
    el.innerHTML = '';
    el.hidden = false;
    return el;
  }

  closeMinigame() {
    const el = $('#minigame');
    el.innerHTML = '';
    el.hidden = true;
  }

  // ---------- Finales ----------
  // Devuelve 'menu' o 'section' según el botón elegido.
  async ending({ ending, cause, feedback, progress, retryLabel }) {
    if (ending.death) {
      const d = $('#death');
      d.hidden = false;
      d.classList.remove('enter'); void d.offsetWidth; d.classList.add('enter');
      await wait(2.4);
      d.hidden = true;
    }
    const el = $('#ending');
    el.className = `screen ending ending--${ending.layout || 'standard'} ${ending.death ? 'ending--death' : ''}`;
    // "final escondite" → "final" arriba y "escondite" grande (como en el wireframe)
    const m = ending.title.match(/^(\S+)\s+(.*)$/);
    $('#ending-title').innerHTML = m
      ? `<span class="t1">${m[1]}</span><span class="t2">${m[2]}</span>`
      : ending.title;
    $('#ending-cause').textContent = cause;
    const img = $('#ending-image');
    img.style.backgroundImage = ending.image ? `url("${ending.image}")` : '';
    img.classList.toggle('placeholder', !ending.image);

    const list = $('#ending-feedback');
    list.innerHTML = '';
    const row = (cls, iconText, iconImg, text) => {
      const li = document.createElement('li');
      li.className = cls;
      const icon = document.createElement('span');
      icon.className = 'fb-icon';
      if (iconImg) icon.style.backgroundImage = `url("${iconImg}")`;
      else icon.textContent = iconText;
      const txt = document.createElement('span');
      txt.className = 'fb-text';
      txt.textContent = text;
      li.append(txt, icon);                       // texto y círculo a la derecha (wireframe)
      li.style.animationDelay = `${0.35 + list.children.length * 0.12}s`;
      list.appendChild(li);
    };
    for (const f of feedback) row(f.ok ? 'ok' : 'bad', f.ok ? '✓' : '✗', f.icon, f.text);
    if (progress) row('progress', '★', null, progress);

    const btnMenu = $('#btn-menu');
    const btnSection = $('#btn-section');
    btnMenu.textContent = this.t('retry_menu');
    btnSection.hidden = !retryLabel;
    btnSection.textContent = retryLabel || '';
    el.hidden = false;
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');

    return new Promise(resolve => {
      btnMenu.onclick = () => { el.hidden = true; resolve('menu'); };
      btnSection.onclick = () => { el.hidden = true; resolve('section'); };
    });
  }

  // Oculta todo lo interactivo (se usa al saltar de nodo: reloj en 0, reinicio, etc.).
  clearAll() {
    this.clearChoices();
    this._dialogCancel?.();
    $('#dialog').hidden = true;
    this.closeMinigame();
    this.hideCard();
    for (const id of ['#menu', '#ending', '#death']) $(id).hidden = true;
  }

  // ---------- Panel de pruebas ----------
  debug(info) {
    const el = $('#debug');
    if (!CONFIG.debug) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = info;
  }
}
