import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { addKeyword, listKeywords, setKeywords, type Keyword } from '@/lib/keywords/store'

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

const respondWithKeywords = (keywords: Keyword[]) => {
  const response = NextResponse.json({ keywords })
  response.cookies.set(COOKIE_NAME, JSON.stringify(keywords), {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax'
  })
  return response
}

export async function GET() {
  const cookie = parseKeywordsCookie(cookies().get(COOKIE_NAME)?.value)
  const keywords = cookie ? setKeywords(cookie) : listKeywords()
  return respondWithKeywords(keywords)
}

export async function POST(request: Request) {
  const cookie = parseKeywordsCookie(cookies().get(COOKIE_NAME)?.value)
  if (cookie) {
    setKeywords(cookie)
  }

  const body = (await request.json()) as { value?: string }
  if (!body.value) {
    return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 })
  }

  const keyword = addKeyword(body.value)
  const keywords = listKeywords()
  const response = NextResponse.json({ keyword }, { status: 201 })
  response.cookies.set(COOKIE_NAME, JSON.stringify(keywords), {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax'
  })
  return response
}
