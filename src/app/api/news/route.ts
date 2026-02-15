import { NextResponse } from 'next/server'
import { collectDailyNews } from '@/lib/news/collect'

export async function GET() {
  const result = await collectDailyNews()
  return NextResponse.json(result)
}

export async function POST() {
  const result = await collectDailyNews()
  return NextResponse.json(result)
}
