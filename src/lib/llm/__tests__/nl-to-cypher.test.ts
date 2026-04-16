// Zod 스키마 검증 테스트 — 통과/실패 케이스

import { describe, it, expect } from 'vitest'
import { LLMOntologyResponseSchema } from '../nl-to-cypher'

describe('LLMOntologyResponseSchema', () => {
  it('유효한 응답을 통과시킨다', () => {
    const valid = {
      nodes: [
        { name: 'React', type: 'Concept', description: 'UI 라이브러리', category: 'framework' },
        { name: 'JavaScript', type: 'Concept' },
      ],
      relations: [
        { from: 'React', to: 'JavaScript', type: 'USES', label: '~를 사용한다', confidence: 0.95 },
      ],
    }
    const result = LLMOntologyResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('허용되지 않은 관계 타입을 거부한다', () => {
    const invalid = {
      nodes: [
        { name: 'A', type: 'Concept' },
        { name: 'B', type: 'Concept' },
      ],
      relations: [
        { from: 'A', to: 'B', type: 'DEPENDS_ON', label: '~에 의존한다', confidence: 0.9 },
      ],
    }
    const result = LLMOntologyResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('노드 name이 200자를 초과하면 거부한다', () => {
    const invalid = {
      nodes: [{ name: 'a'.repeat(201), type: 'Concept' }],
      relations: [],
    }
    const result = LLMOntologyResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('노드 10개 초과를 거부한다', () => {
    const nodes = Array.from({ length: 11 }, (_, i) => ({ name: `Node${i}`, type: 'Concept' as const }))
    const result = LLMOntologyResponseSchema.safeParse({ nodes, relations: [] })
    expect(result.success).toBe(false)
  })

  it('관계 20개 초과를 거부한다', () => {
    const relations = Array.from({ length: 21 }, (_, i) => ({
      from: 'A', to: `B${i}`, type: 'USES' as const, label: '사용', confidence: 0.9,
    }))
    const result = LLMOntologyResponseSchema.safeParse({ nodes: [], relations })
    expect(result.success).toBe(false)
  })

  it('confidence가 0~1 범위를 벗어나면 거부한다', () => {
    const invalid = {
      nodes: [],
      relations: [
        { from: 'A', to: 'B', type: 'IS_A', label: '~이다', confidence: 1.5 },
      ],
    }
    const result = LLMOntologyResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('빈 노드 이름을 거부한다', () => {
    const invalid = {
      nodes: [{ name: '', type: 'Concept' }],
      relations: [],
    }
    const result = LLMOntologyResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('유효하지 않은 노드 타입을 거부한다', () => {
    const invalid = {
      nodes: [{ name: 'Test', type: 'Unknown' }],
      relations: [],
    }
    const result = LLMOntologyResponseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
