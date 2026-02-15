import { fetchRssArticles } from './rss'
import type { Article } from './types'

export type NewsProvider = 'naver' | 'google'

export type ProviderResult = {
  provider: NewsProvider
  articles: Article[]
}

export async function fetchFromNaver(keyword: string): Promise<ProviderResult> {
  const baseUrl =
    process.env.NAVER_NEWS_RSS_BASE ??
    'https://news.naver.com/main/rss/search.naver?query='
  const url = `${baseUrl}${encodeURIComponent(keyword)}`
  const articles = await fetchRssArticles({
    url,
    keyword,
    provider: 'naver'
  })
  return {
    provider: 'naver',
    articles
  }
}

export async function fetchFromGoogle(keyword: string): Promise<ProviderResult> {
  const baseUrl =
    process.env.GOOGLE_NEWS_RSS_BASE ??
    'https://news.google.com/rss/search?q='
  const url = `${baseUrl}${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`
  const articles = await fetchRssArticles({
    url,
    keyword,
    provider: 'google'
  })
  return {
    provider: 'google',
    articles
  }
}
