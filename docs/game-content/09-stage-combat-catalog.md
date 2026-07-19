# Stage 1–50 Combat Catalog

이 문서는 보스 패턴, 일반 몬스터 스킬, encounter와 presentation asset의
사람 검토용 인덱스다. 런타임 source of truth는
[`src/game/content/stage-combat-catalog.ts`](../../src/game/content/stage-combat-catalog.ts)다.

## 에이전트 합의

보스 패턴, 일반 몬스터 AI와 전투 아키텍처 에이전트의 독립 검토 결론은
다음과 같다.

- **필수 불변조건: 50개 보스는 각각 다른 실제 패턴 구성을 가진다.**
  보스 이름, 수치, 속도, 투사체 수, 색, stage namespace만 바꾼 복제 deck은
  금지한다. Stage ID와 presentation ID를 제거한 뒤에도 phase별 executor,
  decision kind와 geometry 배열 fingerprint가 50개 모두 달라야 한다.
- 속도, HP, 탄 수, tint 또는 공통 배열 순서만 바꾼 것은 고유 콘텐츠가 아니다.
- 검증된 executor는 재사용하되 boss/minion identity, 판단 규칙, deck,
  arena 사용, counterplay fingerprint와 presentation은 stage마다 달라야 한다.
- 일반 이동은 느리게 유지하고 난이도는 memory, positioning, bait,
  interrupt, target priority, line-of-sight와 route 판단으로 만든다.
- 보스는 1–30에서 3 phase, 31–40에서 4 phase, 41–50에서 5 phase를 사용하며 phase마다
  12개의 named entry를 우선 구현한다. 허용 범위는 12–15다.
- 일반 몬스터는 Teach → Test → Combine의 세 encounter로 signature를
  학습시킨다.
- 자산은 색만 바꾸지 않는다. silhouette, geometry, motion 가운데 최소
  두 요소가 달라야 한다.

## Stage identity matrix

