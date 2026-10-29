# Junta las ILUSTRACIONES DE LOS FINALES en una sola hoja (assets/endings/finales.webp) + data/endings_art.js
# Uso:  python tools/finales.py "carpeta/con/las/ilustraciones"     (necesita: pip install pillow numpy)
# En la carpeta van PNG con fondo transparente: final_<id>.png (id = clave del final en data/endings.js).
# Para agregar un final: pon su PNG en la carpeta, añádelo en ARTE (abajo) y en data/endings.js usa  image: '<id>'.
import os, sys, json
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'finales'
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALTO = 1000          # alto de cada ilustración en la hoja (px)

# id: (archivo, recorte, sticker)
#   recorte = None (completa) o (cx, cy, lado) en fracciones: un cuadrado centrado en (cx, cy) de lado "lado"
#   sticker = True → borde blanco alrededor del dibujo, como una calcomanía (finales normales, flotando sobre negro)
ARTE = {
    'escondite': ('final_escondite.png', None, True),            # armario (escombros con madera verde)
    'escombros': ('final_escombros.png', None, True),            # bajo los escombros
    'neutral':   ('final_neutral.png', None, True),
    'bueno':     ('final_bueno.png', None, False),                 # final bueno: grande, abajo a la derecha (fondo blanco)
}
BORDE = 16           # grosor del borde blanco del sticker (px, en la hoja)

def sticker(im):
    from PIL import ImageFilter
    pad = BORDE + 4
    big = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    big.paste(im, (pad, pad))
    a = big.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    grown = a.filter(ImageFilter.MaxFilter(2 * BORDE + 1)).filter(ImageFilter.GaussianBlur(1.2))
    base = Image.new('RGBA', big.size, (255, 255, 255, 0)); base.putalpha(grown)
    base.alpha_composite(big)
    return base

def recortar(im, crop):
    a = np.array(im)[:, :, 3]
    if crop is None:
        ys, xs = np.where(a > 10)
        return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    cx, cy, lado = crop
    L = lado * im.width
    x0, y0 = cx * im.width - L / 2, cy * im.height - L / 2
    return im.crop((round(x0), round(y0), round(x0 + L), round(y0 + L)))

frames = []
for key, (fn, crop, stk) in ARTE.items():
    im = recortar(Image.open(f'{SRC}/{fn}').convert('RGBA'), crop)
    h = ALTO - (2 * (BORDE + 4) if stk else 0)
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    if stk: im = sticker(im)
    frames.append((key, im))
# acomodo en filas de máximo 4096 px de ancho (4 px de separación)
pos, x, y, W = {}, 0, 0, 0
for key, im in frames:
    if x and x + im.width > 4096: x, y = 0, y + ALTO + 4
    pos[key] = (x, y); x += im.width + 4; W = max(W, x - 4)
H = y + ALTO
hoja = Image.new('RGBA', (W, H), (0, 0, 0, 0))
meta = {'sheet': 'assets/endings/finales.webp', 'w': W, 'h': H, 'frames': {}}
for key, im in frames:
    fx, fy = pos[key]
    hoja.paste(im, (fx, fy))
    meta['frames'][key] = {'x': fx, 'y': fy, 'w': im.width, 'h': im.height}
os.makedirs(f'{PROJ}/assets/endings', exist_ok=True)
hoja.save(f'{PROJ}/assets/endings/finales.webp', 'WEBP', quality=86, method=6)
js = ('// GENERADO por tools/finales.py — ilustraciones de los finales en una sola hoja. No editar a mano.\n'
      f'export const ENDING_ART = {json.dumps(meta, indent=2)};\n')
open(f'{PROJ}/data/endings_art.js', 'w').write(js)
print(f'hoja {W}x{H}, {os.path.getsize(f"{PROJ}/assets/endings/finales.webp") / 1024:.0f} KB', {k: v for k, v in meta['frames'].items()})
