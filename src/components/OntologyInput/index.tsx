'use client'

// 자연어 입력창 + 폴백 수동 선택 UI
// LLM 모드: 텍스트 입력 (최대 1000자)
// 폴백 모드: 드롭다운 수동 선택 (노드명 + 관계 타입 + 노드명)
// PII 고지 팝업: LLM 첫 사용 시 1회 표시

import { useState, useEffect, useCallback } from 'react'
import type { LLMOntologyResponse, RelationType, OntologyGraph } from '@/types/ontology'
import { ALLOWED_RELATION_TYPES, RELATION_LABELS } from '@/types/ontology'

const MAX_INPUT_LENGTH = 1000
const PII_AGREED_KEY = 'pii_agreed'
const CONFIDENCE_THRESHOLD = 0.75

interface Props {
  onSave: (data: LLMOntologyResponse) => Promise<void>
  graph: OntologyGraph
}

export default function OntologyInput({ onSave, graph }: Props) {
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPiiNotice, setShowPiiNotice] = useState(false)
  const [pendingInput, setPendingInput] = useState<string | null>(null)

  // 확인 팝업 상태
  const [confirmData, setConfirmData] = useState<{
    data: LLMOntologyResponse
    lowConfidence: Array<{ from: string; to: string; type: string; confidence: number }>
  } | null>(null)

  // 폴백 모드 상태
  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualRelType, setManualRelType] = useState<RelationType>('USES')

  // LLM 모드 확인
  useEffect(() => {
    fetch('/api/llm/parse')
      .then((r) => r.json())
      .then((data) => setLlmAvailable(data.llmAvailable))
      .catch(() => setLlmAvailable(false))
  }, [])

  // PII 동의 확인
  const checkPiiAgreed = useCallback((): boolean => {
    return localStorage.getItem(PII_AGREED_KEY) === 'true'
  }, [])

  const agreePii = useCallback(() => {
    localStorage.setItem(PII_AGREED_KEY, 'true')
    setShowPiiNotice(false)
    // 동의 후 대기중이던 입력 전송
    if (pendingInput) {
      handleLLMParse(pendingInput)
      setPendingInput(null)
    }
  }, [pendingInput])

  // LLM 파싱 요청
  const handleLLMParse = useCallback(async (text: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/llm/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      })
      const result = await res.json()

      if (result.success && result.data) {
        const data = result.data as LLMOntologyResponse

        // confidence < 0.75 관계 확인
        const lowConf = data.relations.filter((r) => r.confidence < CONFIDENCE_THRESHOLD)

        if (lowConf.length > 0) {
          setConfirmData({
            data,
            lowConfidence: lowConf.map((r) => ({
              from: r.from,
              to: r.to,
              type: r.type,
              confidence: r.confidence,
            })),
          })
        } else {
          await onSave(data)
          setInput('')
        }
      } else if (result.mode === 'fallback') {
        setLlmAvailable(false)
      } else {
        setError(result.error || '파싱에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 실패')
    } finally {
      setLoading(false)
    }
  }, [onSave])

  // 제출 핸들러
  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return

    // PII 고지 확인
    if (!checkPiiAgreed()) {
      setPendingInput(input)
      setShowPiiNotice(true)
      return
    }

    await handleLLMParse(input)
  }, [input, checkPiiAgreed, handleLLMParse])

  // 수동 모드 제출
  const handleManualSubmit = useCallback(async () => {
    if (!manualFrom.trim() || !manualTo.trim()) return

    const data: LLMOntologyResponse = {
      nodes: [
        { name: manualFrom.trim(), type: 'Concept' },
        { name: manualTo.trim(), type: 'Concept' },
      ],
      relations: [
        {
          from: manualFrom.trim(),
          to: manualTo.trim(),
          type: manualRelType,
          label: RELATION_LABELS[manualRelType],
          confidence: 1.0,
        },
      ],
    }

    setLoading(true)
    try {
      await onSave(data)
      setManualFrom('')
      setManualTo('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }, [manualFrom, manualTo, manualRelType, onSave])

  // 확인 팝업 승인
  const handleConfirm = useCallback(async () => {
    if (!confirmData) return
    setLoading(true)
    try {
      await onSave(confirmData.data)
      setConfirmData(null)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }, [confirmData, onSave])

  // 로딩 중 표시
  if (llmAvailable === null) {
    return <div className="p-4 text-gray-400">모드 확인 중...</div>
  }

  return (
    <div className="space-y-3">
      {/* PII 고지 팝업 */}
      {showPiiNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">안내</h3>
            <p className="text-gray-300 mb-4">
              입력한 내용이 <strong className="text-yellow-400">Anthropic API</strong>로 전송됩니다.
              개인정보나 민감한 정보는 입력하지 마세요.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowPiiNotice(false); setPendingInput(null) }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={agreePii}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                이해했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confidence 확인 팝업 */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">관계 확인</h3>
            <p className="text-gray-300 mb-3">다음 관계의 신뢰도가 낮습니다. 저장할까요?</p>
            <ul className="space-y-2 mb-4">
              {confirmData.lowConfidence.map((r, i) => (
                <li key={i} className="text-sm text-yellow-300">
                  {r.from} → {r.to} ({r.type}, 신뢰도: {(r.confidence * 100).toFixed(0)}%)
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmData(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* LLM 모드: 자연어 입력 */}
      {llmAvailable ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder='예: "React는 JavaScript를 사용한다"'
              rows={2}
              maxLength={MAX_INPUT_LENGTH}
              disabled={loading}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="absolute bottom-2 right-3 text-xs text-gray-500">
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '분석 중...' : '온톨로지 생성'}
          </button>
        </div>
      ) : (
        /* 폴백 모드: 수동 선택 UI */
        <div className="space-y-2">
          <div className="p-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-xs">
            LLM API 키가 설정되지 않아 수동 입력 모드입니다.
            설정 → .env.local에 LLM_API_KEY를 추가하면 자연어 입력이 가능합니다.
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={manualFrom}
              onChange={(e) => setManualFrom(e.target.value)}
              placeholder="노드 이름"
              className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={manualRelType}
              onChange={(e) => setManualRelType(e.target.value as RelationType)}
              className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {ALLOWED_RELATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} ({RELATION_LABELS[t]})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={manualTo}
              onChange={(e) => setManualTo(e.target.value)}
              placeholder="노드 이름"
              className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={loading || !manualFrom.trim() || !manualTo.trim()}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {loading ? '저장 중...' : '관계 추가'}
          </button>
        </div>
      )}

      {/* 현재 노드 수 표시 */}
      <div className="text-xs text-gray-500 text-right">
        노드 {graph.nodes.length}개 · 관계 {graph.relations.length}개
      </div>
    </div>
  )
}
