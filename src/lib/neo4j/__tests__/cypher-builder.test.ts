// Cypher 쿼리 빌더 테스트 — 파라미터 바인딩 검증

import { describe, it, expect } from 'vitest'
import {
  validateRelationType,
  buildConceptMerge,
  buildRelationMerge,
  buildFulltextSearchQuery,
} from '../cypher-builder'

describe('validateRelationType', () => {
  it('화이트리스트 관계 타입을 통과시킨다', () => {
    expect(validateRelationType('IS_A')).toBe('IS_A')
    expect(validateRelationType('USES')).toBe('USES')
    expect(validateRelationType('PART_OF')).toBe('PART_OF')
    expect(validateRelationType('HAS_PROPERTY')).toBe('HAS_PROPERTY')
    expect(validateRelationType('INSTANCE_OF')).toBe('INSTANCE_OF')
  })

  it('화이트리스트 외 관계 타입을 거부한다', () => {
    expect(() => validateRelationType('DEPENDS_ON')).toThrow('허용되지 않은 관계 타입')
    expect(() => validateRelationType('RELATED_TO')).toThrow('허용되지 않은 관계 타입')
    expect(() => validateRelationType('')).toThrow('허용되지 않은 관계 타입')
  })
})

describe('buildConceptMerge', () => {
  it('MERGE 쿼리를 생성한다 (CREATE 사용하지 않음)', () => {
    const { query, params } = buildConceptMerge({
      name: 'React',
      id: 'test-id',
      description: 'UI 라이브러리',
      category: 'framework',
      source: 'natural_language',
    })

    expect(query).toContain('MERGE')
    expect(query).not.toMatch(/\bCREATE\s+\(/) // CREATE (노드) 패턴 금지
    expect(query).toContain('ON CREATE SET')
    expect(query).toContain('ON MATCH SET')
    expect(params.name).toBe('React')
    expect(params.id).toBe('test-id')
    expect(params.now).toBeDefined()
  })
})

describe('buildRelationMerge', () => {
  it('화이트리스트 관계 타입으로 MERGE 쿼리를 생성한다', () => {
    const { query, params } = buildRelationMerge({
      fromName: 'React',
      toName: 'JavaScript',
      relType: 'USES',
      label: '~를 사용한다',
      confidence: 0.95,
      source: 'natural_language',
    })

    expect(query).toContain('MERGE')
    expect(query).toContain(':USES')
    expect(query).toContain('$confidence')
    expect(params.fromName).toBe('React')
    expect(params.toName).toBe('JavaScript')
    expect(params.confidence).toBe(0.95)
  })

  it('화이트리스트 외 관계 타입으로 호출하면 에러가 발생한다', () => {
    expect(() =>
      buildRelationMerge({
        fromName: 'A',
        toName: 'B',
        relType: 'INVALID' as never,
        label: '테스트',
        confidence: 0.9,
        source: 'manual',
      })
    ).toThrow('허용되지 않은 관계 타입')
  })
})

describe('buildFulltextSearchQuery', () => {
  it('Fulltext 검색 쿼리를 생성한다', () => {
    const { query, params } = buildFulltextSearchQuery('React', 30)

    expect(query).toContain('concept_search')
    expect(query).toContain('$keyword')
    expect(query).toContain('$limit')
    expect(params.keyword).toBe('React')
    expect(params.limit).toBe(30)
  })

  it('기본 limit은 50이다', () => {
    const { params } = buildFulltextSearchQuery('Test')
    expect(params.limit).toBe(50)
  })
})
