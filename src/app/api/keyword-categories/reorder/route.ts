import { NextResponse } from 'next/server'
import { reorderCategories } from '@/lib/keywords/store'

export async function PUT(request: Request) {
  const body = (await request.json()) as { ids?: string[] }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: '순서 목록이 필요합니다.' }, { status: 400 })
  }

  const categories = await reorderCategories(body.ids)
  return NextResponse.json({ categories })
}
