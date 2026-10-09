#!/usr/bin/env python3
"""
Builds public/coffee-guide/*.png — the images of the Kaffee guide.

Sources (see docs/coffee-guide-sources.md):
  * Ninja ES600 Series Owner's Guide, US edition (official PDF; its illustrations are vector
    graphics, so crops are rendered sharply at any size). The EU edition (ES600EU, the
    manual of the ES601EU) uses the same drawings except the control panel, which has a
    HOT WATER button there,
  * page 36 of the EU edition (raster pages of the official 181-page ES600EU manual) for
    the EU control panel,
  * the official Ninja ES601 product photo,
  * two CC BY 2.0 photos of a WDT tool (Flickr, Caspia Jackmanson).

Every image is a crop of one of those sources plus removable highlight marks
(ring / arrow). The product drawings themselves are never redrawn or edited,
except that the manual's dotted callout lines to its own letter labels are
removed in the control-panel drawing.

Usage:  python3 scripts/build-coffee-guide-images.py <workdir>
  needs: pip install pymupdf pillow ; downloads the sources into <workdir>.
"""
import io
import os
import sys
import urllib.request

import fitz
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WORK = sys.argv[1] if len(sys.argv) > 1 else "/tmp/coffee-guide-src"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "coffee-guide")
os.makedirs(WORK, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SOURCES = {
    "guide.pdf": "https://cdn.bfldr.com/U447IH35/as/4mjc7t7447v3gj6svz5pwxsq/2845969_Owner-s_Guide",
    "photo.png": "https://assets.sharkninja.com/image/upload/f_auto/q_auto/SharkNinja-NA/ES601BK_01.jpg",
    "wdt_tool.jpg": "https://live.staticflickr.com/65535/52558316160_e7d7b975be_b.jpg",
    "wdt_use.jpg": "https://live.staticflickr.com/65535/52558141014_85d42487dd_b.jpg",
}
SOURCES["eu_p36.webp"] = "https://www.manualpdf.in/viewer/12/5320012/36/bg24.webp"
for name, url in SOURCES.items():
    path = os.path.join(WORK, name)
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.manualpdf.in/"})
        with urllib.request.urlopen(req) as r, open(path, "wb") as f:
            f.write(r.read())

doc = fitz.open(os.path.join(WORK, "guide.pdf"))
PREVIEW = 110 / 72  # page preview used while choosing crops: px per pt
ORANGE = (232, 84, 28)
FONT = "/System/Library/Fonts/Helvetica.ttc"


# ------------------------------------------------------------------ rendering
def render(page, box, dpi=500, origin_dpi=110, origin_pt=(0, 0)):
    """Crop `box` (px of a preview rendered at origin_dpi, origin at origin_pt) of PDF page `page` (1-based)."""
    k = 72 / origin_dpi
    rect = fitz.Rect(
        origin_pt[0] + box[0] * k, origin_pt[1] + box[1] * k,
        origin_pt[0] + box[2] * k, origin_pt[1] + box[3] * k,
    )
    pix = doc[page - 1].get_pixmap(clip=rect, dpi=dpi, alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def acc(box, dpi=500):
    """Accessories drawing (page 3, left): coordinates of the 130-dpi preview whose origin is (20,60)/110dpi."""
    return render(3, box, dpi=dpi, origin_dpi=130, origin_pt=(20 / PREVIEW, 60 / PREVIEW))


def panel_clean():
    """Control-panel drawing without the manual's dotted callout lines (they lead to its A–K letters)."""
    img = render(3, (695, 222, 1165, 418), dpi=450)  # 1923 x 802
    d = ImageDraw.Draw(img)
    for r in [
        (812, 0, 830, 197), (20, 560, 122, 586), (20, 676, 142, 698),
        (1792, 560, 1888, 584), (1772, 672, 1888, 694),
        (345, 722, 363, 790), (412, 560, 563, 588), (545, 560, 563, 790),
        (943, 683, 962, 790), (1237, 620, 1257, 790),
        (1392, 568, 1500, 588), (1392, 568, 1410, 790), (1554, 722, 1573, 790),
    ]:
        d.rectangle(r, fill="white")
    return img.crop((0, 0, 1923, 780))


def eu_panel():
    """Control panel of the ES601EU (page 36 of the official ES600EU manual), 2x, without the manual's callout dots.
    Coordinates used by build(): buttons y=405 — start grind x=122, strength 235, HOT WATER 435, centre dial 618 (r 55),
    size 805, milk type 1006, start froth 1117; labels: espresso column x=435 (y 172/197/222), froth icons y=220."""
    page = Image.open(os.path.join(WORK, "eu_p36.webp")).convert("L")
    img = page.crop((905, 270, 1530, 545))
    # the manual page is a ~140 dpi raster: supersample and stretch the contrast (no content is added or removed)
    img = img.resize((img.width * 4, img.height * 4), Image.BICUBIC)
    img = img.point(lambda v: 0 if v < 70 else (255 if v > 215 else int((v - 70) * 255 / 145))).convert("RGB")
    d = ImageDraw.Draw(img)
    for r in [
        (15, 396, 86, 414), (15, 471, 85, 489), (1156, 396, 1224, 414), (1156, 471, 1224, 489),
        (272, 396, 372, 414), (358, 412, 372, 520), (230, 500, 238, 560), (430, 440, 444, 560),
        (800, 440, 814, 560), (900, 396, 970, 414), (897, 412, 910, 560), (1001, 504, 1011, 560),
        (522, 31, 538, 166), (612, 462, 626, 520), (86, 471, 98, 490), (1141, 471, 1158, 490), (1226, 0, 1250, 560),
    ]:
        d.rectangle(tuple(v * 2 for v in r), fill="white")
    return img


def photo(box=None):
    img = Image.open(os.path.join(WORK, "photo.png")).convert("RGBA")
    bg = Image.new("RGBA", img.size, "white")
    bg.alpha_composite(img)
    out = bg.convert("RGB")
    return out.crop(box) if box else out


# ---------------------------------------------------------------- annotation
def px(img, fx, fy):
    return fx * img.width, fy * img.height


def ring(img, fx, fy, fr, width=None):
    """Highlight ring; (fx, fy) centre, fr radius as fraction of image width."""
    d = ImageDraw.Draw(img, "RGBA")
    cx, cy = px(img, fx, fy)
    r = fr * img.width
    w = width or max(6, int(img.width * 0.011))
    d.ellipse((cx - r - w, cy - r - w, cx + r + w, cy + r + w), outline=(255, 255, 255, 255), width=w * 2 + 2)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ORANGE + (38,), outline=ORANGE + (255,), width=w)


def box(img, fx0, fy0, fx1, fy1, width=None, rad=None):
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0 = px(img, fx0, fy0)
    x1, y1 = px(img, fx1, fy1)
    w = width or max(5, int(img.width * 0.008))
    rad = rad if rad is not None else (y1 - y0) / 2.2
    d.rounded_rectangle((x0 - w, y0 - w, x1 + w, y1 + w), radius=rad, outline=(255, 255, 255, 255), width=w * 2 + 2)
    d.rounded_rectangle((x0, y0, x1, y1), radius=rad, fill=ORANGE + (38,), outline=ORANGE + (255,), width=w)


def tilt_box(img, fcx, fcy, fw, fh, angle, width=None):
    """Highlight for tilted printed text: rounded rectangle, centre/size as fractions of image width, `angle` degrees ccw."""
    W = img.width
    cx, cy, w_, h_ = fcx * W, fcy * W, fw * W, fh * W
    w = width or max(5, int(W * 0.008))
    pad = int(max(w_, h_) * 0.6)
    layer = Image.new("RGBA", (int(w_ + 2 * pad), int(h_ + 2 * pad)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = h_ / 2.2
    box_ = (pad, pad, pad + w_, pad + h_)
    d.rounded_rectangle((box_[0] - w, box_[1] - w, box_[2] + w, box_[3] + w), radius=r, outline=(255, 255, 255, 255), width=w * 2 + 2)
    d.rounded_rectangle(box_, radius=r, fill=ORANGE + (38,), outline=ORANGE + (255,), width=w)
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.paste(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)), layer)


def tag(img, text, fx, fy, size_frac=0.05):
    """Small orange caption (annotation) centred at the fractional position (fx, fy)."""
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, max(14, int(img.width * size_frac)))
    w = d.textlength(text, font=f)
    pad = f.size * 0.3
    x, y = max(pad * 1.5, fx * img.width - w / 2), fy * img.height
    d.rounded_rectangle((x - pad, y - pad * 0.6, x + w + pad, y + f.size * 1.1 + pad * 0.3), radius=pad, fill="white", outline=ORANGE, width=max(3, f.size // 8))
    d.text((x, y), text, fill=ORANGE, font=f)


def arrow(img, f0, f1, width=None):
    import math
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0 = px(img, *f0)
    x1, y1 = px(img, *f1)
    w = width or max(9, int(img.width * 0.014))
    ang = math.atan2(y1 - y0, x1 - x0)
    head = w * 3.2
    bx, by = x1 - math.cos(ang) * head * 0.8, y1 - math.sin(ang) * head * 0.8
    for col, ww in (((255, 255, 255, 255), w + 8), (ORANGE + (255,), w)):
        d.line((x0, y0, bx, by), fill=col, width=int(ww))
    hp = [
        (x1, y1),
        (x1 - head * math.cos(ang - 0.45), y1 - head * math.sin(ang - 0.45)),
        (x1 - head * math.cos(ang + 0.45), y1 - head * math.sin(ang + 0.45)),
    ]
    d.polygon(hp, fill=ORANGE + (255,), outline=(255, 255, 255, 255))


def label(img, text, fx, fy, size=None, color=(60, 60, 60)):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, size or int(img.width * 0.05))
    d.text(px(img, fx, fy), text, fill=color, font=f)


# ------------------------------------------------------------------ compose
def trim(img, pad=0.045):
    """Crop away empty white margin, then add an even margin of `pad` of the longer side."""
    from PIL import ImageChops
    bg = Image.new("RGB", img.size, "white")
    bbox = ImageChops.difference(img.convert("RGB"), bg).convert("L").point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    m = int(max(img.size) * pad)
    out = Image.new("RGB", (img.width + 2 * m, img.height + 2 * m), "white")
    out.paste(img, (m, m))
    return out


def card(img, name, canvas=None, margin=None, credit=None, long_side=1400, max_upscale=2.0):
    """Trim to the content, scale the longer side towards `long_side` (never more than `max_upscale`x —
    the sources are vector / large — and never below the original size when it is bigger)."""
    img = trim(img)
    scale = min(long_side / max(img.size), max_upscale)
    scale = max(scale, 1.0) if max(img.size) <= long_side else scale
    img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    if credit:
        f = ImageFont.truetype(FONT, 28)
        d = ImageDraw.Draw(img)
        w = d.textlength(credit, font=f)
        strip = Image.new("RGB", (img.width, 56), "white")
        img2 = Image.new("RGB", (img.width, img.height + 56), "white")
        img2.paste(img, (0, 0))
        ImageDraw.Draw(img2).text((img.width - w - 24, img.height + 10), credit, fill=(110, 110, 110), font=f)
        img = img2
    q = img.quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE)
    path = os.path.join(OUT, f"{name}.png")
    q.save(path, optimize=True)
    print(f"{name}.png  {os.path.getsize(path)//1024} KB  {img.size}")


