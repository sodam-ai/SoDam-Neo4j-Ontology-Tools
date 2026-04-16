// GDS 모듈 테스트
// Neo4j 미연결 환경에서 graceful fallback 동작 검증

import { describe, it, expect, vi, beforeEach } from 'vitest'

// neo4j-driver 전체 모킹
vi.mock('@/lib/neo4j/connection', () => ({
  getDriver: vi.fn(),
}))

import { getDriver } from '@/lib/neo4j/connection'

function makeMockSession(runResult: unknown = null, shouldThrow = false) {
  return {
    run: vi.fn().mockImplementation(() => {
      if (shouldThrow) throw new Error('GDS not available')
      return Promise.resolve(runResult)
    }),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function makeMockDriver(session: ReturnType<typeof makeMockSession>) {
  return { session: vi.fn().mockReturnValue(session) }
}

describe('isGdsAvailable', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('GDS 설치됨 → true 반환', async () => {
    const session = makeMockSession({ records: [{ get: () => '2.x' }] })
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { isGdsAvailable } = await import('@/lib/neo4j/gds')
    const result = await isGdsAvailable()
    expect(result).toBe(true)
    expect(session.close).toHaveBeenCalled()
  })

  it('GDS 미설치 → false 반환 (에러 아님)', async () => {
    const session = makeMockSession(null, true)
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { isGdsAvailable } = await import('@/lib/neo4j/gds')
    const result = await isGdsAvailable()
    expect(result).toBe(false)
    expect(session.close).toHaveBeenCalled()
  })
})

describe('getPageRankScores', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('GDS 미설치 시 빈 Map 반환', async () => {
    const session = makeMockSession(null, true)
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { getPageRankScores } = await import('@/lib/neo4j/gds')
    const result = await getPageRankScores()
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })

  it('정상 응답 시 Map에 점수 저장', async () => {
    const mockRecords = [
      { get: (k: string) => k === 'name' ? 'React' : 0.85 },
      { get: (k: string) => k === 'name' ? 'JavaScript' : 0.72 },
    ]
    const session = makeMockSession({ records: mockRecords })
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { getPageRankScores } = await import('@/lib/neo4j/gds')
    const result = await getPageRankScores()
    expect(result.get('React')).toBe(0.85)
    expect(result.get('JavaScript')).toBe(0.72)
  })
})

describe('getLouvainCommunities', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('GDS 미설치 시 빈 Map 반환', async () => {
    const session = makeMockSession(null, true)
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { getLouvainCommunities } = await import('@/lib/neo4j/gds')
    const result = await getLouvainCommunities()
    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
  })

  it('정상 응답 시 Map에 communityId 저장', async () => {
    const mockRecords = [
      { get: (k: string) => k === 'name' ? 'React' : 1 },
      { get: (k: string) => k === 'name' ? 'Vue' : 1 },
      { get: (k: string) => k === 'name' ? 'Django' : 2 },
    ]
    const session = makeMockSession({ records: mockRecords })
    vi.mocked(getDriver).mockReturnValue(makeMockDriver(session) as never)

    const { getLouvainCommunities } = await import('@/lib/neo4j/gds')
    const result = await getLouvainCommunities()
    expect(result.get('React')).toBe(1)
    expect(result.get('Vue')).toBe(1)
    expect(result.get('Django')).toBe(2)
  })
})
