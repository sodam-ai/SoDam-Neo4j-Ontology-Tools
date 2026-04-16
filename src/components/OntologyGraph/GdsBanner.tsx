'use client'

// GDS 미설치 안내 배너
// gdsAvailable=false 일 때만 렌더링

interface Props {
  gdsAvailable: boolean
}

export default function GdsBanner({ gdsAvailable }: Props) {
  if (gdsAvailable) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-yellow-900/60 border border-yellow-700 rounded-lg text-sm text-yellow-200">
      <span className="text-yellow-400 text-base">⚠</span>
      <span>
        GDS 미설치: PageRank / 커뮤니티 기능 없음.
        노드 크기·색상이 균등 표시됩니다.
      </span>
      <a
        href="https://neo4j.com/docs/graph-data-science/current/installation/"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto shrink-0 underline text-yellow-300 hover:text-yellow-100"
      >
        GDS 설치 방법 →
      </a>
    </div>
  )
}
