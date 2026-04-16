# Neo4j 온톨로지 도구 -- PRD (Product Requirements Document)

> 생성일: 2026-04-16 | Show Me The PRD (gptaku-plugins v0.7.2)

---

## 1. 제품 개요

### 한 줄 요약
자연어만 입력하면 Neo4j 지식그래프가 자동으로 만들어지고,
Claude Code 같은 LLM AI가 MCP를 통해 그 그래프를 참조해 더 정확하게 바이브코딩을 도와주는 로컬 웹 도구

### 해결하는 문제
- 비개발자가 머릿속 개념과 관계를 AI에게 정확히 전달하기 어려움 (매 세션 컨텍스트 손실)
- 기존 온톨로지 도구(Protégé, OWL 등)는 전문가용이라 초보자 진입 불가
- Claude Code가 프로젝트 맥락을 매번 새로 설명받아야 해서 비효율

### 핵심 가치
1. **자연어만 입력** → Neo4j 그래프 자동 생성 (코딩 0줄)
2. **MCP 연동** → Claude Code가 온톨로지를 직접 조회해 더 정확한 답변
3. **3종 시각화** → Force-directed / Node-link / Network 그래프로 관계를 한눈에 파악
4. **스킬 연동** → /ontology-add, /ontology-search 등 Claude Code 슬래시 명령어 지원
5. **로컬 운영** → 인터넷 없이 동작, 데이터 내 PC에 보관

---

## 2. 사용자

### 주요 사용자
- **누구**: 코딩 경험 0인 바이브코더 (비개발자, 비전문가, 일반인)
- **상황**: VS Code / Cursor / Antigravity에서 자연어로만 AI와 협업 개발 중
- **목표**: AI에게 프로젝트 맥락을 한 번만 알려주고, 이후 모든 세션에서 자동으로 참조되게 하기

### 사용자 시나리오
1. 브라우저에서 로컬 웹앱을 열고
2. "React는 JavaScript를 사용한다"를 입력하면
3. Neo4j에 노드와 관계가 자동 생성되고
4. Force-directed 그래프로 즉시 시각화되며
5. Claude Code가 MCP를 통해 이 관계를 자동으로 참조해 답변

---

## 3. 핵심 기능

| 기능 | 설명 | 우선순위 | 복잡도 |
|------|------|----------|--------|
| 설정 마법사 /setup | 첫 접속 시 자동 이동: Neo4j 연결 테스트 + env 가이드 + MCP config 자동 생성 | P1 (Phase 1) | 간단 |
| Neo4j 연동 | 로컬 Neo4j Desktop 연결, CRUD | P1 (Phase 1) | 보통 |
| 자연어 → 온톨로지 | 문장 입력 → 노드+관계 자동 생성 | P1 (Phase 1) | 보통 |
| MCP 서버 (읽기 전용) | Claude Code가 온톨로지 조회 (query / search / get_context) | P1 (Phase 1) | 복잡 |
| MCP → 웹앱 실시간 반응 | MCP 도구 호출 시 SSE로 웹앱 그래프 자동 업데이트 (하이라이트/포커스) | P1 (Phase 1) | 보통 |
| Force-directed Graph | Cytoscape.js 물리 시뮬레이션 그래프 | P1 (Phase 1) | 보통 |
| Node-link Diagram | Cytoscape.js 계층/트리 레이아웃 | P1 (Phase 2a) | 간단 |
| Network Graph | Cytoscape.js 클러스터링 네트워크 | P1 (Phase 2a) | 간단 |
| GDS 알고리즘 | PageRank(중요도) + 커뮤니티 감지(그룹화) | P1 (Phase 2a) | 보통 |
| Shortest Path | A → B 사이 관계 경로 찾기 | P2 (Phase 2b) | 간단 |
| Claude Code 스킬 | /ontology-add, /ontology-search 등 (쓰기 포함) | P2 (Phase 2b) | 보통 |
| 자연어 검색 | "이것과 연결된 것 찾아줘" 탐색 | P2 (Phase 2b) | 보통 |
| LLM 폴백 수동 선택 UI | LLM API 없을 때 드롭다운으로 관계 직접 선택 | P2 (Phase 2b) | 간단 |
| 가져오기/내보내기 | JSON/CSV 백업·복원 | P3 (Phase 3) | 간단 |

---

## 4. 3종 그래프 시각화 상세 스펙

### 그래프 종류별 스펙

| 그래프 | 레이아웃 플러그인 | 주요 용도 | 핵심 인터랙션 | 특징 |
|--------|----------------|----------|-------------|------|
| Force-directed Graph | cytoscape-cose-bilkent | 전체 온톨로지 관계 탐색 | 노드 드래그, 클릭, 줌 | 물리 시뮬레이션으로 밀접한 노드가 자연스럽게 가까이 모임 |
| Node-link Diagram | cytoscape-dagre | IS_A 계층 구조 파악 | 계층 펼치기/접기, 노드 클릭 | 상하 트리 레이아웃, 깊이별 자동 정렬 |
| Network Graph | cytoscape-cola | 커뮤니티/클러스터 분석 | 그룹 확대, 노드 핀 고정 | 연결이 많은 개념끼리 자동 그룹화 |

### 노드 시각적 인코딩 (색상 · 크기)

