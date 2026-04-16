# Neo4j 온톨로지 도구 -- 보안 설계

> 보안은 선택 사항이 아니라 핵심 요구사항입니다.
> 이 문서는 체크리스트가 아닌 **신뢰 경계 + 위협 모델 + 방어 레이어 설계**를 다룹니다.
> AI에게 코드를 짤 때 이 문서도 반드시 함께 공유하세요.

---

## 1. 신뢰 경계 지도 (Trust Boundary Map)

```
[브라우저 / 사용자]
       ↕ HTTP localhost:3000
[Next.js API Routes] ← 유일한 서버 로직 레이어 (완전 신뢰)
       ↕ Bolt localhost:7687          ↕ HTTPS api.anthropic.com
[Neo4j Desktop]                    [Anthropic LLM API]
                                              ↑
                                   (서버 사이드 전용 접근)

[MCP 서버] ←─ stdio / localhost ─→ [Claude Code / Cursor / VS Code]
    ↕ Bolt localhost:7687
[Neo4j Desktop]
```

### 신뢰 등급

| 컴포넌트 | 신뢰 등급 | 이유 |
|--------|---------|------|
| Next.js API Routes | 완전 신뢰 | 내부 서버 로직, 검증 레이어 |
| 브라우저 입력 (자연어) | 0 신뢰 | 사용자 입력 = 항상 검증 필수 |
| LLM 응답 (Anthropic) | 부분 신뢰 | JSON 스키마 + 화이트리스트 검증 후 사용 |
| MCP 클라이언트 (Claude Code) | 제한 신뢰 | 읽기 전용만, 응답 크기 제한 |
| Neo4j Desktop | 신뢰 | 로컬 전용, Bolt 인증 필수 |

---

## 2. 위협 모델

### 2-1. 최고 위험 경로: 자연어 → LLM → Cypher (인젝션)

```
[자연어 입력] → [LLM 파싱] → [JSON 응답] → [Zod 스키마 검증] → [화이트리스트] → [파라미터 바인딩] → [Neo4j]
                                              ↑ 방어 경계
```

| 위협 | 내용 | 방어 방법 |
|------|------|---------|
| LLM 응답에 악성 Cypher 포함 | `"; DROP DATABASE"` 등 주입 시도 | 파라미터 바인딩 필수, 문자열 직접 조합 금지 |
| LLM 응답 파싱 실패 → raw 문자열 쿼리 | 파싱 오류 무시 시 오염된 데이터 저장 | Zod 검증 실패 시 전체 거부 (partial 사용 금지) |
| 긴 입력으로 LLM 토큰 낭비 | 의도적 긴 문장으로 API 비용 폭탄 | 자연어 입력 최대 1000자 제한 |

### 2-2. LLM API 키 노출

| 위협 | 내용 | 방어 방법 |
|------|------|---------|
| 클라이언트 번들에 포함 | NEXT_PUBLIC_ 사용 시 브라우저 노출 | LLM_API_KEY에 NEXT_PUBLIC_ 접두사 절대 금지 |
| .env.local GitHub 업로드 | 실수로 커밋 | .gitignore에 .env.local 포함 필수 |
| MCP config 평문 저장 | claude_desktop_config.json에 비밀번호 직접 입력 | ${NEO4J_PASSWORD} 시스템 환경변수 참조만 허용 |

### 2-3. MCP 클라이언트 남용

| 위협 | 내용 | 방어 방법 |
|------|------|---------|
| 전체 그래프 스캔 | depth 무제한 쿼리로 성능 저하 | depth 파라미터 최대 3 제한 |
| 응답 크기 폭탄 | 수천 노드 응답으로 컨텍스트 낭비 | get_context: 50노드/100관계 하드캡 |
| 쓰기 시도 | MCP에 없는 도구 요청 | 쓰기 도구 미등록으로 원천 차단 |

### 2-4. CSV/JSON 가져오기 악성 데이터 (Phase 3)

| 위협 | 내용 | 방어 방법 |
|------|------|---------|
| 악성 필드 값 | CSV에 Cypher 코드 포함 | 모든 필드 파라미터 바인딩 |
| 대용량 파일 폭탄 | 10GB 파일로 메모리 고갈 | 파일 크기 최대 10MB 제한 |
| 필드 길이 초과 | name 필드 10000자 등 | 필드별 최대 길이 검증 |

---

## 3. 방어 레이어 설계

```
[브라우저 입력]
    ↓ ① 입력 검증 (1000자 제한, 타입 확인)
[Next.js API]
    ↓ ② LLM 호출 → Zod 스키마 검증 + 화이트리스트
[검증된 구조체]
    ↓ ③ 파라미터 바인딩 Cypher (src/lib/neo4j/ 전용)
[Neo4j]
```

| 레이어 | 위치 | 방어 방법 |
|--------|------|---------|
| ① 입력 검증 | Next.js API Route | 최대 1000자, HTML 이스케이프 |
| ② LLM 응답 검증 | src/lib/llm/nl-to-cypher.ts | Zod 스키마 파싱, 실패 시 거부 |
| ③ DB 쿼리 보호 | src/lib/neo4j/ 전체 | 파라미터 바인딩, CREATE 금지 |
| ④ 비밀 관리 | 환경변수 | 서버 사이드 전용, 시스템 env |
| ⑤ MCP 제한 | packages/mcp-server/ | 읽기 전용, 응답 크기 하드캡 |
| ⑥ 파일 가져오기 보호 | src/app/api/import/ | 크기/타입/필드 검증 |

