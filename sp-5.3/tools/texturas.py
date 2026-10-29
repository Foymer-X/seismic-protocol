# Genera texturas procedurales SIN COSTURAS (se repiten sin que se note) para los materiales del juego.
# Uso:  python tools/texturas.py        (necesita: pip install pillow numpy)
# Cada material produce: <nombre>_col.webp (color), <nombre>_alt.webp (altura → relieve) y <nombre>_rug.webp (rugosidad).
# Las de "detalle" son casi grises: el color final se pone en data/assets.js (color: '#...'), así una misma
# textura sirve para paredes de distintos colores.
import os, numpy as np
from PIL import Image

N = 1024
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'textures', 'propuesta')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]

def noise(beta=2.0, sx=1.0, sy=1.0, lo=0.0, hi=0.5, seed=None):
    """Ruido espectral periódico (sin costuras). beta alto = manchas grandes. sx/sy estiran (vetas)."""
    r = np.random.default_rng(seed) if seed is not None else rng
    f = np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2); f[0, 0] = 1
    amp = f ** (-beta / 2) * ((f >= lo) & (f <= hi))
    amp[0, 0] = 0
    n = np.real(np.fft.ifft2(np.fft.fft2(r.standard_normal((N, N))) * amp))
    return (n - n.mean()) / (n.std() + 1e-9)

def norm01(a): a = a - a.min(); return a / (a.max() + 1e-9)
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def save(name, col, alt, rug):
    col = np.clip(col, 0, 1); alt = np.clip(alt, 0, 1); rug = np.clip(rug, 0, 1)
    if col.ndim == 2: col = np.stack([col] * 3, -1)
    Image.fromarray((col * 255).astype(np.uint8)).save(f'{OUT}/{name}_col.webp', quality=88)
    Image.fromarray((alt * 255).astype(np.uint8)).convert('RGB').save(f'{OUT}/{name}_alt.webp', quality=90)
    Image.fromarray((rug * 255).astype(np.uint8)).convert('RGB').save(f'{OUT}/{name}_rug.webp', quality=88)
    print('ok', name)

def tint(gray, c):   # gris de detalle × color
    return gray[..., None] * np.array(c)[None, None, :]

def cells(rows, cols, offset_rows=0.5, jitter_len=False, seed=1):
    """Ladrillos / baldosas / tablas: id de pieza, distancia al borde (en píxeles)."""
    r = np.random.default_rng(seed)
    y, x = np.mgrid[0:N, 0:N].astype(float)
    ch = N / rows; cw = N / cols
    row = np.floor(y / ch).astype(int)
    shift = (row * offset_rows % 1.0) * cw
    if jitter_len:
        shift = (r.random(rows)[row] * cw)
    xs = (x + shift) % N
    col = np.floor(xs / cw).astype(int)
    dx = np.minimum(xs - col * cw, (col + 1) * cw - xs)
    dy = np.minimum(y - row * ch, (row + 1) * ch - y)
    pid = row * 1000 + col % cols
    rnd = r.random(rows * 1000 + cols)
    return pid, np.minimum(dx, dy), rnd[pid], dx, dy

# ---------- 1) Pañete / yeso (paredes) — detalle claro, se tiñe ----------
big = noise(3.2, hi=0.02); mid = noise(2.2, lo=0.01, hi=0.12); fine = noise(0.6, lo=0.1)
alt = norm01(0.6 * mid + 0.35 * fine + 0.2 * big)
col = 0.93 + 0.035 * big + 0.02 * mid + 0.012 * fine
save('panete', col, alt, 0.85 + 0.08 * norm01(fine))

# ---------- 2) Madera del piso (tablas) — color propio ----------
pid, edge, rv, dx, dy = cells(8, 2, jitter_len=True, seed=3)        # 8 tablas por mosaico (vetas en X)
grain = noise(2.6, sx=0.08, sy=1.0, hi=0.4)                          # vetas largas en X
rings = np.sin((noise(3, sx=0.15, sy=1, hi=0.05) * 3 + np.mgrid[0:N, 0:N][0] / N * 60)) * 0.5
base = np.array([0.55, 0.34, 0.20])
var = (rv - 0.5) * 0.18
fib = noise(1.2, sx=0.05, sy=1.0, lo=0.05)
g = 0.84 + 0.09 * grain + 0.06 * rings + 0.04 * fib + var
col = tint(g, base)
gap = sm(1.5, 3.5, edge)
col *= (0.55 + 0.45 * gap)[..., None]
alt = norm01(0.25 * grain + 0.15 * rings) * 0.6 + 0.4 * gap
save('madera_piso', col, alt, 0.62 + 0.15 * (1 - gap) + 0.06 * grain)

