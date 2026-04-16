// query_ontology — 조건으로 노드/관계 조회
// depth 최대 3, 결과 최대 100개

import neo4j, { Driver } from 'neo4j-driver'
import { postViewEvent } from '../view-event.js'

export const QUERY_ONTOLOGY_SCHEMA = {
  name: 'query_ontology',
  description:
    '온톨로지 노드와 관계를 조건으로 조회합니다. ' +
    '노드 이름, 타입, 카테고리로 필터링하고, depth로 연결 깊이를 지정합니다.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: '노드 이름 (부분 일치)' },
      type: {
        type: 'string',
        enum: ['Concept', 'Property', 'Instance'],
        description: '노드 타입 필터',
      },
      category: { type: 'string', description: '카테고리 필터' },
      depth: {
        type: 'number',
        description: '관계 탐색 깊이 (기본 1, 최대 3)',
        default: 1,
      },
    },
  },
}

export async function handleQueryOntology(
  driver: Driver,
  args: { name?: string; type?: string; category?: string; depth?: number }
): Promise<string> {
  const session = driver.session()
  const depth = Math.min(Math.max(1, args.depth || 1), 3) // 최대 3

  try {
    // 조건 빌드 (파라미터 바인딩 사용)
    const conditions: string[] = []
    const params: Record<string, unknown> = {}

    if (args.name) {
      conditions.push('n.name CONTAINS $name')
      params.name = args.name
    }
    if (args.type) {
      conditions.push(`n:${args.type}`) // 레이블은 파라미터 불가, enum 검증됨
    }
    if (args.category) {
      conditions.push('n.category = $category')
      params.category = args.category
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : 'WHERE n:Concept OR n:Property OR n:Instance'

    // 노드 + 주변 관계 조회
    const query = `
      MATCH (n)
      ${whereClause}
      WITH n LIMIT 100
      OPTIONAL MATCH path = (n)-[*1..${depth}]-(neighbor)
      WHERE neighbor:Concept OR neighbor:Property OR neighbor:Instance
      WITH n, collect(DISTINCT neighbor)[0..100] AS neighbors,
           collect(DISTINCT relationships(path))[0..100] AS relPaths
      RETURN n, labels(n) AS labels, neighbors, relPaths
      LIMIT 100
    `

    const result = await session.executeRead(async (tx) => {
      return await tx.run(query, params)
    })

    const nodes: string[] = []
    const nodeNames: string[] = []

    for (const record of result.records) {
      const node = record.get('n').properties
      const labels = record.get('labels') as string[]
      const type = labels.find((l: string) => ['Concept', 'Property', 'Instance'].includes(l)) || 'Unknown'
      nodes.push(`[${type}] ${node.name}${node.description ? ` — ${node.description}` : ''}`)
      nodeNames.push(node.name)

      // 이웃 노드
      const neighbors = record.get('neighbors')
      if (neighbors && Array.isArray(neighbors)) {
        for (const neighbor of neighbors) {
          if (neighbor && neighbor.properties) {
            nodes.push(`  ↳ ${neighbor.properties.name}`)
            nodeNames.push(neighbor.properties.name)
          }
        }
      }
    }

    // ViewEvent 발송 (best-effort)
    await postViewEvent({
      type: 'highlight',
      nodeNames: [...new Set(nodeNames)].slice(0, 20),
    })

    if (nodes.length === 0) {
      return '조건에 맞는 노드가 없습니다.'
    }

    return `조회 결과 (${nodes.length}개):\n${nodes.join('\n')}`
  } catch (err) {
    if (err instanceof neo4j.Neo4jError) {
      return 'Neo4j 연결 실패. 웹앱 /settings에서 연결 설정을 확인하세요.'
    }
    throw err
  } finally {
    await session.close()
  }
}
