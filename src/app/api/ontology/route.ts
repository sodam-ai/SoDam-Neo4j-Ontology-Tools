// 온톨로지 CRUD API
// GET: 전체 그래프 조회 / POST: LLM 파싱 결과 저장

import { NextRequest, NextResponse } from 'next/server'
import { ensureInitialized } from '@/lib/neo4j/init'
import { getAllGraph, upsertConcept, addRelation } from '@/lib/neo4j/concept-repo'
import { upsertProperty } from '@/lib/neo4j/property-repo'
import { upsertInstance } from '@/lib/neo4j/instance-repo'
import { LLMOntologyResponseSchema } from '@/lib/llm/nl-to-cypher'
import type { LLMParsedNode } from '@/types/ontology'

export async function GET() {
  try {
    await ensureInitialized()
    const graph = await getAllGraph()
    return NextResponse.json(graph)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `온톨로지 조회 실패: ${message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized()

    const body = await request.json()

    // Zod 재검증 (프론트엔드에서 이미 검증했더라도 서버에서 다시 검증)
    const parsed = LLMOntologyResponseSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return NextResponse.json(
        { error: `데이터 검증 실패: ${issues}` },
        { status: 400 }
      )
    }

    const { nodes, relations } = parsed.data

    // 노드 MERGE (타입별 분기)
    for (const node of nodes) {
      await upsertNodeByType(node)
    }

    // 관계 MERGE
    for (const rel of relations) {
      await addRelation({
        fromName: rel.from,
        toName: rel.to,
        relType: rel.type,
        label: rel.label,
        confidence: rel.confidence,
        source: 'natural_language',
      })
    }

    // 저장 후 전체 그래프 반환
    const graph = await getAllGraph()
    return NextResponse.json(graph)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `온톨로지 저장 실패: ${message}` },
      { status: 500 }
    )
  }
}

async function upsertNodeByType(node: LLMParsedNode) {
  const source = 'natural_language' as const
  switch (node.type) {
    case 'Concept':
      return upsertConcept({ name: node.name, description: node.description, category: node.category, source })
    case 'Property':
      return upsertProperty({ name: node.name, source })
    case 'Instance':
      return upsertInstance({ name: node.name, description: node.description, source })
  }
}
