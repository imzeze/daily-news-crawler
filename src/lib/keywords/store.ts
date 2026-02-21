import { promises as fs } from 'fs'
import path from 'path'

export type Keyword = {
  id: string
  value: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const now = () => new Date().toISOString()

const DEFAULT_KEYWORDS: Keyword[] = [
  {
    id: 'samg',
    value: 'SAMG엔터',
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'catch-teenieping',
    value: '캐치 티니핑',
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  }
]

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
    const parsed = JSON.parse(raw) as Keyword[]
    if (Array.isArray(parsed)) return parsed
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
  return keywords.toSorted((a, b) => a.value.localeCompare(b.value))
}

export async function addKeyword(value: string): Promise<Keyword> {
  const keywords = await readKeywordsFile()
  const keyword: Keyword = {
    id: crypto.randomUUID(),
    value,
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
  updates: Partial<Pick<Keyword, 'value' | 'enabled'>>
): Promise<Keyword | null> {
  const keywords = await readKeywordsFile()
  const target = keywords.find((item) => item.id === id)
  if (!target) return null

  if (typeof updates.value === 'string') {
    target.value = updates.value
  }
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