---

## 4. 비밀 관리 계층

| 비밀 | 저장 위치 | 접근 가능 레이어 | 금지 사항 |
|------|---------|--------------|---------|
| LLM_API_KEY | .env.local | Next.js 서버 사이드만 | NEXT_PUBLIC_ 접두사 절대 금지 |
| NEO4J_PASSWORD | .env.local (앱용) + 시스템 환경변수 (MCP용) | src/lib/neo4j/만 | MCP config에 평문 저장 금지 |
| NEO4J_URI | .env.local | src/lib/neo4j/만 | 코드 하드코딩 금지 |

---

## 5. MCP 최소 권한 원칙

| 원칙 | 적용 방법 |
|------|---------|
| 최소 권한 | 읽기 전용 3개 도구만 (쓰기 도구 없음) |
| 응답 크기 제한 | get_context 최대 50노드 + 100관계 |
| Depth 제한 | query_ontology depth 최대 3, get_context depth 최대 2 |
| 네트워크 격리 | localhost 바인딩 전용, 외부 포트 노출 금지 |

---

## 6. LLM 응답 검증 스키마 (Zod)

> LLM이 반환하는 JSON은 반드시 아래 스키마로 검증 후 사용.
> 검증 실패 시 전체 거부 — partial 결과 절대 사용 금지.

```typescript
// src/lib/llm/nl-to-cypher.ts 에서 사용
import { z } from 'zod';

const RelationTypeSchema = z.enum([
  'IS_A', 'USES', 'PART_OF', 'HAS_PROPERTY', 'INSTANCE_OF'
]);

const NodeTypeSchema = z.enum(['Concept', 'Property', 'Instance']);

const LLMOntologyResponseSchema = z.object({
  nodes: z.array(z.object({
    name: z.string().max(200),
    type: NodeTypeSchema,
    description: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
  })).max(10),  // 한 번에 최대 10개 노드
  relations: z.array(z.object({
    from: z.string().max(200),
    to: z.string().max(200),
    type: RelationTypeSchema,
    label: z.string().max(100),
    confidence: z.number().min(0).max(1),
  })).max(20),  // 한 번에 최대 20개 관계
});

export type LLMOntologyResponse = z.infer<typeof LLMOntologyResponseSchema>;
```

> **화이트리스트 외 관계 타입**: Zod 파싱 단계에서 자동 거부됨.
> 단, LLM이 화이트리스트 타입으로 파싱은 됐으나 confidence < 0.75인 경우 → 사용자 확인 팝업.

---

## 7. 순환 참조 방지 (Circular Reference Prevention)

> Node-link Diagram (dagre 레이아웃)은 순환 참조가 있으면 무한 루프에 빠집니다.

**발생 시나리오**: `A --IS_A--> B` 저장 후, `B --IS_A--> A` 입력 시

```typescript
// src/lib/neo4j/concept-repo.ts — 관계 저장 전 순환 확인
async function checkCircularReference(
  fromName: string,
  toName: string,
  relType: string
): Promise<boolean> {
  // toName에서 fromName으로 도달 가능한지 역방향 탐색
  const result = await session.run(
    `MATCH p = (to {name: $toName})-[*1..5]->(from {name: $fromName})
     RETURN count(p) > 0 AS hasCycle`,
    { fromName, toName }
  );
  return result.records[0]?.get('hasCycle') ?? false;
}
```

규칙:
- 순환 참조 감지 시 저장 거부 + 한국어 경고 메시지 표시
- IS_A 관계에서 특히 중요 (계층 구조 보호)
- 깊이 제한: 최대 5홉까지만 탐색 (성능 보호)

---

## 8. 보안 요구사항 구현 체크리스트

### Phase 1에서 반드시 구현

- [ ] Zod 스키마로 LLM 응답 검증 (`zod` 패키지 추가 필수)
- [ ] 자연어 입력 최대 1000자 제한 (API Route + UI 모두)
- [ ] LLM_API_KEY에 NEXT_PUBLIC_ 접두사 없음 확인
- [ ] .env.local이 .gitignore에 포함됐는지 앱 시작 시 경고
- [ ] MCP get_context 응답 50노드/100관계 하드캡
- [ ] Neo4j 인증 실패 시 설치 링크 안내 (비밀번호 없는 연결 거부)
- [ ] 모든 Cypher 쿼리 파라미터 바인딩 검토
- [ ] LLM 첫 사용 시 1회 PII 고지 팝업: "입력한 내용이 Anthropic API로 전송됩니다" (localStorage로 표시 여부 저장)

### Phase 2b에서 구현

- [ ] IS_A 관계 저장 전 순환 참조 탐지 (최대 5홉)

### Phase 3에서 구현

- [ ] CSV/JSON 가져오기: 파일 크기 10MB 제한
- [ ] CSV 필드 길이 검증 (name ≤ 200자, description ≤ 500자)
- [ ] 가져오기 전 사용자 확인 프롬프트 (기존 데이터 덮어쓰기 경고)

---

## [NEEDS CLARIFICATION]

- [ ] Neo4j Desktop이 인증 없이 실행 중일 때: 경고만? 아니면 저장 차단?
- [ ] 자연어 입력에 개인정보(이름, 주소 등) 포함 시 처리 방법 (LLM으로 전송됨)
- [x] MCP 쿼리 rate limiting 도입 여부 → **미적용 확정**: 로컬 전용 앱 (외부 노출 없음), 사용 편의성 우선
