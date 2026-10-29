# Convierte las secuencias PNG de After Effects de los EFECTOS (lluvia, escombros que caen) en hojas WebP
# (una por efecto, todos los cuadros en un solo archivo) + data/effects.js
# Uso:  python tools/secuencias.py "carpeta con las secuencias"   (necesita: pip install pillow numpy)
#   la carpeta debe tener subcarpetas lluvia/ y escombros/ con <nombre>_00000.png, _00001.png, …
# Las secuencias son a pantalla completa (1920×1080): se reducen para que todos los cuadros quepan en una hoja
# de máximo 4096 px. Para que el bucle no "salte", los últimos cuadros se funden con los primeros.
import os, sys, json, math
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'efectos'
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAXTEX = 4096

# nombre: carpeta, primer cuadro, cuadros del bucle, cuadros de fundido, tamaño del cuadro, fps, refuerzo de alfa,
#         velo (alfa de fondo que se quita) y color fijo (None = el del dibujo)
EFECTOS = {
    # lluvia: las gotas son blancas; se quita el velo blanco uniforme del render (alfa 26) → la hoja pesa mucho menos
    'lluvia':    ('lluvia',    0, 48, 8, (640, 360), 24, 1.8, 26, (236, 243, 246)),
    'escombros': ('escombros', 8, 80, 8, (576, 324), 24, 1.0, 0, None),   # (el 0 y el 95 están vacíos: se usa la parte llena)
}

def load(folder, i, size, boost, veil, color):
    im = Image.open(f'{SRC}/{folder}/{folder}_{i:05d}.png').convert('RGBA').resize(size, Image.LANCZOS)
    a = np.array(im).astype(np.float32)
    a[..., 3] = np.clip((a[..., 3] - veil) * boost, 0, 255)
    if color: a[..., :3] = color
    return a

meta = {}
for name, (folder, start, n, xf, size, fps, boost, veil, color) in EFECTOS.items():
    frames = []
    for k in range(n):
        f = load(folder, start + k, size, boost, veil, color)
        if k < xf:                                    # fundido: el inicio se mezcla con lo que sigue al final
            w = (k + 1) / (xf + 1)
            g = load(folder, start + n + k, size, boost, veil, color)
            f = f * w + g * (1 - w)
        frames.append(f)
    fw, fh = size
    cols = MAXTEX // fw
    rows = math.ceil(n / cols)
    assert rows * fh <= MAXTEX, f'{name}: no cabe en {MAXTEX}px'
    sheet = np.zeros((rows * fh, cols * fw, 4), np.float32)
    for k, f in enumerate(frames):
        r, c = divmod(k, cols)
        sheet[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw] = f
    out = f'{PROJ}/assets/fx/{name}.webp'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    # la lluvia es casi solo alfa: comprimir el alfa (alpha_quality) baja la hoja de ~3 MB a ~1.5 MB sin que se note
    aq = 70 if name == 'lluvia' else 100
    Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8)).save(out, 'WEBP', quality=80, alpha_quality=aq, method=4)
    meta[name] = {'sheet': f'assets/fx/{name}.webp', 'cols': cols, 'rows': rows, 'count': n, 'fps': fps, 'w': fw, 'h': fh}
    print(f'{name}: {n} cuadros {fw}x{fh}, hoja {cols * fw}x{rows * fh}, {os.path.getsize(out) / 1024:.0f} KB')

js = ('// GENERADO por tools/secuencias.py — efectos (lluvia, escombros) como hojas de cuadros. No editar a mano.\n'
      f'export const EFFECTS = {json.dumps(meta, indent=2)};\n')
open(f'{PROJ}/data/effects.js', 'w').write(js)
