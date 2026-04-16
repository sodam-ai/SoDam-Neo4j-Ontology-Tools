# Neo4j 온톨로지 도구 -- 프로젝트 스펙

> AI가 코드를 짤 때 이 문서를 반드시 함께 공유하세요.
> @.PRD/04_PROJECT_SPEC.md 를 매번 첨부하면 일관된 품질을 유지할 수 있습니다.

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | 로컬 웹앱, 그래프 시각화에 최적, AI 코딩 호환성 최고 |
| 언어 | TypeScript 5.x | 타입 안전, 자동완성 지원 |
| 스타일링 | Tailwind CSS 4 | 빠른 UI 구성, 커뮤니티 풍부 |
| 패키지 매니저 | pnpm | 빠르고 효율적 |
| 그래프 DB | Neo4j Desktop 5.x (로컬) | 관계 탐색 최적화, 무료, 오프라인 동작 |
| Neo4j 드라이버 | neo4j-driver 5.x (공식) | 공식 지원, TypeScript 완벽 지원 |
| APOC 라이브러리 | APOC 5.x (Neo4j 플러그인) | JSON/CSV 가져오기·내보내기, 고급 데이터 조작 |
| Neo4j GDS | neo4j-graph-data-science 2.x | PageRank, Community Detection, Shortest Path |
| MCP 서버 | @modelcontextprotocol/sdk | Claude / Cursor / VS Code 모두 지원 |
| 그래프 시각화 | Cytoscape.js 3.x | 3종 레이아웃 단일 라이브러리, 번들 최적 |
| Cytoscape 레이아웃 | cytoscape-cose-bilkent (Force) + cytoscape-dagre (Node-link) + cytoscape-cola (Network) | 각 시각화 전용 플러그인 |
| LLM 연동 | Anthropic SDK (claude-sonnet-4-6) | 자연어 → Cypher 변환, 캐싱 지원 |
| 테스트 | Vitest | 빠른 단위 테스트 |

---

## 프로젝트 구조

```
D:\AI_Dev_Work\2026y\26y_04m_17d_neo4j_ontology_tools\
├── PRD/                        디자인 문서 (이 파일들)
├── src/
│   ├── app/                    Next.js 페이지 (App Router)
│   │   ├── page.tsx            메인 화면 (그래프 + 입력창)
│   │   ├── setup/page.tsx      초기 설정 마법사 (첫 접속 시 자동 리다이렉트)
│   │   ├── settings/page.tsx   Neo4j 연결 설정
│   │   └── api/                API 라우트
│   │       ├── ontology/       온톨로지 CRUD API
│   │       ├── mcp/            MCP 요청 처리
│   │       └── mcp-events/     SSE 엔드포인트 (MCP → 웹앱 실시간 뷰 이벤트)
│   ├── components/
│   │   ├── OntologyGraph/      Cytoscape.js 3종 그래프
│   │   │   ├── ForceDirectedGraph.tsx
│   │   │   ├── NodeLinkDiagram.tsx
│   │   │   ├── NetworkGraph.tsx
│   │   │   └── GraphToolbar.tsx
│   │   └── OntologyInput/      자연어 입력창 + 폴백 수동 선택 UI
│   ├── lib/
│   │   ├── neo4j/              Neo4j 연결 + CRUD (모든 Neo4j 접근은 이 모듈만 통해서)
│   │   │   ├── connection.ts   드라이버 + 세션 관리
│   │   │   ├── init.ts         앱 초기화 (Constraint + Index 생성)
│   │   │   ├── concept-repo.ts
│   │   │   ├── property-repo.ts
│   │   │   ├── instance-repo.ts
│   │   │   ├── cypher-builder.ts
│   │   │   └── gds.ts          GDS 알고리즘 (PageRank, Community, Shortest Path)
│   │   └── llm/                자연어 → Cypher 변환 + 화이트리스트 검증
│   │       └── nl-to-cypher.ts
│   └── types/                  TypeScript 타입 정의
│       └── ontology.ts
├── packages/
│   └── mcp-server/             MCP 서버 (독립 실행, 읽기 전용)
│       └── src/
│           ├── server.ts
│           ├── view-event.ts       웹앱 SSE로 ViewEvent POST (best-effort)
│           └── tools/
│               ├── query-ontology.ts   조건으로 노드/관계 조회
│               ├── search-ontology.ts  Fulltext 검색
│               └── get-context.ts      1~2홉 맥락 조회
├── .claude/
│   └── skills/
│       └── ontology/           Claude Code 스킬 (Phase 2b, 쓰기 포함)
│           ├── ontology-add.md
│           ├── ontology-search.md
│           ├── ontology-context.md
│           └── ontology-export.md
├── .env.local                  환경변수 (절대 GitHub 업로드 금지)
└── package.json
```

---

## 절대 하지 마 (DO NOT)

