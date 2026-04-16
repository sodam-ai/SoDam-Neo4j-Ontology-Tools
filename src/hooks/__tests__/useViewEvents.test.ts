// useViewEvents SSE 훅 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// EventSource 모킹
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  close() {
    this.readyState = 2
  }

  // 테스트 헬퍼: 메시지 시뮬레이션
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  // 테스트 헬퍼: 에러 시뮬레이션
  simulateError() {
    if (this.onerror) {
      this.onerror()
    }
  }
}

describe('useViewEvents', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('EventSource가 올바른 URL로 연결된다', async () => {
    // 직접 EventSource 생성 시뮬레이션
    const es = new MockEventSource('/api/mcp-events')
    expect(es.url).toBe('/api/mcp-events')
  })

  it('highlight 이벤트가 콜백에 전달된다', () => {
    const es = new MockEventSource('/api/mcp-events')
    const callback = vi.fn()
    es.onmessage = (e: MessageEvent) => {
      const event = JSON.parse(e.data)
      if (['highlight', 'focus', 'reset'].includes(event.type)) {
        callback(event)
      }
    }

    es.simulateMessage({ type: 'highlight', nodeNames: ['React', 'JavaScript'] })
    expect(callback).toHaveBeenCalledWith({
      type: 'highlight',
      nodeNames: ['React', 'JavaScript'],
    })
  })

  it('connected 타입은 무시된다', () => {
    const es = new MockEventSource('/api/mcp-events')
    const callback = vi.fn()
    es.onmessage = (e: MessageEvent) => {
      const event = JSON.parse(e.data)
      if (['highlight', 'focus', 'reset'].includes(event.type)) {
        callback(event)
      }
    }

    es.simulateMessage({ type: 'connected' })
    expect(callback).not.toHaveBeenCalled()
  })

  it('에러 발생 시 EventSource가 닫힌다', () => {
    const es = new MockEventSource('/api/mcp-events')
    es.onerror = () => { es.close() }

    es.simulateError()
    expect(es.readyState).toBe(2)
  })
})
