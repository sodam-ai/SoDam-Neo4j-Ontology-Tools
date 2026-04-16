// Concept 노드 CRUD — 모든 Neo4j 접근은 이 모듈을 통해서만
// CREATE 금지, MERGE 필수. session.run() 쓰기 금지 → executeWrite 필수

import { getDriver } from './connection'
import { buildConceptMerge, buildRelationMerge, GET_ALL_NODES_QUERY, GET_ALL_RELATIONS_QUERY } from './cypher-builder'
import type { OntologyNode, OntologyRelation, RelationType, NodeType } from '@/types/ontology'

function generateId(): string {
  return `concept-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function upsertConcept(params: {
  name: string
  description?: string
  category?: string
  source: 'natural_language' | 'manual' | 'import'
}): Promise<OntologyNode> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const { query, params: cypherParams } = buildConceptMerge({
      ...params,
      id: generateId(),
    })

    const result = await session.executeWrite(async (tx) => {
      return await tx.run(query, cypherParams)
    })

    const record = result.records[0]
    const node = record.get('c').properties
    return {
      ...node,
      type: 'Concept' as NodeType,
    }
  } finally {
    await session.close()
  }
}

export async function findByName(name: string): Promise<OntologyNode | null> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.executeRead(async (tx) => {
      return await tx.run(
        'MATCH (c:Concept {name: $name}) RETURN c',
        { name }
      )
    })

    if (result.records.length === 0) return null
    const node = result.records[0].get('c').properties
    return { ...node, type: 'Concept' as NodeType }
  } finally {
    await session.close()
  }
}

export async function addRelation(params: {
  fromName: string
  toName: string
  relType: RelationType
  label: string
  confidence: number
  source: 'natural_language' | 'manual' | 'import'
}): Promise<void> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const { query, params: cypherParams } = buildRelationMerge(params)
    await session.executeWrite(async (tx) => {
      await tx.run(query, cypherParams)
    })
  } finally {
    await session.close()
  }
}

// 전체 그래프 조회 (노드 + 관계)
export async function getAllGraph(): Promise<{ nodes: OntologyNode[]; relations: OntologyRelation[] }> {
  const driver = getDriver()
  const session = driver.session()

  try {
    // 노드 조회
    const nodesResult = await session.executeRead(async (tx) => {
      return await tx.run(GET_ALL_NODES_QUERY)
    })

    const nodes: OntologyNode[] = nodesResult.records.map((record) => {
      const node = record.get('n').properties
      const labels: string[] = record.get('labels')
      const type = labels.find((l: string) => ['Concept', 'Property', 'Instance'].includes(l)) || 'Concept'
      return { ...node, type: type as NodeType }
    })

    // 관계 조회
    const relsResult = await session.executeRead(async (tx) => {
      return await tx.run(GET_ALL_RELATIONS_QUERY)
    })

    const relations: OntologyRelation[] = relsResult.records.map((record) => ({
      from: record.get('fromName'),
      to: record.get('toName'),
      type: record.get('relType') as RelationType,
      label: record.get('label') || '',
      confidence: typeof record.get('confidence') === 'number' ? record.get('confidence') : 0,
      weight: typeof record.get('weight') === 'number' ? record.get('weight') : 0,
      created_at: record.get('created_at') || new Date().toISOString(),
      source: (record.get('source') || 'manual') as OntologyRelation['source'],
    }))

    return { nodes, relations }
  } finally {
    await session.close()
  }
}