def stack(images, gap=50, width=None):
    width = width or max(i.width for i in images)
    parts = []
    for i in images:
        s = width / i.width
        parts.append(i.resize((width, int(i.height * s)), Image.LANCZOS))
    h = sum(p.height for p in parts) + gap * (len(parts) - 1)
    out = Image.new("RGB", (width, h), "white")
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height + gap
    return out


def side(images, gap=60, height=None):
    height = height or max(i.height for i in images)
    parts = []
    for i in images:
        s = height / i.height
        parts.append(i.resize((int(i.width * s), height), Image.LANCZOS))
    w = sum(p.width for p in parts) + gap * (len(parts) - 1)
    out = Image.new("RGB", (w, height), "white")
    x = 0
    for p in parts:
        out.paste(p, (x, 0))
        x += p.width + gap
    return out


class Crop:
    """A crop of a bigger drawing; marks are placed in the *source* coordinates."""

    def __init__(self, base, x0, y0, x1, y1, crop=True, k=1):
        """crop=False: `base` already is the rendering of exactly the rect (x0,y0,x1,y1).
        k: pixels of `base` per coordinate unit."""
        self.x0, self.y0, self.w, self.h = x0, y0, x1 - x0, y1 - y0
        self.img = base.crop(tuple(int(v * k) for v in (x0, y0, x1, y1))) if crop else base

    def ring(self, x, y, r):
        ring(self.img, (x - self.x0) / self.w, (y - self.y0) / self.h, r / self.w)

    def box(self, x0, y0, x1, y1, rad=None):
        box(self.img, (x0 - self.x0) / self.w, (y0 - self.y0) / self.h,
            (x1 - self.x0) / self.w, (y1 - self.y0) / self.h,
            rad=None if rad is None else rad / self.w * self.img.width)


