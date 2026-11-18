# Prépare l'animation des 3 images de référence (à relancer si les images changent) :
#  1. détecte les fenêtres et lanternes éclairées → data/lights.json (chacune scintillera à son rythme)
#  2. dessine le masque du ciel de chaque vue → public/references/hotel-N-sky.png (seuls les nuages bougent)
# Usage : python3 scripts/prepare-views.py
import json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = ROOT / "public" / "references"

# Contour du ciel (au-dessus de cette ligne), en pixels de l'image 1672×941. Les zones à exclure
# (tour Eiffel, arbres au premier plan) sont des rectangles retirés du masque.
SKY = {
    "1": {"line": [(0, 240), (400, 232), (470, 150), (530, 125), (660, 118), (700, 108), (760, 98), (790, 82), (1000, 78), (1050, 108), (1130, 122), (1250, 196), (1300, 246), (1672, 250)],
          "cut": [(1490, 100, 1585, 270)]},
    "2": {"line": [(0, 148), (500, 148), (510, 108), (640, 102), (648, 58), (708, 58), (712, 88), (780, 84), (800, 68), (990, 62), (1042, 60), (1050, 94), (1140, 98), (1222, 110), (1250, 128), (1290, 148), (1672, 148)],
          "cut": [(1420, 40, 1500, 165), (210, 100, 260, 155)]},
    "3": {"line": [(300, 330), (300, 60), (500, 70), (630, 40), (690, 40), (700, 50), (950, 85), (1000, 70), (1100, 100), (1200, 160), (1260, 210), (1320, 330), (1672, 340)],
          "cut": [(1440, 180, 1530, 390), (0, 0, 300, 941), (1600, 300, 1672, 941)]},
}

def sky_mask(n):
    im = Image.open(REF / f"hotel-{n}.webp"); W, H = im.size
    m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m)
    line = SKY[n]["line"]
    poly = [(line[0][0], 0)] + line + [(line[-1][0], 0)]
    d.polygon(poly, fill=255)
    for (x0, y0, x1, y1) in SKY[n]["cut"]: d.rectangle([x0, y0, x1, y1], fill=0)
    m = m.filter(ImageFilter.MinFilter(15)).filter(ImageFilter.GaussianBlur(14))
    rgba = Image.new("RGBA", (W, H), (255, 255, 255, 0)); rgba.putalpha(m)
    rgba.save(REF / f"hotel-{n}-sky.png", optimize=True)

def lights(n):
    im = np.asarray(Image.open(REF / f"hotel-{n}.webp").convert("RGB")).astype(np.float32)
    H, W, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    warm = (lum > 188) & (r > b + 45) & (r >= g)
    # pas de ciel : seuls les éclairages en dessous de la ligne d'horizon
    yy = np.arange(H)[:, None].repeat(W, 1)
    warm &= yy > 150
    # composantes connexes sur une grille réduite (x4) : parcours en largeur
    s = 4; small = warm[: H // s * s, : W // s * s].reshape(H // s, s, W // s, s).mean(axis=(1, 3)) > 0.3
    h, w = small.shape; seen = np.zeros_like(small, dtype=bool); out = []
    for y in range(h):
        for x in range(w):
            if not small[y, x] or seen[y, x]: continue
            stack = [(y, x)]; seen[y, x] = True; pts = []
            while stack:
                cy, cx = stack.pop(); pts.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; stack.append((ny, nx))
            if len(pts) < 2 or len(pts) > 400: continue
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            cx = (min(xs) + max(xs) + 1) / 2 * s; cy = (min(ys) + max(ys) + 1) / 2 * s
            bw = (max(xs) - min(xs) + 1) * s; bh = (max(ys) - min(ys) + 1) * s
            out.append({"x": round(cx / W * 100, 2), "y": round(cy / H * 100, 2), "w": round(bw / W * 100, 2), "h": round(bh / H * 100, 2)})
    return out

data = {}
for n in ("1", "2", "3"):
    sky_mask(n)
    sky = np.asarray(Image.open(REF / f"hotel-{n}-sky.png").split()[3]); Hh, Ww = sky.shape
    near_sky = np.asarray(Image.fromarray(sky).filter(ImageFilter.MaxFilter(41)))
    data[n] = [l for l in lights(n) if near_sky[min(Hh - 1, int(l["y"] / 100 * Hh)), min(Ww - 1, int(l["x"] / 100 * Ww))] < 10]
    print("vue", n, ":", len(data[n]), "éclairages")
(ROOT / "data" / "lights.json").write_text(json.dumps(data))
