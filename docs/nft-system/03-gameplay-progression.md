# 장착, 클래스, 전직과 스킬

상태: **설계 기준선 / 세부 수치 provisional**

## 장비 loadout

첫 vertical slice는 다음 3슬롯을 사용한다.

| 슬롯 | 주 역할 | 대표 옵션 |
| --- | --- | --- |
| Weapon | 공격 | skill damage, boss damage, conditional critical |
| Armor | 생존 | max health, defense, low-health mitigation |
| Accessory | 운영 | cooldown, movement, resource/status utility |

추후 Boots와 Relic을 추가해 최대 5슬롯으로 확장한다. 같은 slot 장비를 여러 개
장착하지 못하며 token ID 중복도 허용하지 않는다.

장착 저장에는 온체인 transaction을 요구하지 않는다. 서버는 저장 시와 attempt
생성 시 현재 chain ownership을 확인한다. listed/escrowed 또는 다른 wallet 소유
token은 새 snapshot에 넣지 않는다.

현재 V1 `GameItem`의 `itemType=0` Weapon과 `itemType=1` Armor는 삭제하거나
재민팅하지 않고 그대로 호환한다. `itemType=2` Accessory를 신규 drop pool에
추가한다. 지원 범위 밖 타입이나 비정상 수치의 legacy NFT만 장착에서 제외하고,
자산 자체를 강제 소각하지 않는다.

## modifier 해석

```text
base character stats
→ wallet-bound character upgrades
→ class/rank modifiers
→ equipped NFT additive modifiers
→ equipped NFT multiplicative modifiers
→ category and global caps
→ integer rounding
```

modifier는 `StatId`와 `operation` discriminated union으로 표현한다. cooldown은
글로벌 상한을 적용하고 0 이하가 될 수 없다. defense와 damage reduction의 의미를
혼용하지 않는다.

현재 런타임은 skill enhancement reduction(최대 21%)과 장착 NFT reduction
(최대 20%)을 별도 source로 더한 뒤 total 40%에서 제한한다. 장착 NFT를 기존
21% class cap 안에 먼저 넣으면 강화 7레벨 클래스에서 NFT가 아무 효과도 내지
못하므로 금지한다.

## attempt snapshot

서버가 생성하는 개념적 입력:

```ts
type ProgressionSnapshot = Readonly<{
  wallet: `0x${string}`;
  classToken: Readonly<{
    chainId: number;
    contract: `0x${string}`;
    tokenId: string;
    classId: string;
    rank: number;
  }>;
  equipment: readonly Readonly<{
    slot: 'weapon' | 'armor' | 'accessory' | 'boots' | 'relic';
    contract: `0x${string}`;
    tokenId: string;
    definitionId: string;
  }>[];
  equippedSkillIds: readonly string[];
  stageVersion: number;
  balanceVersion: number;
  snapshotHash: `0x${string}`;
}>;
```

최종 TypeScript 위치와 이름은 구현 전에 정하지만 다음 불변조건은 유지한다.

- 직렬화 가능하고 immutable하다.
- 서버가 chain reads와 지원 catalog로 확정한다.
- Phaser는 NFT metadata와 wallet client를 받지 않는다.
- verifier는 해당 snapshot/balance version을 attempt에 묶는다.

## 실행 중 전송 정책

NFT가 stage 실행 중 판매 또는 전송되어도 이미 발급된 attempt snapshot은 종료까지
유효하다. 이는 매 frame 체인 조회와 예측 불가능한 능력치 제거를 피하기 위한
정책이다.

- snapshot은 한 attempt에만 유효하고 만료된다.
- 다음 attempt는 현재 소유권을 다시 확인한다.
- 판매/전송 event는 저장 loadout을 stale로 표시하고 재저장을 요구한다.
- 동시에 여러 attempt를 열어 entitlement를 장기간 복제하지 못하도록 wallet당
  active attempt를 제한한다.

## 클래스 NFT

클래스 NFT는 `hold-to-use` 권한이다.

- 소유 중 해당 base/advanced class를 선택할 수 있다.
- 판매하면 다음 ownership check부터 class가 잠긴다.
- wallet별 숙련도와 skill 설정은 보존된다.
- 다시 같은 class 권한을 얻으면 보존된 진행을 재사용할 수 있다.
- advanced token은 하위 class entitlement를 포함한다.

기본 onboarding을 위해 최소 한 개 starter class는 NFT 없이 또는 무료
non-transferable entitlement로 사용할 수 있어야 한다.

- 서로 다른 class ID 소유권은 선택지로 누적한다.
- 같은 class ID의 중복 token은 전투 보너스나 skill을 중첩하지 않는다.
- 한 attempt에는 active class 하나만 snapshot에 들어간다.
- 클래스 간 능력치와 스킬을 임의 결합하지 않는다.

## 전직

전직 조건은 다음을 모두 만족해야 한다.

1. 현재 class NFT 소유
2. 요구 class mastery
3. 지정 stage/boss 완료
4. 요구 ERC-1155 재료 보유
5. 정확한 다음 rank/path에 대한 서버 서명 claim

전직 transaction은 재료 소비와 같은 token ID의 class state 변경을 원자적으로
처리한다. 실패하면 어느 쪽도 일부 적용되지 않는다.

예시:

```text
Warrior
├─ Berserker: risk, lifesteal, burst
└─ Paladin: guard, shield, sustain
```

최종 class tree와 고유 명칭은 별도 콘텐츠 결정이며 이 문서는 구조만 확정한다.

## 스킬 슬롯

- 전투 입력은 기본적으로 Q/W/E/R/T 최대 5개다.
- 클래스가 소유할 수 있는 스킬 수는 5개보다 많을 수 있다.
- 실제 attempt에는 서버가 검증한 최대 5개 skill ID만 들어간다.
- 전직은 기존 스킬을 upgrade/replace하거나 새 후보를 unlock한다.
- 추가 Z/X/C/V 슬롯은 특수 콘텐츠로 유지할 수 있지만 기본 전직 규칙으로
  자동 확대하지 않는다.

권장 역할:

| 키 | 역할 |
| --- | --- |
| Q | 짧은 cooldown 핵심기 |
| W | 연계 또는 광역기 |
| E | 이동/제어/전직 핵심기 |
| R | 방어·buff 또는 class mechanic |
| T | ultimate |

스킬 소유권과 전투 정의는 분리한다. NFT는 entitlement ID를 제공하고,
`SkillDefinition`과 `SkillExecutor`가 실제 행동을 결정한다.

## 강화와 중복 NFT

장비 NFT 자체의 무한 level-up은 첫 범위에서 제외한다. 중복 장비는 분해해
정수를 얻고, 정수는 다음에 사용한다.

- wallet-bound character upgrade의 제한된 단계
- class advancement recipe
- 향후 deterministic equipment crafting

기존 `CharacterUpgradeV3`, `SkillEnhancementV2`와 새 NFT 재료 시스템의 비용이
서로 중복되지 않도록 통합 경제 결정 전에는 새 유료 강화 transaction을 추가하지 않는다.
