# Skill and Combat Standard

The current `InnateSkillDefinition` provides `id`, key, display text, cooldown, damage
and a buff flag. That is sufficient for a prototype catalog but not as the long-term
combat contract. Extend it through typed, data-driven definitions and executors.

## Skill layers

Keep these concerns separate:

1. `SkillCatalogEntry`: name, description, icon and localization.
2. `SkillDefinition`: deterministic balance and behavior data.
3. `SkillProgression`: owned level and server/on-chain entitlement reference.
4. `SkillRuntimeState`: cooldown, charges, active cast and temporary effects.
5. `SkillExecutor`: creates validated combat actions from the definition.
6. `SkillPresentation`: animation, VFX, SFX, camera and UI hints.

Owning an on-chain skill/NFT unlocks eligibility; contract data must not directly drive
per-frame combat. At run start, the server supplies a bounded, versioned entitlement
snapshot. The game does not infer ownership from arbitrary client state.

## Typed definition

```ts
type SkillTargeting =
  | Readonly<{ kind: 'self' }>
  | Readonly<{ kind: 'direction'; range: number; width: number }>
  | Readonly<{ kind: 'circle'; range: number; radius: number }>
  | Readonly<{ kind: 'projectile'; projectileId: string }>;

type DamageSpec = Readonly<{
  base: number;
  coefficientPermille: number;
  damageType: 'physical' | 'magic' | 'true';
  hitCount: number;
  intervalMs?: number;
}>;

type SkillDefinition = Readonly<{
  id: SkillId;
  version: number;
  characterId: CharacterId;
  inputSlot: 'Q' | 'W' | 'E' | 'R' | 'T' | 'Z' | 'X' | 'C' | 'V';
  category: 'basic' | 'active' | 'movement' | 'buff' | 'ultimate';
  cooldownMs: number;
  castTimeMs: number;
  recoveryMs: number;
  resourceCost: number;
  maxCharges: number;
  targeting: SkillTargeting;
  damage?: DamageSpec;
  effects: readonly SkillEffectDefinition[];
  executorId: string;
  presentationId: string;
  telemetryId: string;
}>;
```

Use integer or fixed-point (`permille`/basis points) coefficients. Never use ambiguous
fractions or token amounts in combat definitions. Display text is derived from data
and localization; it is not parsed to determine behavior.

## Effects

Represent reusable effects as a discriminated union:

```ts
type SkillEffectDefinition =
  | Readonly<{ type: 'damage'; spec: DamageSpec }>
  | Readonly<{ type: 'heal'; flat: number; maxHealthPermille: number }>
  | Readonly<{ type: 'shield'; amount: number; durationMs: number }>
  | Readonly<{ type: 'stat-modifier'; stat: StatId; operation: 'add' | 'multiply'; valuePermille: number; durationMs: number; stacking: StackingRule }>
  | Readonly<{ type: 'status'; statusId: StatusId; durationMs: number; chancePermille: number }>
  | Readonly<{ type: 'movement'; mode: 'dash' | 'blink' | 'knockback' | 'pull'; distance: number }>
  | Readonly<{ type: 'spawn'; entityDefinitionId: string; count: number; lifetimeMs: number }>;
```

Every effect declares target selection, team filtering, maximum targets, hit interval,
and stacking behavior where applicable. Status IDs and stats are closed unions.

## Cast validation and lifecycle

`SkillSystem.tryCast(skillId, context)` checks in this order:

1. definition exists and belongs to the selected character;
2. skill is unlocked in the immutable session snapshot;
3. player is alive and current state allows the cast;
4. cooldown/charges and global cooldown allow it;
5. resource cost is available;
6. target/range/line-of-sight requirements pass;
7. consume resource/charge and start cooldown atomically;
8. enter cast state, schedule declared events, then recovery;
9. emit one cast telemetry event and presentation requests.

Invalid attempts return a typed reason such as `locked`, `cooldown`, `no-resource`,
`invalid-state`, `no-target`, or `out-of-range`; they do not partially mutate state.

```text
ready → windup → active → recovery → ready
                 └→ interrupted
ready → cooldown/charge regeneration → ready
```

