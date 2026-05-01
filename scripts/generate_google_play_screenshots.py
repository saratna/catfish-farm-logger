from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "screenshots" / "google_play"
OUT.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"

W, H = 1080, 1920
BG = "#F3F7EE"
INK = "#163225"
MUTED = "#617066"
GREEN = "#2F6F4E"
BLUE = "#2F6B8F"
CARD = "#FFFFFF"
LINE = "#D7E1D4"
WARN = "#D78B20"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def rounded(draw, box, radius=36, fill=CARD, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, s, size=44, fill=INK, bold=False, anchor=None):
    draw.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)


def phone_frame(draw):
    rounded(draw, (72, 150, W - 72, H - 92), 54, "#FAFCF8", LINE, 3)
    draw.rounded_rectangle((438, 174, 642, 194), 10, fill="#CBD6CA")


def header(draw, title, subtitle):
    text(draw, (88, 68), title, 54, INK, True)
    text(draw, (88, 128), subtitle, 30, MUTED)


def nav(draw, active):
    y = H - 210
    draw.line((120, y, W - 120, y), fill=LINE, width=2)
    items = [("記録", 210), ("写真", 420), ("同期", 630), ("集計", 840)]
    for label, x in items:
        color = GREEN if label == active else MUTED
        draw.ellipse((x - 18, y + 42, x + 18, y + 78), fill=color)
        text(draw, (x, y + 96), label, 27, color, True, "ma")


def screenshot_1():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    header(d, "水槽の状態を一目で確認", "水温・pH・給餌・写真を毎日記録")
    phone_frame(d)
    text(d, (126, 240), "Catfish Farm Logger", 42, INK, True)
    text(d, (126, 292), "本日の水槽サマリー", 28, MUTED)
    for i, (name, temp, ph, color) in enumerate([("A池  稚魚", "25.8℃", "pH 7.2", GREEN), ("B池  育成", "26.1℃", "pH 7.0", BLUE), ("C池  出荷前", "24.9℃", "pH 7.4", WARN)]):
        y = 370 + i * 235
        rounded(d, (122, y, W - 122, y + 185), 34, CARD, LINE)
        text(d, (154, y + 34), name, 38, INK, True)
        text(d, (154, y + 92), f"水温 {temp}    {ph}", 30, MUTED)
        d.rounded_rectangle((154, y + 132, 412, y + 158), 13, fill=color)
        text(d, (690, y + 96), "良好", 38, color, True)
    nav(d, "記録")
    return im


def screenshot_2():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    header(d, "検査値と給餌を素早く入力", "現場で片手操作しやすい記録フォーム")
    phone_frame(d)
    text(d, (126, 240), "今日の記録", 46, INK, True)
    labels = [("水温", "26.0 ℃"), ("pH", "7.1"), ("溶存酸素", "6.8 mg/L"), ("給餌量", "12.5 kg")]
    for i, (k, v) in enumerate(labels):
        y = 335 + i * 155
        text(d, (142, y), k, 30, MUTED, True)
        rounded(d, (142, y + 42, W - 142, y + 118), 24, "#F8FBF5", LINE)
        text(d, (170, y + 65), v, 36, INK, True)
    rounded(d, (142, 1020, W - 142, 1128), 32, GREEN)
    text(d, (W // 2, 1052), "記録を保存", 42, "#FFFFFF", True, "ma")
    nav(d, "記録")
    return im


def screenshot_3():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    header(d, "魚の成長を写真で残す", "水槽・日付・メモ付きで管理")
    phone_frame(d)
    text(d, (126, 240), "写真記録", 46, INK, True)
    for i, color in enumerate(["#8EBB7A", "#5E92A8", "#C7A86B", "#7EA080"]):
        x = 142 + (i % 2) * 410
        y = 335 + (i // 2) * 410
        rounded(d, (x, y, x + 350, y + 350), 34, color)
        d.arc((x + 78, y + 78, x + 272, y + 254), 200, 340, fill="#FFFFFF", width=12)
        d.ellipse((x + 204, y + 130, x + 236, y + 162), fill="#FFFFFF")
    text(d, (142, 1175), "A池 2026/05/01", 34, INK, True)
    text(d, (142, 1228), "摂餌良好。水面反応も安定。", 30, MUTED)
    nav(d, "写真")
    return im


def screenshot_4():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    header(d, "Google Driveへ同期", "記録JSONと写真を水槽別フォルダへ保存")
    phone_frame(d)
    text(d, (126, 240), "Drive同期", 46, INK, True)
    rounded(d, (142, 340, W - 142, 610), 36, CARD, LINE)
    text(d, (176, 382), "接続状態", 30, MUTED, True)
    text(d, (176, 438), "Google Driveに接続済み", 38, GREEN, True)
    text(d, (176, 500), "最終同期 2026/05/01 12:45", 30, MUTED)
    rounded(d, (142, 690, W - 142, 810), 34, BLUE)
    text(d, (W // 2, 730), "今すぐ同期", 44, "#FFFFFF", True, "ma")
    for i, line in enumerate(["/Catfish Farm Logger/A池", "検査記録 JSON", "給餌記録 JSON", "写真ファイル"]):
        text(d, (176, 925 + i * 70), line, 32, INK if i == 0 else MUTED, i == 0)
    nav(d, "同期")
    return im


shots = [
    ("01_tank_overview_google_play.png", screenshot_1()),
    ("02_daily_entry_google_play.png", screenshot_2()),
    ("03_photo_log_google_play.png", screenshot_3()),
    ("04_drive_sync_google_play.png", screenshot_4()),
]
for name, im in shots:
    im.save(OUT / name, optimize=True)
    print(OUT / name)
