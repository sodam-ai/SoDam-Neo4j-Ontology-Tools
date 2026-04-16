'use client'

// Cytoscape.js Force-directed 그래프 (cose-bilkent)
// 노드 색상: Concept=#4A90D9, Property=#5CB85C, Instance=#F0AD4E
// SSE ViewEvent (highlight/focus/reset) 처리

import { useEffect, useRef } from 'react'
import type cytoscape from 'cytoscape'
import type { OntologyGraph, ViewEvent, NodeType, RelationType } from '@/types/ontology'
import { NODE_COLORS, EDGE_COLORS } from '@/types/ontology'

// Cytoscape 동적 import (브라우저 전용)
let cytoscapeFn: typeof cytoscape | null = null
let coseBilkentRegistered = false

async function loadCytoscape(): Promise<typeof cytoscape> {
  if (cytoscapeFn) return cytoscapeFn
  const cy = (await import('cytoscape')).default
  if (!coseBilkentRegistered) {
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default
    cy.use(coseBilkent)
    coseBilkentRegistered = true
  }
  cytoscapeFn = cy
  return cy
}

interface Props {
  graph: OntologyGraph
  viewEvent?: ViewEvent | null
  onNodeClick?: (name: string) => void
}

export default function ForceDirectedGraph({ graph, viewEvent, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  // 그래프 초기화 및 데이터 업데이트
  useEffect(() => {
    let mounted = true

    async function init() {
      const cy = await loadCytoscape()
      if (!mounted || !containerRef.current) return

      // 노드 수 기반 렌더링 전략
      const nodeCount = graph.nodes.length

      // Cytoscape 요소 변환
      const elements: Array<{ group: 'nodes' | 'edges'; data: Record<string, unknown> }> = []

      for (const node of graph.nodes) {
        elements.push({
          group: 'nodes',
          data: {
            id: node.name,
            label: node.name,
            type: node.type,
            description: node.description || '',
            category: node.category || '',
            pageRank: node.pageRank || 0,
          },
        })
      }

      for (const rel of graph.relations) {
        elements.push({
          group: 'edges',
          data: {
            id: `${rel.from}-${rel.type}-${rel.to}`,
            source: rel.from,
            target: rel.to,
            relType: rel.type,
            label: rel.label,
            confidence: rel.confidence,
            weight: rel.weight || rel.confidence * 5,
          },
        })
      }

      // 기존 인스턴스 파괴
      if (cyRef.current) {
        cyRef.current.destroy()
      }

      const instance = cy({
        container: containerRef.current,
        elements,
        style: [
          // 노드 스타일
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'text-valign': 'center' as const,
              'text-halign': 'center' as const,
              'font-size': '14px',
              color: '#FFFFFF',
              'text-outline-width': 2,
              'text-outline-color': '#333333',
              'background-color': (ele: { data: (key: string) => string }) => {
                return NODE_COLORS[ele.data('type') as NodeType] || '#888888'
              },
              width: (ele: { data: (key: string) => number }) => {
                const pr = ele.data('pageRank') || 0
                return Math.max(20, Math.min(60, 20 + pr * 40))
              },
              height: (ele: { data: (key: string) => number }) => {
                const pr = ele.data('pageRank') || 0
                return Math.max(20, Math.min(60, 20 + pr * 40))
              },
              'border-width': 0,
            },
          },
          // 노드 호버
          {
            selector: 'node:active',
            style: {
              'border-width': 2,
              'border-color': '#FFFFFF',
            },
          },
          // 노드 선택
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': '#FFD700',
            },
          },
          // 하이라이트 클래스
          {
            selector: 'node.highlighted',
            style: {
              'border-width': 3,
              'border-color': '#FFD700',
              'background-opacity': 1,
            },
          },
          {
            selector: 'node.dimmed',
            style: {
              opacity: 0.3,
            },
          },
          // 엣지 스타일
          {
            selector: 'edge',
            style: {
              width: (ele: { data: (key: string) => number }) => {
                return Math.max(1, Math.min(5, ele.data('weight') || 1))
              },
              'line-color': (ele: { data: (key: string) => string }) => {
                return EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC'
              },
              'target-arrow-color': (ele: { data: (key: string) => string }) => {
                return EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC'
              },
              'target-arrow-shape': 'triangle' as const,
              'curve-style': 'bezier' as const,
              label: '',
            },
          },
          // 엣지 호버 — 레이블 표시
          {
            selector: 'edge:active',
            style: {
              label: 'data(label)',
              'font-size': '12px',
              color: '#333333',
              'text-background-color': '#FFFFFF',
              'text-background-opacity': 0.8,
              'text-background-padding': '3px',
            },
          },
        ],
        layout: {
          name: nodeCount > 200 ? 'grid' : 'cose-bilkent',
          ...(nodeCount <= 200
            ? {
                quality: 'default',
                nodeDimensionsIncludeLabels: true,
                animate: true,
                animationDuration: 500,
                idealEdgeLength: 100,
                nodeRepulsion: 4500,
                gravity: 0.25,
              }
            : {}),
        },
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.3,
      })

      // 노드 클릭 이벤트
      instance.on('tap', 'node', (e: cytoscape.EventObject) => {
        const name = e.target.data('id') as string
        onNodeClick?.(name)
      })

      cyRef.current = instance
    }

    init()

    return () => {
      mounted = false
    }
  }, [graph, onNodeClick])

  // SSE ViewEvent 처리
  useEffect(() => {
    if (!viewEvent || !cyRef.current) return
    const cy = cyRef.current

    switch (viewEvent.type) {
      case 'highlight':
        // 모든 노드 dimmed → 지정된 노드만 highlighted
        cy.nodes().removeClass('highlighted').addClass('dimmed')
        cy.edges().addClass('dimmed')
        if (viewEvent.nodeNames) {
          for (const name of viewEvent.nodeNames) {
            const node = cy.getElementById(name)
            if (node.length > 0) {
              node.removeClass('dimmed').addClass('highlighted')
              node.connectedEdges().removeClass('dimmed')
            }
          }
        }
        break

      case 'focus':
        // 중심 노드로 포커스 + 서브그래프
        cy.nodes().removeClass('highlighted dimmed')
        cy.edges().removeClass('dimmed')
        if (viewEvent.centerNode) {
          const center = cy.getElementById(viewEvent.centerNode)
          if (center.length > 0) {
            center.addClass('highlighted')
            cy.animate({
              center: { eles: center },
              zoom: 1.5,
            }, { duration: 500 })
          }
        }
        break

      case 'reset':
        // 모든 스타일 초기화
        cy.nodes().removeClass('highlighted dimmed')
        cy.edges().removeClass('dimmed')
        cy.fit(undefined, 50)
        break
    }
  }, [viewEvent])

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-gray-900 rounded-lg"
      style={{ position: 'relative' }}
    />
  )
}
