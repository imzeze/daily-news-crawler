import { promises as fs } from 'fs'
import path from 'path'

export const KEYWORD_CATEGORIES = ['SAMG', '콘텐츠 산업', '구글 영문 검색'] as const

export type KeywordCategory = (typeof KEYWORD_CATEGORIES)[number]

export type Keyword = {
  id: string
  value: string
  category: KeywordCategory
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const now = () => new Date().toISOString()

const CATEGORY_ORDER: Record<KeywordCategory, number> = {
  SAMG: 0,
  '콘텐츠 산업': 1,
  '구글 영문 검색': 2
}

const CATEGORY_KEYWORDS: Record<KeywordCategory, string[]> = {
  SAMG: [
    'SAMG엔터',
    '에스에이엠지',
    'SAMG',
    '티니핑',
    '하츄핑',
    '사랑의 하츄핑',
    '오로라핑',
    '레전드티니핑',
    '로얄티니핑',
    '메탈카드봇',
    '미니특공대',
    '위시캣',
    '더티니핑',
    '이모션캐슬',
    '마이핑'
  ],
  '콘텐츠 산업': [
    '콘텐츠IP',
    '캐릭터IP',
    '게임IP',
    '콘진원',
    '팝마트',
    '라부부',
    '산리오',
    '반다이남코',
    '포켓몬'
  ],
  '구글 영문 검색': [
    'TEENIEPING',
    'THETEENIEPING',
    'SAMG ENTERTAINMENT',
    'K-ANIMATION',
    'teenieping',
    'metalcardbot',
    'emotioncastle',
    'myping'
  ]
}

const inferCategory = (value: string): KeywordCategory => {
  const trimmedValue = value.trim()
  for (const category of KEYWORD_CATEGORIES) {
    if (CATEGORY_KEYWORDS[category].includes(trimmedValue)) {
      return category
    }
  }

  return /^[A-Za-z0-9\s-]+$/.test(trimmedValue) ? '구글 영문 검색' : 'SAMG'
}

const normalizeCategory = (
  category: string | undefined,
  value: string
): KeywordCategory => {
  if (category && KEYWORD_CATEGORIES.includes(category as KeywordCategory)) {
    return category as KeywordCategory
  }

  return inferCategory(value)
}

const buildDefaultKeywords = (): Keyword[] =>
  KEYWORD_CATEGORIES.flatMap((category) =>
    CATEGORY_KEYWORDS[category].map((value, index) => ({
      id: `${category}-${index + 1}`,
      value,
      category,
      enabled: true,
      createdAt: now(),
      updatedAt: now()
    }))
  )

const DEFAULT_KEYWORDS: Keyword[] = buildDefaultKeywords()

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'keywords.json')

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_KEYWORDS, null, 2), 'utf-8')
  }
}

async function readKeywordsFile(): Promise<Keyword[]> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, 'utf-8')
  try {
    const parsed = JSON.parse(raw) as Array<Partial<Keyword>>
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .filter(
          (item): item is Partial<Keyword> & Pick<Keyword, 'id' | 'value'> =>
            Boolean(item) &&
            typeof item.id === 'string' &&
            typeof item.value === 'string'
        )
        .map((item) => ({
          id: item.id,
          value: item.value.trim(),
          category: normalizeCategory(item.category, item.value),
          enabled: item.enabled ?? true,
          createdAt: item.createdAt ?? now(),
          updatedAt: item.updatedAt ?? item.createdAt ?? now()
        }))

      if (normalized.length > 0) {
        const requiresRewrite = normalized.some(
          (item, index) =>
            parsed[index]?.category !== item.category ||
            typeof parsed[index]?.enabled !== 'boolean' ||
            !parsed[index]?.createdAt ||
            !parsed[index]?.updatedAt
        )

        if (requiresRewrite) {
          await writeKeywordsFile(normalized)
        }

        return normalized
      }
    }
  } catch {
    // fall through to reset file
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_KEYWORDS, null, 2), 'utf-8')
  return [...DEFAULT_KEYWORDS]
}

async function writeKeywordsFile(keywords: Keyword[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(keywords, null, 2), 'utf-8')
}

export async function listKeywords(): Promise<Keyword[]> {
  const keywords = await readKeywordsFile()
  return keywords.toSorted((a, b) => {
    const categoryOrder = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
    if (categoryOrder !== 0) return categoryOrder
    return a.value.localeCompare(b.value, 'ko')
  })
}

export async function addKeyword(
  value: string,
  category?: KeywordCategory
): Promise<Keyword> {
  const keywords = await readKeywordsFile()
  const trimmedValue = value.trim()
  const keyword: Keyword = {
    id: crypto.randomUUID(),
    value: trimmedValue,
    category: normalizeCategory(category, trimmedValue),
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  }

  keywords.push(keyword)
  await writeKeywordsFile(keywords)
  return keyword
}

export async function updateKeyword(
  id: string,
  updates: Partial<Pick<Keyword, 'value' | 'category' | 'enabled'>>
): Promise<Keyword | null> {
  const keywords = await readKeywordsFile()
  const target = keywords.find((item) => item.id === id)
  if (!target) return null

  if (typeof updates.value === 'string') {
    target.value = updates.value.trim()
  }
  target.category = normalizeCategory(updates.category, target.value)
  if (typeof updates.enabled === 'boolean') {
    target.enabled = updates.enabled
  }
  target.updatedAt = now()

  await writeKeywordsFile(keywords)
  return target
}

export async function removeKeyword(id: string): Promise<boolean> {
  const keywords = await readKeywordsFile()
  const index = keywords.findIndex((item) => item.id === id)
  if (index === -1) return false

  keywords.splice(index, 1)
  await writeKeywordsFile(keywords)
  return true
}
