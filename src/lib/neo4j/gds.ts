// GDS (Graph Data Science) 알고리즘 — Phase 2a 본격 사용
// Phase 1: GDS 미설치 시 graceful fallback (에러 아님)

import { getDriver } from './connection'

// PageRank 조회 — GDS 미설치 시 빈 Map 반환
export async function getPageRankScores(): Promise<Map<string, number>> {
  const driver = getDriver()
  const session = driver.session()
  const scores = new Map<string, number>()

  try {
    // GDS 프로젝션 존재 여부 확인 및 생성
    try {
      await session.run(`
        CALL gds.graph.project.cypher(
          'ontology',
          'MATCH (n) WHERE n:Concept OR n:Property OR n:Instance RETURN id(n) AS id',
          'MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target'
        )
      `)
    } catch {
      // 이미 존재하거나 GDS 미설치 — 무시
    }

    const result = await session.run(`
      CALL gds.pageRank.stream('ontology')
      YIELD nodeId, score
      RETURN gds.util.asNode(nodeId).name AS name, score
      ORDER BY score DESC
    `)

    for (const record of result.records) {
      scores.set(record.get('name'), record.get('score'))
    }
  } catch {
    // GDS 미설치 — 빈 Map 반환 (에러 아님)
    console.info('[GDS] PageRank를 사용할 수 없습니다. GDS 라이브러리 설치 후 사용 가능합니다.')
  } finally {
    await session.close()
  }

  return scores
}
