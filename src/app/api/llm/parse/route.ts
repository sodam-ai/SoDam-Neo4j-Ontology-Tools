// 자연어 → LLM 파싱 API
// 입력 1000자 제한, LLM_API_KEY 없으면 fallback 모드 반환

import { NextRequest, NextResponse } from 'next/server'
import { parseNaturalLanguage } from '@/lib/llm/nl-to-cypher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = body.input

    if (typeof input !== 'string') {
      return NextResponse.json(
        { error: '입력(input)이 필요합니다.' },
        { status: 400 }
      )
    }

    // 서버 측 1000자 제한 (UI에서도 별도 제한하지만 이중 방어)
    if (input.length > 1000) {
      return NextResponse.json(
        { error: '입력은 최대 1000자까지 가능합니다.' },
        { status: 400 }
      )
    }

    if (input.trim().length === 0) {
      return NextResponse.json(
        { error: '입력 내용이 비어있습니다.' },
        { status: 400 }
      )
    }

    const result = await parseNaturalLanguage(input)

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data })
    }

    // 폴백 모드 (LLM_API_KEY 미설정)
    if ('mode' in result && result.mode === 'fallback') {
      return NextResponse.json({ success: false, mode: 'fallback' })
    }

    // 파싱 에러
    const errorMsg = 'error' in result ? result.error : '알 수 없는 오류'
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 422 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `파싱 요청 처리 실패: ${message}` },
      { status: 500 }
    )
  }
}

// LLM 모드 확인 (프론트엔드가 앱 시작 시 호출)
export async function GET() {
  const hasKey = !!process.env.LLM_API_KEY
  return NextResponse.json({ llmAvailable: hasKey })
}
