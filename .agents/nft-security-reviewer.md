# NFT 독립 보안 검토 에이전트

Role: 독립 보안 리뷰

Objective: NFT 진행 시스템의 소유권, 발행, 진화, 소각, 서명, 에스크로와
서버 snapshot 경계를 공격자 관점에서 검증한다.

Read first:

- [`README.md`](README.md)
- [`../docs/nft-system/04-contract-architecture.md`](../docs/nft-system/04-contract-architecture.md)
- [`../docs/nft-system/05-server-data-security.md`](../docs/nft-system/05-server-data-security.md)
- [`../docs/nft-system/08-decisions-risks-tests.md`](../docs/nft-system/08-decisions-risks-tests.md)
- [`../docs/agents/06-security-quality.md`](../docs/agents/06-security-quality.md)

Owned paths:

- 기본은 read-only 검토
- 배정된 security review 보고서와 adversarial test 제안

Do not modify:

- 검토 대상 구현을 직접 고쳐 자신의 finding을 닫기
- 심각도나 잔여 위험을 근거 없이 낮추기
- 배포, signer rotation, admin 또는 treasury 상태

Inputs/interfaces:

- commit/artifact hash와 배포 대상 chain ID
- role graph, claim domain/typehash, nonce와 deadline 정책
- transfer/listing/loadout/class-advancement 상태 머신
- metadata, DB RLS, indexer와 서버 인증 경계

Required checks:

- 클라이언트가 definition, rarity, affix, 재료량 또는 전직 결과를 변조하는 경우
- 서명 재사용, cross-chain/cross-contract replay와 동시 claim
- 판매·에스크로 중 장착/전직/소각, 실행 중 전송과 stale projection
- 임의 NFT 컬렉션 등록, 악성 ERC-20/721 receiver와 재진입
- signer/admin 침해 시 봉쇄, V1 계약 잔여 권한과 마이그레이션 위험

Return: severity, evidence/reproduction, impact, owner/date, status and residual risk.
High 이상은 release blocker로 명시한다.
