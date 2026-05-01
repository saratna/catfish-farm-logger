from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

COLORS = {
    "bg": "#F4FBF9",
    "primary": "#087F8C",
    "primary_dark": "#075E67",
    "teal_soft": "#D9F3EF",
    "surface": "#FFFFFF",
    "ink": "#102A2D",
    "muted": "#5F7579",
    "border": "#D4E7E3",
    "success": "#16A34A",
    "warning": "#D97706",
    "danger": "#DC2626",
    "blue": "#2563EB",
    "water": "#BFE9E4",
}

SCREEN_SIZES = {
    "iphone_69": (1320, 2868),
    "iphone_65": (1284, 2778),
}

SCREENS = [
    "home",
    "inspection",
    "feeding",
    "sync",
    "settings",
]

DISPLAY_NAMES = {
    "home": "01_home_tank_overview",
    "inspection": "02_daily_inspection_form",
    "feeding": "03_feeding_weight_log",
    "sync": "04_google_drive_sync",
    "settings": "05_settings_reminders",
}

try:
    FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    FONT_MONO = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"
except Exception:
    FONT_REG = FONT_BOLD = FONT_MONO = None


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else FONT_BOLD if bold else FONT_REG
    return ImageFont.truetype(path, size=size)


def rounded(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy, value: str, size: int, fill=COLORS["ink"], bold=False, anchor=None, align="left"):
    draw.text(xy, value, font=font(size, bold=bold), fill=fill, anchor=anchor, align=align)


def multiline(draw, xy, value, size, fill=COLORS["muted"], bold=False, spacing=8, align="left"):
    draw.multiline_text(xy, value, font=font(size, bold=bold), fill=fill, spacing=spacing, align=align)


