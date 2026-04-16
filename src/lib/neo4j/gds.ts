// GDS (Graph Data Science) 알고리즘 모듈
// Phase 2a: PageRank + Louvain 커뮤니티 감지
// GDS 미설치 시 빈 Map 반환 (에러 아님, graceful fallback)

import { getDriver } from './connection'

export const GDS_GRAPH_NAME = 'ontology-graph'

// GDS 설치 여부 확인
export async function isGdsAvailable(): Promise<boolean> {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.run('CALL gds.version() YIELD version RETURN version LIMIT 1')
    return true
  } catch {
    return false
  } finally {
    await session.close()
  }
}

// GDS 프로젝션 생성 (존재 시 삭제 후 재생성 — 데이터 최신화 보장)
// GDS 미설치 시 false 반환
export async function ensureGdsProjection(): Promise<boolean> {
  const driver = getDriver()
  const session = driver.session()

  try {
    // 존재 여부 확인
    const existsResult = await session.run(
      'CALL gds.graph.exists($name) YIELD exists',
      { name: GDS_GRAPH_NAME }
    )
    const exists = existsResult.records[0]?.get('exists') as boolean | undefined

    // 존재하면 삭제
    if (exists) {
      await session.run('CALL gds.graph.drop($name) YIELD graphName', { name: GDS_GRAPH_NAME })
    }

    // 재생성
    await session.run(`
      CALL gds.graph.project.cypher(
        $name,
        'MATCH (n) WHERE n:Concept OR n:Property OR n:Instance RETURN id(n) AS id',
        'MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target, type(r) AS type'
      )
    `, { name: GDS_GRAPH_NAME })

    return true
  } catch {
    // GDS 미설치 또는 노드 없음 — 조용히 실패
    console.info(
      '[GDS] 프로젝션 생성 불가. GDS 미설치이거나 노드가 없습니다.\n' +
      '설치: Neo4j Desktop → 프로젝트 선택 → Plugins 탭 → Graph Data Science Library → Install'
    )
    return false
  } finally {
    await session.close()
  }
}

// PageRank 점수 조회 → Map<노드 name, score>
// GDS 미설치 또는 프로젝션 없으면 빈 Map 반환
export async function getPageRankScores(): Promise<Map<string, number>> {
  const driver = getDriver()
  const session = driver.session()
  const scores = new Map<string, number>()

  try {
    const result = await session.run(`
      CALL gds.pageRank.stream($name)
      YIELD nodeId, score
      RETURN gds.util.asNode(nodeId).name AS name, score
      ORDER BY score DESC
    `, { name: GDS_GRAPH_NAME })

    for (const record of result.records) {
      const name = record.get('name') as string | null
      const score = record.get('score') as number | null
      if (name != null && score != null) {
        scores.set(name, score)
      }
    }
  } catch {
    console.info('[GDS] PageRank를 사용할 수 없습니다. GDS 라이브러리 설치 후 사용 가능합니다.')
  } finally {
    await session.close()
  }

  return scores
}

// Louvain 커뮤니티 감지 → Map<노드 name, communityId>
// GDS 미설치 또는 프로젝션 없으면 빈 Map 반환
export async function getLouvainCommunities(): Promise<Map<string, number>> {
  const driver = getDriver()
  const session = driver.session()
  const communities = new Map<string, number>()

  try {
    const result = await session.run(`
      CALL gds.louvain.stream($name)
      YIELD nodeId, communityId
      RETURN gds.util.asNode(nodeId).name AS name, communityId
    `, { name: GDS_GRAPH_NAME })

    for (const record of result.records) {
      const name = record.get('name') as string | null
      const communityId = record.get('communityId') as number | null
      if (name != null && communityId != null) {
        communities.set(name, communityId)
      }
    }
  } catch {
    console.info('[GDS] Louvain 커뮤니티 감지를 사용할 수 없습니다. GDS 라이브러리 설치 후 사용 가능합니다.')
  } finally {
    await session.close()
  }

  return communities
}
