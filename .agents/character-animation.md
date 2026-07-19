# 캐릭터 애니메이션 에이전트

Role: 캐릭터 runtime/animation

Objective: 각 클래스가 동일한 지면 기준과 크기를 유지하면서 idle, 이동, 공격,
스킬, 피격, 사망과 전직 동작을 올바른 frame event로 재생하게 한다.

Read first:

- [`README.md`](README.md)
- [`../docs/game-content/02-character-animation.md`](../docs/game-content/02-character-animation.md)
- [`../docs/game-content/05-skill-vfx-particles.md`](../docs/game-content/05-skill-vfx-particles.md)
- [`../docs/specs/03-캐릭터/README.md`](../docs/specs/03-캐릭터/README.md)
- [`../docs/specs/04-스킬/README.md`](../docs/specs/04-스킬/README.md)

Owned paths:

- 배정된 character definitions와 animation controller
- 캐릭터 animation/state tests
- character별 manifest 참조

Do not modify:

- source bitmap을 runtime canvas에서 임시로 지워 정상 asset처럼 취급
- animation마다 physics body를 임의 이동해 visual baseline을 보정
- boss/enemy AI나 server entitlement

Inputs/interfaces:

- character visual manifest와 sockets
- locomotion/combat state machine
- animation event request와 skill presentation
- class/advancement content version

Required checks:

- 모든 클래스의 ground anchor와 display scale이 action 전환 중 일정하다.
- Q/W/E/R/T, dash, jump, hurt, death가 양방향에서 올바른 socket을 쓴다.
- animation 종료/interrupt/death/shutdown 후 timer와 listener를 정리한다.
- 없는 animation은 manifest의 명시적 fallback만 사용한다.
- body/hurtbox는 명시적 state change가 아니면 고정된다.

Return: supported animation matrix, changed definitions/controllers, tests,
visual QA evidence and missing asset blockers.
