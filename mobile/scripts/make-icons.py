# Generates app icon + splash source images for @capacitor/assets (run once; outputs committed).
from PIL import Image, ImageDraw
import math, os
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
TEAL, TEAL2 = (14, 74, 71, 255), (19, 98, 94, 255)
MANGO, MANGO_D, HI, LEAF, LEAF_D, STEM = (246, 167, 35, 255), (224, 123, 0, 255), (255, 214, 128, 255), (63, 140, 74, 255), (40, 100, 50, 255), (92, 60, 20, 255)
SS = 4  # supersampling

def blob(cx, cy, rx, ry, rot, bulge=0.0, n=240):
    """Ellipse-ish outline rotated by rot degrees; bulge fattens one side (mango cheek)."""
    pts, a = [], math.radians(rot)
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        x *= 1 + bulge * max(0.0, math.cos(t))  # fatter on +x side
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    return pts

def leaf(cx, cy, length, width, rot, n=120):
    a, pts = math.radians(rot), []
    for i in range(n + 1):  # upper edge then lower edge
        t = i / n
        pts.append((t * length, width * math.sin(math.pi * t)))
    for i in range(n, -1, -1):
        t = i / n
        pts.append((t * length, -width * 0.55 * math.sin(math.pi * t)))
    return [(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]

def mango(d, cx, cy, s):
    s *= SS; cx *= SS; cy *= SS
    d.polygon(blob(cx, cy, .40 * s, .30 * s, -38, .18), fill=MANGO)
    d.polygon(blob(cx + .10 * s, cy + .06 * s, .26 * s, .17 * s, -38, .1), fill=MANGO_D)   # shaded cheek
    d.polygon(blob(cx - .03 * s, cy - .02 * s, .34 * s, .24 * s, -38, .12), fill=MANGO)
    d.polygon(blob(cx - .17 * s, cy - .10 * s, .09 * s, .05 * s, -38), fill=HI)                 # highlight
    sx, sy = cx + .20 * s, cy - .25 * s
    d.line([sx, sy, sx + .06 * s, sy - .10 * s], fill=STEM, width=int(.045 * s))
    d.polygon(leaf(sx + .05 * s, sy - .09 * s, .36 * s, .10 * s, -18), fill=LEAF)
    d.line([sx + .05 * s, sy - .09 * s, sx + .36 * s, sy - .20 * s], fill=LEAF_D, width=int(.012 * s))

def render(size, bg, draw):
    im = Image.new("RGBA", (size * SS, size * SS), bg)
    draw(ImageDraw.Draw(im), size)
    return im.resize((size, size), Image.LANCZOS)

def river(d, S):
    d.ellipse([-S * .3 * SS, S * .62 * SS, S * 1.3 * SS, S * 1.7 * SS], fill=TEAL2)

S = 1024
render(S, TEAL, lambda d, S: (river(d, S), mango(d, S / 2 - 20, S / 2 + 40, S * .68))).save(os.path.join(OUT, "icon-only.png"))
render(S, (0, 0, 0, 0), lambda d, S: mango(d, S / 2, S / 2 + 20, S * .52)).save(os.path.join(OUT, "icon-foreground.png"))
render(S, TEAL, lambda d, S: river(d, S)).save(os.path.join(OUT, "icon-background.png"))
W = 2732
SS = 1
sp = render(W, TEAL, lambda d, S: mango(d, S / 2, S / 2, 640))
sp.save(os.path.join(OUT, "splash.png")); sp.save(os.path.join(OUT, "splash-dark.png"))
print("ok")
