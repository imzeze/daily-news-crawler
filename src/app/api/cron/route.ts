import { NextResponse } from 'next/server'
import { collectDailyNews } from '@/lib/news/collect'

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const onlyToday = url.searchParams.get('onlyToday') === 'true'
  const result = await collectDailyNews(undefined, { onlyToday })
  return NextResponse.json(result)
}
