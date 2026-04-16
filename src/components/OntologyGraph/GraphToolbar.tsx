'use client'

// 그래프 툴바: 탭 선택 + 관계 타입 필터 + 줌 버튼
// Phase 2a: 3종 탭 전체 활성화
// 선택 상태 localStorage에 저장

import { useState, useEffect, useCallback } from 'react'
import { ALLOWED_RELATION_TYPES } from '@/types/ontology'
import type { RelationType } from '@/types/ontology'

export type GraphTab = 'force' | 'nodelink' | 'network'

interface Props {
  onTabChange?: (tab: GraphTab) => void
  onFilterChange?: (hiddenTypes: RelationType[]) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
}

const STORAGE_KEY_TAB = 'ontology_graph_tab'
const STORAGE_KEY_FILTER = 'ontology_graph_filter'

const tabs: { id: GraphTab; label: string; description: string }[] = [
  { id: 'force', label: 'Force-directed', description: '물리 시뮬레이션 그래프' },
  { id: 'nodelink', label: 'Node-link', description: 'IS_A 계층 구조 다이어그램' },
  { id: 'network', label: 'Network', description: '커뮤니티 클러스터 그래프' },
]

const RELATION_LABELS: Record<RelationType, string> = {
  IS_A: 'IS_A',
  USES: 'USES',
  PART_OF: 'PART_OF',
  HAS_PROPERTY: 'HAS_PROPERTY',
  INSTANCE_OF: 'INSTANCE_OF',
}

export default function GraphToolbar({ onTabChange, onFilterChange, onZoomIn, onZoomOut, onFitView }: Props) {
  const [activeTab, setActiveTab] = useState<GraphTab>('force')
  const [hiddenTypes, setHiddenTypes] = useState<Set<RelationType>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  // localStorage 복원
  useEffect(() => {
    const savedTab = localStorage.getItem(STORAGE_KEY_TAB) as GraphTab | null
    if (savedTab && tabs.find((t) => t.id === savedTab)) {
      setActiveTab(savedTab)
    }
    const savedFilter = localStorage.getItem(STORAGE_KEY_FILTER)
    if (savedFilter) {
      try {
        const arr = JSON.parse(savedFilter) as RelationType[]
        setHiddenTypes(new Set(arr))
      } catch {
        // 무시
      }
    }
  }, [])

  const handleTabClick = useCallback((tab: GraphTab) => {
    setActiveTab(tab)
    localStorage.setItem(STORAGE_KEY_TAB, tab)
    onTabChange?.(tab)
  }, [onTabChange])

  const toggleRelationType = useCallback((relType: RelationType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(relType)) {
        next.delete(relType)
      } else {
        next.add(relType)
      }
      const arr = Array.from(next)
      localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(arr))
      onFilterChange?.(arr)
      return next
    })
  }, [onFilterChange])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 그래프 탭 */}
      <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            title={tab.description}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 관계 필터 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          title="관계 타입 필터"
        >
          필터
          {hiddenTypes.size > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {hiddenTypes.size}
            </span>
          )}
          <span className="ml-1 text-xs">{filterOpen ? '▲' : '▼'}</span>
        </button>

        {filterOpen && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg p-2 min-w-[160px] shadow-xl">
            <p className="text-xs text-gray-400 mb-2 px-1">관계 타입 표시/숨기기</p>
            {ALLOWED_RELATION_TYPES.map((relType) => (
              <label
                key={relType}
                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!hiddenTypes.has(relType)}
                  onChange={() => toggleRelationType(relType)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-200">{RELATION_LABELS[relType]}</span>
              </label>
            ))}
            {hiddenTypes.size > 0 && (
              <button
                onClick={() => {
                  setHiddenTypes(new Set())
                  localStorage.removeItem(STORAGE_KEY_FILTER)
                  onFilterChange?.([])
                }}
                className="mt-2 w-full text-xs text-blue-400 hover:text-blue-200 text-center"
              >
                전체 표시
              </button>
            )}
          </div>
        )}
      </div>

      {/* 줌 버튼 */}
      <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
        <button
          onClick={onZoomIn}
          title="확대"
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-700 hover:text-white text-sm font-bold transition-colors"
        >
          +
        </button>
        <button
          onClick={onFitView}
          title="전체 보기"
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-700 hover:text-white text-xs transition-colors"
        >
          ⊡
        </button>
        <button
          onClick={onZoomOut}
          title="축소"
          className="px-2 py-1 rounded text-gray-300 hover:bg-gray-700 hover:text-white text-sm font-bold transition-colors"
        >
          −
        </button>
      </div>
    </div>
  )
}
