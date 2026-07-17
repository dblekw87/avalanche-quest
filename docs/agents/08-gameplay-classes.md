# Gameplay Classes and Systems

This document is the implementation-level contract for `src/game`. The current
`QuestScene` contains several responsibilities in one file; new work must not make
that coupling worse. Extract one tested boundary at a time rather than rewriting the
whole scene in a single change.

## Target structure

```text
src/game/
├─ config/                  versioned stage, character, skill and asset data
├─ entities/                Player, Enemy, Boss, Projectile runtime objects
├─ scenes/                  orchestration and Phaser lifecycle only
├─ systems/                 combat, input, movement, skills, buffs, spawning
├─ rendering/               animations, VFX, HUD adapters, asset registry
├─ audio/                   music and SFX lifecycle
├─ telemetry/               bounded domain-event recording
├─ bridge/                  serializable React ↔ Phaser messages
└─ types/                   game-only shared types
```

No gameplay class imports wagmi, viem, contract ABIs, Supabase, server modules, or
reward amounts. Systems receive a versioned `GameSessionConfig` and emit gameplay
facts. The server independently decides whether those facts authorize a reward.

## Required domain types

```ts
type EntityId = string;
type CharacterId = /* closed union from characters.ts */;
type SkillId = string;

type Vector2Value = Readonly<{ x: number; y: number }>;

type GameSessionConfig = Readonly<{
  attemptId: string;
  stageId: StageId;
  stageVersion: number;
  seed: number;
  characterId: CharacterId;
  unlockedSkillIds: readonly SkillId[];
}>;
```

Identifiers are stable data keys, never translated display names. Configuration is
immutable during a run. Runtime state is owned by one system and accessed through a
narrow interface rather than public mutable objects.

## Scene responsibilities

### `BootScene`

Optional when startup grows complex. Loads only global manifests, validates required
assets/config, displays load failures, then starts the selected scene. It does not
create combat entities.

### `QuestScene`

Owns Phaser lifecycle and coordinates systems:

- constructor/init: accept serializable session input and validate referenced IDs;
- `preload`: delegate asset selection/loading to `AssetLoader`;
- `create`: build world, instantiate systems, bind collision/event wiring;
- `update(time, delta)`: call systems in a documented deterministic order;
- `shutdown`: remove input/listeners/timers/tweens, destroy pools and stop audio.

It must not become the permanent home for character-specific skill branches. A new
skill is registered through data plus a `SkillExecutor`, not another large conditional
inside `QuestScene`.

Recommended update order:

```text
input snapshot → movement → skill intent → combat/projectiles → enemy AI
→ collisions/damage → buffs/status expiry → animation/VFX → HUD → telemetry
```

All time-based gameplay uses Phaser `time`/`delta` or an injected clock. Do not use
`Date.now()` inside simulation code. Clamp abnormal `delta` after tab suspension.

## Entity classes

### `PlayerCharacter`

Owns the player sprite/body reference, facing, locomotion state, health/resource
state, and animation requests. Public operations should resemble `move`, `jump`,
`dash`, `receiveDamage`, `heal`, `setFacing`, and read-only snapshots. It does not
read keyboards, calculate blockchain upgrades, or spawn arbitrary VFX.

### `EnemyEntity`

Owns identity, archetype, health, patrol/aggro state and its Phaser body. It accepts
damage through `DamageSystem`, emits defeated once, and never directly awards loot.

### `BossEntity`

Extends shared enemy behavior through composition where practical. It owns phase and
pattern state but delegates pattern execution to `BossPatternController`. Boss phases
are data-driven thresholds; transitions are one-way and tested at boundary health.

### `ProjectileEntity`

Contains owner/faction, skill ID, velocity, damage payload, hit policy, spawn time,
lifetime and pierce/bounce counters. It is obtained from and returned to a pool. A
projectile cannot damage the same target repeatedly unless its definition explicitly
permits interval hits.

Entities must not subclass deeply. Prefer a small runtime wrapper plus systems over
chains such as `FlyingEliteFireBoss extends ...`.

## Systems and interfaces

| System | Single responsibility |
| --- | --- |
| `InputController` | convert keyboard/mobile input into one-frame `InputSnapshot` |
| `MovementSystem` | acceleration, jump, dash, gravity and platform movement |
| `CombatSystem` | validate attacks and produce `DamageRequest` objects |
| `DamageSystem` | invulnerability, defense, critical rules, health mutation, death |
| `SkillSystem` | ownership, cooldown/resource/state checks and executor dispatch |
| `BuffSystem` | apply, refresh/stack and expire typed modifiers |
| `ProjectileSystem` | pool, movement, overlap, hit policy and lifetime cleanup |
| `EnemyAiSystem` | patrol, aggro, attack intent and leash behavior |
| `BossPatternController` | deterministic phase-pattern scheduling and telegraphs |
| `AnimationController` | map domain state to registered animation keys |
| `VfxPool` | reuse transient visuals and enforce per-effect limits |
| `GameHudController` | reflect snapshots; never become combat authority |
| `TelemetryRecorder` | append schema-valid, ordered, size-bounded facts |
| `AssetLoader` | load manifest entries and report missing/invalid assets |

Each system exposes `update(time, delta)` only if it truly needs per-frame work.
Prefer event-driven calls for damage, death, cooldown start, VFX and HUD changes.

## State machines

Player locomotion uses explicit states such as `idle`, `run`, `jump`, `fall`, `dash`,
`attack`, `cast`, `hurt`, `dead`, and `victory`. Document which transitions lock
movement, grant invulnerability, or allow canceling. Animation completion callbacks
must validate that the entity is still in the expected state.

Enemy AI uses explicit states such as `spawn`, `patrol`, `chase`, `windup`, `attack`,
`recover`, `stunned`, `dead`. Telegraph and recovery are mandatory for dangerous
attacks. Difficulty must not depend on hidden frame-rate behavior.

## Phaser lifecycle and cleanup

- Register scene listeners with named callbacks or retain unsubscribe functions.
- On `SHUTDOWN`, stop audio, timers, tweens and emitters; clear pools and collections;
  detach global/window/bridge listeners; release large references.
- A scene restart must not double-register animation events or mobile input.
- Global animations use collision-free keys and `anims.exists` before registration.
- Do not create unbounded sprites, particles, timers, text objects, or physics bodies
  during `update`; use pools and hard caps.

## Incremental extraction from current `QuestScene`

Use this safe order:

1. Asset manifest/loading and animation registration.
2. Input/mobile queue into `InputSnapshot`.
3. Projectile pooling and lifetime cleanup.
4. Skill registry/executors and cooldown state.
5. Buff/damage calculations.
6. Enemy and boss pattern controllers.
7. HUD and telemetry adapters.

Every extraction must preserve behavior with focused tests or a recorded deterministic
smoke scenario. Do not combine architectural extraction with game-balance changes.
