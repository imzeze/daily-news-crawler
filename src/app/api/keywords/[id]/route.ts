import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { removeKeyword, updateKeyword, listKeywords, setKeywords, type Keyword } from '@/lib/keywords/store'

const COOKIE_NAME = 'news_keywords'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const parseKeywordsCookie = (value?: string): Keyword[] | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Keyword[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

type Params = {
  params: { id: string }
}

export async function PUT(request: Request, { params }: Params) {
  const cookie = parseKeywordsCookie(cookies().get(COOKIE_NAME)?.value)
  if (cookie) {
    setKeywords(cookie)
  }

  const body = (await request.json()) as {
    value?: string
    enabled?: boolean
  }

  const keyword = updateKeyword(params.id, {
    value: body.value,
    enabled: body.enabled
  })

  if (!keyword) {
    return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
  }

  const keywords = listKeywords()
  const response = NextResponse.json({ keyword })
  response.cookies.set(COOKIE_NAME, JSON.stringify(keywords), {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax'
  })
  return response
}

export async function DELETE(_: Request, { params }: Params) {
  const cookie = parseKeywordsCookie(cookies().get(COOKIE_NAME)?.value)
  if (cookie) {
    setKeywords(cookie)
  }

  const removed = removeKeyword(params.id)
  if (!removed) {
    return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
  }

  const keywords = listKeywords()
  const response = NextResponse.json({ removed: true })
  response.cookies.set(COOKIE_NAME, JSON.stringify(keywords), {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax'
  })
  return response
}
