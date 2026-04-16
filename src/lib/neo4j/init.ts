// Neo4j 초기화: Unique Constraint + Fulltext Index 자동 생성
// 앱 시작 시 1회 실행 (멱등성 보장 — IF NOT EXISTS)

import { getDriver } from './connection'
import { isGdsAvailable, ensureGdsProjection } from './gds'

let initialized = false
let initPromise: Promise<void> | null = null

export async function ensureInitialized(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = runInit()
      .then(() => { initialized = true })
      .catch((err) => {
        // 초기화 실패 시 다음 호출에서 재시도 가능하도록 초기화
        initPromise = null
        throw err
      })
  }
  return initPromise
}

async function runInit(): Promise<void> {
  const driver = getDriver()
  const session = driver.session()

  try {
    // Unique Constraints (중복 노드 원천 차단)
    const constraints = [
      'CREATE CONSTRAINT concept_name IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE',
      'CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT property_name IF NOT EXISTS FOR (p:Property) REQUIRE p.name IS UNIQUE',
      'CREATE CONSTRAINT instance_name IF NOT EXISTS FOR (i:Instance) REQUIRE i.name IS UNIQUE',
    ]

    for (const query of constraints) {
      await session.run(query)
    }

    // Fulltext Index (자연어 검색용)
    await session.run(`
      CREATE FULLTEXT INDEX concept_search IF NOT EXISTS
      FOR (n:Concept|Property|Instance)
      ON EACH [n.name, n.description]
    `)

    console.log('[Neo4j] 초기화 완료: Constraint + Fulltext Index 생성')

    // GDS 설치 여부 확인 후 프로젝션 자동 생성
    await checkGdsAndCreateProjection()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(
      '[Neo4j] 초기화 중 오류가 발생했습니다.\n' +
      'Neo4j Desktop이 실행 중이고 .env.local 설정이 올바른지 확인해 주세요.\n' +
      `오류: ${message}`
    )
    throw err
  } finally {
    await session.close()
  }
}

async function checkGdsAndCreateProjection(): Promise<void> {
  const available = await isGdsAvailable()
  if (available) {
    console.log('[Neo4j] GDS (Graph Data Science) 라이브러리 감지됨. 프로젝션 생성 중...')
    await ensureGdsProjection()
    console.log('[Neo4j] GDS 프로젝션 준비 완료 (ontology-graph)')
  } else {
    console.info(
      '[Neo4j] GDS 라이브러리가 설치되지 않았습니다.\n' +
      'PageRank, 커뮤니티 감지 기능은 GDS 설치 후 사용 가능합니다.\n' +
      '설치: Neo4j Desktop → 프로젝트 선택 → Plugins 탭 → Graph Data Science Library → Install'
    )
  }
}
