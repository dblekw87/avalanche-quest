from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "bosses-v4"
GENERATED_GOBLIN = ROOT / "public" / "assets" / "boss-animation-sources" / "goblin-warlord-animation-transparent.png"
OUTPUT = ROOT / "public" / "assets" / "boss-animation-sheets"
FRAME_SIZE = 256
MAX_CONTENT = 218


def visible_box(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").point(lambda alpha: 255 if alpha >= 10 else 0).getbbox()


def fit_subject(subject: Image.Image, max_width: int = MAX_CONTENT, max_height: int = MAX_CONTENT) -> Image.Image:
    scale = min(max_width / subject.width, max_height / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    return ImageEnhance.Sharpness(subject.resize(size, Image.Resampling.LANCZOS)).enhance(1.18)


def place_frame(subject: Image.Image, x_shift: int = 0, y_shift: int = 0) -> Image.Image:
    if subject.width > 236 or subject.height > 228:
        subject = fit_subject(subject, 236, 228)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    x = max(8, min(FRAME_SIZE - subject.width - 8, (FRAME_SIZE - subject.width) // 2 + x_shift))
    y = max(8, min(FRAME_SIZE - subject.height - 8, 236 - subject.height + y_shift))
    frame.alpha_composite(subject, (x, y))
    return frame


def generated_goblin_frames() -> list[Image.Image]:
    source = Image.open(GENERATED_GOBLIN).convert("RGBA")
    cell_width = source.width // 4
    cell_height = source.height // 2
    frames: list[Image.Image] = []
    for index in range(8):
        column = index % 4
        row = index // 4
        cell = source.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
        box = visible_box(cell)
        if box is None:
            frames.append(Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0)))
            continue
        frames.append(place_frame(fit_subject(cell.crop(box), 224, 224)))
    return frames


def transformed_frames(source_path: Path) -> list[Image.Image]:
    source = Image.open(source_path).convert("RGBA")
    box = visible_box(source)
    if box is None:
        return [Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0)) for _ in range(8)]
    base = fit_subject(source.crop(box), 194, 210)
    poses = (
        (0, 1.0, 1.0, 0, 0),
        (0, 1.025, 0.975, 0, 3),
        (-3, 1.0, 1.0, -5, 0),
        (0, 0.94, 1.06, 0, -18),
        (-8, 0.98, 1.0, -5, 1),
        (10, 1.03, 0.98, 8, -1),
        (4, 1.045, 0.97, 5, 0),
        (-7, 0.96, 1.0, -7, 4),
    )
    frames: list[Image.Image] = []
    for angle, scale_x, scale_y, x_shift, y_shift in poses:
        size = (max(1, round(base.width * scale_x)), max(1, round(base.height * scale_y)))
        posed = base.resize(size, Image.Resampling.BICUBIC)
        if angle:
            posed = posed.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        frames.append(place_frame(posed, x_shift, y_shift))
    return frames


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    unsafe = 0
    sources = sorted(SOURCE.glob("*.png"))
    for source_path in sources:
        frames = generated_goblin_frames() if source_path.stem == "goblin-warlord" and GENERATED_GOBLIN.exists() else transformed_frames(source_path)
        sheet = Image.new("RGBA", (FRAME_SIZE * 8, FRAME_SIZE), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            box = visible_box(frame)
            if box is not None and (box[0] < 6 or box[1] < 6 or box[2] > 250 or box[3] > 250):
                unsafe += 1
            sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
        sheet.save(OUTPUT / source_path.name, optimize=True)
    print(f"Built {len(sources)} boss animation sheets / {len(sources) * 8} frames; unsafe contacts: {unsafe}")


build()
