// 온톨로지 도메인 타입 정의

export type NodeType = 'Concept' | 'Property' | 'Instance'

export type RelationType =
  | 'IS_A'
  | 'USES'
  | 'PART_OF'
  | 'HAS_PROPERTY'
  | 'INSTANCE_OF'

export interface OntologyNode {
  id: string
  name: string
  type: NodeType
  description?: string
  category?: string
  created_at: string
  updated_at: string
  source: 'natural_language' | 'manual' | 'import'
  // PageRank 점수 (GDS 미설치 시 undefined)
  pageRank?: number
  // Louvain 커뮤니티 ID (GDS 미설치 시 undefined)
  communityId?: number
}

export interface OntologyRelation {
  id?: string
  from: string       // 노드 name
  to: string         // 노드 name
  type: RelationType
  label: string      // 한국어 표현 ("~를 사용한다" 등)
  confidence: number // 0.0 ~ 1.0
  weight: number     // confidence × 5.0
  created_at: string
  source: 'natural_language' | 'manual' | 'import'
}

export interface OntologyGraph {
  nodes: OntologyNode[]
  relations: OntologyRelation[]
}

// LLM 응답 구조 (Zod 스키마와 동기화 — nl-to-cypher.ts 참조)
export interface LLMParsedNode {
  name: string
  type: NodeType
  description?: string
  category?: string
}

export interface LLMParsedRelation {
  from: string
  to: string
  type: RelationType
  label: string
  confidence: number
}

export interface LLMOntologyResponse {
  nodes: LLMParsedNode[]
  relations: LLMParsedRelation[]
}

// SSE ViewEvent 타입 (MCP → 웹앱 실시간 반응)
export type ViewEventType = 'highlight' | 'focus' | 'reset'

export interface ViewEvent {
  type: ViewEventType
  // highlight: 노드 이름 목록을 강조 표시
  nodeNames?: string[]
  // focus: 중심 노드 + 서브그래프
  centerNode?: string
  // 이벤트 발생 시각
  timestamp?: string
}

// 노드/엣지 색상 상수 (Cytoscape.js에서 참조)
export const NODE_COLORS: Record<NodeType, string> = {
  Concept: '#4A90D9',
  Property: '#5CB85C',
  Instance: '#F0AD4E',
}

export const EDGE_COLORS: Record<RelationType, string> = {
  IS_A: '#999999',
  USES: '#337AB7',
  PART_OF: '#5CB85C',
  HAS_PROPERTY: '#9B59B6',
  INSTANCE_OF: '#E67E22',
}

// 관계 타입 화이트리스트 (Zod 검증에서도 동일하게 사용)
export const ALLOWED_RELATION_TYPES: RelationType[] = [
  'IS_A',
  'USES',
  'PART_OF',
  'HAS_PROPERTY',
  'INSTANCE_OF',
]

// 관계 타입 한국어 레이블 기본값
export const RELATION_LABELS: Record<RelationType, string> = {
  IS_A: '~이다',
  USES: '~를 사용한다',
  PART_OF: '~에 포함된다',
  HAS_PROPERTY: '~속성이 있다',
  INSTANCE_OF: '~의 예시이다',
}