# ---------- 3) Madera pintada (muebles verdes / blancos / puertas) — detalle, se tiñe ----------
brush = noise(1.8, sx=1.0, sy=0.06, hi=0.45)      # pinceladas verticales
gr = noise(2.4, sx=1.0, sy=0.1, hi=0.3)
blot = noise(3.0, hi=0.03)
col = 0.90 + 0.04 * brush + 0.025 * gr + 0.03 * blot
save('pintura', col, norm01(0.6 * brush + 0.4 * gr), 0.55 + 0.1 * norm01(brush))

# ---------- 4) Tela (sofá, cobija, cama del perro) — detalle, se tiñe ----------
y, x = np.mgrid[0:N, 0:N].astype(float)
k = 2 * np.pi * 96 / N
wv = 0.5 + 0.25 * np.sin(x * k) * np.sign(np.sin(y * k / 2)) + 0.25 * np.sin(y * k) * np.sign(np.sin(x * k / 2))
fuzz = noise(0.8, lo=0.05)
blot = noise(3.0, hi=0.03)
col = 0.86 + 0.07 * wv + 0.02 * fuzz + 0.03 * blot
save('tela', col, norm01(wv + 0.2 * fuzz), 0.92 + 0.05 * norm01(fuzz))

# ---------- 5) Baldosa (pasillos) — color propio ----------
pid, edge, rv, dx, dy = cells(4, 4, offset_rows=0.0, seed=5)
base = np.array([0.86, 0.80, 0.74])
speck = noise(0.7, lo=0.08)
g = 0.94 + (rv - 0.5) * 0.06 + 0.02 * speck + 0.02 * noise(3, hi=0.03)
col = tint(g, base)
grout = sm(2, 6, edge)
col = col * grout[..., None] + np.array([0.55, 0.52, 0.49]) * (1 - grout)[..., None]
alt = 0.75 * grout + 0.05 * norm01(speck)
save('baldosa', col, alt, 0.35 + 0.45 * (1 - grout) + 0.05 * norm01(speck))

# ---------- 6) Ladrillo — color propio ----------
pid, edge, rv, dx, dy = cells(16, 4, offset_rows=0.5, seed=9)
base = np.array([0.62, 0.30, 0.20])
g = 0.85 + (rv - 0.5) * 0.3 + 0.06 * noise(1.2, lo=0.03) + 0.05 * noise(3, hi=0.04)
col = tint(g, base)
mort = sm(3, 8, edge + 2 * noise(1.5, lo=0.02))
col = col * mort[..., None] + np.array([0.70, 0.67, 0.62]) * (1 - mort)[..., None]
alt = 0.7 * mort + 0.1 * norm01(noise(1, lo=0.05))
save('ladrillo', col, alt, 0.8 + 0.1 * (1 - mort))

# ---------- 7) Concreto con grietas y manchas (escape, ruinas) — detalle, se tiñe ----------
stain = noise(3.4, hi=0.015); mid = noise(2, lo=0.01, hi=0.15); pores = noise(0.3, lo=0.2)
ridge = 1 - np.abs(noise(2.6, hi=0.05, seed=11))
crack = sm(0.975, 0.997, ridge) * sm(-0.3, 0.8, noise(3.0, hi=0.02, seed=12))                               # líneas finas de grieta
drip = noise(2.0, sx=1.0, sy=0.08, hi=0.2)                    # chorreones verticales de suciedad
col = 0.88 + 0.06 * stain + 0.025 * mid - 0.05 * sm(1.5, 3, pores) - 0.04 * sm(0.5, 2, drip) * sm(-0.5, 1, stain)
col = col * (1 - 0.55 * crack)
alt = norm01(0.4 * mid + 0.25 * stain) * (1 - 0.8 * crack) - 0.2 * sm(1.5, 3, pores)
save('concreto', col, norm01(alt), 0.9 - 0.08 * sm(0.5, 2, drip))

# ---------- 8) Asfalto — color propio ----------
agg = noise(0.2, lo=0.15); mid = noise(2.2, lo=0.01, hi=0.12); stain = noise(3.2, hi=0.02)
g = 0.28 + 0.05 * mid + 0.04 * stain + 0.08 * sm(1.2, 2.5, agg)
col = np.stack([g, g * 1.01, g * 1.03], -1)
save('asfalto', col, norm01(0.5 * agg + 0.3 * mid), 0.88 - 0.25 * sm(0.5, 2, stain))

# ---------- 9) Metal pintado y gastado (barandas, ascensor, camión) — detalle, se tiñe ----------
brushed = noise(1.0, sx=0.03, sy=1.0, lo=0.02)
scr = sm(0.985, 1.0, 1 - np.abs(noise(1.6, sx=0.4, sy=1.0, hi=0.2, seed=21)))
spots = 0.5 * sm(1.8, 2.8, noise(2.0, hi=0.08, seed=22))
col = 0.82 + 0.04 * brushed + 0.12 * scr - 0.12 * spots
save('metal', col, norm01(0.3 * brushed - 0.5 * spots + 0.3 * scr), 0.45 + 0.1 * brushed * 0.3 + 0.35 * spots - 0.15 * scr)
print('listo →', OUT)
