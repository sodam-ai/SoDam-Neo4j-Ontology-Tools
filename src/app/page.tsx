'use client'

// 메인 화면: Force-directed 그래프 + 자연어 입력창
// Neo4j 미연결 시 /setup 자동 리다이렉트

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import GraphToolbar from '@/components/OntologyGraph/GraphToolbar'
import OntologyInput from '@/components/OntologyInput'
import { useViewEvents } from '@/hooks/useViewEvents'
import type { OntologyGraph, LLMOntologyResponse, ViewEvent } from '@/types/ontology'

// Cytoscape는 브라우저 전용 → dynamic import (ssr: false)
const ForceDirectedGraph = dynamic(
  () => import('@/components/OntologyGraph/ForceDirectedGraph'),
  { ssr: false, loading: () => <div className="w-full h-[500px] bg-gray-900 rounded-lg animate-pulse" /> }
)

export default function HomePage() {
  const router = useRouter()
  const [graph, setGraph] = useState<OntologyGraph>({ nodes: [], relations: [] })
  const [loading, setLoading] = useState(true)
  const [viewEvent, setViewEvent] = useState<ViewEvent | null>(null)

  // SSE ViewEvent 수신
  useViewEvents(useCallback((event: ViewEvent) => {
    setViewEvent(event)
    // 5초 후 자동 리셋
    if (event.type !== 'reset') {
      setTimeout(() => setViewEvent({ type: 'reset' }), 5000)
    }
  }, []))

  // 초기 로딩: Neo4j 연결 확인 + 그래프 데이터 조회
  useEffect(() => {
    async function init() {
      try {
        // 연결 확인
        const healthRes = await fetch('/api/health')
        const health = await healthRes.json()
        if (!health.connected) {
          router.push('/setup')
          return
        }

        // 그래프 데이터 로딩
        const graphRes = await fetch('/api/ontology')
        if (graphRes.ok) {
          const data = await graphRes.json()
          setGraph(data)
        }
      } catch {
        router.push('/setup')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // 온톨로지 저장 콜백
  const handleSave = useCallback(async (data: LLMOntologyResponse) => {
    const res = await fetch('/api/ontology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || '저장 실패')
    }
    const updatedGraph = await res.json()
    setGraph(updatedGraph)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-lg">연결 확인 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">
          Neo4j 온톨로지 도구
        </h1>
        <div className="flex items-center gap-3">
          <GraphToolbar />
          <a
            href="/settings"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            설정
          </a>
        </div>
      </header>

      {/* 메인: 그래프 영역 */}
      <main className="flex-1 relative overflow-hidden p-4">
        <ForceDirectedGraph
          graph={graph}
          viewEvent={viewEvent}
          onNodeClick={(name) => {
            console.log('노드 클릭:', name)
          }}
        />
      </main>

      {/* 하단: 입력 영역 */}
      <footer className="border-t border-gray-800 p-4">
        <div className="max-w-2xl mx-auto">
          <OntologyInput onSave={handleSave} graph={graph} />
        </div>
      </footer>
    </div>
  )
}
