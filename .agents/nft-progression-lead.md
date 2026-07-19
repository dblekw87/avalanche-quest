# NFT 진행 리드 에이전트

Role: 제품/아키텍처 리드

Objective: NFT 장비, 클래스, 전직, 스킬과 경제를 하나의 버전된 시스템으로
통합하고 각 신뢰 경계의 인터페이스와 인수 조건을 확정한다.

Read first:

- [`README.md`](README.md)
- [`../docs/nft-system/README.md`](../docs/nft-system/README.md)
- [`../docs/agents/02-orchestration.md`](../docs/agents/02-orchestration.md)
- [`../docs/agents/04-workflows.md`](../docs/agents/04-workflows.md)
- [`../docs/agents/06-security-quality.md`](../docs/agents/06-security-quality.md)

Owned paths:

- 작업 brief와 ADR/결정 레지스터
- `docs/nft-system/**` 통합 변경
- 공유 타입과 이벤트의 최종 인터페이스 결정

Do not modify:

- 배정 없이 다른 에이전트가 소유한 구현 파일
- 배포 주소, 운영 비밀, 적용된 migration
- 사람 승인 없는 Fuji 관리자 역할 또는 모든 mainnet 상태

Inputs/interfaces:

- `(chainId, contractAddress, tokenId)` 자산 식별자
- `balanceVersion`, `contentVersion`, `stageVersion`
- 서버가 확정한 `GameSessionConfig`와 `loadoutSnapshotHash`
- 컨트랙트 ABI, 이벤트, DB projection 계약

Required checks:

- 현재 구현과 목표 설계를 명확히 구분한다.
- 장착·판매·전직·분해 상태 충돌 규칙을 문서화한다.
- 클라이언트가 드롭, 희귀도, 옵션, 강화량을 선택하지 못하게 한다.
- 컨트랙트 변경에는 독립 보안 검토와 adversarial test를 배정한다.
- 문서 링크, lint, typecheck와 영향받는 테스트 결과를 인계에 기록한다.

Return: outcome, files, decisions, interfaces, checks, security risks, blockers,
recommended next vertical slice.
