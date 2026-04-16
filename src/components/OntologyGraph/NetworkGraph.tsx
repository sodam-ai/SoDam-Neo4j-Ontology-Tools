'use client'

// Network Graph — Cytoscape.js cola 레이아웃
// communityId → 노드 배경색 (10색 팔레트)
// GDS 미설치 시 communityId=0 → 단일 색상
// 노드 수 > 200 → grid 폴백

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type cytoscape from 'cytoscape'
import type { OntologyGraph, ViewEvent, RelationType } from '@/types/ontology'
import { EDGE_COLORS } from '@/types/ontology'
import type { GraphHandle } from './ForceDirectedGraph'

// 커뮤니티 색상 팔레트 (10색)
const COMMUNITY_COLORS = [
  '#4A90D9', // 0 — GDS 미설치 기본색 (파랑)
  '#E67E22', // 1
  '#2ECC71', // 2
  '#9B59B6', // 3
  '#E74C3C', // 4
  '#1ABC9C', // 5
  '#F39C12', // 6
  '#3498DB', // 7
  '#D35400', // 8
  '#27AE60', // 9
]

function communityColor(id: number): string {
  return COMMUNITY_COLORS[id % COMMUNITY_COLORS.length]
}

let cytoscapeFn: typeof cytoscape | null = null
let colaRegistered = false

async function loadCytoscape(): Promise<typeof cytoscape> {
  if (cytoscapeFn) return cytoscapeFn
  const cy = (await import('cytoscape')).default
  if (!colaRegistered) {
    const cola = (await import('cytoscape-cola')).default
    cy.use(cola)
    colaRegistered = true
  }
  cytoscapeFn = cy
  return cy
}

interface Props {
  graph: OntologyGraph
  viewEvent?: ViewEvent | null
  onNodeClick?: (name: string) => void
}

const NetworkGraph = forwardRef<GraphHandle, Props>(function NetworkGraph(
  { graph, viewEvent, onNodeClick }: Props,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useImperativeHandle(ref, () => ({
    zoomIn: () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3),
    zoomOut: () => cyRef.current?.zoom(cyRef.current.zoom() * 0.7),
    fitView: () => cyRef.current?.fit(undefined, 50),
    applyFilter: (hiddenTypes: RelationType[]) => {
      if (!cyRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(cyRef.current.edges() as any).show()
      for (const t of hiddenTypes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(cyRef.current.edges(`[relType = "${t}"]`) as any).hide()
      }
    },
  }))

  useEffect(() => {
    let mounted = true

    async function init() {
      const cy = await loadCytoscape()
      if (!mounted || !containerRef.current) return

      const nodeCount = graph.nodes.length
      const elements: Array<{ group: 'nodes' | 'edges'; data: Record<string, unknown> }> = []

      for (const node of graph.nodes) {
        elements.push({
          group: 'nodes',
          data: {
            id: node.name,
            label: node.name,
            communityId: node.communityId ?? 0,
            pageRank: node.pageRank ?? 0,
            description: node.description || '',
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
            weight: rel.weight || rel.confidence * 5,
          },
        })
      }

      if (cyRef.current) cyRef.current.destroy()

      const instance = cy({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'text-valign': 'center' as const,
              'text-halign': 'center' as const,
              'font-size': '13px',
              color: '#FFFFFF',
              'text-outline-width': 2,
              'text-outline-color': '#333333',
              'background-color': (ele: { data: (key: string) => number }) =>
                communityColor(ele.data('communityId') || 0),
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
          {
            selector: 'node:selected',
            style: { 'border-width': 3, 'border-color': '#FFD700' },
          },
          {
            selector: 'node.highlighted',
            style: { 'border-width': 3, 'border-color': '#FFD700', 'background-opacity': 1 },
          },
          {
            selector: 'node.dimmed',
            style: { opacity: 0.3 },
          },
          {
            selector: 'edge',
            style: {
              width: (ele: { data: (key: string) => number }) =>
                Math.max(1, Math.min(5, ele.data('weight') || 1)),
              'line-color': (ele: { data: (key: string) => string }) =>
                EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC',
              'target-arrow-color': (ele: { data: (key: string) => string }) =>
                EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC',
              'target-arrow-shape': 'triangle' as const,
              'curve-style': 'bezier' as const,
            },
          },
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layout: (nodeCount > 200
          ? { name: 'grid' }
          : {
              name: 'cola',
              animate: true,
              animationDuration: 500,
              convergenceThreshold: 0.01,
              nodeSpacing: 15,
            }) as any,
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.3,
      })

      instance.on('tap', 'node', (e: cytoscape.EventObject) => {
        onNodeClick?.(e.target.data('id') as string)
      })

      cyRef.current = instance
    }

    init()
    return () => { mounted = false }
  }, [graph, onNodeClick])

  // SSE ViewEvent 처리
  useEffect(() => {
    if (!viewEvent || !cyRef.current) return
    const cy = cyRef.current
    switch (viewEvent.type) {
      case 'highlight':
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
        cy.nodes().removeClass('highlighted dimmed')
        cy.edges().removeClass('dimmed')
        if (viewEvent.centerNode) {
          const center = cy.getElementById(viewEvent.centerNode)
          if (center.length > 0) {
            center.addClass('highlighted')
            cy.animate({ center: { eles: center }, zoom: 1.5 }, { duration: 500 })
          }
        }
        break
      case 'reset':
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
})

export default NetworkGraph
