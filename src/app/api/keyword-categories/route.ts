import { NextResponse } from 'next/server'
import { addCategory, listCategories } from '@/lib/keywords/store'

export async function GET() {
  const categories = await listCategories()
  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '카테고리 이름을 입력해 주세요.' }, { status: 400 })
  }

  const category = await addCategory(body.name)
  return NextResponse.json({ category }, { status: 201 })
}
