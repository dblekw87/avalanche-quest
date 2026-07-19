# 결정, 위험과 테스트 매트릭스

상태: **진행 중 결정 레지스터**

## 확정 결정

| ID | 결정 | 이유 |
| --- | --- | --- |
| NFT-001 | 첫 장비 loadout은 3슬롯 | UI와 balance 검증 범위를 제한 |
| NFT-002 | 장착 저장은 오프체인 | 매 stage/교체마다 gas와 서명 방지 |
| NFT-003 | attempt 시작 시 소유권 snapshot | deterministic combat와 trust boundary 유지 |
| NFT-004 | 클래스 NFT는 hold-to-use | 거래 가능한 클래스 권한 유지 |
| NFT-005 | 전직은 같은 class token ID 진화 | 컬렉션 폭증 방지와 token history 보존 |
| NFT-006 | 조각/정수는 ERC-1155 | 동일 재료를 개별 ERC-721로 만들지 않음 |
| NFT-007 | active skill은 최대 Q/W/E/R/T 5개 | 조작·모바일 복잡도 제한 |
| NFT-008 | 기존 계약은 in-place 변경하지 않음 | 비업그레이드 배포와 storage 현실 반영 |
| NFT-009 | 전투 수치는 versioned catalog가 해석 | metadata 문자열과 live chain을 runtime 권위로 쓰지 않음 |
| NFT-010 | 기존 V1 장비 NFT를 삭제하지 않고 타입 0/1 호환 | 보유자 자산과 거래 이력 보존 |
| NFT-011 | 장비 효과는 stage별 누적 없이 3슬롯 snapshot만 적용 | 무한 성장과 판매 잠금 방지 |
| NFT-012 | 장착 NFT는 해제 후 마켓 등록 | UX 상태와 판매 상태 충돌 방지 |
| NFT-013 | 서로 다른 클래스는 누적, 동일 클래스 중복 효과는 비중첩 | 수집 가치는 유지하고 pay-to-win 배수 효과 방지 |

## 구현 전 필수 결정

| ID | 미정 사항 | 결정 증거 |
| --- | --- | --- |
| NFT-O01 | rarity 단계와 stage별 확률 | supply simulation |
| NFT-O02 | pity pool과 확정 횟수 | 획득 시간 분포 |
| NFT-O03 | affix별 roll 범위와 cap | resolver fixture/playtest |
| NFT-O04 | class tree와 starter class | 콘텐츠/UX 승인 |
| NFT-O05 | mastery와 전직 stage/material 요구량 | 진행 시간 테스트 |
| NFT-O06 | RNG CSPRNG/HMAC commitment 방식 | threat/fairness review |
| NFT-O07 | V1 Fuji 비정상/미지원 자산의 표시와 opt-in migration | 보유자 목록과 사람 승인 |
| NFT-O08 | ERC-721 enumerable 사용 여부 | gas/indexer benchmark |
| NFT-O09 | material 거래 허용 여부 | 경제·bot abuse review |
| NFT-O10 | legacy item V2 opt-in migration | contract/security ADR |

## 주요 위험

| 위험 | 영향 | 기본 완화 |
| --- | --- | --- |
| 공격 affix 단일 meta | build 다양성 상실 | slot 역할, conditional affix, cap |
| 후반 장비의 완전 상위호환 | 초반 NFT 무가치 | 고유 affix와 salvage/recipe 수요 |
| class NFT Pay-to-Win | 진입/공정성 악화 | starter class, grindable fragment, 수평 class |
| 판매 후 권한 혼란 | 사용자 손실 오인 | pre-list 경고, mastery 보존 설명 |
| 실행 중 NFT 전송 | entitlement race | 짧은 immutable attempt snapshot |
| signer 탈취 | 임의 mint/evolution | 분리 역할, pause, rotation, monitoring |
| metadata 변조/XSS | 잘못된 표시/웹 공격 | content hash, schema/host/MIME 제한 |
| 분해 오조작 | 비가역 자산 손실 | 명시 확인, exact output, receipt 후 UI 반영 |
| claim 순서 충돌 | 보상 blocked/replay | unordered nonce + claim/source key |
| V1/V2 혼동 | 잘못된 ABI/소유권 | chain registry version과 asset composite key |
| 계약 수 증가 | 배포/감사 복잡도 | 3 asset family와 controller로 제한 |
| 기존 강화 계약과 비용 중복 | 경제 과금 중첩 | 통합 경제 결정 전 새 유료 강화 금지 |

## 테스트 매트릭스

| 계층 | 필수 시나리오 |
| --- | --- |
| Resolver | modifier order, cap, rounding, duplicate slot, invalid version |
| Phaser | snapshot 적용, pause/restart cleanup, class/skill mismatch 거부 |
| UI | compare, stale ownership, wrong network, rejected/replaced/reverted tx |
| API | auth, ownership, rate limit, payload bounds, concurrent loadout save |
| Reward | forged rarity/roll, duplicate attempt, pity race, idempotent retry |
| Equipment contract | role, bounds, tampering, replay, salvage atomicity |
| Class contract | owner, rank/path, sold/escrowed token, metadata update |
| Material contract | unauthorized mint/burn, exact recipe, receiver failure |
| Marketplace | fake collection, escrow, cancel, self-buy, stale listing, reentrancy |
| Indexer | duplicate/out-of-order event, reorg, V1/V2 composite key |
| E2E | play → claim → equip → play → list/transfer → next attempt rejection |
| E2E | fragments → class mint → skill loadout → advance → class NFT sale |

## 독립 검토 gate

- contract author가 아닌 reviewer가 signer, role, replay, consume/evolve와 escrow를 검토한다.
- High/Critical finding은 local/Fuji release를 차단한다.
- Medium finding은 수정하거나 owner와 만료일이 있는 위험 수락을 요구한다.
- Fuji 배포 전에 source commit, artifact hash, chain ID `43113`, sender, addresses,
  constructor args, role graph, simulation과 containment를 사람에게 제시한다.

## 완료 증거

문서 단계에서는 링크와 현재 구현 사실을 검증한다. 코드 단계에서는 다음을 기록한다.

```text
npm run lint
npm run typecheck
npm run build
npm run contracts:compile
npm run contracts:test
focused unit/integration tests
two-wallet local E2E
deployment simulation
independent security review
```
