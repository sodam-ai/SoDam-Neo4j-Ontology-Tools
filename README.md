> **🇺🇸 [English](./README_EN.md)**

# Neo4j 온톨로지 도구

> 자연어만 입력하면 Neo4j 지식그래프가 자동으로 만들어지고,
> Claude Code 같은 AI가 MCP를 통해 그 그래프를 참조해 더 정확하게 도와주는 로컬 웹 도구

## 이 프로그램이 하는 일

1. **자연어로 지식 입력**: "React는 JavaScript를 사용한다"를 입력하면
2. **자동으로 관계 생성**: AI가 분석해서 노드와 관계를 자동으로 만들고
3. **그래프로 시각화**: Force-directed 그래프로 한눈에 보여주며
4. **AI가 참조**: Claude Code가 MCP를 통해 이 지식을 자동으로 참조

코딩 지식이 없어도 사용할 수 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 자연어 입력 | 일상 문장으로 개념과 관계를 입력 |
| AI 자동 변환 | 입력한 문장을 자동으로 노드+관계로 변환 |
| Force-directed 그래프 | 물리 시뮬레이션 기반 시각화 |
| MCP 서버 | Claude Code/Cursor에서 온톨로지 조회 (읽기 전용) |
| 실시간 반응 | MCP 도구 호출 시 웹앱 그래프가 자동으로 반응 |
| 설정 마법사 | 첫 사용 시 단계별 안내 |
| 폴백 모드 | AI 키 없어도 수동 드롭다운으로 사용 가능 |

---

## 설치 방법 (처음 사용하는 분)

### 1단계: 필요한 프로그램 설치

1. **Node.js 20 이상** 설치: https://nodejs.org/
2. **pnpm** 설치: 터미널에서 `npm install -g pnpm`
3. **Neo4j Desktop** 설치: https://neo4j.com/download/
   - 설치 후 새 프로젝트 만들기 → 데이터베이스 시작

### 2단계: 프로젝트 설정

```bash
# 프로젝트 폴더로 이동
cd D:\AI_Dev_Work\2026y\26y_04m_17d_neo4j_ontology_tools

# 의존성 설치
pnpm install

# 환경변수 파일 만들기
# .env.local.example 파일을 복사해서 .env.local 으로 이름 변경
# 그 안에 Neo4j 비밀번호를 입력
```

### 3단계: .env.local 설정

`.env.local.example`을 `.env.local`로 복사하고 값을 채웁니다:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=여기에_Neo4j_비밀번호_입력

# 선택사항 (없으면 수동 입력 모드로 동작)
LLM_API_KEY=sk-ant-api03-여기에_Anthropic_키_입력
LLM_MODEL=claude-sonnet-4-6

NEXT_PUBLIC_APP_PORT=3000
WEB_APP_URL=http://localhost:3000
```

### 4단계: 실행

```bash
# 웹앱 시작 (포트 3000)
pnpm dev

# 브라우저에서 열기
# http://localhost:3000
```

처음 접속하면 자동으로 설정 마법사 페이지로 이동합니다.

---

## MCP 서버 설정 (Claude Code에서 사용)

### 빌드

```bash
cd packages/mcp-server
pnpm build
```

### claude_desktop_config.json에 추가

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "neo4j-ontology": {
      "command": "node",
      "args": ["D:/AI_Dev_Work/2026y/26y_04m_17d_neo4j_ontology_tools/packages/mcp-server/dist/server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD}",
        "WEB_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

> NEO4J_PASSWORD는 시스템 환경변수로 설정하세요. 직접 입력은 보안 위험!

### MCP 도구 (읽기 전용 3개)

| 도구 | 설명 |
|------|------|
| `query_ontology` | 조건으로 노드/관계 조회 (depth 최대 3) |
| `search_ontology` | 키워드 검색 (최대 50개 결과) |
| `get_context` | 특정 노드의 주변 맥락 조회 (1~2홉, 50노드/100관계 제한) |

---

## 환경변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEO4J_URI` | O | Neo4j 연결 주소 (기본: bolt://localhost:7687) |
| `NEO4J_USER` | O | Neo4j 사용자 이름 (기본: neo4j) |
| `NEO4J_PASSWORD` | O | Neo4j 비밀번호 |
| `LLM_API_KEY` | X | Anthropic API 키 (없으면 수동 모드) |
| `LLM_MODEL` | X | Claude 모델 (기본: claude-sonnet-4-6) |
| `WEB_APP_URL` | X | MCP 서버용 웹앱 주소 (기본: http://localhost:3000) |

---

## 폴더 구조

```
neo4j_ontology_tools/
├── .PRD/                    설계 문서 (PRD, 데이터 모델, 보안)
├── src/
│   ├── app/                 Next.js 페이지
│   │   ├── page.tsx         메인 화면 (그래프 + 입력)
│   │   ├── setup/           설정 마법사
│   │   ├── settings/        설정 페이지
│   │   └── api/             API 라우트
│   │       ├── health/      Neo4j 연결 확인
│   │       ├── ontology/    그래프 CRUD
│   │       ├── llm/parse/   자연어 → 온톨로지 변환
│   │       └── mcp-events/  실시간 SSE 스트림
│   ├── components/
│   │   ├── OntologyGraph/   Cytoscape.js 그래프
│   │   └── OntologyInput/   입력창 (자연어 + 수동)
│   ├── hooks/               SSE 클라이언트 훅
│   ├── lib/
│   │   ├── neo4j/           Neo4j 연결 + CRUD (싱글톤)
│   │   └── llm/             LLM 변환 + Zod 검증
│   └── types/               TypeScript 타입
├── packages/
│   └── mcp-server/          MCP 서버 (읽기 전용 3도구)
├── .env.local.example       환경변수 템플릿
└── package.json
```

---

## 테스트

```bash
pnpm test           # 전체 테스트 (19개)
pnpm typecheck      # 타입 체크
```

---

## 기술 스택

- **Next.js 15** (App Router) + **TypeScript 5.x**
- **Tailwind CSS 4** (스타일링)
- **Neo4j Desktop 5.x** + **neo4j-driver 5.x**
- **Cytoscape.js 3.x** + cose-bilkent (그래프 시각화)
- **Anthropic SDK** (Claude, 프롬프트 캐싱)
- **@modelcontextprotocol/sdk** (MCP 서버)
- **Zod** (LLM 응답 검증)
- **Vitest** (테스트)

---

## 보안 주의사항

- `.env.local`은 **절대 GitHub에 올리지 마세요** (.gitignore에 포함됨)
- `LLM_API_KEY`에 `NEXT_PUBLIC_` 접두사를 **사용하지 마세요** (브라우저 노출 위험)
- MCP config에 비밀번호를 직접 입력하지 말고 **시스템 환경변수**를 사용하세요
- MCP 서버는 **읽기 전용**으로만 동작합니다 (쓰기 도구 없음)

---

## 라이선스

MIT License - Copyright (c) 2026 SoDam AI Studio

[🇺🇸 English README](./README_EN.md)