| # | Stage / Boss | Boss identity anchors | Normal-monster signature |
|---:|---|---|---|
| 1 | Verdant Pass / Goblin Warlord | banner claim, shield flank, bomb bait | `root-lattice` — ordered root gaps |
| 2 | Mistwood Den / Mist Wolf | scent trail, fog pockets, echo paw | `mist-footprint` — delayed path echo |
| 3 | Ruined City / Rune Golem | rune order, core break, pillar LoS | `masonry-order` — numbered falling masonry |
| 4 | Volcanic Frontier / Lava Dragon | vent order, breath cover, tail bait | `vent-relay` — cooled-vent route |
| 5 | Frozen Sanctum / Ice Queen | mirror tile, statue cover, thaw sigil | `frost-mirror` — mirrored safe symbol |
| 6 | Desert Tomb / Desert Scorpion | burrow track, tail mark, oasis cleanse | `scarab-seal` — interruptible summon seal |
| 7 | Sky Reach / Wind Harpy | gust lanes, perch interrupt, updraft zone | `crosswind-pennant` — directional cover |
| 8 | Blood Castle / Vampire Lord | blood tether, altar sever, shadow mirror | `crimson-tether` — distance/channel break |
| 9 | Abyssal Reef / Deep Kraken | tentacle order, anchor zone, ink LoS | `bubble-wake` — oldest-first path bait |
| 10 | Thunder Coliseum / Thunder Minotaur | pillar charge, lightning rods, hoof shock | `conduction-circuit` — pylon memory |
| 11 | Plague Marsh / Plague Necromancer | corpse totem, cleanse pool, bone line | `spore-choir` — ordered target interrupt |
| 12 | Crystal Labyrinth / Crystal Hydra | head match, prism lanes, crystal cover | `prism-ricochet` — reflected line reading |
| 13 | Clockwork Fortress / Clockwork Titan | clock sectors, gear jam, piston lanes | `clock-gate` — rotating marked gap |
| 14 | Sunken Dunes / Sand Wyrm | footprint memory, burrow path, oasis zone | `buried-footfall` — delayed footprint reversal |
| 15 | Celestial Aerie / Celestial Griffin | constellation order, wing gust, star perch | `feather-compass` — lane glyph sequence |
| 16 | Void Temple / Void Witch | portal pairs, void mark, shadow copy | `null-rite` — node-before-caster priority |
| 17 | Mammoth Glacier / Frost Mammoth | tusk wall, ice order, stomp ring | `fracture-route` — ordered platform safety |
| 18 | Phoenix Caldera / Inferno Phoenix | ash nests, rebirth interrupt, ember carry | `ember-recall` — revive-object interrupt |
| 19 | Leviathan Trench / Abyss Leviathan | tide level, anchor chain, wave cover | `pressure-ring` — aligned notch crossing |
| 20 | Avalanche Throne / Avalanche Emperor | royal decree, snow cover, crown shards | `avalanche-arch` — pre-marked closing cover |
| 21 | Obsidian Breach / Obsidian Behemoth | plate break, shard cover, fissure route | `obsidian-facet` — baited facing weak window |
| 22 | Spectral Exchange / Spectral Broker | bid/ask zones, contract mark, coin bait | `debt-ledger` — enemy death placement |
| 23 | Iron Maelstrom / Iron Seraph | wing gates, halo match, feather shield | `magnetic-claim` — pylon-guided projectile |
| 24 | Toxic Singularity / Toxic Singularity | contagion transfer, purifier pylons, quarantine lanes | `antidote-rotation` — beacon route |
| 25 | Solar Ruin / Solar Devourer | moving shadow, eclipse pillars, flare bait | `solar-occlusion` — explicit LoS shadow |
| 26 | Gravity Vault / Gravity Colossus | anchor weight, gravity lanes, falling zone | `gravity-stamp` — raised safe pad |
| 27 | Broken Fortune / Ruin Sovereign | floor collapse, rebuild tiles, masonry cover | `fortune-split` — shape-based symbol match |
| 28 | Chaos Ledger / Chaos Auditor | ledger order, audit stamps, variance zones | `audit-sequence` — 1→2→3 interrupt |
| 29 | Extinction Market / Extinction Dragon | fossil wards, breath LoS, species sigils | `disposal-route` — guide bomb to crusher |
| 30 | Last Compound / Compound Overlord | stack transfer, deposit zones, growing mark | `keyholder-protocol` — I→II→III role order |
| 31 | Eclipse Gate / Eclipse Executioner | light/shadow judgment, execution marks, totality sentence | `umbra-relay` — A→B→C moving sanctuary |
| 32 | Paradox Foundry / Paradox Machinist | recorded path, clone timeline, bootstrap collapse | `paradox-afterimage` — mirrored delayed echo |
| 33 | Blood Moon Citadel / Blood Moon Tyrant | moon altars, vein lanes, red coronation | `moonbrand-hunt` — moving priority target |
| 34 | Infinite Tempest / Infinite Tempest | moving eye, grounded zones, infinite eye | `storm-weave` — moving gap route |
| 35 | Godfall Chasm / Godfall Arbiter | verdict symbols, witness adds, godfall verdict | `judgment-seal` — collision bait shield break |
| 36 | Chronos Prison / Chronos Warden | delayed echo, time locks, prison break | `time-latch` — player-controlled hazard angle |
| 37 | Astral Graveyard / Astral Gravekeeper | constellation graves, lantern LoS, astral funeral | `constellation-wake` — ordered defeat path |
| 38 | Hellfire Nexus / Hellfire Origin | temper cycle, forge runes, origin forge | `fuse-network` — network interrupt/safe bay |
| 39 | Absolute Zero / Absolute Zero | heat sharing, thaw beacons, thermal death | `thermal-memory` — warm-platform memory |
| 40 | End of Eternity / Eternity Devourer | era lanes, memory devour, end of eternity | `eternity-palindrome` — A-B-C-C-B-A |
| 41 | The Unwritten Citadel / The Unwritten Sovereign | unwritten law, crown of zero, axiom collapse | `cipher-hunt` — crossfire memory |
| 42 | Shattered Halo Cathedral / The Shattered Halo | halo sever, cathedral lanes, saintfall | `halo-hunt` — converging crossfire |
| 43 | Bone-Tide Necropolis / Bone-Tide Leviathan | tide fangs, rib cage, necrotic deluge | `marrow-current` — guided tide |
| 44 | Oracle Clockworks / Clockwork Oracle | future mark, hourglass turn, zero second | `future-gear` — ordered forecast |
| 45 | Crimson Moon Hunt / Crimson Moon Beast | lunar pounce, blood crescent, red eclipse | `moon-scent` — pursuit echo |
| 46 | Storm Judgment Spire / Storm Executioner | thunder sentence, winged gallows, whiteout verdict | `storm-brand` — lane execution |
| 47 | Void Archive / Void Archivist | forbidden index, rune orbit, archive erasure | `index-seal` — orbit memory |
| 48 | Glacial War Foundry / Glacial War Engine | furnace ram, ice barrage, absolute overdrive | `frost-fuse` — crossfire overheat |
| 49 | Reality Rift Palace / Reality Duelist | crescent cut, mirror step, world divider | `rift-feint` — mirrored crossing |
| 50 | Last Apocalypse Throne / Apocalypse Dragon-Emperor | dragon law, singularity crown, last world collapse | `apocalypse-brand` — terminal crossfire |

## Stage 41–50 long-form contract

- 월드 폭은 모두 `58,000px`로 기존 특수 스테이지 `11,600px`의 5배다.
- 일반 몬스터는 stage별 80–98체이며 상공 투사체는 수직 낙하하지 않고
  발사 시점의 플레이어 위치를 조준한다.
- named guardian은 약 19,000px, named herald는 약 38,000px의 독립 봉쇄
  아레나에서 한 번씩 등장한다.