| 요소 | 인코딩 규칙 | 값 | 이유 |
|------|-----------|-----|------|
| 노드 색상 | 노드 타입별 고정 색상 | Concept = 파랑 (#4A90D9), Property = 초록 (#5CB85C), Instance = 주황 (#F0AD4E) | 한눈에 타입 구분 |
| 노드 크기 | PageRank 점수 비례 | 점수 높을수록 크게 (최소 20px, 최대 60px) | 중요한 개념이 시각적으로 돋보임 |
| 노드 테두리 | 선택/호버 상태 | 기본=없음, 호버=흰색 2px, 선택=노란색 3px | 인터랙션 피드백 |
| 노드 레이블 | name 필드 | 항상 표시, 14px 폰트 | 이름 즉시 파악 |

### 엣지 시각적 인코딩 (색상 · 두께)

| 요소 | 인코딩 규칙 | 값 | 이유 |
|------|-----------|-----|------|
| 엣지 색상 | 관계 타입별 고정 색상 | IS_A = 회색 (#999), USES = 파랑 (#337AB7), PART_OF = 녹색 (#5CB85C), HAS_PROPERTY = 보라 (#9B59B6), INSTANCE_OF = 주황 (#E67E22) | 관계 종류 즉시 구분 |
| 엣지 두께 | weight 속성 비례 | 1.0 = 1px, 3.0 = 3px, 5.0 = 5px | 관계 강도 시각화 |
| 엣지 화살표 | 항상 방향 표시 | 단방향 화살표 | 관계 방향 명확화 |
| 엣지 레이블 | label 속성 (한국어) | 마우스 호버 시 표시 | 화면 정리 + 상세 확인 |

---

## 5. 사용자 흐름 (User Flow)

### 핵심 흐름 — 온톨로지 생성 (LLM API 있을 때)
```
자연어 입력 → LLM 첫 사용 시 1회 PII 고지 팝업 ("입력 내용이 Anthropic API로 전송됩니다")
  → LLM 파싱 → 관계 타입 화이트리스트 검증
  → confidence ≥ 0.75: 자동 저장 → 그래프 실시간 업데이트
  → confidence < 0.75: 사용자 확인 팝업 → 승인 시 저장
```

### 핵심 흐름 — 온톨로지 생성 (LLM API 없을 때)
```
앱 시작 시 LLM_API_KEY 미설정 자동 감지 → 즉시 드롭다운 모드로 전환 (LLM 호출 없음)
  → 수동 선택 UI: [노드명] → [관계 드롭다운] → [노드명] → 저장
```

### 핵심 흐름 — Claude Code 활용 (A + B 동시 동작)
```
바이브코딩 중 질문 → MCP 서버 쿼리 (읽기 전용)
  → Neo4j 온톨로지 조회
  → [A] Claude Code 터미널에 텍스트 결과 표시
  → [B] 웹앱 /api/mcp-events로 ViewEvent 발송
        → 브라우저 SSE 수신 → 그래프 실시간 업데이트
             (query_ontology → 노드 하이라이트)
             (search_ontology → 검색 결과 강조)
             (get_context → 중심 노드 포커스 + 서브그래프)
```

### 상세 흐름
1. **첫 접속 시 /setup 마법사**: Neo4j 연결 테스트 → .env.local 설정 안내 → MCP config 자동 생성
2. **Neo4j 연결**: 설정 화면에서 bolt://localhost:7687 연결 확인
3. **온톨로지 입력**: 메인 화면 입력창에 자연어 문장 입력
4. **자동 변환**: LLM이 문장 → Concept/Property/Instance 노드 + 관계 타입 추출
5. **시각화**: 3종 탭 전환 (Force-directed / Node-link / Network)
6. **MCP 활용**: claude_desktop_config.json에 서버 등록 → 모든 세션에서 자동 컨텍스트

---

## 6. 성공 기준

- [ ] 자연어 문장 1개 입력 → Neo4j 노드+관계 생성 3초 이내
- [ ] Cytoscape.js 3종 그래프 탭 전환 100ms 이내
- [ ] PageRank 기반 노드 크기 변화 실시간 반영
- [ ] Claude Code에서 /ontology-search로 관련 개념 조회 가능
- [ ] Neo4j Desktop 설치 후 5분 내 첫 그래프 생성 가능
- [ ] Claude Code MCP 명령 → 웹앱 그래프 반응 1초 이내 (SSE 실시간 업데이트)
- [ ] LLM API 없어도 수동 선택 UI로 기본 기능 동작
- [ ] 중복 노드 생성 없음 (MERGE 전략 + Unique Constraint 보장)
- [ ] 노드 수 증가 시 성능 기준 준수 (아래 기준표)

### 노드 수 성능 기준

| 노드 수 | 렌더링 전략 |
|--------|-----------|
| 0 ~ 200개 | 전체 그래프 렌더링 |
| 200 ~ 1000개 | 선택된 노드 중심 2-hop 서브그래프만 표시 |
| 1000개 이상 | 카테고리별 클러스터로 축소 표시, 클릭 시 확장 |

---

## 7. 안 만드는 것 (Out of Scope)

> Phase 1~3에서는 만들지 않습니다.

- OWL/RDF 표준 형식 지원 -- 이유: 초보자 불필요, 추후 고려
- 멀티유저/팀 공유 기능 -- 이유: 개인용 도구, 공유 기능 추후
- 클라우드 Neo4j Aura 연동 -- 이유: 복잡도 증가, 로컬 우선
- SPARQL 쿼리 인터페이스 -- 이유: 전문가용, 자연어 검색으로 대체
- 온톨로지 추론(Reasoning) 엔진 -- 이유: 고급 기능, 기본 기능 완성 후
- 모바일 앱 -- 이유: 데스크탑 개발 도구 특성상 불필요
- MCP를 통한 직접 쓰기 -- 이유: 데이터 손상 리스크, 스킬로 대체

---

## 8. [NEEDS CLARIFICATION]

- [ ] Neo4j Desktop 미설치 감지 및 안내 방법 (자동 설치? 링크 안내?)
