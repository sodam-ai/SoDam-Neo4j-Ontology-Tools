# Neo4j 온톨로지 도구 -- 데이터 모델

> 이 문서는 Neo4j 그래프 DB에 저장되는 온톨로지 구조를 정의합니다.
> 개발자가 아니어도 이해할 수 있는 "개념적 관계 지도"입니다.

---

## 전체 구조

```
[Concept] --IS_A-------> [Concept]       "React는 Framework이다"
[Concept] --USES-------> [Concept]       "React는 JavaScript를 사용한다"
[Concept] --PART_OF----> [Concept]       "React는 Frontend에 포함된다"
[Concept] --HAS_PROPERTY-> [Property]   "React는 버전 속성이 있다"
[Instance] --INSTANCE_OF-> [Concept]    "GPT-4o는 LLM의 예시이다"
```

---

## 노드 상세

### :Concept (핵심 개념)
"내가 알고 싶거나 정의하고 싶은 개념 — React, Python, 프론트엔드, Claude Code 등"

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 (자동 생성) | concept-abc123 | O |
| name | 개념 이름 **(고유값, 중복 불가)** | React | O |
| description | 한 줄 설명 | UI를 만드는 JS 라이브러리 | X |
| category | 분류 태그 | framework, language, tool, concept | X |
| created_at | 생성 날짜 (자동) | 2026-04-16 | O |
| updated_at | 마지막 수정 날짜 (자동) | 2026-04-16 | O |
| source | 생성 출처 | natural_language, manual, import | O |

### :Property (속성)
"개념의 특징 — 버전, 라이선스, 제작사, 출시연도 등"

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | prop-xyz789 | O |
| name | 속성 이름 **(고유값, 중복 불가)** | 버전 | O |
| value | 속성 값 | 19.0.0 | X |
| value_type | 값의 타입 | string, number, boolean | O |
| created_at | 생성 날짜 (자동) | 2026-04-16 | O |
| updated_at | 마지막 수정 날짜 (자동) | 2026-04-16 | O |

### :Instance (실제 사례)
"개념의 구체적 예시 — 내 프로젝트-A, GPT-4o, 특정 라이브러리 버전 등"

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | inst-qrs456 | O |
| name | 인스턴스 이름 **(고유값, 중복 불가)** | 내 쇼핑몰 프로젝트 | O |
| description | 간단한 설명 | 2026년 운영 중인 Next.js 쇼핑몰 | X |
| created_at | 생성 날짜 (자동) | 2026-04-16 | O |
| updated_at | 마지막 수정 날짜 (자동) | 2026-04-16 | O |

---

## 관계(Edge) 상세

| 관계 | 의미 | 자연어 입력 예시 | 생성 Cypher |
|------|------|----------------|------------|
| IS_A | 상위 분류 | "React는 프레임워크이다" | (React)-[:IS_A]->(Framework) |
| USES | 사용/의존 | "React는 JavaScript를 사용한다" | (React)-[:USES]->(JavaScript) |
| PART_OF | 포함 관계 | "React는 프론트엔드에 포함된다" | (React)-[:PART_OF]->(Frontend) |
| HAS_PROPERTY | 속성 보유 | "React는 버전 속성이 있다" | (React)-[:HAS_PROPERTY]->(버전) |
| INSTANCE_OF | 인스턴스 | "GPT-4o는 LLM의 예시이다" | (GPT-4o)-[:INSTANCE_OF]->(LLM) |

### 모든 관계 공통 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| created_at | 관계 생성 날짜 | 2026-04-16 |
| source | 생성 출처 | natural_language / manual / import |
| confidence | LLM 변환 신뢰도 (0.0~1.0) | 0.92 |
| label | 관계를 한국어로 표현한 문구 | "~이다", "~를 사용한다", "~에 포함된다" |
| weight | 관계 강도 (confidence × 5.0으로 자동 계산) | 1.0 ~ 5.0 |

---

## LLM 응답 JSON 스키마

> LLM은 자연어를 파싱한 결과를 아래 구조의 JSON으로 반환해야 합니다.
> 앱은 Zod로 이 스키마를 검증하고, 실패 시 전체 거부합니다.

```json
{
  "nodes": [
    {
      "name": "React",
      "type": "Concept",
      "description": "UI를 만드는 JS 라이브러리",
      "category": "framework"
    }
  ],
  "relations": [
    {
      "from": "React",
      "to": "JavaScript",
      "type": "USES",
      "label": "~를 사용한다",
      "confidence": 0.95
    }
  ]
}
```

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| nodes[].name | string | 최대 200자 | 노드 이름 |
| nodes[].type | enum | Concept / Property / Instance | 노드 타입 |
| nodes[].description | string | 최대 500자, optional | 한 줄 설명 |
| nodes[].category | string | 최대 100자, optional | 분류 태그 |
| relations[].type | enum | 화이트리스트 5개 | 아래 참조 |
| relations[].confidence | number | 0.0 ~ 1.0 | LLM 신뢰도 |
| nodes | array | 최대 10개/요청 | 한 번에 최대 10노드 |
| relations | array | 최대 20개/요청 | 한 번에 최대 20관계 |

---

## LLM 관계 타입 화이트리스트

> **규칙**: LLM이 자연어를 변환할 때 반환할 수 있는 관계 타입은 아래 5가지로 제한합니다.
> 이 목록 외의 타입(예: DEPENDS_ON, RELATED_TO, IS_USED_BY 등)이 반환되면
> 자동 저장하지 않고 사용자에게 확인 팝업을 표시합니다.

