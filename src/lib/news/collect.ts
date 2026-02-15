import { listKeywords } from '@/lib/keywords/store'
import type { Article } from './types'
import { fetchFromGoogle, fetchFromNaver } from './providers'

export type CollectResult = {
  articles: Article[]
  collectedAt: string
}

export async function collectDailyNews(): Promise<CollectResult> {
  const keywords = listKeywords().filter((keyword) => keyword.enabled)
  const tasks = keywords.flatMap((keyword) => [
    fetchFromNaver(keyword.value),
    fetchFromGoogle(keyword.value)
  ])
  const results = await Promise.all(tasks)
  const articles = results.flatMap((result) => result.articles)
  return {
    articles,
    collectedAt: new Date().toISOString()
  }
}