- [ ] **MCP view event 발송 실패 시 도구 결과 실패 처리 금지** — 웹앱이 꺼져 있어도 MCP 도구는 정상 동작해야 함 (best-effort)
- [ ] **Neo4j 연결 정보 코드에 하드코딩 금지** — .env.local 사용
- [ ] **LLM API 키 코드에 직접 작성 금지** — .env.local 사용
- [ ] **LLM_API_KEY에 NEXT_PUBLIC_ 접두사 금지** — 클라이언트 번들 노출됨
- [ ] **Cypher 쿼리 문자열 직접 조합 금지** — 파라미터 바인딩 필수 (인젝션 방지)
- [ ] **LLM 응답 raw 사용 금지** — 반드시 Zod 스키마 검증 후 사용 (05_SECURITY.md 참조)
- [ ] **D3.js, Sigma.js 추가 금지** — Cytoscape.js 단일 라이브러리로 확정
- [ ] **Neo4j Aura 클라우드 코드 추가 금지** — 로컬 전용 (Phase 3 이후 고려)
- [ ] **목업/가짜 데이터로 완성 처리 금지** — 실제 Neo4j 연결 필수
- [ ] **MCP 서버 외부 포트 바인딩 금지** — localhost만 (보안)
- [ ] **CSV 가져오기 시 입력 검증 생략 금지** — 악성 데이터 방지
- [ ] **노드 생성에 CREATE 사용 금지** — 반드시 MERGE 사용 (중복 노드 방지)
- [ ] **session.run() 직접 사용 금지 (쓰기 시)** — 반드시 session.writeTransaction() 사용
- [ ] **src/lib/neo4j/ 외부에서 Neo4j 직접 접근 금지** — 서비스 레이어를 통해서만
- [ ] **Neo4j 드라이버 다중 인스턴스 생성 금지** — 싱글톤 패턴 필수 (connection.ts에서만 생성)
- [ ] **MCP에 쓰기 도구 추가 금지** — add_concept, add_relationship은 MCP 금지, 스킬(.claude/skills/)로만
- [ ] **화이트리스트 외 관계 타입 자동 저장 금지** — IS_A/USES/PART_OF/HAS_PROPERTY/INSTANCE_OF 외 반환 시 사용자 확인 필수
- [ ] **WEB_APP_URL 코드에 하드코딩 금지** — 반드시 환경변수만 사용 (.env.local)

---

## 항상 해 (ALWAYS DO)

