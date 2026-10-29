# Genera la MÚSICA y los EFECTOS DE SONIDO del juego (todo original, sintetizado aquí mismo: sin derechos de terceros).
# Estilo: videojuego "8 bits suave" — ondas cuadradas, triangulares y ruido (como las consolas clásicas),
# con un poco de eco/reverberación para que suene ambiental y no tan chillón.
# Uso:  python tools/sonido.py            (necesita: pip install numpy scipy  +  ffmpeg instalado)
# NOTA: music_menu, music_antes y music_terremoto ahora son canciones del equipo (no se generan aquí).
# Salida: assets/audio/*.mp3   ·   Para cambiar una melodía, edita su lista de notas más abajo y vuelve a correrlo.
import os, subprocess, tempfile
import numpy as np
from scipy.signal import fftconvolve, lfilter

SR = 44100
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{PROJ}/assets/audio'
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- utilidades
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def t_(d): return np.arange(int(d * SR)) / SR

def env(n, a=0.005, d=0.08, s=0.6, r=0.08):
    """ADSR en muestras para una nota de n muestras (r se suma al final)."""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n + R, s, dtype=np.float64)
    A = min(A, n); e[:A] = np.linspace(0, 1, A, endpoint=False) if A else e[:A]
    D2 = min(D, max(0, n - A)); e[A:A + D2] = np.linspace(1, s, D2, endpoint=False) if D2 else e[A:A + D2]
    e[n:] = np.linspace(e[n - 1] if n else s, 0, R) if R else e[n:]
    return e

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)

def highpass(x, fc):
    return x - lowpass(x, fc)

def osc(kind, f, n, duty=0.5, vib=0.0):
    t = np.arange(n) / SR
    ph = f * t
    if vib: ph = ph + vib * np.sin(2 * np.pi * 5.2 * t) / (2 * np.pi * 5.2) * f * 0.012
    ph = ph % 1.0
    if kind == 'tri':   return 4 * np.abs(ph - 0.5) - 1
    if kind == 'pulse': return np.where(ph < duty, 1.0, -1.0) - (2 * duty - 1)
    if kind == 'saw':   return 2 * ph - 1
    if kind == 'sine':  return np.sin(2 * np.pi * ph)
    raise ValueError(kind)

def nes_noise(n, period=1):
    """Ruido tipo consola (muestreado y mantenido): period alto = ruido más grave."""
    k = n // period + 2
    return np.repeat(rng.uniform(-1, 1, k), period)[:n]

def reverb(x, secs=2.2, mix=0.25, damp=3500):
    n = int(secs * SR)
    ir = rng.normal(0, 1, n) * np.exp(-np.linspace(0, 7, n))
    ir = lowpass(ir, damp); ir /= np.sqrt(np.sum(ir ** 2))
    if x.ndim == 1: x = np.stack([x, x])
    out = np.zeros((2, x.shape[1] + n - 1))
    for c in range(2):
        irc = np.roll(ir, c * 331)          # un poco distinto por canal → estéreo
        out[c] = fftconvolve(x[c], irc)
    dry = np.zeros_like(out); dry[:, :x.shape[1]] = x
    return dry * (1 - mix) + out * mix

def echo(x, delay=0.33, fb=0.35, mix=0.3, n_rep=5):
    d = int(delay * SR)
    y = x.copy() if x.ndim == 2 else np.stack([x, x])
    out = np.zeros((2, y.shape[1] + d * n_rep)); out[:, :y.shape[1]] += y
    for k in range(1, n_rep + 1):
        g = mix * fb ** (k - 1)
        ch = k % 2           # rebota entre izquierda y derecha
        out[ch, k * d:k * d + y.shape[1]] += y[ch] * g
    return out

def pan(x, p):  # p: -1 izquierda … 1 derecha
    return np.stack([x * np.sqrt((1 - p) / 2), x * np.sqrt((1 + p) / 2)])

def normalize(x, peak=0.89):
    m = np.max(np.abs(x)) or 1
    return x * (peak / m)

