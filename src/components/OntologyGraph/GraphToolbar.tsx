'use client'

// 그래프 탭 선택 UI
// Phase 1: Force-directed만 활성, 나머지 비활성 표시
// 선택 상태 localStorage에 저장

import { useState, useEffect } from 'react'

type GraphTab = 'force' | 'nodelink' | 'network'

interface Props {
  onTabChange?: (tab: GraphTab) => void
}

const STORAGE_KEY = 'ontology_graph_tab'

const tabs: { id: GraphTab; label: string; enabled: boolean; description: string }[] = [
  { id: 'force', label: 'Force-directed', enabled: true, description: '물리 시뮬레이션 그래프' },
  { id: 'nodelink', label: 'Node-link', enabled: false, description: 'Phase 2a에서 추가 예정' },
  { id: 'network', label: 'Network', enabled: false, description: 'Phase 2a에서 추가 예정' },
]

export default function GraphToolbar({ onTabChange }: Props) {
  const [activeTab, setActiveTab] = useState<GraphTab>('force')

  // localStorage에서 복원
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as GraphTab | null
    if (saved && tabs.find((t) => t.id === saved && t.enabled)) {
      setActiveTab(saved)
    }
  }, [])

  const handleTabClick = (tab: GraphTab) => {
    const tabInfo = tabs.find((t) => t.id === tab)
    if (!tabInfo?.enabled) return

    setActiveTab(tab)
    localStorage.setItem(STORAGE_KEY, tab)
    onTabChange?.(tab)
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          disabled={!tab.enabled}
          title={tab.description}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : tab.enabled
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            }
          `}
        >
          {tab.label}
          {!tab.enabled && <span className="ml-1 text-xs">(준비중)</span>}
        </button>
      ))}
    </div>
  )
}
