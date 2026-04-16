// 자연어 → 온톨로지 변환 (LLM + Zod 검증)
// LLM_API_KEY 서버 사이드 전용 — NEXT_PUBLIC_ 접두사 절대 금지
// 검증 실패 시 전체 거부 (partial 사용 금지)

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// ── Zod 스키마 (05_SECURITY.md 기준) ──────────────────────────

const RelationTypeSchema = z.enum([
  'IS_A', 'USES', 'PART_OF', 'HAS_PROPERTY', 'INSTANCE_OF',
])

const NodeTypeSchema = z.enum(['Concept', 'Property', 'Instance'])

export const LLMOntologyResponseSchema = z.object({
  nodes: z.array(z.object({
    name: z.string().min(1).max(200),
    type: NodeTypeSchema,
    description: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
  })).max(10),
  relations: z.array(z.object({
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
    type: RelationTypeSchema,
    label: z.string().min(1).max(100),
    confidence: z.number().min(0).max(1),
  })).max(20),
})

export type LLMOntologyResponse = z.infer<typeof LLMOntologyResponseSchema>

// ── LLM 호출 ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 자연어 문장을 온톨로지 구조로 변환하는 전문가입니다.

사용자가 입력한 한국어 또는 영어 문장을 분석하여 노드(Concept/Property/Instance)와 관계를 추출합니다.

규칙:
1. 노드 타입: Concept(개념), Property(속성), Instance(인스턴스/사례)
2. 관계 타입은 반드시 다음 5가지 중 하나: IS_A, USES, PART_OF, HAS_PROPERTY, INSTANCE_OF
3. 각 관계에 confidence(0.0~1.0)를 부여하세요. 확실한 관계는 0.9 이상, 추론된 관계는 0.7~0.9
4. label은 관계를 한국어로 표현한 문구입니다 (예: "~를 사용한다", "~이다")
5. 반드시 유효한 JSON만 반환하세요. 설명이나 마크다운 없이 JSON만.

반환 형식:
{
  "nodes": [{"name": "...", "type": "Concept|Property|Instance", "description": "...", "category": "..."}],
  "relations": [{"from": "...", "to": "...", "type": "IS_A|USES|PART_OF|HAS_PROPERTY|INSTANCE_OF", "label": "...", "confidence": 0.95}]
}`

export type ParseResult =
  | { success: true; data: LLMOntologyResponse }
  | { success: false; error: string }
  | { success: false; mode: 'fallback' }

export async function parseNaturalLanguage(input: string): Promise<ParseResult> {
  // LLM_API_KEY 없으면 폴백 모드 (에러 아님)
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    return { success: false, mode: 'fallback' }
  }

  // 입력 길이 제한 (1000자)
  if (input.length > 1000) {
    return { success: false, error: '입력은 최대 1000자까지 가능합니다.' }
  }

  if (input.trim().length === 0) {
    return { success: false, error: '입력 내용이 비어있습니다.' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const model = process.env.LLM_MODEL || 'claude-sonnet-4-6'

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: input },
      ],
    })

    // 응답 텍스트 추출
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { success: false, error: 'LLM 응답에서 텍스트를 찾을 수 없습니다.' }
    }

    // JSON 파싱
    let rawJson: unknown
    try {
      // LLM이 ```json ... ``` 으로 감싸는 경우 처리
      let text = textBlock.text.trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }
      rawJson = JSON.parse(text)
    } catch {
      return { success: false, error: 'LLM 응답이 유효한 JSON이 아닙니다.' }
    }

    // Zod 스키마 검증 — 실패 시 전체 거부 (partial 금지)
    const parsed = LLMOntologyResponseSchema.safeParse(rawJson)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return { success: false, error: `LLM 응답 검증 실패: ${issues}` }
    }

    return { success: true, data: parsed.data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `LLM 호출 실패: ${message}` }
  }
}
