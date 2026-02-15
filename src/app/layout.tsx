import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily News Crawler',
  description: 'SAMG 및 주요 IP 관련 뉴스 데일리 센싱'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
