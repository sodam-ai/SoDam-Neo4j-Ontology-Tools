// Cypher 쿼리 파라미터 바인딩 헬퍼
// 문자열 직접 조합 금지 — SQL 인젝션과 동일한 Cypher 인젝션 방지

import { RelationType } from '@/types/ontology'

// 허용된 관계 타입 검증 (런타임 이중 방어)
const ALLOWED_REL_TYPES: RelationType[] = [
  'IS_A', 'USES', 'PART_OF', 'HAS_PROPERTY', 'INSTANCE_OF',
]

export function validateRelationType(type: string): RelationType {
  if (!ALLOWED_REL_TYPES.includes(type as RelationType)) {
    throw new Error(
      `허용되지 않은 관계 타입입니다: "${type}"\n` +
      `허용 목록: ${ALLOWED_REL_TYPES.join(', ')}`
    )
  }
  return type as RelationType
}

// 노드 MERGE 쿼리 (Concept)
export function buildConceptMerge(params: {
  name: string
  id: string
  description?: string
  category?: string
  source: string
}) {
  const query = `
    MERGE (c:Concept {name: $name})
    ON CREATE SET
      c.id = $id,
      c.description = $description,
      c.category = $category,
      c.created_at = $now,
      c.updated_at = $now,
      c.source = $source
    ON MATCH SET
      c.description = COALESCE($description, c.description),
      c.category = COALESCE($category, c.category),
      c.updated_at = $now
    RETURN c
  `
  return { query, params: { ...params, now: new Date().toISOString() } }
}

// 노드 MERGE 쿼리 (Property)
export function buildPropertyMerge(params: {
  name: string
  id: string
  value?: string
  value_type: string
  source: string
}) {
  const query = `
    MERGE (p:Property {name: $name})
    ON CREATE SET
      p.id = $id,
      p.value = $value,
      p.value_type = $value_type,
      p.created_at = $now,
      p.updated_at = $now,
      p.source = $source
    ON MATCH SET
      p.value = COALESCE($value, p.value),
      p.updated_at = $now
    RETURN p
  `
  return { query, params: { ...params, now: new Date().toISOString() } }
}

// 노드 MERGE 쿼리 (Instance)
export function buildInstanceMerge(params: {
  name: string
  id: string
  description?: string
  source: string
}) {
  const query = `
    MERGE (i:Instance {name: $name})
    ON CREATE SET
      i.id = $id,
      i.description = $description,
      i.created_at = $now,
      i.updated_at = $now,
      i.source = $source
    ON MATCH SET
      i.description = COALESCE($description, i.description),
      i.updated_at = $now
    RETURN i
  `
  return { query, params: { ...params, now: new Date().toISOString() } }
}

// 관계 MERGE 쿼리 — 관계 타입을 Cypher 식별자로 사용
// 주의: 관계 타입은 파라미터로 바인딩 불가(Neo4j 제약) → validateRelationType으로 화이트리스트 검증 후 사용
export function buildRelationMerge(params: {
  fromName: string
  toName: string
  relType: RelationType
  label: string
  confidence: number
  source: string
}) {
  const { relType, ...rest } = params
  // 화이트리스트 재검증 (이중 방어)
  const safeType = validateRelationType(relType)

  // 관계 타입은 식별자로 직접 삽입 (화이트리스트 검증 완료)
  const query = `
    MATCH (a {name: $fromName})
    MATCH (b {name: $toName})
    MERGE (a)-[r:${safeType}]->(b)
    ON CREATE SET
      r.created_at = $now,
      r.source = $source,
      r.confidence = $confidence,
      r.label = $label,
      r.weight = $confidence * 5.0
    ON MATCH SET
      r.confidence = $confidence,
      r.label = $label,
      r.weight = $confidence * 5.0
    RETURN r
  `
  return { query, params: { ...rest, now: new Date().toISOString() } }
}

// 전체 그래프 조회 쿼리
export const GET_ALL_NODES_QUERY = `
  MATCH (n)
  WHERE n:Concept OR n:Property OR n:Instance
  RETURN n, labels(n) AS labels
  LIMIT 1000
`

export const GET_ALL_RELATIONS_QUERY = `
  MATCH (a)-[r]->(b)
  WHERE (a:Concept OR a:Property OR a:Instance)
    AND (b:Concept OR b:Property OR b:Instance)
  RETURN a.name AS fromName, b.name AS toName,
         type(r) AS relType, r.label AS label,
         r.confidence AS confidence, r.weight AS weight,
         r.created_at AS created_at, r.source AS source
  LIMIT 2000
`

// Fulltext 검색 쿼리
export function buildFulltextSearchQuery(keyword: string, limit = 50) {
  return {
    query: `
      CALL db.index.fulltext.queryNodes("concept_search", $keyword)
      YIELD node, score
      RETURN node, labels(node) AS labels, score
      ORDER BY score DESC
      LIMIT $limit
    `,
    params: { keyword, limit },
  }
}

// N-hop 컨텍스트 조회 쿼리
export function buildContextQuery(nodeName: string, depth = 2) {
  const safeDepth = Math.min(Math.max(1, depth), 2) // 최대 2홉
  return {
    query: `
      MATCH (center {name: $nodeName})
      CALL apoc.path.subgraphAll(center, {maxLevel: $depth})
      YIELD nodes, relationships
      RETURN nodes, relationships
    `,
    params: { nodeName, depth: safeDepth },
    // APOC 없는 경우 폴백
    fallbackQuery: `
      MATCH path = (center {name: $nodeName})-[*1..${safeDepth}]-(neighbor)
      WHERE neighbor:Concept OR neighbor:Property OR neighbor:Instance
      WITH collect(DISTINCT neighbor) AS neighbors,
           collect(DISTINCT relationships(path)) AS rels
      RETURN neighbors, rels
    `,
    fallbackParams: { nodeName },
  }
}