def save(name, x, kbps=112):
    x = np.clip(x, -1, 1)
    if x.ndim == 1: x = np.stack([x, x])
    pcm = (x.T * 32767).astype('<i2').tobytes()
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.raw', delete=False) as f:
        f.write(pcm); raw = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', raw,
                    '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', f'{OUT}/{name}.mp3'], check=True)
    os.remove(raw)
    print(f'{name}.mp3  {x.shape[1] / SR:5.1f} s  {os.path.getsize(f"{OUT}/{name}.mp3") / 1024:.0f} KB')

# ---------------------------------------------------------------- secuenciador
class Track:
    """Pista: se le agregan notas en tiempos de compás (beats) y se mezcla."""
    def __init__(self, bpm, beats, tail=3.0):
        self.bpm = bpm; self.spb = 60 / bpm
        self.len = beats * self.spb
        self.buf = np.zeros((2, int((self.len + tail) * SR)))

    def add(self, sig, beat, p=0.0, g=1.0):
        i = int(beat * self.spb * SR)
        s = pan(sig, p) * g
        j = min(self.buf.shape[1], i + s.shape[1])
        self.buf[:, i:j] += s[:, :j - i]

    def note(self, beat, dur, m, inst='tri', g=0.3, p=0.0, duty=0.25, a=0.005, d=0.1, s=0.6, r=0.12, vib=0.0, lp=None):
        n = int(dur * self.spb * SR)
        e = env(n, a, d, s, r)
        x = osc(inst, hz(m), len(e), duty, vib) * e
        if lp: x = lowpass(x, lp)
        self.add(x, beat, p, g)

    def kick(self, beat, g=0.5):
        n = int(0.22 * SR); t = np.arange(n) / SR
        f = 120 * np.exp(-t * 28) + 42
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
        self.add(x, beat, 0, g)

    def snare(self, beat, g=0.25, period=1):
        n = int(0.16 * SR); t = np.arange(n) / SR
        x = nes_noise(n, period) * np.exp(-t * 22) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
        self.add(lowpass(x, 7000), beat, 0.1, g)

    def hat(self, beat, g=0.08, p=0.3):
        n = int(0.05 * SR); t = np.arange(n) / SR
        self.add(highpass(nes_noise(n), 5000) * np.exp(-t * 80), beat, p, g)

