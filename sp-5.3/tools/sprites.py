# Convierte secuencias PNG de After Effects en hojas WebP + data/sprites.js
# Uso:  python tools/sprites.py "ruta/a/Animaciones"      (necesita: pip install pillow numpy)
# Para agregar una animación nueva, añádela en CHARS (carpeta, cuadros, fps, metros por píxel, ancla)
# y en data/assets.js usa el nombre (idle, walk, walk_scared, …) según las etiquetas del personaje.
import os, json, math, sys, glob
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'Animaciones'   # carpeta con las secuencias PNG
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{PROJ}/assets/sprites/chars'
PPM = 340            # píxeles por metro en la hoja final
MAXTEX = 4096

def frames(folder, idx):
    fs = sorted(glob.glob(f'{SRC}/{folder}/*.png'))
    byn = {int(f[-9:-4]): f for f in fs}
    return [byn[i] for i in idx if i in byn]     # tolera cuadros faltantes

def feet_center(a, ground, band=40):
    al = a[max(0, ground - band):ground + 5, :, 3]
    ys, xs = np.where(al > 40)
    return float(xs.mean()) if len(xs) else a.shape[1] / 2

# clip: carpeta, índices, fps, metros/píxel, ancla (x, y suelo) en píxeles del lienzo original
# anchor 'feet' = centro de los pies del primer cuadro
CHARS = {
  'hero': {
    'idle':        ('Animación quieto', range(1, 96, 2), 12, 1.0/553, (414, 776)),
    'idle_cry':    ('Prota llorando quieto', range(0, 96, 2), 12, 1.0/553, (414, 776)),
    'walk':        ('Animación caminata 1', range(0, 16), 24, 1.0/553, (414, 776)),
    'walk_scared': ('Animación caminata 2', range(0, 16), 24, 1.0/553, (414, 776)),
    'walk_bag':    ('Caminata mochila 1', range(0, 16), 24, 1.0/553, (414, 776)),
    'walk_bag_scared': ('Caminata_mochila2', range(0, 16), 24, 1.0/553, (414, 776)),
    'walk_mom_scared':     ('Animación caminata con madre', range(0, 44), 24, 0.00183, (260, 1128)),
    'walk_mom_bag_scared': ('Animación caminata con madre 2', range(0, 44), 24, 0.00183, (260, 1128)),
  },
  'mom': {
    'idle':        ('Madre quieta', range(0, 96, 2), 12, 1.75/883, ('feet', 938)),
    'idle_talk':   ('Madre hablando', range(0, 95, 2), 12, 1.75/1177, ('feet', 1194)),
    'idle_scared': ('Madre asustada', range(0, 96, 2), 12, 1.75/1177, ('feet', 1194)),
    'walk_scared': ('Madre caminando', range(0, 44), 24, 1.75/1177, ('feet', 'p90')),
  },
  'dog': {
    'idle':        ('Rex', range(0, 16), 24, 0.6/401, ('feet', 689), 'flip'),
    'walk':        ('Rex caminata 1', range(0, 16), 24, 0.6/401, ('feet', 'p90')),
    'walk_scared': ('Rex caminata 2', range(0, 16), 24, 0.6/401, ('feet', 'p90')),
  },
}

def build(char, name, spec):
    folder, idx, fps, mpp, (ax, ground) = spec[:5]
    flip = len(spec) > 5 and spec[5] == 'flip'
    ims = []
    for f in frames(folder, list(idx)):
        im = Image.open(f).convert('RGBA')
        if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ims.append(im)
    arrs = [np.array(i) for i in ims]
    if ground == 'p90':
        bots = [np.where(a[:, :, 3] > 40)[0].max() for a in arrs]
        ground = int(np.percentile(bots, 90))
    if ax == 'feet':
        ax = feet_center(arrs[0], ground)
    # recorte común a todos los cuadros
    x0 = y0 = 10**9; x1 = y1 = 0
    for a in arrs:
        ys, xs = np.where(a[:, :, 3] > 8)
        x0, y0 = min(x0, xs.min()), min(y0, ys.min()); x1, y1 = max(x1, xs.max()), max(y1, ys.max())
    x0, y0 = max(0, x0 - 4), max(0, y0 - 4); x1, y1 = x1 + 5, y1 + 5
    cw, ch = x1 - x0, y1 - y0
    ppm = PPM
    while True:
        s = mpp * ppm                       # escala píxel original → píxel final
        fw, fh = max(1, round(cw * s)), max(1, round(ch * s))
        n = len(ims)
        best = None
        for cols in range(1, n + 1):
            rows = math.ceil(n / cols)
            if cols * fw <= MAXTEX and rows * fh <= MAXTEX:
                area = cols * fw * rows * fh
                if best is None or area < best[2]: best = (cols, rows, area)
        if best: break
        ppm *= 0.9
    cols, rows, _ = best
    sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        fr = im.crop((x0, y0, x1, y1)).resize((fw, fh), Image.LANCZOS)
        sheet.paste(fr, ((i % cols) * fw, (i // cols) * fh))
    os.makedirs(f'{OUT}/{char}', exist_ok=True)
    path = f'{OUT}/{char}/{name}.webp'
    sheet.save(path, 'WEBP', quality=80, method=6)   # 80: casi igual a la vista y pesa menos (límite del zip)
    return {
        'sheet': f'assets/sprites/chars/{char}/{name}.webp', 'cols': cols, 'rows': rows, 'count': n, 'fps': fps,
        'w': round(cw * mpp, 4), 'h': round(ch * mpp, 4),
        'ax': round((ax - x0) / cw, 4), 'ay': round((ground - y0) / ch, 4),     # ancla (fracción desde arriba-izquierda)
    }, os.path.getsize(path), (fw, fh, cols * fw, rows * fh)

meta = {}
total = 0
for char, clips in CHARS.items():
    meta[char] = {}
    for name, spec in clips.items():
        m, size, dims = build(char, name, spec)
        meta[char][name] = m
        total += size
        print(f'{char}/{name}: {m["count"]} cuadros, cuadro {dims[0]}x{dims[1]}, hoja {dims[2]}x{dims[3]}, {size/1024:.0f} KB, {m["w"]:.2f}x{m["h"]:.2f} m')
print(f'TOTAL {total/1024/1024:.2f} MB')
js = ('// GENERADO por la herramienta de sprites a partir de las secuencias PNG de After Effects.\n'
      '// Cada animación es una hoja WebP (cols × rows cuadros). w/h = tamaño del cuadro en metros;\n'
      '// ax/ay = punto de apoyo (pies) como fracción del cuadro desde arriba a la izquierda.\n'
      '// No editar a mano: si cambian las animaciones, se vuelve a generar.\n'
      f'export const SPRITES = {json.dumps(meta, indent=2, ensure_ascii=False)};\n')
open(f'{PROJ}/data/sprites.js', 'w').write(js)