- 최종 보스 아레나는 56,000px에서 시작하며 모든 보스는 5 phase,
  phase당 12개 named pattern을 사용한다.
- telegraph는 최소 700ms를 유지하되 stage가 진행될수록 recovery를
  500ms에서 최소 320ms까지 줄여 패턴 연계 체감을 빠르게 한다.
- Stage 41–50에서 서버가 승인한 NFT drop은 `rarity = 3`(Relic)으로
  EIP-712 claim과 온체인 `rarities` mapping에 기록된다.

## Runtime mechanic library

The typed catalog composes twelve audited primitives:

1. ordered sigils
2. baited impact
3. moving sanctuary
4. interrupt ritual
5. weak-point break
6. line-of-sight cover
7. delayed echo
8. marked pursuit
9. tether guide
10. rotating gates
11. collapsing floor
12. lane synthesis

The primitive name is not the stage identity. Stage identity also includes the
boss anchor, decision kind, safe-zone rule, counterplay rule, phase order,
ultimate and presentation namespace. Canonical tests ignore numeric tuning and
tint before comparing profiles.

## Movement and readability budget

- Boss ordinary movement: 70–105 px/s.
- Normal patrol: 42–67 px/s in the current generator.
- Boss/minion hostile projectile: 205–250 px/s in the catalog executors.
- Boss warning: 760 ms minimum; early phases use 1050 ms or more.
- Normal signature warning: 900–1200 ms.
- Boss recovery: 320–1240 ms. Stage 41–50만 500ms 아래의 빠른 연계를 사용한다.
- No HP enrage locomotion multiplier, stage-based projectile multiplier or
  timer-driven automatic boss jump.

## Difficulty tiers

| Stage | Tier | 권장 스킬 강화 | 전투 압박 |
|---:|---|---:|---|
| 1–10 | Veteran | +2 | 기존보다 높은 전 구간 체력·피해, 2.2초 이하 minion cast cadence |
| 11–20 | Master | +4 | 추가 체력/피해와 1.85초 이하 cast cadence |
| 21–30 | Hard | +5 | hard HP floor, 2배 incoming damage 기준, 1.55초 cadence |
| 31–36 | Extreme Hard | +6 | 일반·중간·최종 보스 대폭 강화, 1.28초 cadence |
| 37–40 | Cataclysm | +7 | 별도 최고 티어, 가장 높은 HP/damage와 1.05초 cadence |
| 41–50 | Apocalypse | +7 | 5배 장거리 route, 고밀도 일반 몬스터, 중간 보스 2개, 5-phase final |

권장 강화 수치는 입장 잠금이 아니라 balance target이다. 속도만 올려 난이도를
만들지 않으며, 고유 pattern deck과 함께 체력, 공격 피해, pattern cadence와
archetype 조합을 동시에 사용한다. 치명 패턴의 telegraph는 700ms 아래로
내리지 않고 hostile projectile은 250px/s를 넘지 않는다.

## Presentation and asset status

- Stages 1–30 retain their distinct existing boss actor sheets.
- Only the current stage boss actor/projectile pack is loaded.
- The previously unused boss-specific projectile path now drives boss
  projectiles; minions keep their separate stage projectile path.
- Stages 21–30 replace the ten previously duplicated boss projectile files
  with boss-specific high-resolution art in `public/assets/boss-projectiles/`.
- Stages 31–50 have twenty newly generated boss actor sheets and normal-monster
  sheets under `public/assets/boss-animation-sheets-special/` and
  `public/assets/minions-special/`.
- All stages use alpha-cleaned normal-monster projectile sheets. Stages 1–30
  load `public/assets/projectiles-alpha/`; stages 31–50 load distinct generated
  sheets from `public/assets/projectiles-special/`.
- Boss and mid-boss projectiles use the same boss-pattern authority but a
  separate presentation path from normal monsters. All 50 load alpha-cleaned
  files from `boss-projectiles-alpha/` or `boss-projectiles-special-alpha/`.
- All fifty boss projectile files now have distinct SHA-256 hashes.
- Telegraph shapes are code-native presentation assets keyed by the catalog
  presentation contract and differ by lane, ordered cell, ring, safe glyph,
  sweep, tether, moving zone and weak-point silhouettes. Every stage also adds
  a deterministic stage sigil whose point count, inner/outer radii, initial
  angle and rotation direction differ, so presentation is not a tint-only
  variation.
- Stages 41–50 use the distinct Null Choir Sentinel and Axiom Butcher mid-boss
  silhouettes with stage-specific names, palettes and boss-pattern projectiles.
  Final bosses and normal monsters no longer use shared actor placeholders.

AI generation used the built-in image generation tool. Stage 31–50 actor packs
used ten separate stage-specific prompts on a removable green background; the
local pipeline converted that background to alpha and split each pack into boss,
normal-monster and normal-projectile runtime sheets. Source outputs remain in the
tool-managed generated-image directory; project copies are the files listed above.
