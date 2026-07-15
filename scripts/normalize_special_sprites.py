from pathlib import Path
import sys
from collections import deque

from PIL import Image, ImageFilter


def keep_primary_subject(frame: Image.Image) -> Image.Image:
    alpha = frame.getchannel("A")
    connected = alpha.point(lambda value: 255 if value > 12 else 0).filter(ImageFilter.MaxFilter(5))
    width, height = connected.size
    pixels = connected.load()
    visited = bytearray(width * height)
    largest: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or pixels[x, y] == 0:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited[offset] = 1
            while queue:
                current_x, current_y = queue.popleft()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x - 1, current_y), (current_x + 1, current_y),
                    (current_x, current_y - 1), (current_x, current_y + 1),
                ):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    next_offset = next_y * width + next_x
                    if visited[next_offset] or pixels[next_x, next_y] == 0:
                        continue
                    visited[next_offset] = 1
                    queue.append((next_x, next_y))
            if len(component) > len(largest):
                largest = component
    if not largest:
        return frame
    keep = Image.new("L", frame.size, 0)
    keep_pixels = keep.load()
    for x, y in largest:
        keep_pixels[x, y] = 255
    keep = keep.filter(ImageFilter.MaxFilter(5))
    clean_alpha = Image.new("L", frame.size, 0)
    clean_alpha.paste(alpha, mask=keep)
    cleaned = frame.copy()
    cleaned.putalpha(clean_alpha)
    return cleaned


def normalize(source: Path, output: Path, frame_count: int, max_width: int, max_height: int) -> None:
    image = Image.open(source).convert("RGBA")
    source_frame_width = image.width // frame_count
    sheet = Image.new("RGBA", (frame_count * 256, 256), (0, 0, 0, 0))
    for index in range(frame_count):
        frame = image.crop((index * source_frame_width, 0, (index + 1) * source_frame_width, image.height))
        # Generated contact sheets can let a neighboring pose bleed across a
        # nominal cell boundary. Discard the outer strip before measuring the
        # subject so one Phaser frame never renders pieces of two boss poses.
        horizontal_inset = round(source_frame_width * 0.08)
        frame = frame.crop((horizontal_inset, 0, source_frame_width - horizontal_inset, image.height))
        frame = keep_primary_subject(frame)
        alpha = frame.getchannel("A")
        box = alpha.getbbox()
        if box is None:
            continue
        subject = frame.crop(box)
        scale = min(max_width / subject.width, max_height / subject.height)
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        x = index * 256 + (256 - subject.width) // 2
        y = 244 - subject.height
        sheet.alpha_composite(subject, (x, y))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 6:
        raise SystemExit("usage: normalize_special_sprites.py SOURCE OUTPUT FRAME_COUNT MAX_WIDTH MAX_HEIGHT")
    normalize(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]))