def acc_part(box_, wipes=(), dpi=500):
    """Accessories drawing crop; `wipes` are rects (130-dpi preview coords) painted white
    (the manual's dotted callout lines to its own part numbers)."""
    img = acc(box_, dpi=dpi)
    k = dpi / 130
    d = ImageDraw.Draw(img)
    for w in wipes:
        d.rectangle(((w[0] - box_[0]) * k, (w[1] - box_[1]) * k, (w[2] - box_[0]) * k, (w[3] - box_[1]) * k), fill="white")
    return img


PH = 2.07  # official product photo: 2070 px, coordinates below are in 1000-px units


def photo_crop(x0, y0, x1, y1):
    return photo((int(x0 * PH), int(y0 * PH), int(x1 * PH), int(y1 * PH)))


def jug_clean():
    """The milk jug of the manual's drawing (p. 9). The drawing pours milk from a vessel above into
    the jug; for close-ups the pouring vessel and the milk stream (separate vector paths) are dropped
    from a throw-away copy of the page, nothing else is touched."""
    k = 72 / 110
    tmp9 = fitz.open(os.path.join(WORK, "guide.pdf"))
    pg9 = tmp9[8]
    pg9.add_redact_annot(fitz.Rect(88 * k, 119 * k, 181 * k, 211 * k))  # only touches the vessel + stream paths
    pg9.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED, text=fitz.PDF_REDACT_TEXT_NONE)
    pix = pg9.get_pixmap(clip=fitz.Rect(140 * k, 208 * k, 218 * k, 280 * k), dpi=1100, alpha=False)
    jug = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    u = 1100 / 110  # px per preview unit
    for x0, y0, x1, y1 in ((167.6, 213.0, 171.0, 224.0), (167.5, 225.6, 169.6, 233.9)):  # last stream pieces inside the jug
        ImageDraw.Draw(jug).rectangle(((x0 - 140) * u, (y0 - 208) * u, (x1 - 140) * u, (y1 - 208) * u), fill="white")
    return jug


