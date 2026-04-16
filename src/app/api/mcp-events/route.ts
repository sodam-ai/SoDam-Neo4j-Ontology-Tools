// SSE 스트림 엔드포인트 (MCP 서버 → 웹앱 실시간 ViewEvent 브로드캐스트)
// GET: 브라우저 EventSource 연결
// POST: MCP 서버가 ViewEvent를 보내면 모든 연결된 브라우저에 전파

import { NextRequest, NextResponse } from 'next/server'

// 메모리 내 SSE 클라이언트 연결 관리 (로컬 전용 앱이므로 단일 프로세스)
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()

const encoder = new TextEncoder()

export async function GET() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
      clients.add(controller)

      // 연결 확인 이벤트
      const welcome = encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      controller.enqueue(welcome)
    },
    cancel() {
      clients.delete(controllerRef)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = encoder.encode(`data: ${JSON.stringify(body)}\n\n`)

    // 모든 연결된 브라우저에 브로드캐스트
    const dead: ReadableStreamDefaultController<Uint8Array>[] = []
    clients.forEach((controller) => {
      try {
        controller.enqueue(data)
      } catch {
        dead.push(controller)
      }
    })

    // 끊어진 연결 정리
    dead.forEach((c) => clients.delete(c))

    return NextResponse.json({ ok: true, clients: clients.size })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `이벤트 전송 실패: ${message}` },
      { status: 500 }
    )
  }
}
