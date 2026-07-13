from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
NAMES = [
    "goblin-warlord", "mist-wolf", "rune-golem", "lava-dragon", "ice-queen",
    "desert-scorpion", "wind-harpy", "vampire-lord", "deep-kraken", "thunder-minotaur",
    "plague-necromancer", "crystal-hydra", "clockwork-titan", "sand-wyrm", "celestial-griffin",
    "void-witch", "frost-mammoth", "inferno-phoenix", "abyss-leviathan", "avalanche-emperor",
]


def remove_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if red > 190 and blue > 165 and green < 115 and red + blue - green * 2 > 245:
                pixels[x, y] = (red, green, blue, 0)
            elif alpha > 0:
                pixels[x, y] = (red, green, blue, alpha)
    return rgba


def clean_disconnected_bleed(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    source = alpha.load()
    visited = bytearray(width * height)
    components: list[tuple[list[tuple[int, int]], tuple[int, int, int, int]]] = []

    for y in range(height):
        for x in range(width):
            position = y * width + x
            if visited[position] or source[x, y] < 24:
                continue
            queue = deque([(x, y)])
            visited[position] = 1
            points: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                current_x, current_y = queue.popleft()
                points.append((current_x, current_y))
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)
                for next_y in range(max(0, current_y - 1), min(height, current_y + 2)):
                    for next_x in range(max(0, current_x - 1), min(width, current_x + 2)):
                        next_position = next_y * width + next_x
                        if not visited[next_position] and source[next_x, next_y] >= 24:
                            visited[next_position] = 1
                            queue.append((next_x, next_y))
            components.append((points, (min_x, min_y, max_x, max_y)))

    if not components:
        return image
    components.sort(key=lambda component: len(component[0]), reverse=True)
    largest_points, largest_box = components[0]
    keep = set(largest_points)
    main_left, main_top, main_right, main_bottom = largest_box
    for points, (left, top, right, bottom) in components[1:]:
        touches_cell_edge = left <= 1 or top <= 1 or right >= width - 2 or bottom >= height - 2
        gap_x = max(main_left - right, left - main_right, 0)
        gap_y = max(main_top - bottom, top - main_bottom, 0)
        close_to_subject = gap_x <= 48 and gap_y <= 48
        substantial = len(points) >= max(12, len(largest_points) // 180)
        if not touches_cell_edge and (close_to_subject or substantial):
            keep.update(points)

    cleaned_alpha = Image.new("L", image.size, 0)
    cleaned_pixels = cleaned_alpha.load()
    for x, y in keep:
        cleaned_pixels[x, y] = source[x, y]
    cleaned = image.copy()
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def fit_cell(image: Image.Image, padding: int) -> Image.Image:
    bounds = image.getbbox()
    canvas = Image.new("RGBA", (256, 320), (0, 0, 0, 0))
    if bounds is None:
        return canvas
    subject = image.crop(bounds)
    subject.thumbnail((256 - padding * 2, 320 - padding * 2), Image.Resampling.LANCZOS)
    x = (256 - subject.width) // 2
    y = (320 - subject.height) // 2
    canvas.alpha_composite(subject, (x, y))
    return canvas


def rebuild(source_name: str, output_folder: str, atlas_name: str, padding: int) -> None:
    source = remove_magenta(Image.open(ASSETS / "sprites" / source_name))
    output = ASSETS / output_folder
    output.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (256 * 5, 320 * 4), (0, 0, 0, 0))

    for index, name in enumerate(NAMES):
        column = index % 5
        row = index // 5
        left = round(column * source.width / 5)
        right = round((column + 1) * source.width / 5)
        top = round(row * source.height / 4)
        bottom = round((row + 1) * source.height / 4)
        cell = source.crop((left, top, right, bottom))
        cell = fit_cell(clean_disconnected_bleed(cell), padding)
        cell.save(output / f"{name}.png", optimize=True)
        atlas.alpha_composite(cell, (column * 256, row * 320))

    atlas.save(ASSETS / "sprites" / atlas_name, optimize=True)


if __name__ == "__main__":
    rebuild("boss-atlas-generated-v3.png", "bosses-v4", "boss-atlas-clean-v4.png", 10)
    rebuild("boss-effect-atlas-generated-v3.png", "boss-effects-v4", "boss-effect-atlas-clean-v4.png", 18)
    print("Rebuilt 20 bosses and 20 projectiles into clean v4 atlases.")
