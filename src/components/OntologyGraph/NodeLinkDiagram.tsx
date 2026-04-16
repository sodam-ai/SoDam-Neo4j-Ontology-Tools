'use client'

// Node-link Diagram — Cytoscape.js dagre 레이아웃
// IS_A 관계: 계층 구조 실선 / 나머지: 점선
// 노드 수 > 200 → grid 폴백

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type cytoscape from 'cytoscape'
import type { OntologyGraph, ViewEvent, NodeType, RelationType } from '@/types/ontology'
import { NODE_COLORS, EDGE_COLORS } from '@/types/ontology'
import type { GraphHandle } from './ForceDirectedGraph'

let cytoscapeFn: typeof cytoscape | null = null
let dagreRegistered = false

async function loadCytoscape(): Promise<typeof cytoscape> {
  if (cytoscapeFn) return cytoscapeFn
  const cy = (await import('cytoscape')).default
  if (!dagreRegistered) {
    const dagre = (await import('cytoscape-dagre')).default
    cy.use(dagre)
    dagreRegistered = true
  }
  cytoscapeFn = cy
  return cy
}

interface Props {
  graph: OntologyGraph
  viewEvent?: ViewEvent | null
  onNodeClick?: (name: string) => void
}

const NodeLinkDiagram = forwardRef<GraphHandle, Props>(function NodeLinkDiagram(
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
            isHierarchy: rel.type === 'IS_A',
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
              'background-color': (ele: { data: (key: string) => string }) =>
                NODE_COLORS[ele.data('type') as NodeType] || '#888888',
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
          // IS_A 실선
          {
            selector: 'edge[?isHierarchy]',
            style: {
              width: (ele: { data: (key: string) => number }) =>
                Math.max(1, Math.min(5, ele.data('weight') || 1)),
              'line-color': EDGE_COLORS['IS_A'],
              'target-arrow-color': EDGE_COLORS['IS_A'],
              'target-arrow-shape': 'triangle' as const,
              'curve-style': 'bezier' as const,
              'line-style': 'solid' as const,
            },
          },
          // 나머지 관계 점선
          {
            selector: 'edge[!isHierarchy]',
            style: {
              width: 1,
              'line-color': (ele: { data: (key: string) => string }) =>
                EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC',
              'target-arrow-color': (ele: { data: (key: string) => string }) =>
                EDGE_COLORS[ele.data('relType') as RelationType] || '#CCCCCC',
              'target-arrow-shape': 'triangle' as const,
              'curve-style': 'bezier' as const,
              'line-style': 'dashed' as const,
              'line-dash-pattern': [6, 3],
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
              name: 'dagre',
              rankDir: 'TB',
              nodeSep: 50,
              rankSep: 80,
              animate: true,
              animationDuration: 400,
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

export default NodeLinkDiagram