**허용 관계 타입**: `IS_A` | `USES` | `PART_OF` | `HAS_PROPERTY` | `INSTANCE_OF`

```
LLM 반환값이 위 5개 중 하나 → 자동 저장
LLM 반환값이 위 5개 외       → "어떤 관계인지 선택해 주세요" 팝업 표시
```

---

## confidence 임계값 기준

> **결정**: confidence 0.75를 기준으로 자동 저장 여부를 결정합니다.

| confidence 값 | 처리 방식 |
|-------------|---------|
| 0.75 이상 | 자동 저장 (사용자 확인 불필요) |
| 0.75 미만 | "이 관계가 맞나요?" 확인 팝업 표시 후 사용자 승인 시 저장 |

---

## weight 자동 계산 공식

> **결정**: LLM이 계산한 confidence를 weight 초기값으로 재활용합니다.
> 별도 계산 없이 이미 있는 값을 활용합니다.

```
weight = confidence × 5.0

예시:
  confidence 0.92 → weight 4.6 (굵은 엣지)
  confidence 0.75 → weight 3.75 (보통 엣지)
  confidence 0.50 → weight 2.5 (얇은 엣지)
```

weight는 초기값이며, 사용자가 직접 수정 가능합니다 (1.0 ~ 5.0 범위).

---

## Neo4j 제약 조건 (Unique Constraints)

> **중요**: 앱 초기 실행 시 아래 제약 조건을 반드시 생성해야 합니다.

```cypher
CREATE CONSTRAINT concept_name IF NOT EXISTS
  FOR (c:Concept) REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT concept_id IF NOT EXISTS
  FOR (c:Concept) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT property_name IF NOT EXISTS
  FOR (p:Property) REQUIRE p.name IS UNIQUE;

CREATE CONSTRAINT instance_name IF NOT EXISTS
  FOR (i:Instance) REQUIRE i.name IS UNIQUE;
```

---

## MERGE 전략 (중복 방지 필수 규칙)

### 노드 생성 MERGE 패턴

```cypher
MERGE (c:Concept {name: $name})
ON CREATE SET
  c.id = $id,
  c.description = $description,
  c.category = $category,
  c.created_at = $created_at,
  c.updated_at = $created_at,
  c.source = $source
ON MATCH SET
  c.description = COALESCE($description, c.description),
  c.category = COALESCE($category, c.category),
  c.updated_at = $now
RETURN c;
```

### 관계 생성 MERGE 패턴

```cypher
MATCH (a {name: $fromName})
MATCH (b {name: $toName})
MERGE (a)-[r:IS_A]->(b)
ON CREATE SET
  r.created_at = $created_at,
  r.source = $source,
  r.confidence = $confidence,
  r.label = $label,
  r.weight = $confidence * 5.0
RETURN r;
```

---

## Fulltext 검색 인덱스

```cypher
CREATE FULLTEXT INDEX concept_search IF NOT EXISTS
  FOR (n:Concept|Property|Instance)
  ON EACH [n.name, n.description];
```

### 전문 검색 쿼리 예시

```cypher
CALL db.index.fulltext.queryNodes("concept_search", "React")
YIELD node, score
RETURN node.name, node.description, score
ORDER BY score DESC
LIMIT 20;
```

---

## 자연어 → 온톨로지 변환 예시

| 자연어 입력 | 추출 노드 | 추출 관계 | label 예시 |
|-----------|----------|----------|-----------|
| "Claude Code는 AI 에이전트이다" | Claude Code, AI 에이전트 | IS_A | "~이다" |
| "Next.js는 React를 사용한다" | Next.js, React | USES | "~를 사용한다" |
| "TypeScript는 JavaScript에 포함된다" | TypeScript, JavaScript | PART_OF | "~에 포함된다" |
| "GPT-4o는 버전 속성이 있다" | GPT-4o, 버전 | HAS_PROPERTY | "~속성이 있다" |
| "Claude Sonnet은 LLM의 예시이다" | Claude Sonnet, LLM | INSTANCE_OF | "~의 예시이다" |

---

## 왜 이 구조인가

- **확장성**: IS_A/USES/PART_OF 3가지 기본 관계로 대부분의 지식 표현 가능
- **단순성**: Concept/Property/Instance 3종 노드만으로 비개발자도 직관적으로 이해
- **MCP 최적화**: get_context 도구가 특정 개념과 연결된 모든 노드를 1~2홉으로 빠르게 조회
- **시각화 친화**: Cytoscape.js의 3종 레이아웃 모두 이 구조와 자연스럽게 호환
- **중복 안전**: Unique Constraint + MERGE 전략으로 중복 노드 원천 차단
- **검색 최적화**: Fulltext 인덱스로 자연어 검색 O(log n) 속도 보장
- **이력 추적**: updated_at으로 언제 수정됐는지 항상 파악 가능

---

## 순환 참조 방지 규칙

> Node-link Diagram (dagre 레이아웃)은 IS_A 관계에 순환이 있으면 렌더링이 무한 루프에 빠집니다.

**금지 패턴 예시**:
```
A --IS_A--> B  (저장됨)
B --IS_A--> A  ← 이 관계 저장 시 순환 감지 → 거부
```

**규칙**:
- IS_A 관계 저장 전 역방향 경로 탐색 (최대 5홉)
- 순환 감지 시 저장 거부 + 한국어 오류 메시지
- 다른 관계 타입(USES, PART_OF 등)은 순환 허용 (Network Graph에서는 문제없음)

---

## [NEEDS CLARIFICATION]

- [ ] 논리 삭제(deleted_at) 도입 여부 — Phase 3 스냅샷과 함께 검토
