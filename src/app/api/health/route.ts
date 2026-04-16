// Neo4j 연결 상태 확인 API (setup 마법사에서 사용)

import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/neo4j/connection'

export async function GET() {
  const result = await testConnection()

  if (result.ok) {
    return NextResponse.json({ connected: true })
  }

  return NextResponse.json(
    { connected: false, error: result.error },
    { status: 503 }
  )
}
