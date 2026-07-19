# NFT 진행 UX 흐름

상태: **3슬롯 vertical slice 구현 / 확장 UX 목표 설계**

## 정보 구조

웹 내 NFT 영역은 최소 다음 화면으로 나눈다.

```text
Inventory
├─ Equipment
├─ Class Licenses
└─ Materials

Loadout
├─ Equipment slots
├─ Class selection
├─ Skill Q/W/E/R/T
└─ Resolved stat summary

Progression
├─ Class mastery
├─ Advancement paths
└─ Recipes / salvage

Marketplace
├─ Equipment
└─ Class Licenses
```

모바일에서는 drag-only interaction을 쓰지 않고 선택 후 `장착`, `교체`, `해제`
버튼을 제공한다.

## Inventory item card

장비 카드:

- collection/version과 token ID
- slot, rarity, stage tier
- primary/secondary affix와 roll
- 장착/미장착, listed/escrowed, stale 상태
- 현재 장비 대비 변화
- 장착, 판매, 분해 action

클래스 카드:

- base/current class, rank와 advancement path
- 사용 가능한 하위 class
- wallet mastery와 다음 전직 조건
- 선택, 스킬 구성, 전직, 판매 action

재료 카드:

- definition, 보유량, 획득처와 사용 recipe
- chain finalized/stale 상태

## 장착 흐름

```text
select owned NFT
→ validate slot and class restriction
→ show old/new stat comparison and cap clipping
→ save off-chain loadout
→ server rechecks ownership
→ success or actionable stale/ownership error
```

장착에는 wallet transaction 상태를 가장하지 않는다. 저장 중에는 loading, success,
error와 retry를 보여준다. 사용자가 NFT를 판매/전송하면 자동으로 조용히 다른
장비를 넣지 않고 빈 slot과 해결 action을 표시한다.

현재 vertical slice의 마켓 규칙:

```text
equipped NFT
→ Inventory listing action 거부
→ Game page에서 unequip
→ Marketplace listing
→ 다음 attempt에서 서버가 ownerOf 재검증
```

웹의 해제 전 등록 차단은 사용 실수 방지 장치다. 직접 contract 호출까지 막는
온체인 귀속은 사용하지 않으며, 보안 경계는 다음 attempt의 서버 소유권 검증이다.

## stage 입장 전

- 선택 class와 rank
- Q/W/E/R/T skill icons
- 3개 또는 해금된 5개 equipment slot
- 최종 핵심 능력치와 cap에 잘린 수치
- stale ownership 또는 지원하지 않는 balance version

서버 snapshot 생성이 성공하기 전에는 game scene을 시작하지 않는다. 실패 시 어떤
자산을 해제/교체해야 하는지 보여준다.

## 전직 흐름

```text
select owned class NFT
→ compare paths and skill changes
→ show mastery/stage/material checklist
→ choose one path
→ review irreversible transaction
→ awaiting signature
→ submitted / confirming
→ confirmed and metadata refresh
```

서명 전 화면은 chain, contract, class token ID, old/new class, consumed materials와
되돌릴 수 없음을 표시한다. wallet rejection, replaced, reverted, expired claim과
ownership changed 오류를 구분한다.

## 분해 흐름

- 장착 중이면 먼저 loadout 영향과 빈 slot을 경고한다.
- NFT 이미지, collection, token ID와 예상 material output을 다시 보여준다.
- 텍스트 확인 또는 동등한 비가역 확인 단계를 둔다.
- transaction confirmation 전에는 inventory에서 NFT를 제거하지 않는다.
- revert 시 원래 카드와 loadout을 보존한다.
- confirmed 후 NFT, material과 history query만 선택적으로 invalidate한다.

## 클래스 NFT 판매

listing 전 다음을 명확히 알린다.

- 판매/escrow 후 해당 class로 새 stage를 시작할 수 없다.
- wallet mastery와 skill loadout 기록은 남는다.
- 현재 실행 중 attempt는 snapshot 만료까지 유지된다.
- NFT에 저장된 advancement rank/path는 구매자에게 이전된다.

## 마켓 필터

- collection family
- equipment slot 또는 class
- rarity/rank/path
- stage tier
- affix
- price
- legacy/V2 contract version

UI는 이름이 같은 다른 contract NFT를 합치지 않는다. collection address와 verified
project badge를 통해 가짜 자산을 구분한다.

## 접근성과 품질

- rarity를 색상만으로 구분하지 않는다.
- 키보드로 모든 slot과 action에 접근 가능해야 한다.
- focus 이동과 modal 복귀 위치를 보존한다.
- reduced motion에서 card/particle animation을 줄인다.
- 긴 address/token ID는 복사 가능하고 전체 값을 확인할 수 있다.
- metadata image 실패 시 alt와 durable on-chain trait를 계속 표시한다.
