# 서버, 데이터와 보안 경계

상태: **목표 설계 / 미구현**

## 권위 모델

| 판단 | 권위 |
| --- | --- |
| 현재 NFT/material 소유 | configured chain contract |
| 저장 loadout과 skill 선택 | 인증된 서버 DB |
| attempt에 적용할 최종 build | 서버 snapshot service |
| stage 완료 증거 | 신뢰하지 않는 telemetry + 서버 verifier |
| drop/rarity/affix/recipe 결과 | versioned server rules |
| mint/evolution 실행 가능성 | signed claim + contract |
| UI history와 검색 | chain event projection |

브라우저가 전송한 token ID, metadata, 능력치, class ID와 reward 후보는 힌트일 뿐이며
서버가 configured contract에서 다시 확인한다.

## attempt 생성

```text
authenticated wallet requests stage
→ validate stage/version and one-active-attempt policy
→ load selected class/equipment/skills
→ batch-read ownership and durable token state
→ reject unsupported, listed/escrowed or malformed assets
→ resolve versioned stats and skills
→ persist immutable snapshot + hash
→ return serializable GameSessionConfig
```

snapshot은 최소 다음을 묶는다.

- attempt ID, wallet, stage ID/version과 seed
- chain ID와 각 NFT contract/token ID
- class ID/rank와 equipped skill IDs
- equipment slot, definition과 affix rolls
- character upgrade levels
- balance/content version
- resolved modifier summary와 `snapshotHash`
- issue/expiry time

Phaser에는 필요한 resolved game data만 전달하고 address, ABI, metadata URI와 DB ID를
불필요하게 노출하지 않는다.

## 실행 중 전송과 TOCTOU

소유권 확인 직후 전송되는 race를 완전히 제거하려고 NFT를 escrow/lock하지 않는다.
대신 다음 bounded 정책을 사용한다.

- snapshot 발급 시점의 finalized chain read를 기록한다.
- snapshot은 하나의 짧은 attempt에만 유효하다.
- wallet당 동시에 활성 attempt 수를 제한한다.
- 현재 attempt는 snapshot 기준으로 검증한다.
- 다음 attempt와 loadout 변경은 최신 ownership을 요구한다.
- transfer/listing index event는 저장 loadout을 stale로 표시한다.

이 정책은 사용성을 위한 의도적 tradeoff이며 장기 대여나 entitlement 복제를
허용하는 근거가 아니다.

## stage 완료와 drop

```text
submit bounded telemetry
→ schema/order/range/version verification
→ atomic attempt transition
→ server computes one drop result
→ persist reward result and pity transition atomically
→ create action-specific claim
→ persist claim before signing response
```

- 클라이언트가 item type, rarity, roll 또는 material amount를 보내면 무시하지 말고
  schema에서 거부하는 것을 우선한다.
- 같은 attempt 재제출은 기존 결과를 안전하게 반환하거나 명확히 거부한다.
- drop 계산은 client RNG를 사용하지 않는다.
- CSPRNG/HMAC commitment, reveal과 pity 알고리즘은 구현 전 결정 레지스터에서 확정한다.
- reward signer는 DB service role이나 contract admin과 분리한다.

## 목표 데이터 모델

실제 table 이름은 migration 설계에서 확정하되 책임은 다음처럼 분리한다.

| 영역 | 목적과 핵심 제약 |
| --- | --- |
| `nft_definitions` | stable ID + content/balance version unique |
| `affix_definitions` | stat, operation, bounds, stacking/cap |
| `drop_tables` | stage/version별 pool과 확률 합 검증 |
| `player_loadouts` | wallet + loadout type/version unique |
| `loadout_items` | loadout slot unique, asset key unique |
| `class_mastery` | wallet + class ID unique, bounded level/xp |
| `skill_loadouts` | wallet + class + slot unique, max 5 |
| `attempt_snapshots` | attempt ID unique, immutable hash/payload |
| `progression_rewards` | source/action unique, server-selected result |
| `progression_claims` | claim ID, chain, contract, nonce unique |
| `pity_counters` | wallet + pool + balance version unique |
| `chain_asset_projection` | chain + contract + token unique |

chain ownership과 material balance는 DB가 권위가 아니다. projection은 재생 가능하며
RPC 확인이 필요한 action에서 stale cache를 최종 근거로 사용하지 않는다.

## API 경계

예상 endpoint 책임:

- `GET/PUT /api/loadouts/equipment`
- `GET/PUT /api/loadouts/skills`
- `POST /api/attempts`
- 기존 completion/verification endpoint
- `POST /api/progression/claims/equipment`
- `POST /api/progression/claims/class`
- `POST /api/progression/claims/advancement`

각 route는 wallet session, chain ID, runtime schema, payload size, rate limit과
idempotency key를 검증한다. signature와 server proof를 로그에 남기지 않는다.

## RLS와 개인정보

- 플레이어는 자신의 loadout, mastery와 claim 상태만 읽는다.
- 다른 wallet의 공개 NFT 소유/마켓 정보는 chain projection 범위에서만 노출한다.
- reward 계산, pity mutation, signature 생성과 projection write는 server role만 수행한다.
- service role key는 client bundle에 들어가지 않는다.
- raw telemetry 보존 기간과 크기를 제한하고 불필요한 행동 추적을 피한다.

## metadata와 content

- content hash가 signed claim/on-chain event와 일치하는지 확인한다.
- server-side arbitrary URL fetch를 금지하거나 엄격한 host allowlist를 사용한다.
- JSON depth, attribute count, string length, image MIME/size를 제한한다.
- 표시 실패가 ownership, listing cancel 또는 안전한 transaction recovery를 막지 않는다.

## 보안 실패 시 봉쇄

| 실패 | 우선 봉쇄 |
| --- | --- |
| reward signer 의심 | 새 claim 발급 중단, controller pause 승인 요청, signer rotate |
| metadata compromise | content gateway 차단, hash 불일치 표시, 자산 전송은 보존 |
| indexer 지연/reorg | stale 표시, direct chain read, cursor rewind/replay |
| drop rule 오류 | 해당 balance version 발급 중단, 기존 result 보존 |
| class/equipment resolver 오류 | 새 attempt 중단, 지원 version allowlist 축소 |
| marketplace 문제 | listing/purchase pause, 안전한 cancel 유지 |

Fuji라도 관리자 action은 chain ID, sender, target, calldata, 예상 결과와 rollback/
containment를 기록하고 사람 승인을 받는다.
