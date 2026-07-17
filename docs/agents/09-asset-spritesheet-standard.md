# Asset and Sprite-Sheet Standard

## Source and licensing

Every asset has a recorded origin, author/tool, license or ownership statement, and
export date. Do not imitate or ship copyrighted game characters, UI, logos, maps,
sounds, or ripped sprite sheets. AI-generated assets require a retained prompt/source
record and human review for recognizable third-party material.

Keep editable sources outside the runtime asset tree or in a clearly named source
folder. `public/assets` contains optimized runtime exports only.

## Directory contract

```text
public/assets/
├─ characters/<character-id>/
├─ enemies/<enemy-id>/
├─ bosses/<boss-id>/
├─ skills/<character-id>/<skill-id>/
├─ projectiles/<projectile-id>/
├─ maps/<stage-id>/
├─ ui/
└─ audio/{music,sfx,voice}/
```

Existing folders may remain during migration, but new assets must have one canonical
owner and a manifest entry. Avoid duplicating the same bitmap under icon/VFX folders.

## Naming

Use lowercase kebab-case filenames and stable semantic IDs:

```text
<character-id>-<action>-sheet-v<number>.png
<skill-id>-cast-vfx-sheet-v<number>.png
<skill-id>-icon-v<number>.webp
<stage-id>-background-v<number>.webp
```

Phaser texture keys are namespaced:

```text
char:<character-id>:<action>:v<number>
enemy:<enemy-id>:<action>:v<number>
skill:<skill-id>:<phase>:v<number>
ui:<feature>:<name>:v<number>
```

Never rely on query-string cache versions scattered through scene code. The asset
manifest owns the file version and texture key.

## Sprite-sheet layout

- Use a uniform cell size within one sheet. Runtime sheets must declare exact
  `frameWidth`, `frameHeight`, frame count, row/column order and frame rate.
- Recommended character cell: `256×256`; smaller exports are acceptable only when
  all actions share scale, foot position and hitbox alignment.
- Use transparent PNG/WebP, sRGB, straight alpha, no opaque padding/background, and
  no partially clipped glow at cell edges.
- Keep the character's ground contact at the same anchor across locomotion frames.
  Default origin is `(0.5, 1.0)` for grounded actors and `(0.5, 0.5)` for effects.
- Face right in source art. Use `flipX` for left unless asymmetric equipment/text or
  lighting requires an explicitly declared left-facing sheet.
- Padding and extrusion must prevent texture bleeding. If using an atlas, include
  trimmed-frame offsets and do not trim collision geometry independently per frame.
- Do not mix unrelated resolutions or actions in an undocumented grid.

## Required character animations

| Animation | Suggested frames | FPS | Loop | Gameplay note |
| --- | ---: | ---: | --- | --- |
| `idle` | 4–8 | 6–10 | yes | no body movement |
| `run` | 6–10 | 10–14 | yes | stable foot contact |
| `jump-start` | 2–4 | 10–12 | no | may fall back to `jump` |
| `jump`/`fall` | 1–4 | 6–10 | optional | selected by vertical velocity |
| `attack-1` | 4–8 | 12–18 | no | hit frame declared in data |
| `cast` | 4–10 | 10–16 | no | spawn frame declared |
| `dash` | 3–6 | 14–20 | no | not source of invulnerability truth |
| `hurt` | 2–4 | 10–14 | no | short and interruptible by death |
| `death` | 6–12 | 8–12 | no | terminal, never loops |

Bosses additionally require `telegraph`, each named attack/pattern, phase transition,
and death. If an animation is absent, the manifest declares a reviewed fallback;
silently using frame zero is not acceptable.

## Animation event metadata

Hit, projectile spawn, sound, movement lock and VFX timings live in data, not magic
timeouts dispersed through a scene:

```ts
type AnimationDefinition = Readonly<{
  key: string;
  textureKey: string;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
  origin: Readonly<{ x: number; y: number }>;
  events?: readonly Readonly<{
    frame: number;
    type: 'hit' | 'projectile' | 'sound' | 'footstep' | 'vfx';
    payloadId: string;
  }>[];
}>;
```

Animation events request gameplay actions, but `CombatSystem` still validates state,
cooldown and hit policy. A decorative frame must never be the sole security/reward
evidence.

## Hitboxes and visual bounds

Physics bodies and combat hitboxes are data independent of transparent pixels. Define
body size/offset, hurtbox, attack shapes and debug color in character/skill manifests.
Validate at both facings, on slopes/platform edges and at maximum animation scale.
VFX size does not imply damage area; the telegraph should clearly cover the actual
danger area.

## Skill VFX phases

Separate `anticipation`, `cast`, `travel`, `impact`, `sustain`, and `dissipate` assets
where used. The manifest defines blend mode, depth layer, origin, scale, animation,
maximum simultaneous instances and pool size. Full-screen flashes respect reduced
motion and photosensitivity limits; avoid rapid high-contrast flashing.

## Performance budgets

- Prefer WebP/AVIF for static backgrounds and PNG/WebP for alpha sprites according to
  measured browser support and quality.
- Load only the selected character, current stage, current enemies and equipped skills.
- Use atlases/sheets to reduce requests, but split assets that cause large unused loads.
- Pool projectiles and VFX. Set hard caps for particles and simultaneous full-screen
  effects. Avoid runtime texture generation in the frame loop.
- Record compressed size, decoded dimensions and approximate GPU memory in the manifest.
  Any single texture above the supported GPU limit or unexplained large asset blocks
  review. Test on the project's minimum target device.

## Asset manifest

```ts
type SpriteSheetAsset = Readonly<{
  id: string;
  kind: 'character' | 'enemy' | 'boss' | 'skill-vfx' | 'projectile';
  url: string;
  version: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  animations: readonly AnimationDefinition[];
  source: Readonly<{ owner: string; license: string; record: string }>;
}>;
```

CI or a validation script should check file existence, dimensions divisible by frame
size, declared frame bounds, duplicate keys, missing animations, oversized textures,
and orphan manifest entries. New asset work is incomplete until this validation passes.

## Asset acceptance checklist

- [ ] Original/licensed source record exists.
- [ ] Naming, texture key, dimensions and frame count match the manifest.
- [ ] No clipped frames, halos, matte background or anchor jitter.
- [ ] Required animations and declared events play correctly in both directions.
- [ ] Body/hurtbox/hitbox debug overlay was inspected.
- [ ] Pool/cap and load/unload behavior were tested through scene restart.
- [ ] Compressed size, decoded size and frame-time impact meet the device budget.
