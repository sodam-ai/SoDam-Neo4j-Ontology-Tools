// ViewEvent 발송 — MCP 도구 호출 시 웹앱에 POST (best-effort)
// 핵심 원칙: 발송 실패가 MCP 도구 결과에 절대 영향 주면 안 됨
// WEB_APP_URL 환경변수에서만 읽기 (하드코딩 금지)

export interface ViewEvent {
  type: 'highlight' | 'focus' | 'reset'
  nodeNames?: string[]
  centerNode?: string
  timestamp?: string
}

export async function postViewEvent(event: ViewEvent): Promise<void> {
  try {
    const webAppUrl = process.env.WEB_APP_URL
    if (!webAppUrl) {
      // WEB_APP_URL 미설정 — 조용히 무시 (MCP 도구 동작에 영향 없음)
      return
    }

    const url = `${webAppUrl}/api/mcp-events`

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
    })
  } catch {
    // best-effort — 실패해도 MCP 도구 결과에 영향 없음
    // 웹앱이 꺼져 있거나 네트워크 문제 등 — 무시
  }
}
