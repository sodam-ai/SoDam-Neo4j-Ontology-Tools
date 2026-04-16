# Neo4j 온톨로지 도구 -- Phase 분리 계획

> 한 번에 다 만들면 복잡해져서 품질이 떨어집니다.
> Phase별로 나눠서 각각 "진짜 동작하는 제품"을 만듭니다.

---

## Phase 1: MVP — Neo4j + MCP(읽기 전용) + Force-directed 시각화 (약 1~2주)

### 목표
자연어로 온톨로지를 입력하면 Neo4j에 저장되고,
Force-directed 그래프로 시각화되며, Claude Code가 MCP로 조회할 수 있는 상태

### 기능
- [ ] 로컬 웹앱 구동 (Next.js, 포트 3000)
- [ ] Neo4j Desktop 연결 설정 (bolt://localhost:7687)
- [ ] 앱 초기 실행 시 Unique Constraint + Fulltext 인덱스 자동 생성
- [ ] 자연어 입력창 → LLM → 관계 타입 화이트리스트 검증 → Neo4j MERGE 저장
- [ ] confidence ≥ 0.75: 자동 저장 / < 0.75: 사용자 확인 팝업
- [ ] Force-directed Graph 시각화 (Cytoscape.js cose-bilkent, 노드 드래그/클릭)
- [ ] 노드 색상 인코딩: Concept=파랑, Property=초록, Instance=주황
- [ ] **MCP 서버 구동 — 읽기 전용 3개 도구만**:
  - `query_ontology` — 조건으로 노드/관계 조회
  - `search_ontology` — Fulltext 검색
  - `get_context` — 특정 개념의 1~2홉 맥락 조회
- [ ] **MCP → 웹앱 실시간 연결 (SSE)**:
  - `packages/mcp-server/src/view-event.ts` — ViewEvent를 `/api/mcp-events`로 POST (best-effort)
  - `src/app/api/mcp-events/route.ts` — SSE 스트림 엔드포인트 (브라우저 연결 유지)
  - `src/hooks/useViewEvents.ts` — 브라우저 SSE 클라이언트 훅
  - 그래프 컴포넌트에서 ViewEvent 수신 시: highlight(노드 강조) / focus(서브그래프) / reset(전체)
- [ ] 설정 마법사 페이지 `/setup` (첫 접속 시 자동 리다이렉트):
  - Neo4j 연결 테스트 (성공/실패 피드백)
  - .env.local 설정 방법 단계별 안내
  - claude_desktop_config.json 자동 생성 + 복사 버튼
  - LLM API 키 입력 (선택, 없으면 폴백 모드 안내)

> **MCP 쓰기 도구 없음**: `add_concept`, `add_relationship`은 MCP에 포함하지 않습니다.
> 온톨로지 추가/수정은 웹앱 UI 또는 Phase 2b 스킬로만 가능합니다.

### 데이터
- :Concept, :Property, :Instance 노드 (created_at, updated_at 포함)
- IS_A, USES, PART_OF, HAS_PROPERTY, INSTANCE_OF 관계
- 관계 공통 속성: created_at, source, confidence, label, weight (= confidence × 5.0)

### "진짜 제품" 체크리스트
- [ ] 실제 Neo4j Desktop 연결 (목업 데이터 X)
- [ ] 실제 LLM API로 자연어 변환 (하드코딩 X)
- [ ] Claude Code에서 MCP 서버 실제 연결 후 query_ontology 동작 확인
- [ ] 중복 입력 시 중복 노드 생성 없음 (MERGE 전략 확인)
- [ ] 화이트리스트 외 관계 타입 반환 시 확인 팝업 표시 확인

### Phase 1 시작 프롬프트
```
아래 PRD를 읽고 Phase 1을 구현해주세요.

@.PRD/01_PRD.md
@.PRD/02_DATA_MODEL.md
@.PRD/04_PROJECT_SPEC.md
@.PRD/05_SECURITY.md

Phase 1 범위:
- Next.js 웹앱 프로젝트 초기화 (포트 3000)
- 설정 마법사 페이지 /setup (첫 접속 시 자동 리다이렉트)
  → Neo4j 연결 테스트 + .env.local 안내 + MCP config 자동 생성
  → LLM API 키 입력 (선택, 없으면 폴백 모드 안내)
- src/lib/neo4j/ 모듈 (neo4j-driver 5.x, CRUD, CypherBuilder)
- packages/mcp-server/ 패키지 (@modelcontextprotocol/sdk)
  → 읽기 전용 3개 도구만: query_ontology / search_ontology / get_context
  → 각 도구 호출 시 view-event.ts로 웹앱에 ViewEvent POST (best-effort)
  → WEB_APP_URL 환경변수로 웹앱 주소 참조 (하드코딩 금지)
  → Neo4j 연결 실패 시 "Neo4j 연결 실패. 웹앱 /settings에서 연결 설정을 확인하세요." 반환
- SSE 연결:
  → src/app/api/mcp-events/route.ts (SSE 스트림 엔드포인트)
  → src/hooks/useViewEvents.ts (브라우저 SSE 클라이언트 훅, 끊김 시 3초 후 자동 재연결)
  → ForceDirectedGraph에서 highlight / focus / reset 처리
- 자연어 입력창 UI:
  → LLM_API_KEY 있으면: LLM → Cypher 변환, 첫 사용 시 PII 고지 1회
  → LLM_API_KEY 없으면: 앱 시작 시 자동 드롭다운 모드 전환
- 관계 타입 화이트리스트 검증 + confidence 0.75 임계값 처리
- LLM 응답 Zod 스키마 검증 (05_SECURITY.md 참조)
- Cytoscape.js Force-directed Graph 컴포넌트 (cose-bilkent)
- 앱 초기화 시 Unique Constraint + Fulltext 인덱스 자동 생성

반드시 지켜야 할 것:
- 04_PROJECT_SPEC.md의 "절대 하지 마" + "항상 해" 목록 전체 준수
- 05_SECURITY.md의 Phase 1 보안 요구사항 전체 구현
- 환경변수: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, LLM_API_KEY, WEB_APP_URL
- 하드코딩 절대 금지, 실제 Neo4j 연결 (목업 X)
- 노드 생성 시 CREATE 금지, MERGE 필수
- MCP에 쓰기 도구(add_concept, add_relationship) 추가 금지
- view event 발송 실패 시 MCP 도구 결과에 영향 없도록 try/catch 필수
```

---

## Phase 2a: 3종 시각화 완성 + GDS 알고리즘 (약 1~1.5주)

### 전제 조건
Phase 1이 안정적으로 동작하는 상태

### 목표
3종 그래프 완성 + GDS PageRank/커뮤니티 연동으로 그래프가 "살아있는" 형태로 발전

### 기능

#### 그래프 시각화
- [ ] Node-link Diagram 추가 (Cytoscape.js dagre 레이아웃, IS_A 계층 구조)
- [ ] Network Graph 추가 (Cytoscape.js cola 레이아웃, 커뮤니티 클러스터)
- [ ] 그래프 전환 툴바 (3종 탭, 필터, 줌)
- [ ] 노드 클릭 → 상세 정보 패널
- [ ] 엣지 시각적 인코딩: 관계 타입별 색상, weight 비례 두께
- [ ] 노드 수 성능 기준 적용 (200/1000 기준표)

#### GDS 알고리즘 (Graph Data Science)
- [ ] **GDS 그래프 프로젝션 자동 생성** — 앱 초기화 시 `src/lib/neo4j/init.ts`에서 생성
  ```cypher
  CALL gds.graph.project.cypher(
    'ontology-graph',
    'MATCH (n) WHERE n:Concept OR n:Property OR n:Instance RETURN id(n) AS id',
    'MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target, type(r) AS type'
  )
  ```
  이미 존재하면 삭제 후 재생성 (`gds.graph.exists` 확인 후 처리)
- [ ] **PageRank** — 각 노드의 중요도 점수 계산 → 노드 크기에 반영
  - 쿼리: `CALL gds.pageRank.stream('ontology-graph') YIELD nodeId, score`
  - 마지막 변경 후 30초 디바운스 → 자동 갱신 + 즉시 갱신 버튼 제공
- [ ] **Community Detection (Louvain)** — 연결 패턴으로 자동 그룹화 → Network Graph 색상에 반영
  - 쿼리: `CALL gds.louvain.stream('ontology-graph') YIELD nodeId, communityId`
- [ ] **GDS 미설치 폴백**: GDS 없으면 노드 크기 30px 균등 + 화면 상단 "GDS 미설치: PageRank/커뮤니티 기능 없음" 배너 표시 (나머지 기능 정상 동작)

### 통합 테스트
- Phase 1 모든 기능 여전히 정상 동작 확인
- 3종 그래프 데이터 일관성 확인
- PageRank 점수 변화 → 노드 크기 반영 확인

### Phase 2a 시작 프롬프트
```
Phase 1 완료 후 Phase 2a를 구현해주세요.

@.PRD/01_PRD.md
@.PRD/04_PROJECT_SPEC.md

Phase 2a 범위:
- Node-link Diagram 컴포넌트 (Cytoscape.js dagre)
- Network Graph 컴포넌트 (Cytoscape.js cola)
- 그래프 전환 툴바 + 엣지 시각적 인코딩
- 노드 수 성능 기준 적용 (200개/1000개 임계값)
- GDS PageRank → 노드 크기 반영 (30초 디바운스 자동 갱신)
- GDS Louvain Community Detection → Network Graph 색상 반영

반드시:
- Cytoscape.js 단일 라이브러리 (D3.js, Sigma.js 추가 금지)
- Phase 1 기능 회귀 없음
- GDS 미설치 시 한국어 안내 메시지 표시
- MCP 쓰기 도구 추가 금지
```

---

## Phase 2b: 스킬 + 검색 + 경로 탐색 + 폴백 UI (약 1~1.5주)

### 전제 조건
Phase 2a가 안정적으로 동작하는 상태

### 목표
Claude Code 스킬(쓰기 포함), 자연어 검색, 경로 탐색, LLM 없을 때 폴백 UI 완성

### 기능

#### Claude Code 스킬 (쓰기는 스킬로만)
- [ ] `.claude/skills/ontology/` 스킬 5개:
  - `/ontology-add` — 개념/관계 추가 (MCP 대신 스킬로 쓰기)
  - `/ontology-search` — 자연어 검색
  - `/ontology-context` — 현재 프로젝트 맥락 요약
  - `/ontology-export` — 온톨로지 내보내기
  - `/ontology-health` — Neo4j 연결 상태 + 노드/관계 수 + GDS 프로젝션 상태 확인

  > 스킬 파일 형식: 마크다운 (.md), YAML 프론트매터 + 지시사항 본문.
  > 위치: `.claude/skills/ontology/<skill-name>.md`

#### 최단 경로 탐색
- [ ] **Shortest Path** — "A 개념에서 B 개념까지 어떤 관계로 연결되나?" 탐색
  - 쿼리: `MATCH p=shortestPath((a:Concept {name:$from})-[*]-(b:Concept {name:$to})) RETURN p`
  - 결과: 경로 상의 노드와 관계를 Force-directed Graph에 하이라이트

#### 자연어 검색 UI
- [ ] 검색창 + 결과 하이라이트
- [ ] Fulltext 인덱스 활용 (Phase 1에서 생성한 concept_search 인덱스)
- [ ] 검색 결과 그래프에서 하이라이트 표시

#### LLM 폴백 수동 선택 UI
- [ ] LLM API 미설정 또는 오류 감지 시 자동 전환
- [ ] UI 구성: `[A 노드명 입력]` → `[관계 드롭다운: IS_A/USES/PART_OF/HAS_PROPERTY/INSTANCE_OF]` → `[B 노드명 입력]`
- [ ] 선택 완료 → 저장 (confidence = 1.0으로 처리, weight = 5.0)

### Phase 2b 시작 프롬프트
```
Phase 2a 완료 후 Phase 2b를 구현해주세요.

@.PRD/01_PRD.md
@.PRD/04_PROJECT_SPEC.md

Phase 2b 범위:
- .claude/skills/ontology/ 스킬 4개 (마크다운 형식)
  → /ontology-add가 MCP 대신 온톨로지 쓰기를 담당
- Shortest Path 탐색 UI + 결과 하이라이트
- 자연어 검색 UI + Fulltext 인덱스 활용
- LLM 폴백 수동 선택 UI (드롭다운 방식)

반드시:
- Phase 2a 기능 회귀 없음
- MCP 쓰기 도구 추가 금지 (쓰기는 스킬로만)
```

---

## Phase 3: 고도화 — 가져오기/내보내기 + 안정화 (약 1주)

### 전제 조건
Phase 1 + 2a + 2b가 안정적으로 동작 중

### 목표
JSON/CSV 백업·복원, 온톨로지 스냅샷, 릴리스 준비

### 기능
- [ ] JSON/CSV 내보내기 (전체 온톨로지 백업, APOC apoc.export.json.all 활용)
- [ ] JSON/CSV 가져오기 (파일 드롭 또는 버튼, APOC apoc.load.json 활용)
- [ ] 온톨로지 스냅샷 (특정 시점 저장)
- [ ] 에러 처리 강화 (Neo4j 연결 실패, LLM 오류, GDS 미설치 등)
- [ ] 설치 가이드 문서 (Neo4j Desktop 설치 → 앱 실행 → MCP 등록 순서)
- [ ] 논리 삭제(deleted_at) 도입 여부 검토

### 주의사항
- CSV 가져오기 시 입력 검증 필수 (악성 데이터 방지)
- 기존 데이터 덮어쓰기 전 확인 프롬프트
- APOC 미설치 시 수동 JSON 내보내기 폴백 구현

### Phase 3 시작 프롬프트
```
Phase 1+2a+2b 완료 후 Phase 3을 구현해주세요.

@.PRD/01_PRD.md
@.PRD/04_PROJECT_SPEC.md

Phase 3 범위:
- JSON/CSV 가져오기/내보내기 (APOC 활용, 미설치 시 폴백)
- 온톨로지 스냅샷 기능
- 에러 처리 강화 및 사용자 안내 메시지 (한국어)
- 설치/사용 가이드 문서

반드시:
- CSV 입력 검증 (악성 데이터 방지)
- 모든 기존 기능 회귀 없음
- APOC 미설치 시에도 기본 동작 보장
```

---

## Phase 로드맵 요약

| Phase | 핵심 기능 | 상태 |
|-------|----------|------|
| Phase 1 (MVP) | Neo4j 연동 + MCP 읽기 전용 3개 + Force-directed + confidence/화이트리스트 | 시작 전 |
| Phase 2a | 3종 시각화 완성 + GDS(PageRank+커뮤니티) + 성능 기준 적용 | Phase 1 완료 후 |
| Phase 2b | Shortest Path + 스킬 5개(쓰기 포함) + 검색 + LLM 폴백 UI | Phase 2a 완료 후 |
| Phase 3 | 가져오기/내보내기(APOC) + 스냅샷 + 안정화 + 가이드 | Phase 2b 완료 후 |

---

## Phase 완료 검증 명령어

> 각 Phase가 끝나면 아래 명령어로 "진짜 동작하는지" 확인하세요.

### Phase 1 검증

```bash
# 1. 웹앱 구동 확인
pnpm dev                          # 포트 3000에서 실행되는지 확인

# 2. 타입 오류 없음 확인
pnpm typecheck

# 3. 테스트 통과 확인
pnpm test

# 4. MCP 서버 빌드 + 실행 확인
cd packages/mcp-server && pnpm build && pnpm start

# 5. Neo4j 연결 + MERGE 동작 확인 (Neo4j Browser에서)
# MATCH (n) RETURN count(n)        ← 노드 수 확인
# SHOW CONSTRAINTS                 ← 4개 Unique Constraint 확인
# SHOW INDEXES                     ← concept_search Fulltext 인덱스 확인

# 6. SSE 연결 확인
# 브라우저에서 http://localhost:3000 열기
# Claude Code에서 query_ontology 도구 호출
# → 웹앱 그래프에서 해당 노드가 하이라이트되는지 확인 (1초 이내)
```

### Phase 2a 검증

```bash
# 1. Phase 1 회귀 없음 확인
pnpm test

# 2. GDS 설치 + 프로젝션 확인 (Neo4j Browser에서)
# CALL gds.graph.exists('ontology-graph') YIELD exists   ← true여야 함
# CALL gds.pageRank.stream('ontology-graph') YIELD nodeId, score RETURN count(*)

# 3. 3종 그래프 탭 전환이 100ms 이내인지 브라우저 개발자도구로 확인
```

### Phase 2b 검증

```bash
# 1. 스킬 파일 5개 존재 확인
ls .claude/skills/ontology/

# 2. Claude Code에서 /ontology-health 실행해 상태 확인
# (Claude Code 터미널에서 직접 실행)

# 3. 전체 테스트 통과
pnpm test
```

### Phase 3 검증

```bash
# 1. APOC 설치 확인 (Neo4j Browser에서)
# CALL apoc.help('export')          ← APOC 설치됐으면 결과 반환

# 2. JSON 내보내기 → 가져오기 왕복 테스트
# (웹앱 UI에서 직접 실행)

# 3. 전체 빌드 확인
pnpm build
```
