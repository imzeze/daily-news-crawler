import { NextResponse } from 'next/server'
import { addKeyword, listKeywords } from '@/lib/keywords/store'

export async function GET() {
  const keywords = await listKeywords()
  return NextResponse.json({ keywords })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { value?: string }
  if (!body.value) {
    return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 })
  }

  const keyword = await addKeyword(body.value)
  return NextResponse.json({ keyword }, { status: 201 })
}
