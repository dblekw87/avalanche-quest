# 프로젝트 전문 에이전트

이 디렉터리는 NFT 진행 시스템과 게임 콘텐츠 제작 파이프라인을 설계하고
구현할 때 사용하는 역할별 작업 계약을 담는다.
실행 가능한 코드를 뜻하지 않으며, 리드 에이전트가 작업 범위와 파일 소유권을
배정할 때 읽는 지침이다.

## 읽기 순서

1. 루트 [`AGENTS.md`](../AGENTS.md)
2. [`docs/agents/README.md`](../docs/agents/README.md)
3. NFT 작업이면 [`docs/agents/11-nft-progression-standard.md`](../docs/agents/11-nft-progression-standard.md)와
   [`docs/nft-system/README.md`](../docs/nft-system/README.md)
4. 게임 콘텐츠 작업이면 [`docs/agents/12-game-content-production-standard.md`](../docs/agents/12-game-content-production-standard.md)와
   [`docs/game-content/README.md`](../docs/game-content/README.md)
5. 배정된 역할 문서
6. 변경 대상 하위 디렉터리의 `AGENTS.md`

## NFT 진행 역할

| 역할 | 문서 | 기본 책임 |
| --- | --- | --- |
| NFT 진행 리드 | [nft-progression-lead.md](nft-progression-lead.md) | 범위, 결정, 인터페이스와 통합 |
| 게임 경제 설계 | [nft-game-economy.md](nft-game-economy.md) | 드롭, 장착, 강화, 소각과 밸런스 |
| 컨트랙트 구현 | [nft-contract-engineer.md](nft-contract-engineer.md) | 토큰, claim, 마켓과 마이그레이션 |
| 독립 보안 검토 | [nft-security-reviewer.md](nft-security-reviewer.md) | 권한, replay, 소각, 에스크로 공격 검토 |
| 통합 QA | [nft-integration-qa.md](nft-integration-qa.md) | 게임·서버·체인 경계와 E2E 검증 |

## 게임 콘텐츠 역할

| 역할 | 문서 | 기본 책임 |
| --- | --- | --- |
| 콘텐츠 통합 리드 | [game-content-lead.md](game-content-lead.md) | 콘텐츠 계약, 순서와 통합 |
| 테크니컬 아트 | [sprite-alignment.md](sprite-alignment.md) | frame, anchor, socket, hitbox와 export |
| 캐릭터 애니메이션 | [character-animation.md](character-animation.md) | 클래스별 동작·상태·부착점 |
| 스테이지 encounter | [stage-encounter.md](stage-encounter.md) | map collision, spawn과 난이도 곡선 |
| 일반 몬스터 AI | [enemy-ai-pattern.md](enemy-ai-pattern.md) | archetype, pattern과 skill |
| 보스 패턴 | [boss-pattern.md](boss-pattern.md) | 이동, phase, telegraph와 패턴 |
| 스킬·VFX | [skill-vfx.md](skill-vfx.md) | 캐릭터/적 skill presentation과 particle |
| 시각 QA·성능 | [visual-qa-performance.md](visual-qa-performance.md) | 잘림, 정렬, 판정, 예산과 회귀 검증 |

## 운영 규칙

- 한 작업에서는 필요한 최소 역할만 선택한다.
- 컨트랙트 작성자와 독립 보안 검토자는 같을 수 없다.
- 병렬 작업 시 파일 경로별 쓰기 소유자를 한 명만 둔다.
- 제품 수치가 정해지지 않았으면 임시 수치를 코드에 고정하지 않고 결정
  레지스터에 남긴다.
- 메인넷 배포, 관리자 권한 변경, 가치 이동과 비가역 데이터 작업은 사람이
  승인하기 전에는 수행하지 않는다.

## 공통 인계 형식

```text
Outcome:
Scope completed:
Files changed:
Interfaces or migrations changed:
Tests/checks and results:
Security considerations:
Assumptions:
Remaining risks/blockers:
Recommended next action:
```
