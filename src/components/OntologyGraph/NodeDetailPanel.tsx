'use client'

// 노드 클릭 시 오른쪽에 표시되는 상세 정보 패널
// 노드 이름, 타입, 설명, 카테고리, 생성일, PageRank, 커뮤니티 ID 표시

import type { OntologyNode } from '@/types/ontology'
import { NODE_COLORS } from '@/types/ontology'

interface Props {
  node: OntologyNode | null
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  Concept: '개념',
  Property: '속성',
  Instance: '인스턴스',
}

export default function NodeDetailPanel({ node, onClose }: Props) {
  if (!node) return null

  const color = NODE_COLORS[node.type] ?? '#888888'
  const typeLabel = TYPE_LABELS[node.type] ?? node.type
  const createdDate = node.created_at
    ? new Date(node.created_at).toLocaleDateString('ko-KR')
    : '-'

  return (
    <div className="absolute top-4 right-4 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-10 overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `2px solid ${color}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-white font-semibold truncate">{node.name}</span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-2 text-gray-400 hover:text-white text-lg leading-none"
          aria-label="패널 닫기"
        >
          ×
        </button>
      </div>

      {/* 본문 */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <Row label="타입" value={typeLabel} />
        {node.description && <Row label="설명" value={node.description} />}
        {node.category && <Row label="분류" value={node.category} />}
        <Row label="생성일" value={createdDate} />

        {/* GDS 데이터 */}
        <div className="pt-2 border-t border-gray-700 space-y-2">
          <Row
            label="PageRank"
            value={
              node.pageRank && node.pageRank > 0
                ? node.pageRank.toFixed(4)
                : 'GDS 미설치'
            }
          />
          <Row
            label="커뮤니티"
            value={
              node.communityId && node.communityId > 0
                ? `#${node.communityId}`
                : 'GDS 미설치'
            }
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-gray-400 w-16">{label}</span>
      <span className="text-gray-100 break-all">{value}</span>
    </div>
  )
}