def chord_arp(tr, start, bars, chord, pattern, step=0.5, inst='pulse', g=0.12, duty=0.125, p=0.25, lp=5000, r=0.1):
    """Arpegio: chord = notas MIDI; pattern = índices dentro del acorde (se repite)."""
    b = start; k = 0
    while b < start + bars * 4 - 1e-6:
        m = chord[pattern[k % len(pattern)] % len(chord)] + 12 * (pattern[k % len(pattern)] // len(chord))
        tr.note(b, step * 0.9, m, inst, g, p, duty, d=0.06, s=0.35, r=r, lp=lp)
        b += step; k += 1

def melody(tr, start, notes, inst='tri', g=0.28, p=-0.1, duty=0.5, vib=1.0, lp=None, r=0.15):
    """notes: lista de (beats, midi|None)."""
    b = start
    for dur, m in notes:
        if m is not None: tr.note(b, dur * 0.95, m, inst, g, p, duty, a=0.01, d=0.12, s=0.7, r=r, vib=vib, lp=lp)
        b += dur
    return b

# acordes (MIDI, octava media)
C, Dm, Em, F, G, Am, Bb, A, E = [60, 64, 67], [62, 65, 69], [64, 67, 71], [65, 69, 72], [67, 71, 74], [57, 60, 64], [58, 62, 65], [57, 61, 64], [52, 56, 59]
def low(ch, o=-12): return [n + o for n in ch]

# ---------------------------------------------------------------- MÚSICA
# El tema de Carlos (leitmotiv): suena en el menú (menor, con esperanza) y vuelve en el final bueno (mayor).
LEIT_MINOR = [(1, 69), (1, 72), (1, 76), (1, 74), (2, 72), (1, 71), (1, 67),
              (1, 69), (1, 72), (1, 77), (1, 76), (3, 74), (1, None),
              (1, 72), (1, 74), (1, 76), (1, 79), (2, 77), (1, 76), (1, 72),
              (1, 74), (1, 72), (1, 71), (1, 67), (3, 69), (1, None)]

def music_menu():
    tr = Track(84, 64)
    prog = [Am, F, C, G] * 4
    for i, ch in enumerate(prog):
        b = i * 4
        chord_arp(tr, b, 1, ch, [0, 1, 2, 3, 2, 1, 0, 1], 0.5, g=0.07, duty=0.125, lp=3800)
        tr.note(b, 3.8, low(ch, -24)[0], 'tri', 0.26, 0, a=0.02, s=0.8, r=0.3)
        for m in ch: tr.note(b, 4, m - 12, 'saw', 0.025, 0.0, a=0.6, d=0.5, s=0.8, r=0.8, lp=900)   # colchón suave
    melody(tr, 16, LEIT_MINOR, 'tri', 0.22, -0.15, vib=1.2)
    melody(tr, 48, LEIT_MINOR[:13], 'pulse', 0.06, 0.2, duty=0.25, vib=1.0, lp=3000)
    for i in range(32, 64, 2): tr.hat(i + 1, 0.035)
    return tr

def music_antes():
    tr = Track(100, 64)
    prog = [F, Dm, Bb, C, F, Dm, Bb, C, Dm, Bb, F, C, Bb, C, F, F]
    for i, ch in enumerate(prog):
        b = i * 4
        chord_arp(tr, b, 1, ch, [0, 1, 2, 1, 3, 1, 2, 1], 0.5, g=0.075, duty=0.125, lp=4200)
        root = low(ch, -24)[0]
        for q in range(4): tr.note(b + q, 0.8, root if q % 2 == 0 else root + 7, 'tri', 0.22, 0, d=0.1, s=0.5, r=0.08)
        for q in range(4): tr.hat(b + q + 0.5, 0.03)
    mel = [(1, 69), (1, 72), (2, 74), (1, 77), (0.5, 76), (0.5, 74), (2, 72), (1, 74), (1, 72), (1, 70), (1, 69), (3, 67), (1, None),
           (1, 69), (1, 72), (2, 77), (1, 76), (1, 74), (2, 69), (1, 70), (1, 74), (1, 72), (1, 70), (2, 69), (2, 67),
           (1, 74), (1, 77), (2, 81), (1, 79), (1, 77), (2, 74), (1, 77), (1, 76), (1, 72), (1, 69), (3, 72), (1, None),
           (1, 70), (1, 74), (1, 72), (1, 70), (2, 69), (1, 67), (1, 72), (4, 65), (4, None)]
    melody(tr, 0, mel, 'pulse', 0.085, -0.1, duty=0.5, vib=1.0, lp=3500)
    melody(tr, 0, [(d, m - 12 if m else None) for d, m in mel], 'tri', 0.07, 0.1, vib=0.6)
    return tr

def music_terremoto():
    tr = Track(138, 64, tail=2.0)
    prog = [Dm, Dm, Bb, Bb, C, C, A, A] * 2
    for i, ch in enumerate(prog):
        b = i * 4
        root = low(ch, -24)[0]
        for e8 in range(8):     # bajo galopante
            tr.note(b + e8 * 0.5, 0.42, root + (12 if e8 % 4 == 3 else 0), 'pulse', 0.11, 0, duty=0.5, d=0.05, s=0.5, r=0.03, lp=1800)
        chord_arp(tr, b, 1, ch, [0, 1, 2, 3, 2, 1], 0.25, g=0.05, duty=0.25, lp=3000, r=0.04)
        tr.kick(b, 0.55); tr.kick(b + 2, 0.55); tr.kick(b + 2.75, 0.3)
        tr.snare(b + 1, 0.2); tr.snare(b + 3, 0.2)
        for e8 in range(8): tr.hat(b + e8 * 0.5, 0.04 if e8 % 2 else 0.06)
    # alarma: nota aguda que sube cada 8 compases + tensión al final
    for k, m in enumerate([74, 77, 81, 79]):
        tr.note(k * 16, 7.5, m, 'tri', 0.07, -0.3, a=1.5, s=0.9, r=0.5, vib=4.0)
    stabs = [(0, 74), (1.5, 74), (3, 72), (4, 70), (5.5, 69), (7, 69)]
    for blk in (32, 48):
        for b, m in stabs: tr.note(blk + b, 0.4, m, 'pulse', 0.06, 0.25, duty=0.25, d=0.05, s=0.4, lp=4000)
    return tr

def music_despues():
    tr = Track(68, 64, tail=4.0)
    prog = [Am, F, C, G, Am, F, G, E, F, G, Em, Am, F, G, Am, Am]
    for i, ch in enumerate(prog):
        b = i * 4
        for m in ch: tr.note(b, 4, m - 12, 'saw', 0.03, 0.0, a=1.0, d=0.6, s=0.8, r=1.2, lp=700)
        tr.note(b, 3.6, low(ch, -24)[0], 'tri', 0.2, 0, a=0.05, s=0.7, r=0.4)
        # caja de música
        for k, idx in enumerate([0, 2, 1, 2]): tr.note(b + k, 0.6, ch[idx] + 12, 'pulse', 0.04, 0.3, duty=0.125, d=0.3, s=0.1, r=0.4, lp=3500)
    mel = [(2, 76), (1, 74), (1, 72), (3, 72), (1, None), (2, 71), (1, 72), (1, 74), (4, 71),
           (2, 72), (1, 71), (1, 69), (2, 69), (2, 72), (3, 71), (1, 68), (4, None),
           (2, 69), (1, 71), (1, 72), (2, 74), (2, 76), (2, 71), (2, 67), (4, 67),
           (2, 72), (1, 71), (1, 69), (2, 74), (2, 71), (8, 69)]
    melody(tr, 0, mel, 'tri', 0.2, -0.15, vib=1.5, r=0.4)
    return tr

def music_final():
    tr = Track(92, 48, tail=4.0)
    prog = [C, G, Am, F, C, G, F, C, F, G, Em, Am, F, G, C, C]
    prog = prog[:12]
    for i, ch in enumerate(prog):
        b = i * 4
        chord_arp(tr, b, 1, ch, [0, 1, 2, 3, 4, 3, 2, 1], 0.5, g=0.07, duty=0.125, lp=4500)
        tr.note(b, 3.8, low(ch, -24)[0], 'tri', 0.24, 0, s=0.8, r=0.3)
        for m in ch: tr.note(b, 4, m - 12, 'saw', 0.025, 0, a=0.5, s=0.8, r=0.8, lp=1000)
        tr.hat(b + 1, 0.03); tr.hat(b + 3, 0.03)
    LEIT_MAJOR = [(1, 67), (1, 72), (1, 76), (1, 74), (2, 72), (1, 71), (1, 67),
                  (1, 69), (1, 72), (1, 77), (1, 76), (3, 74), (1, None),
                  (1, 72), (1, 74), (1, 76), (1, 79), (2, 77), (1, 76), (1, 74),
                  (1, 72), (1, 74), (1, 76), (1, 79), (4, 84)]
    melody(tr, 8, LEIT_MAJOR, 'pulse', 0.075, -0.1, duty=0.5, vib=1.0, lp=3800)
    melody(tr, 8, LEIT_MAJOR, 'tri', 0.12, 0.1, vib=0.8)
    return tr

# ---------------------------------------------------------------- EFECTOS
def blip(f0, f1, dur, inst='pulse', duty=0.25, g=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.geomspace(f0, f1, n)
    ph = np.cumsum(f) / SR % 1.0
    x = (np.where(ph < duty, 1.0, -1.0) if inst == 'pulse' else 4 * np.abs(ph - 0.5) - 1)
    return x * np.exp(-t * 4 / dur) * g

def seq(notes, step, inst='pulse', duty=0.25, g=0.4, decay=8):
    n = int(step * SR); out = []
    for m in notes:
        t = np.arange(n) / SR
        x = osc(inst, hz(m), n, duty) * np.exp(-t * decay)
        out.append(x * g)
    return np.concatenate(out)

def loop_seamless(x, xf=1.0):
    """Hace que un sonido largo empalme sin corte consigo mismo (fundido cruzado del final al inicio)."""
    k = int(xf * SR)
    head, body, tail = x[..., :k], x[..., k:-k], x[..., -k:]
    w = np.linspace(0, 1, k)
    return np.concatenate([tail * (1 - w) + head * w, body], axis=-1) if x.ndim == 1 else \
        np.concatenate([tail * (1 - w) + head * w, body], axis=-1)

def sfx_quake():
    d = 9.0; n = int(d * SR); t = np.arange(n) / SR
    brown = np.cumsum(rng.normal(0, 1, n)); brown = highpass(brown, 20); brown /= np.max(np.abs(brown))
    rumble = lowpass(brown, 140) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t))
    sub = np.sin(2 * np.pi * 38 * t + 3 * np.sin(2 * np.pi * 0.5 * t)) * 0.35
    crack = np.zeros(n)
    for _ in range(14):    # crujidos y golpecitos
        i = rng.integers(0, n - SR // 4); m = int(SR * rng.uniform(0.03, 0.12))
        crack[i:i + m] += lowpass(nes_noise(m, int(rng.integers(2, 9))), 1600) * np.exp(-np.linspace(0, 6, m)) * rng.uniform(0.15, 0.4)
    x = normalize(rumble + sub + crack, 0.9)
    x = loop_seamless(np.stack([x, np.roll(x, 2000)]), 1.0)
    return x

def sfx_rain():
    d = 8.0; n = int(d * SR)
    hiss = lowpass(highpass(rng.normal(0, 1, n), 700), 6000) * 0.25
    drops = np.zeros(n)
    for _ in range(900):
        i = rng.integers(0, n - 800); m = int(rng.integers(150, 600))
        f = rng.uniform(1800, 5200)
        drops[i:i + m] += np.sin(2 * np.pi * f * np.arange(m) / SR) * np.exp(-np.linspace(0, 9, m)) * rng.uniform(0.02, 0.09)
    l = hiss + drops; r = np.roll(hiss, 9000) + np.roll(drops, 5000)
    return loop_seamless(normalize(np.stack([l, r]), 0.7), 1.0)

def sfx_collapse():
    n = int(2.6 * SR); t = np.arange(n) / SR
    crash = nes_noise(n, 3) * np.exp(-t * 2.2)
    crash = lowpass(crash, 2500)
    thump = np.sin(2 * np.pi * np.cumsum(60 * np.exp(-t * 3) + 30) / SR) * np.exp(-t * 2.5) * 0.9
    debris = np.zeros(n)
    for _ in range(26):
        i = rng.integers(int(0.1 * SR), n - SR // 5); m = int(SR * rng.uniform(0.02, 0.08))
        debris[i:i + m] += nes_noise(m, int(rng.integers(1, 5))) * np.exp(-np.linspace(0, 5, m)) * rng.uniform(0.1, 0.35)
    return reverb(normalize(crash + thump + debris * np.exp(-t * 0.8)), 1.6, 0.2, 2500)

def sfx_truck():
    n = int(3.2 * SR); t = np.arange(n) / SR
    engine = osc('pulse', 1, n)  # marcador
    f = 34 + 8 * np.clip(t / 1.2, 0, 1)
    engine = np.where((np.cumsum(f) / SR) % 1 < 0.3, 1.0, -1.0)
    engine = lowpass(engine, 300) * 0.35 * np.clip(t * 3, 0, 1)
    beeps = np.zeros(n)
    for k in range(4):       # pitido de reversa
        i = int((0.4 + k * 0.7) * SR); m = int(0.35 * SR)
        beeps[i:i + m] += osc('pulse', 1046, m, 0.5) * 0.12
    return reverb(normalize(engine + beeps, 0.8), 1.0, 0.15)

def sfx_click():   return lowpass(blip(520, 700, 0.06, 'pulse', 0.5, 0.35), 2600) + blip(520, 700, 0.06, 'tri', 0.5, 0.2)   # más grave y redondo
def sfx_typing():  return blip(900, 900, 0.045, 'pulse', 0.5, 0.18)
def sfx_ok():      return reverb(seq([72, 76, 79, 84], 0.06, 'pulse', 0.25, 0.3, 14), 0.8, 0.15)
def sfx_bad():     return reverb(seq([64, 58], 0.12, 'pulse', 0.5, 0.25, 9), 0.6, 0.12)
def sfx_hit():
    n = int(0.35 * SR); t = np.arange(n) / SR
    x = nes_noise(n, 4) * np.exp(-t * 10) * 0.7 + blip(300, 70, 0.35, 'pulse', 0.5, 0.4)
    return normalize(lowpass(x, 3000), 0.8)
def sfx_drop():    return blip(500, 220, 0.09, 'tri', 0.5, 0.6)
def sfx_pick():    return blip(330, 660, 0.07, 'tri', 0.5, 0.5)
def sfx_tick():    return blip(2000, 2000, 0.05, 'pulse', 0.5, 0.2)
def sfx_death():
    x = seq([67, 66, 65, 64], 0.28, 'pulse', 0.5, 0.25, 3)
    x = np.concatenate([x, seq([55], 1.2, 'tri', 0.5, 0.35, 1.5)])
    return reverb(x, 1.8, 0.25)
def sfx_card():    # golpe de tarjeta de capítulo
    n = int(1.2 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 6) + 40) / SR) * np.exp(-t * 4) + lowpass(nes_noise(n, 6), 900) * np.exp(-t * 9) * 0.4
    return reverb(normalize(x, 0.8), 1.5, 0.25)
