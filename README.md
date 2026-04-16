# Neo4j 온톨로지 도구

> **[English version → README_EN.md](./README_EN.md)**

지식 그래프(온톨로지)를 시각적으로 탐색하고, 자연어로 관계를 입력하며, Neo4j에 저장·조회하는 Next.js 15 웹 앱입니다.  
MCP(Model Context Protocol) 서버를 내장하여 Claude Code 등 AI 클라이언트에서 직접 그래프를 조작할 수 있습니다.

---

## 주요 기능

### Phase 1 — 기본 시각화 + MCP 읽기 전용
- **Force-directed 그래프** (Cytoscape.js cose-bilkent) — 물리 시뮬레이션 레이아웃
- **자연어 입력** — LLM(Claude)이 "React는 JavaScript 프레임워크이다"를 온톨로지 트리플로 변환
- **폴백 수동 모드** — LLM 없이도 직접 노드·관계 입력 가능
- **설정 마법사** `/setup` — Neo4j 연결, LLM API 키, MCP 설정 3단계
- **MCP 서버** — `get_ontology`, `search_nodes`, `get_node_relations` 3개 읽기 전용 도구

### Phase 2a — 3종 그래프 시각화 + GDS 알고리즘
- **Node-link Diagram** (dagre) — IS_A 관계를 위→아래 계층 구조로 표시, 나머지 관계는 점선
- **Network Graph** (cola) — 커뮤니티별 색상 클러스터 (Louvain 알고리즘)
- **GDS 연동** — PageRank 점수로 노드 크기 조절, Louvain 커뮤니티 감지
- **GDS 미설치 시 자동 폴백** — 기능 저하 없이 정상 동작, 안내 배너 표시
- **노드 상세 패널** — 클릭 시 이름·타입·설명·PageRank·커뮤니티 ID 표시
- **관계 타입 필터** — IS_A / USES / PART_OF / HAS_PROPERTY / INSTANCE_OF 토글
- **줌 컨트롤** — 확대·축소·전체 맞춤 버튼
- **PageRank 30초 자동 갱신** — 온톨로지 변경 후 자동 업데이트

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| 그래프 | Cytoscape.js + cose-bilkent / dagre / cola |
| DB | Neo4j 5.x |
| GDS | Neo4j Graph Data Science (선택 사항) |
| LLM | Anthropic Claude API (선택 사항) |
| MCP | @modelcontextprotocol/sdk |
| 테스트 | Vitest + @testing-library/react |
| 패키지 | pnpm workspace |

---

## 설치 및 실행

### 사전 요구 사항

- Node.js 20+
- pnpm 9+
- Neo4j Desktop 또는 Neo4j Aura (선택 사항)

### 1. 저장소 복제

```bash
git clone https://github.com/sodam-ai/neo4j_ontology_tools.git
cd neo4j_ontology_tools
```

### 2. 패키지 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 편집:

```env
# Neo4j (필수 — 연결할 경우)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Anthropic (자연어 입력 사용 시)
ANTHROPIC_API_KEY=sk-ant-...

# MCP 서버 (선택 사항)
MCP_SERVER_PORT=3100
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000` 접속.

### 5. (선택) MCP 서버 빌드

```bash
pnpm --filter mcp-server build
```

Claude Code `settings.json`에 MCP 서버 등록:

```json
{
  "mcpServers": {
    "ontology": {
      "command": "node",
      "args": ["D:/path/to/neo4j_ontology_tools/packages/mcp-server/dist/server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password"
      }
    }
  }
}
```

---

## GDS (Graph Data Science) 선택 설치

Neo4j Desktop → 해당 DB → **Plugins** → **Graph Data Science Library** → Install

- 설치 후 앱 재시작 시 PageRank + 커뮤니티 감지 자동 활성화
- 미설치 시: PageRank=0, communityId=0으로 정상 동작 (기능 저하 없음)

---

## 프로젝트 구조

```
neo4j_ontology_tools/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 페이지 (그래프 + 입력)
│   │   ├── setup/                # 설정 마법사
│   │   ├── settings/             # 설정 페이지
│   │   └── api/
│   │       ├── health/           # Neo4j 연결 상태
│   │       ├── ontology/         # CRUD + PageRank 병합
│   │       ├── llm/parse/        # 자연어 → 트리플
│   │       └── mcp-events/       # SSE 스트림
│   ├── components/
│   │   ├── OntologyGraph/
│   │   │   ├── ForceDirectedGraph.tsx   # cose-bilkent
│   │   │   ├── NodeLinkDiagram.tsx      # dagre (IS_A 계층)
│   │   │   ├── NetworkGraph.tsx         # cola (커뮤니티)
│   │   │   ├── GraphToolbar.tsx         # 탭·필터·줌
│   │   │   ├── NodeDetailPanel.tsx      # 노드 상세 패널
│   │   │   └── GdsBanner.tsx            # GDS 미설치 안내
│   │   └── OntologyInput/
│   │       └── NaturalLanguageInput.tsx
│   ├── lib/
│   │   ├── neo4j/
│   │   │   ├── connection.ts     # 싱글톤 드라이버
│   │   │   ├── init.ts           # 제약 + GDS 프로젝션
│   │   │   ├── repos.ts          # CRUD
│   │   │   ├── cypher-builder.ts # 쿼리 빌더
│   │   │   └── gds.ts            # PageRank + Louvain
│   │   └── llm/
│   │       └── nl-to-cypher.ts   # 자연어 파서
│   └── types/
│       ├── ontology.ts           # 핵심 타입
│       ├── cytoscape-dagre.d.ts
│       └── cytoscape-cola.d.ts
└── packages/
    └── mcp-server/               # MCP 독립 패키지
        └── src/
            ├── server.ts
            ├── view-event.ts
            └── tools/
```

---

## 테스트

```bash
pnpm test          # 전체 테스트 실행
pnpm typecheck     # TypeScript 타입 검사
pnpm build         # 프로덕션 빌드
```

현재 테스트: **28개** 전체 통과

---

## 로드맵

| Phase | 상태 | 내용 |
|-------|------|------|
| Phase 1 | ✅ 완료 | Force-directed 그래프, MCP 읽기 전용, 자연어 입력 |
| Phase 2a | ✅ 완료 | Node-link / Network 그래프, GDS PageRank+커뮤니티 |
| Phase 2b | 대기 | Shortest Path, Claude Code 스킬, 자연어 검색, IS_A 순환 참조 방지 |
| Phase 3 | 대기 | JSON/CSV 가져오기·내보내기 (APOC) |

---

## 라이선스

MIT © 2026 SoDam AI Studio
