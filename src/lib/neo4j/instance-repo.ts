// Instance 노드 CRUD — CREATE 금지, MERGE 필수

import { getDriver } from './connection'
import { buildInstanceMerge } from './cypher-builder'
import type { OntologyNode, NodeType } from '@/types/ontology'

function generateId(): string {
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function upsertInstance(params: {
  name: string
  description?: string
  source: 'natural_language' | 'manual' | 'import'
}): Promise<OntologyNode> {
  const driver = getDriver()
  const session = driver.session()

  try {
    const { query, params: cypherParams } = buildInstanceMerge({
      ...params,
      id: generateId(),
    })

    const result = await session.executeWrite(async (tx) => {
      return await tx.run(query, cypherParams)
    })

    const record = result.records[0]
    const node = record.get('i').properties
    return { ...node, type: 'Instance' as NodeType }
  } finally {
    await session.close()
  }
}
