from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "boss-effects-v4"
OUTPUT = ROOT / "public" / "assets" / "boss-projectiles"
CANVAS_SIZE = 256
CONTENT_SIZE = 216


def normalize() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    edge_contacts = 0
    sources = sorted(SOURCE.glob("*.png"))
    for source_path in sources:
        source = Image.open(source_path).convert("RGBA")
        mask = source.getchannel("A").point(lambda alpha: 255 if alpha >= 8 else 0)
        box = mask.getbbox()
        if box is None:
            continue
        subject = source.crop(box)
        scale = min(CONTENT_SIZE / subject.width, CONTENT_SIZE / subject.height)
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        subject = ImageEnhance.Sharpness(subject).enhance(1.25)
        canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        x = (CANVAS_SIZE - subject.width) // 2
        y = (CANVAS_SIZE - subject.height) // 2
        canvas.alpha_composite(subject, (x, y))
        output_box = canvas.getchannel("A").point(lambda alpha: 255 if alpha >= 8 else 0).getbbox()
        if output_box is not None and (output_box[0] < 18 or output_box[1] < 18 or output_box[2] > 238 or output_box[3] > 238):
            edge_contacts += 1
        canvas.save(OUTPUT / source_path.name, optimize=True)
    print(f"Normalized {len(sources)} boss projectiles; unsafe edge contacts: {edge_contacts}")


normalize()
