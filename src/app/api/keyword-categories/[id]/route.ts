import { NextResponse } from 'next/server'
import { removeCategory } from '@/lib/keywords/store'

type Params = {
  params: { id: string }
}

export async function DELETE(_: Request, { params }: Params) {
  const removed = await removeCategory(params.id)
  if (!removed) {
    return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ removed: true })
}
