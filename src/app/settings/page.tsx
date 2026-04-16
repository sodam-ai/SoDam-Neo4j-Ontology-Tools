'use client'

// 설정 페이지 — Neo4j 연결 상태 확인/테스트

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [error, setError] = useState<string | null>(null)

  const testConnection = useCallback(async () => {
    setStatus('testing')
    setError(null)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.connected) {
        setStatus('ok')
      } else {
        setStatus('fail')
        setError(data.error || 'Neo4j에 연결할 수 없습니다.')
      }
    } catch {
      setStatus('fail')
      setError('서버에 연결할 수 없습니다.')
    }
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">설정</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← 메인으로
          </button>
        </div>

        {/* Neo4j 연결 */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Neo4j 연결</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>URI: <code className="text-blue-400">{process.env.NEXT_PUBLIC_NEO4J_URI || 'bolt://localhost:7687'}</code> (.env.local)</p>
            <p>User: <code className="text-blue-400">neo4j</code></p>
          </div>

          {status === 'ok' && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
              연결 성공
            </div>
          )}
          {status === 'fail' && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {status === 'testing' ? '테스트 중...' : '연결 테스트'}
          </button>
        </section>

        {/* 환경변수 안내 */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">환경변수</h2>
          <p className="text-sm text-gray-400">
            <code className="text-blue-400">.env.local</code> 파일을 수정한 후에는 서버를 재시작해야 합니다.
          </p>
          <pre className="p-4 bg-gray-800 rounded-lg text-xs text-gray-400 overflow-x-auto">{`NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=비밀번호
LLM_API_KEY=sk-ant-api03-...  (선택)
WEB_APP_URL=http://localhost:3000`}</pre>
        </section>

        {/* 초기 설정 마법사 링크 */}
        <div className="text-center">
          <button
            onClick={() => router.push('/setup')}
            className="text-sm text-gray-500 hover:text-blue-400 transition-colors"
          >
            초기 설정 마법사 다시 실행
          </button>
        </div>
      </div>
    </div>
  )
}
