from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/catfish_farm_logger')
source = root / 'assets/images/icon.png'
targets = [
    root / 'assets/images/icon.png',
    root / 'assets/images/splash-icon.png',
    root / 'assets/images/favicon.png',
    root / 'assets/images/android-icon-foreground.png',
]

with Image.open(source) as img:
    img = img.convert('RGBA')
    for target in targets:
        size = 512 if target.name != 'favicon.png' else 256
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(target, format='PNG', optimize=True, compress_level=9)
        print(f'{target}: {target.stat().st_size / 1024:.1f}KB')
