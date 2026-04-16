# Neo4j 온톨로지 도구

> **[English version → README_EN.md](./README_EN.md)**

"내가 알고 있는 지식들 사이의 관계를 그림으로 그려보고 싶다" — 이 앱이 그 일을 해줍니다.  
코딩을 몰라도, 자연어(우리말)로 입력하면 AI가 지식 그래프를 자동으로 만들어 줍니다.  
Neo4j 데이터베이스에 저장되며, 3가지 방식의 시각화 그래프로 탐색할 수 있습니다.

---

## 목차

1. [이 앱으로 무엇을 할 수 있나요?](#이-앱으로-무엇을-할-수-있나요)
2. [처음 사용하는 분을 위한 안내 (코딩 경험 불필요)](#처음-사용하는-분을-위한-안내)
3. [개발자 설치 가이드](#개발자-설치-가이드)
4. [환경 변수 설정](#환경-변수-설정)
5. [배포 방법](#배포-방법)
6. [GDS 선택 설치](#gds-graph-data-science-선택-설치)
7. [폴더 구조](#폴더-구조)
8. [운영 시 주의사항](#운영-시-주의사항)
9. [테스트](#테스트)
10. [로드맵](#로드맵)
11. [라이선스](#라이선스)

---

## 이 앱으로 무엇을 할 수 있나요?

| 기능 | 설명 |
|------|------|
| 자연어 입력 | "React는 JavaScript 프레임워크이다" 처럼 문장으로 입력하면 AI가 자동으로 관계를 추출합니다 |
| 3종 그래프 시각화 | Force-directed(물리), Node-link(계층), Network(커뮤니티) 세 가지 방식으로 그래프를 탐색합니다 |
| 노드 상세 보기 | 그래프의 항목을 클릭하면 상세 정보(중요도, 그룹 등)를 확인할 수 있습니다 |
| 관계 필터 | 원하는 종류의 관계만 표시하거나 숨길 수 있습니다 |
| AI 클라이언트 연동 | Claude Code 등 AI 도구에서 직접 이 그래프를 조회·조작할 수 있습니다 (MCP) |
| 중요도 자동 계산 | Neo4j GDS가 설치된 경우, PageRank(중요도)와 커뮤니티(그룹) 자동 분석 |

---

## 처음 사용하는 분을 위한 안내

> 코딩을 한 번도 해본 적 없어도 괜찮습니다. 아래 순서대로 따라하면 됩니다.

### 1단계 — 필요한 프로그램 내려받기

아래 세 가지 프로그램을 설치합니다. 모두 무료입니다.

**① Node.js** (앱을 실행하는 기반 프로그램)
- 구글에서 "Node.js 다운로드" 검색 → 공식 사이트에서 **LTS 버전** 내려받아 설치

**② pnpm** (라이브러리 관리 도구 — 설치 후 터미널에서 실행)
- Node.js 설치 후 Windows 검색에서 **PowerShell** 또는 **명령 프롬프트**를 열고 아래 명령어 입력:
```
npm install -g pnpm
```

**③ Neo4j Desktop** (데이터베이스 프로그램 — 선택 사항)
- 구글에서 "Neo4j Desktop 다운로드" 검색 → 공식 사이트에서 무료 설치
- 설치 후 새 프로젝트 → 새 데이터베이스 생성 → 비밀번호 기억해두기

---

### 2단계 — 앱 내려받기

1. 이 페이지 상단의 초록색 **Code** 버튼 클릭 → **Download ZIP** 선택
2. 내려받은 ZIP 파일 압축 해제 (원하는 폴더에)
3. 폴더 안에서 주소 표시줄을 클릭 → `cmd` 입력 후 Enter (명령 프롬프트 열기)

---

### 3단계 — 라이브러리 설치

명령 프롬프트에서 아래 명령어 입력 후 Enter:
```
pnpm install
```
(인터넷이 연결된 상태에서 잠시 기다리면 자동으로 완료됩니다)

---

### 4단계 — 설정 파일 만들기

1. 앱 폴더 안에 `.env.local.example` 파일이 있습니다
2. 이 파일을 복사해서 이름을 `.env.local`로 변경합니다
3. 메모장으로 `.env.local` 파일을 열고 아래 항목을 채웁니다:

```
NEO4J_URI=bolt://localhost:7687        ← Neo4j Desktop 기본값 (그대로 두세요)
NEO4J_USER=neo4j                       ← Neo4j 기본 사용자명 (그대로 두세요)
NEO4J_PASSWORD=여기에_비밀번호_입력    ← Neo4j Desktop에서 설정한 비밀번호
ANTHROPIC_API_KEY=sk-ant-...           ← (선택) Anthropic 홈페이지에서 발급
```

> Neo4j 없이도 사용 가능합니다. Neo4j 없이 쓰면 데이터가 저장되지 않지만 화면은 열립니다.

---

### 5단계 — 앱 실행

명령 프롬프트에서:
```
pnpm dev
```
실행 후 인터넷 브라우저(크롬, 엣지 등)를 열고 주소창에 입력:
```
http://localhost:3000
```

이제 앱이 열립니다! 상단 입력창에 "A는 B이다" 형태로 문장을 입력해보세요.

---

### 자주 묻는 질문

**Q. Neo4j Desktop을 꼭 설치해야 하나요?**  
아니요. 설치하지 않아도 앱은 실행됩니다. 다만 입력한 데이터가 저장되지 않습니다.

**Q. Anthropic API 키가 없으면 어떻게 되나요?**  
자연어 입력 기능이 비활성화됩니다. 대신 직접 노드·관계를 입력하는 수동 모드로 사용할 수 있습니다.

**Q. 앱을 끄면 데이터가 사라지나요?**  
Neo4j Desktop이 연결되어 있으면 데이터가 유지됩니다. Neo4j 없이 사용하면 앱을 끄면 사라집니다.

---

## 개발자 설치 가이드

### 사전 요구 사항

- Node.js 20+
- pnpm 9+
- Neo4j 5.x (선택 사항)

### 설치

```bash
git clone https://github.com/sodam-ai/neo4j_ontology_tools.git
cd neo4j_ontology_tools
pnpm install
cp .env.local.example .env.local
# .env.local 편집 후
pnpm dev
```

### (선택) MCP 서버 빌드

```bash
pnpm --filter mcp-server build
```

Claude Code `settings.json` 등록:

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

## 환경 변수 설정

`.env.local` 파일에 아래 항목을 설정합니다. 이 파일은 절대 GitHub에 올리면 안 됩니다.

| 항목 | 필수 여부 | 설명 |
|------|----------|------|
| `NEO4J_URI` | Neo4j 사용 시 필수 | Neo4j 접속 주소. 로컬이면 `bolt://localhost:7687` |
| `NEO4J_USER` | Neo4j 사용 시 필수 | Neo4j 사용자명. 기본값 `neo4j` |
| `NEO4J_PASSWORD` | Neo4j 사용 시 필수 | Neo4j 비밀번호 |
| `ANTHROPIC_API_KEY` | 자연어 입력 사용 시 | Anthropic 콘솔에서 발급. `sk-ant-`로 시작 |
| `MCP_SERVER_PORT` | 선택 | MCP 서버 포트. 기본값 `3100` |

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

ANTHROPIC_API_KEY=sk-ant-...

MCP_SERVER_PORT=3100
```

> **주의:** `.env.local`은 `.gitignore`에 포함되어 있어 자동으로 GitHub 업로드가 차단됩니다.

---

## 배포 방법

### Vercel (가장 간단한 방법)

1. [vercel.com](https://vercel.com) 가입 후 GitHub 저장소 연결
2. Vercel 대시보드 → 프로젝트 설정 → **Environment Variables**에 `.env.local` 항목 입력
3. 배포 버튼 클릭 → 자동 빌드·배포

> **주의:** Vercel 배포 시 Neo4j는 외부에서 접근 가능한 주소(Neo4j Aura 등)를 사용해야 합니다. `localhost`는 작동하지 않습니다.

### 직접 서버 (Node.js 서버)

```bash
pnpm build          # 프로덕션 빌드
pnpm start          # 서버 실행 (기본 포트 3000)
```

서버에서 실행 시 환경 변수는 `.env.local` 또는 서버 환경 변수로 주입합니다.

### Neo4j Aura (클라우드 DB)

로컬 Neo4j Desktop 대신 클라우드 DB를 사용하려면:
1. [neo4j.com/aura](https://neo4j.com/aura) 무료 인스턴스 생성
2. 연결 정보를 `.env.local`의 `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`에 입력

---

## GDS (Graph Data Science) 선택 설치

PageRank(중요도)와 커뮤니티(그룹) 기능을 사용하려면 Neo4j Desktop에 GDS 플러그인을 추가합니다.

**설치 방법:**
Neo4j Desktop → 해당 DB 선택 → 오른쪽 **Plugins** 탭 → **Graph Data Science Library** → **Install**

- 설치 후 앱 재시작 시 PageRank + 커뮤니티 감지 자동 활성화
- **미설치 시:** 기능이 비활성화될 뿐, 앱은 정상 작동합니다 (상단에 안내 배너 표시)

---

## 폴더 구조

```
neo4j_ontology_tools/
├── .env.local.example        ← 환경 변수 템플릿 (이걸 복사해서 .env.local 만들기)
├── .env.local                ← 실제 환경 변수 (GitHub에 올리면 안 됨!)
├── README.md                 ← 이 문서 (한국어)
├── README_EN.md              ← 영문 문서
├── LICENSE                   ← 라이선스
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 화면
│   │   ├── setup/                # 초기 설정 마법사
│   │   ├── settings/             # 설정 페이지
│   │   └── api/                  # 서버 API
│   ├── components/
│   │   ├── OntologyGraph/        # 그래프 시각화 컴포넌트
│   │   └── OntologyInput/        # 자연어 입력 컴포넌트
│   ├── lib/
│   │   ├── neo4j/                # Neo4j 연결·조회·GDS
│   │   └── llm/                  # AI 자연어 처리
│   └── types/                    # 타입 정의
└── packages/
    └── mcp-server/               # AI 클라이언트 연동 서버
```

---

## 운영 시 주의사항

### 보안
- `.env.local` 파일은 절대 GitHub, 카카오톡, 이메일 등 외부로 공유하지 마세요. API 키와 DB 비밀번호가 담겨 있습니다.
- Neo4j 비밀번호는 추측하기 어려운 복잡한 값으로 설정하세요.
- 서버 공개 배포 시 Neo4j URI를 외부에 노출하지 마세요.

### 데이터
- Neo4j Desktop 사용 중 DB를 삭제하면 모든 그래프 데이터가 사라집니다. 중요한 데이터는 사전에 내보내기(Export) 하세요.
- 앱은 Neo4j 연결 없이도 실행되지만, 이 경우 입력한 데이터가 저장되지 않습니다.

### 성능
- 그래프 노드 수가 200개를 초과하면 레이아웃이 자동으로 grid(격자) 방식으로 전환됩니다.
- 노드 수가 1,000개를 초과하면 성능 경고 배너가 표시됩니다.
- PageRank는 30초마다 자동 갱신됩니다. 갱신 중에는 잠시 응답이 느릴 수 있습니다.

### API 비용
- Anthropic API 키를 설정한 경우, 자연어 입력마다 API 비용이 발생합니다.
- 비용 관리를 위해 Anthropic 콘솔에서 사용량 한도를 설정하는 것을 권장합니다.

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

## 테스트

```bash
pnpm test          # 전체 테스트 실행
pnpm typecheck     # TypeScript 타입 검사
pnpm build         # 프로덕션 빌드 테스트
```

현재 테스트: **28개** 전체 통과

---

## 로드맵

| Phase | 상태 | 내용 |
|-------|------|------|
| Phase 1 | ✅ 완료 | Force-directed 그래프, MCP 읽기 전용, 자연어 입력 |
| Phase 2a | ✅ 완료 | Node-link / Network 그래프, GDS PageRank+커뮤니티 |
| Phase 2b | 대기 | 최단 경로 탐색, 자연어 검색, IS_A 순환 참조 방지 |
| Phase 3 | 대기 | JSON/CSV 가져오기·내보내기 (APOC) |

---

## 라이선스

MIT License — 자세한 내용은 [LICENSE](./LICENSE) 파일 참고

Copyright © 2026 SoDam AI Studio