def build():
    P = panel_clean()

    # ---- Sieb: Doppelsieb in den Siebträger (Zeichnung der Anleitung, mit Pfeil)
    insert = render(5, (655, 352, 925, 522), dpi=600)
    card(insert, "basket-double")

    # ---- Trichter auf den Siebträger
    card(render(5, (700, 722, 905, 866), dpi=600), "funnel-on-portafilter")

    # ---- Siebträger in die Mahlhalterung
    cr = render(5, (955, 182, 1135, 331), dpi=600)
    ring(cr, 0.31, 0.62, 0.17)
    card(cr, "portafilter-in-cradle")

    # ---- Bedienfeld der ES601EU (Seite 36 der EU-Anleitung): Getränk wählen, Bezug, Heißwasser
    E = eu_panel()

    def eu_mid():
        return Crop(E, 365, 40, 905, 486, k=2)

    sel = eu_mid()
    sel.ring(618, 405, 60)
    sel.box(396, 160, 476, 184)
    card(sel.img, "select-espresso")

    ame = eu_mid()
    ame.ring(618, 405, 60)
    card(ame.img, "select-americano")

    sb = eu_mid()
    sb.ring(618, 405, 60)
    card(sb.img, "start-brew")

    hw1 = eu_mid()
    hw1.ring(435, 405, 44)
    tag(hw1.img, "HOT WATER", (435 - 365) / 540, 0.62, 0.042)
    card(hw1.img, "hot-water-select")

    hw2 = eu_mid()
    hw2.ring(618, 405, 60)
    card(hw2.img, "hot-water-start")

    # ---- Mahlgrad: Regler an der Seite + Anzeige CURRENT / RECOMMENDED
    dial = Crop(render(6, (335, 212, 505, 405), dpi=700), 335, 212, 505, 405, crop=False)
    dial.ring(419.6, 353.2, 17)
    disp = Crop(render(6, (385, 500, 490, 565), dpi=1000), 385, 500, 490, 565, crop=False)
    disp.box(400, 520.5, 433, 554, rad=9)
    disp.box(434.5, 520.5, 481, 554, rad=9)
    dial, disp = dial.img, disp.img
    card(stack([dial, disp], gap=50, width=1000), "grind-dial-display", canvas=(1200, 1500))

    # ---- Mahlen starten (START GRIND)
    P2 = P.copy()
    ImageDraw.Draw(P2).rectangle((100, 650, 600, 730), fill="white")
    sg = Crop(P2, 30, 20, 570, 692)
    sg.ring(180, 572, 78)
    card(sg.img, "start-grind", canvas=(1100, 1150))

    # ---- Siebträger herausnehmen (Trichter bleibt dran)
    out = render(5, (955, 182, 1135, 331), dpi=600)
    ring(out, 0.30, 0.66, 0.2)
    card(out, "portafilter-with-funnel")

    # ---- Tampen: Tamper im Trichter (Zeichnung der Anleitung)
    card(render(6, (950, 212, 1192, 366), dpi=600), "tamping")

    # ---- Trichter + Tamper in ihre Fächer links
    st = Crop(render(6, (1015, 574, 1130, 713), dpi=900), 1015, 574, 1130, 713, crop=False)
    st.box(1018, 640, 1038, 691, rad=7)
    card(st.img, "funnel-tamper-removed")

    # ---- Siebträger einspannen
    # + Detail aus dem offiziellen Produktfoto: der orange Punkt am Brühkopf (neben "insert")
    lock = render(7, (80, 215, 250, 383), dpi=600)
    dot = Crop(photo_crop(400, 370, 560, 450), 400, 370, 560, 450, crop=False)
    dot.ring(438.4, 409.7, 15)
    d_img = dot.img.resize((640, int(dot.img.height * 640 / dot.img.width)), Image.LANCZOS)
    lock = trim(lock, 0.02).resize((1000, int(trim(lock, 0.02).height * 1000 / trim(lock, 0.02).width)), Image.LANCZOS)
    both = Image.new("RGB", (1000, lock.height + 40 + d_img.height), "white")
    both.paste(lock, (0, 0))
    both.paste(d_img, (180, lock.height + 40))
    card(both, "group-head-lock")

    # ---- Tasse unterstellen (Zeichnung der Anleitung: Tasse unter den Auslaufstellen)
    cup = Crop(render(7, (714, 246, 838, 391), dpi=800), 714, 246, 838, 391, crop=False)
    cup.ring(800, 346, 37)
    card(cup.img, "cup-under")

    # ---- Kännchen: Linie "cappuccino" bzw. "latte" (die Linien sind am Kännchen aufgedruckt)
    # the manual's drawing pours milk from above into the jug; for this close-up the pouring
    # vessel and the milk stream (separate vector paths) are dropped from a throw-away copy
    for drink, (lx, ly, lw, lh) in {"latte": (175.7, 260.6, 13.0, 5.8), "cappuccino": (176.3, 266.6, 19.5, 5.8)}.items():
        jug = jug_clean()
        tilt_box(jug, (lx - 140) / 78, (ly - 208) / 78, lw / 78, lh / 78, 12)
        card(jug, f"jug-line-{drink}")

    # ---- Kännchen auf die Plattform
    card(render(9, (55, 335, 228, 432), dpi=600), "jug-on-platform")

    # ---- Schaum wählen: Symbole der Anleitung (S. 9 US) + Bedienfeld der ES601EU rechts
    for name, (sx0, sx1, icon_x) in {"thin": (71, 131, 1008), "thick": (135.5, 194, 1052)}.items():
        s2 = Crop(render(9, (14, 493, 312, 569.2), dpi=700), 14, 493, 312, 569.2, crop=False)
        s2.box(sx0 - 2, 496.5, sx1 + 2, 568.4, rad=24)
        p2 = Crop(E, 880, 40, 1228, 500, k=2)
        p2.ring(icon_x, 220, 26)
        p2.ring(1006, 405, 40)
        p2.ring(1117, 405, 40)
        card(stack([s2.img, p2.img], gap=50, width=1000), f"froth-select-{name}")

    # ---- Aufschäumen starten
    card(render(9, (370, 190, 560, 332), dpi=600), "start-froth")

    # ---- Milch zum Espresso gießen
    card(render(9, (715, 520, 868, 618), dpi=600), "pour-milk")

    # ---- Dampfstab abwischen
    card(render(9, (374, 615, 524, 768), dpi=600), "wand-wipe")

    # ---- WDT (CC BY 2.0)
    tool = Image.open(os.path.join(WORK, "wdt_tool.jpg")).convert("RGB")
    use = Image.open(os.path.join(WORK, "wdt_use.jpg")).convert("RGB").crop((250, 100, 1024, 1024))
    credit = "Foto: Caspia Jackmanson / Flickr · CC BY 2.0"
    card(side([tool.crop((40, 150, 330, 1000)), use], gap=40), "wdt-tool", canvas=(1400, 1120), credit=credit)
    card(use, "wdt-stirring", canvas=(1200, 1100), credit=credit)

    # ================================================================ "Welches Teil ist das?"
    # Zeichnungen der Zubehör-Seite des Handbuchs (Nummern/Strichlinien des Handbuchs entfernt)
    card(acc_part((388, 148, 520, 252), wipes=[(380, 183.4, 400.7, 186.8)]), "part-funnel", canvas=(1000, 800))
    card(acc_part((391, 18, 515, 146), wipes=[(380, 45.4, 401.2, 49.2)]), "part-tamper", canvas=(800, 1000))
    card(acc_part((160, 425, 520, 650), wipes=[(330, 440, 384, 470), (150, 425, 330, 536)]), "part-portafilter", canvas=(1200, 800))

    # Offizielles Produktfoto (ES601BK_01)
    pc = Crop(photo_crop(150, 430, 560, 760), 150, 430, 560, 760, crop=False)
    pc.ring(343, 588, 60)
    card(pc.img, "part-cradle", canvas=(1000, 800))
    gh = Crop(photo_crop(380, 330, 640, 520), 380, 330, 640, 520, crop=False)
    gh.ring(510, 433, 42)
    card(gh.img, "part-group-head", canvas=(1000, 750))
    card(jug_clean(), "part-milk-jug")
    sw = Crop(photo_crop(640, 300, 800, 560), 640, 300, 800, 560, crop=False)
    sw.ring(695, 454, 48)
    card(sw.img, "part-steam-wand", canvas=(700, 1000))
    fd = Crop(E, 880, 40, 1228, 500, k=2)
    fd.ring(1117, 405, 42)
    card(fd.img, "part-froth-dial")
    hb = eu_mid()
    hb.ring(435, 405, 44)
    tag(hb.img, "HOT WATER", (435 - 365) / 540, 0.62, 0.042)
    card(hb.img, "part-hot-water")


if __name__ == "__main__":
    build()
