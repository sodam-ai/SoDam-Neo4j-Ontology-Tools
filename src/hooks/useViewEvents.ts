'use client'

// SSE 클라이언트 훅 — MCP 서버 ViewEvent 실시간 수신
// 끊김 시 3초 후 자동 재연결, 언마운트 시 자동 정리

import { useEffect, useCallback, useRef } from 'react'
import type { ViewEvent } from '@/types/ontology'

export function useViewEvents(onEvent: (event: ViewEvent) => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const start = () => {
      if (disposed) return

      es = new EventSource('/api/mcp-events')

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as ViewEvent
          // 'connected' 타입은 초기 연결 확인용 — 무시
          if (event.type === 'highlight' || event.type === 'focus' || event.type === 'reset') {
            onEventRef.current(event)
          }
        } catch {
          // JSON 파싱 실패 — 무시
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        if (!disposed) {
          // 3초 후 자동 재연결
          retryTimeout = setTimeout(start, 3000)
        }
      }
    }

    start()

    // cleanup 함수
    return () => {
      disposed = true
      if (retryTimeout) clearTimeout(retryTimeout)
      es?.close()
    }
  }, [])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])
}
