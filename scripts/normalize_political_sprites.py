from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "political-duel" / "political-sd-sheet.png"
OUTPUT = ROOT / "public" / "assets" / "political-duel"
SOURCE_FRAME_WIDTH = 222
SOURCE_FRAME_HEIGHT = 444
TARGET_FRAME_SIZE = 256
MAX_SUBJECT_WIDTH = 224
MAX_SUBJECT_HEIGHT = 224
BASELINE_Y = 244


def normalize_row(row: int, name: str) -> None:
    source = Image.open(SOURCE).convert("RGBA")
    sheet = Image.new("RGBA", (TARGET_FRAME_SIZE * 8, TARGET_FRAME_SIZE), (0, 0, 0, 0))
    for column in range(8):
        frame = source.crop(
            (
                column * SOURCE_FRAME_WIDTH,
                row * SOURCE_FRAME_HEIGHT,
                (column + 1) * SOURCE_FRAME_WIDTH,
                (row + 1) * SOURCE_FRAME_HEIGHT,
            )
        )
        alpha_box = frame.getchannel("A").getbbox()
        if alpha_box is None:
            continue
        subject = frame.crop(alpha_box)
        scale = min(MAX_SUBJECT_WIDTH / subject.width, MAX_SUBJECT_HEIGHT / subject.height, 1.0)
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        x = column * TARGET_FRAME_SIZE + (TARGET_FRAME_SIZE - subject.width) // 2
        y = BASELINE_Y - subject.height
        sheet.alpha_composite(subject, (x, y))
    sheet.save(OUTPUT / f"political-{name}-sheet.png", optimize=True)


normalize_row(0, "conservative")
normalize_row(1, "progressive")