def pill(draw, xy, label, fill, text_fill="#FFFFFF", size=34):
    x, y = xy
    w = int(draw.textlength(label, font=font(size, bold=True))) + 54
    h = size + 30
    rounded(draw, (x, y, x + w, y + h), h // 2, fill)
    text(draw, (x + w // 2, y + h // 2 + 1), label, size, fill=text_fill, bold=True, anchor="mm")
    return w, h


def draw_catfish(draw, cx, cy, scale=1.0, color="#087F8C"):
    # Simple symbolic catfish, not a photorealistic claim.
    body_w = int(250 * scale)
    body_h = int(92 * scale)
    draw.ellipse((cx - body_w // 2, cy - body_h // 2, cx + body_w // 2, cy + body_h // 2), fill=color)
    tail = [(cx + body_w // 2 - 15 * scale, cy), (cx + body_w // 2 + 92 * scale, cy - 62 * scale), (cx + body_w // 2 + 92 * scale, cy + 62 * scale)]
    draw.polygon(tail, fill=color)
    draw.ellipse((cx - body_w // 2 + 38 * scale, cy - 15 * scale, cx - body_w // 2 + 58 * scale, cy + 5 * scale), fill="#FFFFFF")
    draw.ellipse((cx - body_w // 2 + 45 * scale, cy - 9 * scale, cx - body_w // 2 + 52 * scale, cy - 2 * scale), fill=COLORS["ink"])
    for dy in [-16, 0, 16]:
        draw.line((cx - body_w // 2 + 8 * scale, cy + dy * scale, cx - body_w // 2 - 105 * scale, cy + (dy - 38) * scale), fill=color, width=max(3, int(5 * scale)))
        draw.line((cx - body_w // 2 + 8 * scale, cy + dy * scale, cx - body_w // 2 - 105 * scale, cy + (dy + 38) * scale), fill=color, width=max(3, int(5 * scale)))


def make_canvas(size):
    w, h = size
    img = Image.new("RGB", (w, h), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    # soft background waves
    for i, c in enumerate(["#E7F7F3", "#D9F3EF", "#F0FAF8"]):
        y = int(h * (0.16 + i * 0.13))
        draw.ellipse((-int(w * 0.25), y, int(w * 1.25), y + int(h * 0.18)), fill=c)
    return img, draw


def draw_phone_frame(draw, x, y, w, h):
    rounded(draw, (x, y, x + w, y + h), 92, "#0B1D20")
    rounded(draw, (x + 22, y + 22, x + w - 22, y + h - 22), 72, COLORS["bg"])
    rounded(draw, (x + w // 2 - 110, y + 43, x + w // 2 + 110, y + 74), 16, "#0B1D20")
    return (x + 50, y + 92, x + w - 50, y + h - 62)


def header(draw, box, title, subtitle=None):
    x1, y1, x2, _ = box
    text(draw, (x1, y1), "Catfish Farm Logger", 28, COLORS["primary"], bold=True)
    text(draw, (x1, y1 + 48), title, 46, COLORS["ink"], bold=True)
    if subtitle:
        multiline(draw, (x1, y1 + 112), subtitle, 25, COLORS["muted"], spacing=7)


def card(draw, xy, title_s, body_s=None, accent=None, height=190):
    x, y, w = xy
    rounded(draw, (x, y, x + w, y + height), 28, COLORS["surface"], COLORS["border"], 2)
    if accent:
        rounded(draw, (x + 20, y + 24, x + 34, y + height - 24), 8, accent)
    text(draw, (x + 58, y + 34), title_s, 30, COLORS["ink"], bold=True)
    if body_s:
        multiline(draw, (x + 58, y + 84), body_s, 23, COLORS["muted"], spacing=9)


def bottom_tabs(draw, box, active):
    x1, _, x2, y2 = box
    y = y2 - 130
    rounded(draw, (x1, y, x2, y + 92), 32, "#FFFFFF", COLORS["border"], 2)
    labels = [("Home", "home"), ("Records", "inspection"), ("Sync", "sync"), ("Settings", "settings")]
    step = (x2 - x1) / 4
    for i, (label, key) in enumerate(labels):
        cx = int(x1 + step * (i + 0.5))
        col = COLORS["primary"] if key == active else COLORS["muted"]
        text(draw, (cx, y + 28), "●", 30, col, anchor="mm")
        text(draw, (cx, y + 64), label, 20, col, bold=(key == active), anchor="mm")


def screen_home(draw, box):
    x1, y1, x2, y2 = box
    header(draw, box, "Tank overview", "Daily check status, pond conditions, and pending sync counts are visible at a glance.")
    y = y1 + 215
    rounded(draw, (x1, y, x2, y + 150), 34, COLORS["primary"], None)
    text(draw, (x1 + 36, y + 38), "Daily inspection due", 34, "#FFFFFF", bold=True)
    text(draw, (x1 + 36, y + 90), "Tank B still needs pH, DO, ammonia, and nitrite readings today.", 23, "#DBFFFB")
    y += 185
    card(draw, (x1, y, x2 - x1), "Tank A · Nursery", "Temp 27.8°C   pH 7.2   DO 5.8 mg/L\nLast fed 08:10 · 1.8 kg floating pellets", COLORS["success"], 205)
    y += 228
    card(draw, (x1, y, x2 - x1), "Tank B · Grow-out", "Inspection pending today\nPhotos: 14 · Unsynced records: 3", COLORS["warning"], 205)
    y += 228
    card(draw, (x1, y, x2 - x1), "Tank C · Quarantine", "Stable water condition\nNext feeding reminder 17:30", COLORS["blue"], 190)
    rounded(draw, (x2 - 230, y2 - 270, x2, y2 - 200), 35, COLORS["primary"])
    text(draw, (x2 - 115, y2 - 235), "+ Add tank", 25, "#FFFFFF", bold=True, anchor="mm")
    bottom_tabs(draw, box, "home")


def field(draw, x, y, label, value, unit=""):
    text(draw, (x, y), label, 22, COLORS["muted"], bold=True)
    rounded(draw, (x, y + 36, x + 250, y + 118), 22, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x + 28, y + 78), value, 30, COLORS["ink"], bold=True, anchor="lm")
    if unit:
        text(draw, (x + 170, y + 79), unit, 19, COLORS["muted"], anchor="lm")


def screen_inspection(draw, box):
    x1, y1, x2, y2 = box
    header(draw, box, "Daily inspection", "Record water condition before feeding so the farm can react early to stress signs.")
    y = y1 + 215
    rounded(draw, (x1, y, x2, y + 96), 28, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x1 + 30, y + 48), "Tank B · Grow-out", 30, COLORS["ink"], bold=True, anchor="lm")
    pill(draw, (x2 - 210, y + 20), "Today", COLORS["teal_soft"], COLORS["primary"], size=24)
    y += 140
    col_gap = 286
    field(draw, x1, y, "Water temp", "28.4", "°C")
    field(draw, x1 + col_gap, y, "pH", "7.1", "")
    y += 164
    field(draw, x1, y, "Dissolved O₂", "5.6", "mg/L")
    field(draw, x1 + col_gap, y, "Ammonia", "0.02", "mg/L")
    y += 164
    field(draw, x1, y, "Nitrite", "0.04", "mg/L")
    rounded(draw, (x1 + col_gap, y + 36, x2, y + 118), 22, "#FFF7ED", "#FED7AA", 2)
    text(draw, (x1 + col_gap + 28, y + 78), "Watch", 30, COLORS["warning"], bold=True, anchor="lm")
    y += 175
    rounded(draw, (x1, y, x2, y + 190), 28, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x1 + 30, y + 34), "Notes", 25, COLORS["muted"], bold=True)
    multiline(draw, (x1 + 30, y + 78), "Surface activity normal. Aerator checked.\nWater exchange not required today.", 25, COLORS["ink"], spacing=9)
    rounded(draw, (x1, y2 - 280, x2, y2 - 205), 38, COLORS["primary"])
    text(draw, ((x1 + x2) // 2, y2 - 242), "Save inspection", 28, "#FFFFFF", bold=True, anchor="mm")
    bottom_tabs(draw, box, "inspection")


def screen_feeding(draw, box):
    x1, y1, x2, y2 = box
    header(draw, box, "Feeding & weight", "Log feed type, quantity, average fish weight, and behavior after feeding.")
    y = y1 + 215
    rounded(draw, (x1, y, x2, y + 120), 28, COLORS["primary"], None)
    text(draw, (x1 + 34, y + 40), "Suggested context", 27, "#DBFFFB", bold=True)
    text(draw, (x1 + 34, y + 82), "Tank B · biomass estimate 480 kg · last feed 1.6 kg", 23, "#FFFFFF")
    y += 165
    card(draw, (x1, y, x2 - x1), "Feed type", "Floating grower pellet · 32% protein", COLORS["primary"], 150)
    y += 175
    field(draw, x1, y, "Feed amount", "1.8", "kg")
    field(draw, x1 + 286, y, "Avg. fish weight", "420", "g")
    y += 165
    rounded(draw, (x1, y, x2, y + 230), 28, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x1 + 32, y + 36), "Behavior note", 26, COLORS["muted"], bold=True)
    multiline(draw, (x1 + 32, y + 84), "Strong response in first 8 minutes.\nNo floating dead fish observed.\nCheck morning dissolved oxygen tomorrow.", 25, COLORS["ink"], spacing=10)
    draw_catfish(draw, x2 - 180, y + 170, 0.55, COLORS["primary"])
    rounded(draw, (x1, y2 - 280, x2, y2 - 205), 38, COLORS["primary"])
    text(draw, ((x1 + x2) // 2, y2 - 242), "Save feeding record", 28, "#FFFFFF", bold=True, anchor="mm")
    bottom_tabs(draw, box, "inspection")


def screen_sync(draw, box):
    x1, y1, x2, y2 = box
    header(draw, box, "Google Drive sync", "Keep local-first records safe by uploading tank folders whenever internet is available.")
    y = y1 + 215
    rounded(draw, (x1, y, x2, y + 150), 34, "#ECFDF5", "#BBF7D0", 2)
    text(draw, (x1 + 36, y + 45), "Online · ready to upload", 34, COLORS["success"], bold=True)
    text(draw, (x1 + 36, y + 96), "3 pending records and 2 fish photos will sync to Drive.", 24, COLORS["ink"])
    y += 190
    card(draw, (x1, y, x2 - x1), "Drive folder structure", "Catfish Farm Logger / Tank B / 2026-05\ninspections.json · feedings.json · photos/", COLORS["blue"], 205)
    y += 235
    rounded(draw, (x1, y, x2, y + 255), 30, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x1 + 36, y + 38), "Sync progress", 30, COLORS["ink"], bold=True)
    for i, (label, color) in enumerate([("Authenticate with Google", COLORS["success"]), ("Create tank folders", COLORS["success"]), ("Upload JSON + photos", COLORS["warning"])]):
        yy = y + 94 + i * 52
        text(draw, (x1 + 48, yy), "●", 28, color, anchor="mm")
        text(draw, (x1 + 78, yy), label, 24, COLORS["ink"], anchor="lm")
    rounded(draw, (x1, y2 - 280, x2, y2 - 205), 38, COLORS["primary"])
    text(draw, ((x1 + x2) // 2, y2 - 242), "Sync now", 28, "#FFFFFF", bold=True, anchor="mm")
    bottom_tabs(draw, box, "sync")


def screen_settings(draw, box):
    x1, y1, x2, y2 = box
    header(draw, box, "Farm settings", "Tune reminders, feed presets, and the Drive root folder for your farm workflow.")
    y = y1 + 215
    card(draw, (x1, y, x2 - x1), "Daily inspection reminder", "Every day at 07:00 before the first feeding round", COLORS["warning"], 168)
    y += 195
    rounded(draw, (x1, y, x2, y + 245), 30, COLORS["surface"], COLORS["border"], 2)
    text(draw, (x1 + 36, y + 40), "Feed type presets", 30, COLORS["ink"], bold=True)
    for i, label in enumerate(["Starter crumble", "Floating grower pellet", "Finisher pellet"]):
        yy = y + 95 + i * 48
        text(draw, (x1 + 54, yy), "●", 22, COLORS["primary"], anchor="mm")
        text(draw, (x1 + 85, yy), label, 24, COLORS["ink"], anchor="lm")
    y += 275
    card(draw, (x1, y, x2 - x1), "Drive root folder", "Catfish Farm Logger\nSubfolders are created per tank and month.", COLORS["blue"], 190)
    y += 220
    rounded(draw, (x1, y, x2, y + 150), 30, COLORS["teal_soft"], None)
    multiline(draw, (x1 + 36, y + 36), "Offline-first: records remain on device even when field internet is unstable.", 27, COLORS["primary_dark"], bold=True, spacing=8)
    bottom_tabs(draw, box, "settings")


def compose(screen_name: str, size: tuple[int, int]) -> Image.Image:
    w, h = size
    img, draw = make_canvas(size)
    text(draw, (w // 2, 155), "Catfish farm records, ready offline", 62, COLORS["ink"], bold=True, anchor="mm")
    text(draw, (w // 2, 235), "Designed for pond checks, feeding logs, photos, and Drive backup", 31, COLORS["muted"], anchor="mm")
    frame_w = int(w * 0.72)
    frame_h = int(h * 0.74)
    frame_x = (w - frame_w) // 2
    frame_y = int(h * 0.16)
    box = draw_phone_frame(draw, frame_x, frame_y, frame_w, frame_h)
    content_x1, content_y1, content_x2, content_y2 = box
    # Clear screen content area after notch, preserving rounded frame.
    content_box = (content_x1, content_y1, content_x2, content_y2)
    if screen_name == "home":
        screen_home(draw, content_box)
    elif screen_name == "inspection":
        screen_inspection(draw, content_box)
    elif screen_name == "feeding":
        screen_feeding(draw, content_box)
    elif screen_name == "sync":
        screen_sync(draw, content_box)
    elif screen_name == "settings":
        screen_settings(draw, content_box)
    # Footer caption.
    footer = {
        "home": "Multiple tanks with daily inspection status",
        "inspection": "Water quality checks: temperature, pH, DO, ammonia, nitrite",
        "feeding": "Feed amount, type, weight, and behavior in one record",
        "sync": "Manual Google Drive backup by tank and month",
        "settings": "Reminders and presets for daily farm routines",
    }[screen_name]
    text(draw, (w // 2, h - 170), footer, 38, COLORS["primary_dark"], bold=True, anchor="mm")
    return img


def main():
    for size_key, size in SCREEN_SIZES.items():
        for screen in SCREENS:
            img = compose(screen, size)
            out = OUT / f"{DISPLAY_NAMES[screen]}_{size_key}.png"
            img.save(out, "PNG", optimize=True)
            print(out)


if __name__ == "__main__":
    main()