def sfx_whoosh():
    n = int(0.6 * SR); t = np.arange(n) / SR
    x = rng.normal(0, 1, n); y = np.zeros(n)
    for i, fc in enumerate(np.linspace(400, 3000, 8)):   # barrido de filtro
        seg = slice(i * n // 8, (i + 1) * n // 8)
        y[seg] = lowpass(x, fc)[seg]
    return normalize(y * np.sin(np.pi * t / t[-1]), 0.4)
def sfx_ending():  # final bueno: fanfarria corta (antes de la música del final)
    x = seq([72, 76, 79], 0.12, 'pulse', 0.25, 0.3, 6)
    x = np.concatenate([x, seq([84], 0.9, 'pulse', 0.25, 0.3, 2)])
    return reverb(x, 1.6, 0.25)

if __name__ == '__main__':
    def mus(name, tr, rv=(2.2, 0.22), ech=None):
        x = tr.buf
        if ech: x = echo(x, *ech)[:, :x.shape[1]]
        x = reverb(x, *rv)[:, :x.shape[1]]
        save(name, normalize(x, 0.85), 112)
        return tr.len
    lens = {}
    # (reemplazada por la canción del equipo de diseño: assets/audio/music_menu.mp3 — no se regenera)
    # lens['music_menu'] = mus('music_menu', music_menu(), (2.6, 0.28), (60 / 84 * 0.75, 0.35, 0.25))
    # (reemplazada por la canción del equipo de diseño: assets/audio/music_antes.mp3 — no se regenera)
    # lens['music_antes'] = mus('music_antes', music_antes(), (1.8, 0.18))
    # (reemplazada por la canción del equipo de diseño: assets/audio/music_terremoto.mp3 — no se regenera)
    # lens['music_terremoto'] = mus('music_terremoto', music_terremoto(), (1.2, 0.12))
    lens['music_despues'] = mus('music_despues', music_despues(), (3.2, 0.32), (60 / 68 * 0.75, 0.4, 0.25))
    lens['music_final'] = mus('music_final', music_final(), (2.4, 0.24))
    for name in ['sfx_quake', 'sfx_rain']: save(name, globals()[name](), 96)
    for name in ['sfx_collapse', 'sfx_truck', 'sfx_click', 'sfx_typing', 'sfx_ok', 'sfx_bad', 'sfx_hit', 'sfx_drop',
                 'sfx_pick', 'sfx_tick', 'sfx_death', 'sfx_card', 'sfx_whoosh', 'sfx_ending']:
        save(name, normalize(globals()[name](), 0.8), 96)
    print('duración de cada bucle (loopLength en data/assets.js):', {k: round(v, 3) for k, v in lens.items()})