Define whether interruption refunds cost, cooldown or charge. Defaults: no refund after
the active event; full refund if interrupted before any effect, unless skill data says
otherwise. Death and scene shutdown cancel all pending cast callbacks.

## Damage pipeline

```text
cast validation
→ target query and deduplication
→ immutable DamageRequest
→ attacker modifiers
→ defender mitigation
→ clamp/round using one documented rule
→ invulnerability/shield/health mutation
→ hit/death events
→ VFX/SFX/HUD/telemetry observers
```

`DamageRequest` includes source entity, target entity, skill/version, cast instance ID,
hit index, base/coefficient/type and timestamp. Deduplicate by cast/hit/target. Damage
cannot be negative, NaN or infinite; healing is a separate effect. Clamp health to
`0..maxHealth`. A death transition occurs exactly once.

## Buffs and status effects

Every effect specifies one stacking rule: `replace`, `refresh-duration`, `stack-add`,
`stack-max`, or `independent`, plus a maximum stack count. Modifier evaluation order is
fixed: base → additive → multiplicative → final clamp. Expiration uses the game clock.
UI timers are views of runtime state, not separate timers.

Crowd control defines immunity and diminishing-return behavior. Boss immunity must be
data, visible to players where relevant, and tested. Buff removal on death, stage end,
character switch and scene shutdown is explicit.

## Projectiles and area effects

Definitions include speed, acceleration/gravity, lifetime, collision radius, pierce,
bounce, team mask, destroy-on-hit, per-target hit interval and maximum total hits.
Continuous areas use a capped target query and deterministic tick interval; they must
not apply damage every render frame.

Spawn points come from named sockets/offsets in presentation data and are mirrored by
facing. Gameplay collision uses declared shapes, not the VFX bitmap dimensions.

## Cooldown and upgrades

Cooldown starts at the declared lifecycle point and uses one clock. Apply reductions
in a documented order and clamp them to a global cap. The current project constants
(`SKILL_COOLDOWN_REDUCTION_PER_LEVEL` and maximum reduction) must eventually move into
versioned balance configuration with tests at level boundaries.

Skill upgrades use a pure function:

```ts
resolveSkill(baseDefinition, skillLevel, characterUpgrades, balanceVersion)
  => ResolvedSkillDefinition
```

It never reads React state, token balance or a contract during combat. Server reward
verification knows the accepted balance/stage version and rejects unsupported versions.

## Presentation contract

`presentationId` resolves cast animation, VFX phases, SFX, screen shake, hit stop and
camera effect. Presentation may be skipped or reduced for performance/accessibility
without changing hit timing, damage or telemetry. Limit shake/flash and honor reduced
motion. Ultimate cinematics cannot hide dangerous enemy telegraphs or block controls
longer than declared.

## Adding a skill

1. Reserve stable skill ID and balance version.
2. Add catalog/localization and typed definition.
3. Reuse or add a narrow executor; avoid character-ID branches in the scene.
4. Add manifest-validated icon/VFX/SFX and presentation definition.
5. Add entitlement/shop mapping without duplicating combat balance on-chain.
6. Test validation, cooldown, costs, targeting, every effect, interruption, death,
   cleanup, mobile binding and both facings.
7. Test maximum upgrade level and performance with simultaneous enemies/effects.
8. Update server-accepted balance version and telemetry validation if necessary.

## Skill acceptance checklist

- [ ] Stable ID, owner character, category and version are unique.
- [ ] All numeric fields have units, bounds and integer rounding rules.
- [ ] Locked/cooldown/resource/state/target failures are visible and non-mutating.
- [ ] Cast, hit, multi-hit dedupe, status stacking, interruption and cleanup are tested.
- [ ] Actual hitbox matches the telegraph and debug overlay.
- [ ] Animation/VFX/SFX manifest entries load and fall back safely.
- [ ] Mobile and keyboard inputs map to the same skill intent.
- [ ] No reward, entitlement or token balance is trusted from live client mutation.
- [ ] Scene restart leaves no timer, listener, projectile, VFX or buff behind.
