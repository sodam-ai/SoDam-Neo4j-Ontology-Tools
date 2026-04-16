'use client'

// 설정 마법사 — 첫 접속 시 자동 리다이렉트
// Step 1: Neo4j 연결 테스트
// Step 2: .env.local 설정 안내
// Step 3: MCP config 자동 생성 + 복사

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [neo4jStatus, setNeo4jStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [neo4jError, setNeo4jError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Neo4j 연결 테스트
  const testConnection = useCallback(async () => {
    setNeo4jStatus('testing')
    setNeo4jError(null)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.connected) {
        setNeo4jStatus('ok')
      } else {
        setNeo4jStatus('fail')
        setNeo4jError(data.error || 'Neo4j에 연결할 수 없습니다.')
      }
    } catch {
      setNeo4jStatus('fail')
      setNeo4jError('서버에 연결할 수 없습니다. .env.local 파일이 존재하는지 확인해 주세요.')
    }
  }, [])

  // 클립보드 복사
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // 복사 실패 — 무시
    }
  }, [])

  const envExample = `NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=여기에_비밀번호_입력
LLM_API_KEY=sk-ant-api03-여기에_키_입력
LLM_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_APP_PORT=3000
WEB_APP_URL=http://localhost:3000`

  const mcpConfig = `{
  "mcpServers": {
    "neo4j-ontology": {
      "command": "node",
      "args": ["${process.env.NEXT_PUBLIC_PROJECT_PATH || 'D:/AI_Dev_Work/2026y/26y_04m_17d_neo4j_ontology_tools'}/packages/mcp-server/dist/server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "\${NEO4J_PASSWORD}",
        "WEB_APP_URL": "http://localhost:3000"
      }
    }
  }
}`

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <h1 className="text-2xl font-bold text-white mb-2">설정 마법사</h1>
        <p className="text-gray-400 mb-6">Neo4j 온톨로지 도구를 처음 사용하기 위한 설정입니다.</p>

        {/* 단계 표시 */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Neo4j 연결 테스트 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Neo4j 연결 확인</h2>
            <p className="text-gray-400 text-sm">
              Neo4j Desktop이 실행 중이어야 합니다.
              설치가 안 되어 있다면{' '}
              <a href="https://neo4j.com/download/" target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline">
                여기에서 다운로드
              </a>하세요.
            </p>

            {neo4jStatus === 'ok' && (
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
                Neo4j 연결 성공!
              </div>
            )}
            {neo4jStatus === 'fail' && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm whitespace-pre-wrap">
                {neo4jError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={testConnection}
                disabled={neo4jStatus === 'testing'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {neo4jStatus === 'testing' ? '테스트 중...' : '연결 테스트'}
              </button>
              {neo4jStatus === 'ok' && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  다음
                </button>
              )}
              {neo4jStatus === 'fail' && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  건너뛰기 (.env.local 먼저 설정)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: .env.local 설정 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">.env.local 설정</h2>
            <p className="text-gray-400 text-sm">
              프로젝트 루트에 <code className="text-blue-400">.env.local</code> 파일을 만들고 아래 내용을 붙여넣으세요.
            </p>

            <div className="relative">
              <pre className="p-4 bg-gray-800 rounded-lg text-sm text-gray-300 overflow-x-auto">
                {envExample}
              </pre>
              <button
                onClick={() => copyToClipboard(envExample, 'env')}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {copied === 'env' ? '복사됨!' : '복사'}
              </button>
            </div>

            <p className="text-yellow-400 text-xs">
              LLM_API_KEY는 선택사항입니다. 없으면 수동 드롭다운 모드로 동작합니다.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3: MCP Config */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">MCP 서버 설정</h2>
            <p className="text-gray-400 text-sm">
              Claude Code에서 온톨로지를 조회하려면 아래 설정을{' '}
              <code className="text-blue-400">claude_desktop_config.json</code>에 추가하세요.
            </p>
            <p className="text-gray-500 text-xs">
              Windows 경로: <code>%APPDATA%\Claude\claude_desktop_config.json</code>
            </p>

            <div className="relative">
              <pre className="p-4 bg-gray-800 rounded-lg text-sm text-gray-300 overflow-x-auto">
                {mcpConfig}
              </pre>
              <button
                onClick={() => copyToClipboard(mcpConfig, 'mcp')}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {copied === 'mcp' ? '복사됨!' : '복사'}
              </button>
            </div>

            <p className="text-yellow-400 text-xs">
              NEO4J_PASSWORD는 시스템 환경변수로 설정해야 합니다. 평문 입력은 보안 위험!
            </p>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                이전
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
              >
                설정 완료 — 시작하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
