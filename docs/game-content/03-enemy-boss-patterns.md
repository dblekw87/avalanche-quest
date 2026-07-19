# 일반 몬스터와 레이드 보스 패턴

상태: **설계 기준선 / 세부 수치 provisional**

## 난이도 철학

```text
좋은 난이도
= 규칙을 읽는다
+ 위치와 순서를 기억한다
+ 다음 행동을 선택한다
+ 실행 결과를 이해한다
```

다음은 난이도의 주 수단으로 사용하지 않는다.

- stage마다 이동속도와 탄속을 계속 증가
- projectile 수와 fan 각도만 증가
- 주기적으로 매우 높게 점프
- off-screen spawn 또는 즉시 damage
- telegraph보다 큰 장식 VFX로 안전지대 가리기
- 피할 수 없는 damage를 체력/공격력으로 버티기

속도와 수량은 pattern을 읽을 수 있는 bounded range 안에서 보조 tuning으로만 쓴다.

## 공통 pattern 계약

```ts
type PatternDefinition = Readonly<{
  id: string;
  version: number;
  category: PatternCategory;
  requiredArenaTags: readonly string[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  movementPlanId?: string;
  skillSequence: readonly string[];
  safeZoneRuleId: string;
  counterplayTextId: string;
  failureRuleId: string;
  overlapTags: readonly string[];
  presentationId: string;
  telemetryId: string;
}>;
```

모든 pattern은 다음 질문에 답한다.

1. 유저가 무엇을 보고 시작을 인지하는가?
2. 어디가 안전하며 실제 이동속도로 도달 가능한가?
3. 어떤 판단 또는 기억을 요구하는가?
4. 실패했을 때 왜 맞았는지 이해할 수 있는가?
5. 언제 공격할 수 있는 recovery window가 생기는가?
6. 어떤 pattern과 겹치면 불공정해지는가?

## 일반 몬스터

### archetype

| 역할 | 작은 pattern 예시 |
| --- | --- |
| Guard | 전방 방패 후 후방 weak point |
| Charger | 긴 직선 예고 후 돌진, 벽 충돌 시 stagger |
| Caster | 순서가 보이는 2~3개 지면 표식 |
| Trapper | 이동 경로를 제한하는 느린 trap |
| Support | 다른 적 shield/channel, 우선 처치 판단 |
| Summoner | 제한 수 add를 소환하고 channel interrupt |
| Sniper | 긴 line telegraph, 엄폐/높이 이동 |
| Bomber | player 위치 bait 후 지연 폭발 |

초반 archetype은 1개 pattern, 중반은 2개, 후반은 2~3개를 가진다. 상위 stage에서
같은 monster의 기본 속도를 과도하게 높이지 않고 다음으로 난이도를 만든다.

- 서로 보완하는 archetype 조합
- pattern 순서 변화
- arena/platform의 이동 선택
- 제한된 overlap
- 이전 stage에서 배운 규칙의 짧은 조합

한 화면에서 동시에 읽어야 할 위험 telegraph 수에 상한을 둔다. 여러 몬스터가
같은 frame에 공격을 시작하지 않도록 encounter scheduler가 cadence를 조절한다.

## 보스 이동

boss 평상시 locomotion은 느리고 목적이 분명해야 한다.

- idle/turn
- 제한된 chase
- player와 너무 가까울 때 느린 retreat
- pattern 시작 전 arena marker로 이동
- 명시적 charge/teleport/leap pattern
- recovery와 원위치 복귀

timer가 되었다는 이유만으로 자동 점프하지 않는다. 도약은 다음을 모두 가진
named pattern일 때만 허용한다.

- takeoff telegraph와 animation
- 목표 지점 또는 bait 규칙
- 체공 중 안전/위험 규칙
- 착지 위치와 shockwave/안전지대
- landing recovery
- arena 밖으로 나갈 때 deterministic recovery

## 보스 phase와 12~15 pattern deck

각 phase는 목표 12~15개의 named pattern entry를 가진다. 이 수는 단순히 탄환 수,
속도 또는 색만 바꾼 복제본으로 채우지 않는다.

콘텐츠 규모를 관리하기 위해 다음을 허용한다.

- 같은 core mechanic의 phase별 진화
- 두 개의 이미 학습한 mechanic을 합친 composite entry
- arena topology가 바뀐 변형
- phase transition/ultimate entry

단, 각 entry는 다른 판단, 이동 경로, 기억 또는 우선순위를 요구해야 한다.
boss 전체에는 최소 8개의 distinct mechanic family가 있어야 한다.

권장 phase deck 구조:

