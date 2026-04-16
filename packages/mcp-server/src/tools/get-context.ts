// get_context — 특정 개념의 1~2홉 맥락 조회
// 하드캡: 최대 50노드 + 100관계

import neo4j, { Driver } from 'neo4j-driver'
import { postViewEvent } from '../view-event.js'

export const GET_CONTEXT_SCHEMA = {
  name: 'get_context',
  description:
    '특정 개념의 주변 맥락(1~2홉 연결)을 조회합니다. ' +
    '중심 노드와 연결된 모든 노드, 관계를 가져옵니다. 최대 50노드/100관계.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: '중심 노드 이름 (필수)',
      },
      depth: {
        type: 'number',
        description: '탐색 깊이 (기본 1, 최대 2)',
        default: 1,
      },
    },
    required: ['name'],
  },
}

export async function handleGetContext(
  driver: Driver,
  args: { name: string; depth?: number }
): Promise<string> {
  const session = driver.session()
  const depth = Math.min(Math.max(1, args.depth || 1), 2) // 최대 2홉

  try {
    // 중심 노드 존재 확인
    const centerResult = await session.executeRead(async (tx) => {
      return await tx.run(
        'MATCH (n {name: $name}) WHERE n:Concept OR n:Property OR n:Instance RETURN n, labels(n) AS labels',
        { name: args.name }
      )
    })

    if (centerResult.records.length === 0) {
      return `"${args.name}" 노드를 찾을 수 없습니다.`
    }

    // 주변 노드 + 관계 조회 (하드캡 적용)
    const contextQuery = `
      MATCH (center {name: $name})
      WHERE center:Concept OR center:Property OR center:Instance
      MATCH path = (center)-[*1..${depth}]-(neighbor)
      WHERE neighbor:Concept OR neighbor:Property OR neighbor:Instance
      WITH center,
           collect(DISTINCT neighbor)[0..50] AS neighbors,
           collect(DISTINCT relationships(path))[0..100] AS allRelPaths
      RETURN center, labels(center) AS centerLabels, neighbors, allRelPaths
    `

    const result = await session.executeRead(async (tx) => {
      return await tx.run(contextQuery, { name: args.name })
    })

    if (result.records.length === 0) {
      const centerNode = centerResult.records[0].get('n').properties
      return `[${args.name}] 노드는 존재하지만 연결된 다른 노드가 없습니다.\n설명: ${centerNode.description || '(없음)'}`
    }

    const record = result.records[0]
    const center = record.get('center').properties
    const centerLabels = record.get('centerLabels') as string[]
    const centerType = centerLabels.find((l: string) => ['Concept', 'Property', 'Instance'].includes(l)) || 'Unknown'
    const neighbors = record.get('neighbors') as Array<{ properties: Record<string, unknown>; labels?: string[] }>

    // 결과 포맷팅
    const lines: string[] = []
    lines.push(`=== ${center.name} (${centerType}) ===`)
    if (center.description) lines.push(`설명: ${center.description}`)
    if (center.category) lines.push(`카테고리: ${center.category}`)
    lines.push('')

    const nodeNames: string[] = [args.name]

    if (neighbors && neighbors.length > 0) {
      lines.push(`연결된 노드 (${neighbors.length}개):`)
      for (const neighbor of neighbors) {
        if (neighbor && neighbor.properties) {
          const name = neighbor.properties.name as string
          const desc = neighbor.properties.description as string | undefined
          lines.push(`  - ${name}${desc ? ` — ${desc}` : ''}`)
          nodeNames.push(name)
        }
      }
    }

    // 관계 정보 수집
    const allRelPaths = record.get('allRelPaths')
    if (allRelPaths && Array.isArray(allRelPaths)) {
      const relLines: string[] = []
      const seen = new Set<string>()

      for (const relArray of allRelPaths) {
        if (!Array.isArray(relArray)) continue
        for (const rel of relArray) {
          if (!rel || !rel.type) continue
          const key = `${rel.start}-${rel.type}-${rel.end}`
          if (seen.has(key)) continue
          seen.add(key)

          const label = rel.properties?.label || rel.type
          const confidence = rel.properties?.confidence
          relLines.push(
            `  ${rel.type} (${label})` +
            (typeof confidence === 'number' ? ` [신뢰도: ${confidence.toFixed(2)}]` : '')
          )
        }
      }

      if (relLines.length > 0) {
        lines.push('')
        lines.push(`관계 (${relLines.length}개):`)
        lines.push(...relLines.slice(0, 100)) // 100관계 하드캡
      }
    }

    // ViewEvent 발송 (best-effort)
    await postViewEvent({
      type: 'focus',
      centerNode: args.name,
      nodeNames: [...new Set(nodeNames)].slice(0, 50),
    })

    return lines.join('\n')
  } catch (err) {
    if (err instanceof neo4j.Neo4jError) {
      return 'Neo4j 연결 실패. 웹앱 /settings에서 연결 설정을 확인하세요.'
    }
    throw err
  } finally {
    await session.close()
  }
}
