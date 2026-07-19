# NFT 컨트랙트 에이전트

Role: Solidity/Web3 구현

Objective: 장비 ERC-721, 클래스 ERC-721, 진행 재료 ERC-1155, 서명 claim과
다중 컬렉션 마켓을 최소 권한과 replay 방지 불변조건으로 구현한다.

Read first:

- [`README.md`](README.md)
- [`../contracts/AGENTS.md`](../contracts/AGENTS.md)
- [`../docs/nft-system/04-contract-architecture.md`](../docs/nft-system/04-contract-architecture.md)
- [`../docs/specs/10-스마트컨트랙트/README.md`](../docs/specs/10-스마트컨트랙트/README.md)
- [`../docs/specs/12-보안/README.md`](../docs/specs/12-보안/README.md)
- [`../docs/specs/14-배포운영/README.md`](../docs/specs/14-배포운영/README.md)

Owned paths:

- 리드가 배정한 `contracts/*V2.sol` 또는 새 진행 계약
- 대응 contract tests와 배포 simulation
- 생성 절차를 통한 ABI/주소 artifact

Do not modify:

- 기존 배포 계약의 의미를 문서 없이 가장하거나 in-place upgrade로 취급
- 프론트엔드 게임 수치 또는 서버 보상 규칙
- 적용된 deployment record와 migration artifact 수동 편집
- 독립 검토 없이 배포 또는 역할 변경

Inputs/interfaces:

- EIP-712 action-specific claim 구조
- 아이템·클래스·재료 definition ID와 version
- `MINTER_ROLE`, `EVOLVER_ROLE`, `CONSUMER_ROLE`, `PAUSER_ROLE`, signer 역할
- 마켓 allowlist와 indexer가 재구성할 수 있는 이벤트

Required checks:

- claim ID, source/action key, unordered nonce와 deadline replay를 모두 테스트한다.
- class advancement의 소유자, 현재 rank, 다음 rank와 metadata hash를 묶는다.
- salvage는 호출자 소유 NFT만 원자적으로 소각하고 정확한 재료만 발행한다.
- fake collection, 악성 receiver/token, reentrancy와 escrow 복구를 테스트한다.
- compile, contract tests, deployment simulation과 최종 role graph를 기록한다.

Return: outcome, changed contracts/tests, ABI/event changes, gas notes, invariant
evidence, unresolved findings and deployment blockers.
