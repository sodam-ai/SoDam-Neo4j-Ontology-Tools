// search_ontology — Fulltext 검색, 결과 최대 50개

import neo4j, { Driver } from 'neo4j-driver'
import { postViewEvent } from '../view-event.js'

export const SEARCH_ONTOLOGY_SCHEMA = {
  name: 'search_ontology',
  description:
    '온톨로지에서 키워드로 Fulltext 검색합니다. ' +
    '노드 이름과 설명에서 검색하며, 카테고리로 필터링할 수 있습니다.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      keyword: {
        type: 'string',
        description: '검색 키워드 (필수)',
      },
      category: {
        type: 'string',
        description: '카테고리 필터 (선택)',
      },
      limit: {
        type: 'number',
        description: '최대 결과 수 (기본 20, 최대 50)',
        default: 20,
      },
    },
    required: ['keyword'],
  },
}

export async function handleSearchOntology(
  driver: Driver,
  args: { keyword: string; category?: string; limit?: number }
): Promise<string> {
  const session = driver.session()
  const limit = Math.min(Math.max(1, args.limit || 20), 50) // 최대 50개

  try {
    const query = args.category
      ? `
        CALL db.index.fulltext.queryNodes("concept_search", $keyword)
        YIELD node, score
        WHERE node.category = $category
        RETURN node, labels(node) AS labels, score
        ORDER BY score DESC
        LIMIT $limit
      `
      : `
        CALL db.index.fulltext.queryNodes("concept_search", $keyword)
        YIELD node, score
        RETURN node, labels(node) AS labels, score
        ORDER BY score DESC
        LIMIT $limit
      `

    const params: Record<string, unknown> = {
      keyword: args.keyword,
      limit: neo4j.int(limit),
    }
    if (args.category) {
      params.category = args.category
    }

    const result = await session.executeRead(async (tx) => {
      return await tx.run(query, params)
    })

    const results: string[] = []
    const nodeNames: string[] = []

    for (const record of result.records) {
      const node = record.get('node').properties
      const labels = record.get('labels') as string[]
      const score = record.get('score')
      const type = labels.find((l: string) => ['Concept', 'Property', 'Instance'].includes(l)) || 'Unknown'

      results.push(
        `[${type}] ${node.name} (관련도: ${typeof score === 'number' ? score.toFixed(2) : score})` +
        (node.description ? `\n    ${node.description}` : '')
      )
      nodeNames.push(node.name)
    }

    // ViewEvent 발송 (best-effort)
    await postViewEvent({
      type: 'highlight',
      nodeNames: nodeNames.slice(0, 20),
    })

    if (results.length === 0) {
      return `"${args.keyword}"에 대한 검색 결과가 없습니다.`
    }

    return `"${args.keyword}" 검색 결과 (${results.length}개):\n\n${results.join('\n\n')}`
  } catch (err) {
    if (err instanceof neo4j.Neo4jError) {
      return 'Neo4j 연결 실패. 웹앱 /settings에서 연결 설정을 확인하세요.'
    }
    throw err
  } finally {
    await session.close()
  }
}
