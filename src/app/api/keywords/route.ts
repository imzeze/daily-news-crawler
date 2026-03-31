import { NextResponse } from 'next/server'
import { addKeyword, listKeywords, type KeywordCategory } from '@/lib/keywords/store'

export async function GET() {
  const keywords = await listKeywords()
  return NextResponse.json({ keywords })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { value?: string; category?: KeywordCategory }
  if (!body.value?.trim()) {
    return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 })
  }

  const keyword = await addKeyword(body.value, body.category)
  return NextResponse.json({ keyword }, { status: 201 })
}
