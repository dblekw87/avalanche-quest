# 데이터베이스와 인덱서 명세

주 담당: **데이터 에이전트**. 권한·보상·자산·운영 데이터에 영향을 주면 작성자와
다른 검토자가 확인한다.

| 문서 | 핵심 범위 |
| --- | --- |
| [데이터베이스 스키마](스키마.md) | 시도·제출·청구·이벤트·커서를 정규화한다. |
| [제약조건과 멱등성](제약조건.md) | 경합 상황의 중복과 잘못된 상태 전이를 막는다. |
| [Row Level Security](rls.md) | 익명·본인·타인·service role 권한을 검증한다. |
| [마이그레이션](마이그레이션.md) | 전진 변경·staging·expand/migrate/contract를 따른다. |
| [이벤트 인덱서](이벤트-인덱서.md) | 중복 제거·겹침 조회·트랜잭션 커서를 사용한다. |
| [체인 재구성 처리](reorg.md) | 블록 해시를 보존하고 projection을 되감는다. |
| [조회 Projection](조회-projection.md) | DB를 복구 가능한 최종 일관성 조회 모델로 둔다. |
| [데이터 테스트](데이터-테스트.md) | 경합·중복·RLS·migration·reorg·재처리를 검증한다. |

공통으로 루트 `AGENTS.md`, `docs/agents/01-common-rules.md`,
`docs/agents/06-security-quality.md`를 적용한다.