- [ ] 변경 전에 계획을 먼저 보여줄 것
- [ ] 모든 Neo4j 접근은 `src/lib/neo4j/` 모듈을 통해서만
- [ ] Neo4j 드라이버는 `src/lib/neo4j/connection.ts` 싱글톤 사용 (앱 전체 공유)
- [ ] 모든 Neo4j 쓰기는 `session.writeTransaction()` 사용 (트랜잭션 보장)
- [ ] 앱 초기 실행 시 `src/lib/neo4j/init.ts`로 Constraint + Index + GDS 프로젝션 자동 생성
- [ ] LLM 응답은 반드시 Zod 스키마로 검증 후 사용 (검증 실패 시 전체 거부)
- [ ] 자연어 입력 API Route에서 최대 1000자 제한 적용
- [ ] 에러 발생 시 비개발자가 이해할 수 있는 한국어 메시지
- [ ] Neo4j 연결 실패 시 설치 링크 안내 (https://neo4j.com/download/)
- [ ] LLM API 응답에 프롬프트 캐싱 적용 (Anthropic SDK)
- [ ] 새 컴포넌트마다 Vitest 테스트 추가
- [ ] GDS / APOC 미설치 감지 시 한국어 안내 메시지 + 설치 방법 표시
- [ ] LLM 반환 관계 타입은 화이트리스트 검증 후 저장
- [ ] confidence < 0.75 시 사용자 확인 팝업 표시
- [ ] 노드 생성/수정 시 updated_at 자동 갱신
- [ ] 그래프 레이아웃 선택(탭)은 localStorage에 저장해 새로고침 후에도 유지
- [ ] MCP 도구 호출 시 결과를 `view-event.ts`로 웹앱 `/api/mcp-events`에 발송 (best-effort, try/catch로 감쌀 것)
- [ ] SSE EventSource 끊김 감지 시 3초 후 자동 재연결 (브라우저 클라이언트 `useViewEvents.ts`)
- [ ] MCP 도구에서 Neo4j 연결 실패 시 한국어 오류 반환: "Neo4j 연결 실패. 웹앱 /settings에서 연결 설정을 확인하세요."

---

## MCP 서버 도구 목록 (읽기 전용 3개)

| 도구 | 설명 | 제한 | 읽기/쓰기 |
|------|------|------|---------|
| `query_ontology` | 조건으로 노드/관계 조회, depth 파라미터 지원 | depth 최대 3, 결과 최대 100개 | 읽기 |
| `search_ontology` | Fulltext 검색, category 필터 지원 | 결과 최대 50개 | 읽기 |
| `get_context` | 특정 개념의 1~2홉 맥락 조회 | **최대 50노드 + 100관계 하드캡** | 읽기 |

> **쓰기 도구 없음**: 온톨로지 추가/수정은 웹앱 UI 또는 `.claude/skills/ontology/` 스킬로만 가능.

---

## 트랜잭션 전략

```typescript
// 올바른 방법 (writeTransaction 사용)
const session = driver.session();
await session.writeTransaction(async (tx) => {
  await tx.run(
    `MERGE (c:Concept {name: $name})
     ON CREATE SET c.id = $id, c.created_at = $now, c.updated_at = $now, c.source = $source
     ON MATCH SET c.description = COALESCE($description, c.description), c.updated_at = $now`,
    { name, id, now: new Date().toISOString(), source, description }
  );
  await tx.run(
    `MATCH (a:Concept {name: $fromName})
     MATCH (b:Concept {name: $toName})
     MERGE (a)-[r:${relType}]->(b)
     ON CREATE SET r.created_at = $now, r.confidence = $confidence,
                   r.label = $label, r.weight = $confidence * 5.0`,
    { fromName, toName, now, confidence, label }
  );
});
await session.close();

// 금지된 방법
// await session.run('CREATE (c:Concept {name: $name})', { name });  ← 금지
```

---

## 환경변수 (.env.local)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NEO4J_URI | Neo4j 연결 주소 | bolt://localhost:7687 |
| NEO4J_USER | Neo4j 사용자 이름 | neo4j |
| NEO4J_PASSWORD | Neo4j 비밀번호 | (필수 입력) |
| LLM_API_KEY | Anthropic API 키 | (선택, 없으면 폴백 UI 표시) |
| LLM_MODEL | 사용할 Claude 모델 | claude-sonnet-4-6 |
| NEXT_PUBLIC_APP_PORT | 웹앱 포트 | 3000 |
| WEB_APP_URL | MCP 서버가 ViewEvent 발송할 웹앱 주소 | http://localhost:3000 |

> .env.local 파일에 저장. 절대 GitHub에 올리지 말 것. .gitignore에 포함 필수.

---

## MCP 서버 등록 (claude_desktop_config.json)

> **보안 주의**: 평문 비밀번호 금지. 시스템 환경변수에 설정 후 참조.

```json
{
  "mcpServers": {
    "neo4j-ontology": {
      "command": "node",
      "args": ["D:/AI_Dev_Work/2026y/26y_04m_17d_neo4j_ontology_tools/packages/mcp-server/dist/index.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD}"
      }
    }
  }
}
```

> Windows 환경변수 설정: 설정 → 시스템 → 고급 시스템 설정 → 환경 변수 → NEO4J_PASSWORD 추가

claude_desktop_config.json 위치:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

---

## 테스트 방법

```bash
pnpm install          # 의존성 설치
pnpm dev              # 웹앱 개발 서버 (포트 3000)
pnpm test             # 테스트 실행
pnpm typecheck        # 타입 체크
pnpm build            # 빌드 확인

cd packages/mcp-server
pnpm build && pnpm start   # MCP 서버 빌드 + 실행
```

---

## Neo4j 플러그인 설치 안내

### GDS 설치 (Phase 2a — PageRank·커뮤니티)
1. Neo4j Desktop → 프로젝트 선택 → "Plugins" 탭
2. Graph Data Science Library → "Install" → 재시작

### APOC 설치 (Phase 3 — JSON/CSV 가져오기·내보내기)
1. Neo4j Desktop → 프로젝트 선택 → "Plugins" 탭
2. APOC → "Install" → 재시작

> 미설치 상태: 해당 기능에 한국어 안내 메시지 표시, 나머지 기능 정상 동작

---

## 보안 체크리스트

- [ ] Neo4j 인증 정보는 환경변수만 (코드 X)
- [ ] MCP 서버는 localhost만 바인딩 (외부 노출 X)
- [ ] MCP 도구는 읽기 전용 3개만 (쓰기 도구 없음)
- [ ] Cypher 쿼리는 파라미터 바인딩 사용 (인젝션 방지)
- [ ] .env.local이 .gitignore에 포함됐는지 확인
- [ ] CSV 가져오기 시 파일 크기 제한 + 입력 검증
- [ ] LLM API 키는 서버 사이드에서만 사용 (클라이언트 노출 X)
- [ ] claude_desktop_config.json에 평문 비밀번호 없음

---

## [NEEDS CLARIFICATION]

- [ ] Neo4j Desktop 미설치 감지 방법 (연결 실패 시 자동 안내?)
- [ ] 논리 삭제(deleted_at) 도입 여부 — Phase 3 스냅샷과 함께 검토
