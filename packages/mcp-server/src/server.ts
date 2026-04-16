#!/usr/bin/env node
// Neo4j 온톨로지 MCP 서버 — 읽기 전용 3개 도구
// 쓰기 도구(add_concept, add_relationship) 추가 금지

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import neo4j from 'neo4j-driver'
import { handleQueryOntology } from './tools/query-ontology.js'
import { handleSearchOntology } from './tools/search-ontology.js'
import { handleGetContext } from './tools/get-context.js'

// Neo4j 드라이버 생성 (환경변수에서만 읽기 — 하드코딩 금지)
function createDriver() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
  const user = process.env.NEO4J_USER || 'neo4j'
  const password = process.env.NEO4J_PASSWORD

  if (!password) {
    console.error(
      '[MCP] NEO4J_PASSWORD 환경변수가 설정되지 않았습니다.\n' +
      '웹앱 /settings에서 연결 설정을 확인하세요.'
    )
    process.exit(1)
  }

  return neo4j.driver(uri, neo4j.auth.basic(user, password))
}

async function main() {
  const driver = createDriver()

  // 연결 테스트
  try {
    await driver.verifyConnectivity()
    console.error('[MCP] Neo4j 연결 성공')
  } catch (err) {
    console.error('[MCP] Neo4j 연결 실패:', err instanceof Error ? err.message : err)
    console.error('[MCP] 웹앱 /settings에서 연결 설정을 확인하세요.')
  }

  const server = new McpServer({
    name: 'neo4j-ontology',
    version: '0.1.0',
  })

  // 도구 1: query_ontology — 조건으로 노드/관계 조회
  server.tool(
    'query_ontology',
    '온톨로지 노드와 관계를 조건으로 조회합니다. 노드 이름, 타입, 카테고리로 필터링하고, depth로 연결 깊이를 지정합니다.',
    {
      name: z.string().optional().describe('노드 이름 (부분 일치)'),
      type: z.enum(['Concept', 'Property', 'Instance']).optional().describe('노드 타입 필터'),
      category: z.string().optional().describe('카테고리 필터'),
      depth: z.number().min(1).max(3).default(1).describe('관계 탐색 깊이 (기본 1, 최대 3)'),
    },
    async (args) => {
      const text = await handleQueryOntology(driver, args)
      return { content: [{ type: 'text', text }] }
    }
  )

  // 도구 2: search_ontology — Fulltext 검색
  server.tool(
    'search_ontology',
    '온톨로지에서 키워드로 Fulltext 검색합니다. 노드 이름과 설명에서 검색하며, 카테고리로 필터링할 수 있습니다.',
    {
      keyword: z.string().describe('검색 키워드 (필수)'),
      category: z.string().optional().describe('카테고리 필터'),
      limit: z.number().min(1).max(50).default(20).describe('최대 결과 수 (기본 20, 최대 50)'),
    },
    async (args) => {
      const text = await handleSearchOntology(driver, args)
      return { content: [{ type: 'text', text }] }
    }
  )

  // 도구 3: get_context — 특정 개념의 1~2홉 맥락 조회
  server.tool(
    'get_context',
    '특정 개념의 주변 맥락(1~2홉 연결)을 조회합니다. 중심 노드와 연결된 모든 노드, 관계를 가져옵니다. 최대 50노드/100관계.',
    {
      name: z.string().describe('중심 노드 이름 (필수)'),
      depth: z.number().min(1).max(2).default(1).describe('탐색 깊이 (기본 1, 최대 2)'),
    },
    async (args) => {
      const text = await handleGetContext(driver, args)
      return { content: [{ type: 'text', text }] }
    }
  )

  // stdio 트랜스포트로 실행
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[MCP] Neo4j 온톨로지 서버 시작됨 (읽기 전용 3개 도구)')

  // 프로세스 종료 시 드라이버 정리
  process.on('SIGINT', async () => {
    await driver.close()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await driver.close()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[MCP] 서버 시작 실패:', err)
  process.exit(1)
})
