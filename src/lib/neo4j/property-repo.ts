// Property 노드 CRUD — CREATE 금지, MERGE 필수

import { getDriver } from './connection'
import { buildPropertyMerge } from './cypher-builder'
import type { OntologyNode, NodeType } from '@/types/ontology'

function generateId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function upsertProperty(params: {
  name: string
  value?: string
  value_type?: string
  source: 'natural_language' | 'manual' | 'import'
}): Promise<OntologyNode> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const { query, params: cypherParams } = buildPropertyMerge({
      ...params,
      id: generateId(),
      value_type: params.value_type || 'string',
    })

    const result = await session.executeWrite(async (tx) => {
      return await tx.run(query, cypherParams)
    })

    const record = result.records[0]
    const node = record.get('p').properties
    return { ...node, type: 'Property' as NodeType }
  } finally {
    await session.close()
  }
}
