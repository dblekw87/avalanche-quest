from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "political-duel" / "political-skill-vfx-sheet.png"
FULL_BULL_SOURCE = ROOT / "public" / "assets" / "political-duel" / "source" / "conservative-bull-v2-transparent.png"
FULL_PROGRESSIVE_Q_SOURCE = ROOT / "public" / "assets" / "political-duel" / "source" / "progressive-q-orb-v2-transparent.png"
OUTPUT = ROOT / "public" / "assets" / "political-duel" / "skill-vfx"
SOURCE_WIDTH = 192
SOURCE_HEIGHT = 128
TARGET_SIZE = 256
MAX_SIZE = 216
EDGE_FADE = 12
ROW_BLEED_CUT = 38

SKILLS = (
    "conservative-q", "conservative-w", "conservative-e", "conservative-r",
    "conservative-z", "conservative-x", "conservative-c", "conservative-v",
    "progressive-q", "progressive-w", "progressive-e", "progressive-r",
    "progressive-z", "progressive-x", "progressive-c", "progressive-v",
)

GROUND_SKILLS = {
    "conservative-w", "conservative-z", "conservative-v",
    "progressive-w", "progressive-z", "progressive-x", "progressive-v",
}

# Moving shots need a stable, readable core. Replaying the generated impact/fade
# sequence while the physics body is still flying makes the projectile flicker
# or disappear, so these strips reuse their clearest phase with a subtle pulse.
PROJECTILE_SKILLS = {
    "conservative-q": {"phase": 1, "rotation": 42, "mirror": True, "size": 220},
    "conservative-r": {"phase": 1, "rotation": 0, "mirror": True, "size": 224},
}


def visible_box(frame: Image.Image) -> tuple[int, int, int, int] | None:
    mask = frame.getchannel("A").point(lambda alpha: 255 if alpha >= 112 else 0)
    return mask.getbbox()


def edge_mask() -> Image.Image:
    mask = Image.new("L", (SOURCE_WIDTH, SOURCE_HEIGHT), 0)
    pixels = mask.load()
    for y in range(SOURCE_HEIGHT):
        for x in range(SOURCE_WIDTH):
            distance = min(x, y, SOURCE_WIDTH - 1 - x, SOURCE_HEIGHT - 1 - y)
            pixels[x, y] = max(0, min(255, round(distance * 255 / EDGE_FADE)))
    return mask


def split() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    full_bull = Image.open(FULL_BULL_SOURCE).convert("RGBA") if FULL_BULL_SOURCE.exists() else None
    full_progressive_q = Image.open(FULL_PROGRESSIVE_Q_SOURCE).convert("RGBA") if FULL_PROGRESSIVE_Q_SOURCE.exists() else None
    fade_mask = edge_mask()
    touched = 0
    for skill_index, slug in enumerate(SKILLS):
        strip = Image.new("RGBA", (TARGET_SIZE * 4, TARGET_SIZE), (0, 0, 0, 0))
        if slug == "progressive-q" and full_progressive_q is not None:
            cell_width = full_progressive_q.width // 4
            for phase in range(4):
                frame = full_progressive_q.crop((phase * cell_width, 0, (phase + 1) * cell_width, full_progressive_q.height))
                box = visible_box(frame)
                if box is None:
                    continue
                subject = ImageEnhance.Sharpness(frame.crop(box)).enhance(1.5)
                scale = min(216 / subject.width, 216 / subject.height)
                size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
                subject = subject.resize(size, Image.Resampling.LANCZOS)
                x = phase * TARGET_SIZE + (TARGET_SIZE - subject.width) // 2
                y = (TARGET_SIZE - subject.height) // 2
                strip.alpha_composite(subject, (x, y))
            strip.save(OUTPUT / f"{slug}.png", optimize=True)
            continue
        projectile = PROJECTILE_SKILLS.get(slug)
        if projectile is not None:
            source_index = skill_index * 4 + int(projectile["phase"])
            column = source_index % 8
            row = source_index // 8
            frame = source.crop((column * SOURCE_WIDTH, row * SOURCE_HEIGHT, (column + 1) * SOURCE_WIDTH, (row + 1) * SOURCE_HEIGHT))
            if row > 0:
                clean_alpha = frame.getchannel("A")
                clean_alpha.paste(0, (0, 0, SOURCE_WIDTH, ROW_BLEED_CUT))
                frame.putalpha(clean_alpha)
            frame.putalpha(ImageChops.multiply(frame.getchannel("A"), fade_mask))
            box = visible_box(frame)
            if box is not None:
                subject = frame.crop(box)
                if bool(projectile["mirror"]):
                    subject = ImageOps.mirror(subject)
                rotation = int(projectile["rotation"])
                if rotation:
                    subject = subject.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)
                subject = ImageEnhance.Sharpness(subject).enhance(1.7)
                pulse = (0.92, 1.0, 1.05, 0.98)
                for phase, phase_scale in enumerate(pulse):
                    max_size = int(projectile["size"] * phase_scale)
                    scale = min(max_size / subject.width, max_size / subject.height)
                    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
                    rendered = subject.resize(size, Image.Resampling.LANCZOS)
                    x = phase * TARGET_SIZE + (TARGET_SIZE - rendered.width) // 2
                    y = (TARGET_SIZE - rendered.height) // 2
                    strip.alpha_composite(rendered, (x, y))
            strip.save(OUTPUT / f"{slug}.png", optimize=True)
            continue
        for phase in range(4):
            if slug == "conservative-x" and full_bull is not None:
                cell_width = full_bull.width // 4
                frame = full_bull.crop((phase * cell_width, 0, (phase + 1) * cell_width, full_bull.height))
                box = visible_box(frame)
                if box is None:
                    continue
                subject = frame.crop(box)
                scale = min(240 / subject.width, 190 / subject.height)
                size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
                subject = subject.resize(size, Image.Resampling.LANCZOS)
                x = phase * TARGET_SIZE + (TARGET_SIZE - subject.width) // 2
                strip.alpha_composite(subject, (x, 236 - subject.height))
                continue
            source_index = skill_index * 4 + phase
            column = source_index % 8
            row = source_index // 8
            frame = source.crop((
                column * SOURCE_WIDTH,
                row * SOURCE_HEIGHT,
                (column + 1) * SOURCE_WIDTH,
                (row + 1) * SOURCE_HEIGHT,
            ))
            if row > 0:
                clean_alpha = frame.getchannel("A")
                clean_alpha.paste(0, (0, 0, SOURCE_WIDTH, ROW_BLEED_CUT))
                frame.putalpha(clean_alpha)
            frame.putalpha(ImageChops.multiply(frame.getchannel("A"), fade_mask))
            box = visible_box(frame)
            if box is None:
                continue
            if box[0] <= 2 or box[1] <= 2 or box[2] >= SOURCE_WIDTH - 2 or box[3] >= SOURCE_HEIGHT - 2:
                touched += 1
            subject = frame.crop(box)
            scale = min(MAX_SIZE / subject.width, MAX_SIZE / subject.height, 1.0)
            size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
            subject = subject.resize(size, Image.Resampling.LANCZOS)
            x = phase * TARGET_SIZE + (TARGET_SIZE - subject.width) // 2
            y = (232 - subject.height) if slug in GROUND_SKILLS else (TARGET_SIZE - subject.height) // 2
            strip.alpha_composite(subject, (x, max(8, y)))
        strip.save(OUTPUT / f"{slug}.png", optimize=True)
    print(f"Created {len(SKILLS)} independent skill strips; source edge contacts: {touched}/64")


split()
