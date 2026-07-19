# Generated Combat Asset Record

Generation date: 2026-07-19
Mode: built-in image generation tool, one call per distinct asset
Target: boss projectile/VFX plus stage 31–40 boss/minion/projectile actor packs
Runtime: current-stage-only loading through `combat-presentation-manifest.ts`

## Shared prompt constraints

Every prompt required:

- a named boss-specific object and motif
- a non-generic, readable silhouette at 64–96 px
- transparent background and clean alpha edges
- no text, UI frame, badge or character
- high-detail hand-painted 2D game art
- no tint-only variation

## Prompt set

| Stage | Asset | Distinct prompt motif |
|---:|---|---|
| 21 | `obsidian-behemoth.png` | blackglass armor facets, molten heart fracture |
| 22 | `spectral-broker.png` | chained contract scroll, coin and balance needle |
| 23 | `iron-seraph.png` | articulated iron wings, segmented halo spear |
| 24 | `toxic-singularity.png` | quarantine bio-cell, purifier coils, vortex tail |
| 25 | `solar-devourer.png` | eclipse disk occlusion, hard shadow wedge |
| 26 | `gravity-colossus.png` | heavy cube, gravitational lens and bent grid |
| 27 | `ruin-sovereign.png` | broken arch, keystone spear and masonry trail |
| 28 | `chaos-auditor.png` | crossed audit stamps, warped ledger and wax shards |
| 29 | `extinction-dragon.png` | skeletal dragon wing wrapped around fossil ward |
| 30 | `compound-overlord.png` | layered token stack, vault-key ram and graph fins |
| 31 | `eclipse-executioner.png` | eclipsed axe crescent and scaffold fractures |
| 32 | `paradox-machinist.png` | opposing clockwork arrowheads and causality seam |
| 33 | `blood-moon-tyrant.png` | moonbrand spear, veins and throne spikes |
| 34 | `infinite-tempest.png` | interlocking lightning ribbons and moving eye gap |
| 35 | `godfall-arbiter.png` | falling gavel, scale arms and verdict tablets |
| 36 | `chronos-warden.png` | broken clock cage and delayed ghost outlines |
| 37 | `astral-gravekeeper.png` | grave lantern and constellation soul ribbons |
| 38 | `hellfire-origin.png` | molten anvil wedge, hammer and broken chains |
| 39 | `absolute-zero.png` | frost fracture, heat-sharing hexagonal core |
| 40 | `eternity-devourer.png` | broken infinity ribbon, era glyphs and timeline maw |

Tool-managed originals remain in the generated-image output directory. Project
copies are stored under `public/assets/boss-projectiles/` for stages 21–30 and
`public/assets/boss-projectiles-special/` for stages 31–40. Originals were not
deleted. Automated tests require all forty runtime boss projectile files to
exist and have forty distinct SHA-256 hashes.

## Known limitation

## Stage 31–40 actor pack prompt set

Each stage used one separate 4×4, 1024px stage-pack prompt. Rows 1–2 contain
eight boss poses, row 3 contains four normal-monster poses, and row 4 contains
four signature-projectile poses. The source background was uniform `#00ff00`;
`scripts/process-combat-assets.mjs` converted it to real alpha and split the
runtime sheets.

| Stage | Boss / minion / projectile motif |
|---:|---|
| 31 | Eclipse Executioner / relay acolyte / crescent eclipse core |
| 32 | Paradox Machinist / causality automaton / opposed hourglass arrows |
| 33 | Blood Moon Tyrant / moonbrand hunter / thorned moon seal |
| 34 | Infinite Tempest / storm weaver / lightning eye gap |
| 35 | Godfall Arbiter / judgment bailiff / gavel-and-scale seal |
| 36 | Chronos Warden / time-latch gaoler / broken clock cage |
| 37 | Astral Gravekeeper / stargrave sexton / constellation lantern |
| 38 | Hellfire Origin / fusebreaker / chained anvil junction |
| 39 | Absolute Zero / thawless sentinel / fractured thermal hex |
| 40 | Eternity Devourer / era eater / palindrome infinity blades |

Shared constraints were original hand-painted 2D art, fixed side view, consistent
actor identity and ground contact, no copyrighted character reference, no text,
no UI, no checkerboard, and a non-rectangular projectile readable at 52px.
Tool-managed originals remain in the generated-image output directory.

Stages 31–40 now use stage-specific final-boss and normal-monster sheets.
Guardian/herald actor animations remain shared; their stage-specific boss
projectile presentation is production. Generated sprite alignment still needs
an independent in-game overlay review on every frame before a release build.
