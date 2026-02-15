import { NextResponse } from 'next/server'
import { removeKeyword, updateKeyword } from '@/lib/keywords/store'

type Params = {
  params: { id: string }
}

export async function PUT(request: Request, { params }: Params) {
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

  return NextResponse.json({ keyword })
}

export async function DELETE(_: Request, { params }: Params) {
  const removed = removeKeyword(params.id)
  if (!removed) {
    return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ removed: true })
}
