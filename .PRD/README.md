# Neo4j 온톨로지 도구 -- 디자인 문서

> Show Me The PRD로 생성됨 (2026-04-16)
> 목적: Neo4j에 데이터를 저장하고, Claude Code에서 명령하면 웹앱 그래프가 실시간으로 반응하는 로컬 지식그래프 도구

## 문서 구성

| 문서 | 내용 | 언제 읽나 |
|------|------|----------|
| [01_PRD.md](./01_PRD.md) | 뭘 만드는지, 누가 쓰는지, 3종 그래프 스펙, 시각적 인코딩, 노드 수 성능 기준 | 프로젝트 시작 전 |
| [02_DATA_MODEL.md](./02_DATA_MODEL.md) | Neo4j 노드/관계 구조, LLM 응답 JSON 스키마, MERGE 전략, 화이트리스트, confidence/weight 기준, 순환 참조 방지 | Neo4j 설계할 때 |
| [03_PHASES.md](./03_PHASES.md) | Phase 1 / 2a / 2b / 3 단계별 계획 + 시작 프롬프트 + 검증 명령어 | 개발 순서 정할 때 |
| [04_PROJECT_SPEC.md](./04_PROJECT_SPEC.md) | 기술 스택, MCP 읽기 전용 규칙, 트랜잭션 전략, AI 행동 규칙 | AI에게 코드 시킬 때마다 |
| [05_SECURITY.md](./05_SECURITY.md) | 신뢰 경계 지도, 위협 모델, 방어 레이어, Zod 스키마, 비밀 관리, 보안 요구사항 | 보안 관련 코드 짤 때마다 |

## 다음 단계

Phase 1을 시작하려면 [03_PHASES.md](./03_PHASES.md)의 **"Phase 1 시작 프롬프트"** 섹션을
복사해서 Claude Code에 붙여넣으세요.

> AI에게 코드를 시킬 때는 `@.PRD/04_PROJECT_SPEC.md`와 `@.PRD/05_SECURITY.md`를 함께 첨부하세요.

## 핵심 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| Neo4j 형태 | Desktop 로컬 (bolt://localhost:7687) | 오프라인 동작, 데이터 내 PC 보관 |
| 노드 생성 방식 | MERGE 필수 (CREATE 금지) | 중복 노드 방지 |
| 제약 조건 | Unique Constraint (name 필드) | MERGE 전략의 안전망 |
| 검색 인덱스 | Fulltext Index (name + description) | 자연어 검색 전제 조건 |
| 그래프 라이브러리 | Cytoscape.js 단일 (D3.js 금지) | 3종 레이아웃 하나로 해결 |
| GDS 알고리즘 | PageRank + Louvain + Shortest Path | 노드 크기/그룹 색상/경로 탐색 |
| 트랜잭션 | writeTransaction() 필수 | 반쪽 저장 방지 |
| MCP 권한 | 읽기 전용 3개만 | 데이터 손상 리스크 원천 차단 |
| 쓰기 방법 | 웹앱 UI 또는 스킬(.claude/skills/) | MCP 통한 임의 수정 방지 |
| LLM 관계 타입 | 화이트리스트 5개 + 검증 | 비표준 타입 저장 방지 |
| confidence 기준 | 0.75 이상 자동 저장 / 미만 확인 팝업 | 오류 관계 방지 |
| weight 계산 | confidence × 5.0 (자동) | 별도 계산 없이 기존 값 활용 |
| LLM 폴백 | 수동 선택 드롭다운 UI | 정확도 최우선 |
| 노드 수 성능 | 200/1000 기준 3단계 렌더링 전략 | 대용량 대응 |
| MCP 시크릿 | 시스템 환경변수 참조 | 평문 비밀번호 파일 제거 |
| LLM 응답 검증 | Zod 스키마 파싱 필수 | raw LLM 출력 → Cypher 직결 차단 |
| 자연어 입력 제한 | 최대 1000자 | LLM API 비용 폭탄 + 남용 방지 |
| Neo4j 드라이버 | 싱글톤 (connection.ts 전용) | 드라이버 다중 생성 → 연결 고갈 방지 |
| GDS 프로젝션 | 앱 초기화 시 자동 생성 | PageRank/Louvain 실행 전 필수 |
| 순환 참조 | IS_A 관계 저장 전 탐지 | dagre 레이아웃 무한 루프 방지 |
| MCP 응답 하드캡 | 50노드 / 100관계 | Claude Code 컨텍스트 낭비 방지 |
| 그래프 레이아웃 | localStorage 유지 | 새로고침 후 선택 탭 복원 |
| 스킬 파일 형식 | 마크다운 + YAML 프론트매터 | Claude Code 스킬 표준 형식 |
| 보안 문서 | 05_SECURITY.md 전용 분리 | 체크리스트 아닌 설계 수준 보안 |
| MCP → 웹앱 연결 | SSE (Server-Sent Events) | WebSocket보다 단순, 서버→브라우저 단방향으로 충분 |
| view event 발송 | best-effort (try/catch) | 웹앱 꺼져 있어도 MCP 도구 정상 동작 보장 |
| WEB_APP_URL | 환경변수로 관리 (기본값 http://localhost:3000) | MCP 포트 하드코딩 제거, 포트 변경 대응 |
| 설정 마법사 /setup | 첫 접속 시 자동 리다이렉트 | 비개발자 초기 설정 실패 방지 (설치 안내 + MCP config 자동 생성) |
| PII 고지 | LLM 첫 사용 시 1회 팝업 | 입력 내용이 Anthropic API로 전송된다는 사실 사용자 인지 |
| GDS 폴백 | 미설치 시 30px 균등 + 배너 | Phase 2a가 GDS 없이도 정상 동작 보장 |

## 미결 사항 (NEEDS CLARIFICATION)

- [ ] Neo4j Desktop 미설치 감지 및 자동 안내 방법
- [ ] 논리 삭제(deleted_at) 도입 여부 — Phase 3에서 검토
