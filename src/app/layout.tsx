import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Neo4j 온톨로지 도구',
  description: '자연어 입력으로 Neo4j 지식그래프를 자동 생성하는 로컬 웹 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
