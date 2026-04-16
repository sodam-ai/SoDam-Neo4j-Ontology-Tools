'use client'

// 메인 화면: 3종 그래프 + 자연어 입력창
// Neo4j 미연결 시 /setup 자동 리다이렉트
// Phase 2a: Force / Node-link / Network 탭 전환 + GDS 배너 + NodeDetailPanel

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import GraphToolbar from '@/components/OntologyGraph/GraphToolbar'
import type { GraphTab } from '@/components/OntologyGraph/GraphToolbar'
import GdsBanner from '@/components/OntologyGraph/GdsBanner'
import NodeDetailPanel from '@/components/OntologyGraph/NodeDetailPanel'
import OntologyInput from '@/components/OntologyInput'
import { useViewEvents } from '@/hooks/useViewEvents'
import type { OntologyGraph, OntologyNode, LLMOntologyResponse, ViewEvent, RelationType } from '@/types/ontology'
import type { GraphHandle } from '@/components/OntologyGraph/ForceDirectedGraph'

// Cytoscape 컴포넌트는 브라우저 전용 → dynamic import (ssr: false)
const ForceDirectedGraph = dynamic(
  () => import('@/components/OntologyGraph/ForceDirectedGraph'),
  { ssr: false, loading: () => <GraphLoading /> }
)
const NodeLinkDiagram = dynamic(
  () => import('@/components/OntologyGraph/NodeLinkDiagram'),
  { ssr: false, loading: () => <GraphLoading /> }
)
const NetworkGraph = dynamic(
  () => import('@/components/OntologyGraph/NetworkGraph'),
  { ssr: false, loading: () => <GraphLoading /> }
)

function GraphLoading() {
  return <div className="w-full h-[500px] bg-gray-900 rounded-lg animate-pulse" />
}

const PAGERANK_DEBOUNCE_MS = 30_000

export default function HomePage() {
  const router = useRouter()
  const [graph, setGraph] = useState<OntologyGraph>({ nodes: [], relations: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<GraphTab>('force')
  const [viewEvent, setViewEvent] = useState<ViewEvent | null>(null)
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null)
  const [gdsAvailable, setGdsAvailable] = useState(true) // 낙관적 기본값
  const graphRef = useRef<GraphHandle>(null)
  const pageRankTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // SSE ViewEvent 수신
  useViewEvents(useCallback((event: ViewEvent) => {
    setViewEvent(event)
    if (event.type !== 'reset') {
      setTimeout(() => setViewEvent({ type: 'reset' }), 5000)
    }
  }, []))

  // 그래프 데이터 로딩 (GDS 포함)
  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/ontology')
      if (res.ok) {
        const data: OntologyGraph = await res.json()
        setGraph(data)
        // GDS 설치 여부: pageRank가 0이 아닌 노드가 하나라도 있으면 GDS 설치됨
        const hasGds = data.nodes.some((n) => (n.pageRank ?? 0) > 0)
        setGdsAvailable(hasGds || data.nodes.length === 0)
      }
    } catch {
      // 조용히 실패
    }
  }, [])

  // PageRank 30초 디바운스 자동 갱신
  const schedulePageRankRefresh = useCallback(() => {
    if (pageRankTimer.current) clearTimeout(pageRankTimer.current)
    pageRankTimer.current = setTimeout(() => {
      loadGraph()
    }, PAGERANK_DEBOUNCE_MS)
  }, [loadGraph])

  // 초기 로딩
  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch('/api/health')
        const health = await healthRes.json()
        if (!health.connected) {
          router.push('/setup')
          return
        }
        await loadGraph()
      } catch {
        router.push('/setup')
      } finally {
        setLoading(false)
      }
    }
    init()
    return () => {
      if (pageRankTimer.current) clearTimeout(pageRankTimer.current)
    }
  }, [router, loadGraph])

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
    const updatedGraph: OntologyGraph = await res.json()
    setGraph(updatedGraph)
    // 저장 후 PageRank 갱신 타이머 리셋
    schedulePageRankRefresh()
  }, [schedulePageRankRefresh])

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback((name: string) => {
    const node = graph.nodes.find((n) => n.name === name) ?? null
    setSelectedNode(node)
  }, [graph.nodes])

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((hiddenTypes: RelationType[]) => {
    graphRef.current?.applyFilter(hiddenTypes)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-lg">연결 확인 중...</div>
      </div>
    )
  }

  const commonGraphProps = {
    graph,
    viewEvent,
    onNodeClick: handleNodeClick,
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">Neo4j 온톨로지 도구</h1>
        <div className="flex items-center gap-3">
          <GraphToolbar
            onTabChange={setActiveTab}
            onFilterChange={handleFilterChange}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onFitView={() => graphRef.current?.fitView()}
          />
          <button
            onClick={loadGraph}
            title="PageRank 즉시 갱신"
            className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1 transition-colors"
          >
            ↻ 갱신
          </button>
          <a href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
            설정
          </a>
        </div>
      </header>

      {/* GDS 미설치 배너 */}
      {!gdsAvailable && graph.nodes.length > 0 && (
        <div className="px-4 pt-2">
          <GdsBanner gdsAvailable={false} />
        </div>
      )}

      {/* 메인: 그래프 영역 */}
      <main className="flex-1 relative overflow-hidden p-4">
        {/* 그래프 탭 전환 */}
        {activeTab === 'force' && (
          <ForceDirectedGraph ref={graphRef} {...commonGraphProps} />
        )}
        {activeTab === 'nodelink' && (
          <NodeLinkDiagram ref={graphRef} {...commonGraphProps} />
        )}
        {activeTab === 'network' && (
          <NetworkGraph ref={graphRef} {...commonGraphProps} />
        )}

        {/* 노드 상세 패널 */}
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
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