| 구간 | entry 수 | 목적 |
| --- | ---: | --- |
| Teach | 4–5 | 새 규칙을 단독으로 소개 |
| Test | 4–5 | 같은 규칙의 방향/위치 변화 |
| Combine | 3–4 | 검증된 두 규칙의 공정한 결합 |
| Ultimate/transition | 1 | phase 정리와 다음 규칙 예고 |

전투 길이에 따라 한 시도에서 deck 전체를 모두 보여주지 않을 수 있지만 scheduler는
결정적이고 학습 가능해야 한다. 첫 cycle은 핵심 규칙을 빠뜨리지 않으며, 무작위
선택으로 불가능한 조합이 나오지 않게 constraint를 둔다.

## raid mechanic family 예시

1. `Baited Impact`: 현재 위치를 표시한 뒤 이동해야 하는 지연 공격
2. `Ordered Sigils`: 표시된 순서대로 안전 구역 이동
3. `Moving Sanctuary`: 천천히 움직이는 안전지대 유지
4. `Line of Sight`: 기둥/지형 뒤에서 회피
5. `Rotating Gates`: 회전하는 위험선 사이 통과
6. `Weak Point Break`: 제한 시간 특정 부위 공격
7. `Interrupt Ritual`: add 또는 channel 우선 처리
8. `Delayed Echo`: 이전 공격 위치가 한 번 더 폭발
9. `Collapsing Floor`: platform 순차 붕괴와 복원
10. `Marked Pursuit`: 추적 장판을 외곽으로 유도
11. `Rune Match`: boss 표시와 같은 속성/구역 선택
12. `Tether Guide`: orb/chain을 지정 위치로 유도
13. `Crossing Lanes`: 순서 있는 lane attack과 한 개의 이동 경로
14. `Shield Window`: 방어막 파괴 후 짧은 damage window
15. `Phase Synthesis`: 이미 학습한 두 mechanic의 최종 조합

이 목록은 공통 library다. 각 boss는 자신의 아트/arena/class mechanic에 맞는
고유 이름, timing과 presentation을 가진다.

## phase 진행 예시

```text
Phase 1
→ 느린 이동, 4개 core mechanic 단독 소개
→ test variants
→ first synthesis

Phase 2
→ arena 일부 변화
→ 기존 2개 + 신규 2개 mechanic
→ 안전한 overlap

Phase 3
→ 모든 학습 규칙을 순서/위치 판단으로 결합
→ 속도 폭증 대신 선택 시간과 안전 영역을 점진적으로 줄임
→ 명확한 final recovery/damage window
```

체력이 줄었다는 이유로 모든 movement/projectile speed를 일괄 배수로 올리지 않는다.
phase 난이도는 mechanic 조합과 판단 부담으로 올린다.

## 공정한 overlap

pattern은 tag를 가진다.

```text
requires-movement
requires-stillness
uses-left-lane
uses-right-lane
full-arena
spawns-adds
camera-critical
high-visual-noise
```

scheduler는 모순되는 요구를 같은 시간에 겹치지 않는다. 예를 들어 왼쪽으로
피해야 하는 pattern과 왼쪽 전역 즉사 pattern을 동시에 선택하지 않는다.

## reaction과 recovery

정확한 최소 시간은 playtest에서 확정하지만 모든 pattern에 다음 예산을 기록한다.

- 인지 시간
- 이동 거리와 player 이동속도
- input/animation lock
- network와 무관한 local frame budget
- recovery/damage opportunity

화면 밖에서 시작하거나 camera 이동 때문에 telegraph가 보이지 않는 pattern은
실패다. 실패 damage는 원인을 학습할 수 있게 일관되고, 피할 수 없는 chip damage를
raid의 기본으로 삼지 않는다.

## 테스트

- 각 phase deck의 12~15 entry schema와 unique ID
- distinct mechanic family 수
- forbidden speed/count-only duplicate detection review
- safe-zone reachability simulation
- deterministic first cycle과 forbidden overlap
- phase boundary one-time transition
- jump/teleport arena containment
- interrupt, death와 scene shutdown cleanup
- slow/default/max supported player movement build
- reduced-motion에서 telegraph 가독성

## 구현된 40-stage 계약

[`09-stage-combat-catalog.md`](09-stage-combat-catalog.md)와
`src/game/content/stage-combat-catalog.ts`가 forty-stage identity의 검토용
표와 typed source of truth다. 모든 stage는 서로 다른 boss fingerprint,
normal-monster signature, counterplay와 presentation namespace를 가진다.

현재 mechanic executor library는 ordered sigils, baited impact, moving
sanctuary, interrupt ritual, weak-point break, line-of-sight, delayed echo,
marked pursuit, tether guide, rotating gates, collapsing floor와 lane
synthesis다. Executor 재사용은 허용하지만 동일 deck/counterplay/arena
fingerprint 또는 speed/count/tint-only 변형은 허용하지 않는다.
