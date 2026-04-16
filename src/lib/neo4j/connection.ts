// Neo4j 드라이버 싱글톤
// 모든 Neo4j 접근은 이 모듈을 통해서만 — 직접 neo4j.driver() 호출 금지

import neo4j, { Driver } from 'neo4j-driver'

// Next.js dev 환경에서 핫 리로드로 인한 다중 인스턴스 방지
// global 객체에 드라이버를 저장
declare global {
  // eslint-disable-next-line no-var
  var __neo4jDriver: Driver | undefined
}

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !user || !password) {
    throw new Error(
      'Neo4j 연결 정보가 설정되지 않았습니다.\n' +
      '.env.local.example을 참고해 .env.local 파일을 만들어 주세요.\n' +
      '설치 안내: https://neo4j.com/download/'
    )
  }

  return neo4j.driver(
    uri,
    neo4j.auth.basic(user, password),
    {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
      maxTransactionRetryTime: 15000,
    }
  )
}

export function getDriver(): Driver {
  if (!global.__neo4jDriver) {
    global.__neo4jDriver = createDriver()
  }
  return global.__neo4jDriver
}

export async function closeDriver(): Promise<void> {
  if (global.__neo4jDriver) {
    await global.__neo4jDriver.close()
    global.__neo4jDriver = undefined
  }
}

// 연결 테스트 (setup 마법사 + health API에서 사용)
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const driver = getDriver()
    await driver.verifyConnectivity()
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error:
        'Neo4j에 연결할 수 없습니다. Neo4j Desktop이 실행 중인지 확인해 주세요.\n' +
        `오류: ${message}\n` +
        '설치 안내: https://neo4j.com/download/',
    }
  }
}
