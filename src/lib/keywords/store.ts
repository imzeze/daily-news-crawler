export type Keyword = {
  id: string
  value: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const now = () => new Date().toISOString()

const keywordStore: Keyword[] = [
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

export function listKeywords(): Keyword[] {
  return keywordStore.toSorted((a, b) => a.value.localeCompare(b.value))
}

export function setKeywords(keywords: Keyword[]): Keyword[] {
  keywordStore.splice(0, keywordStore.length, ...keywords)
  return listKeywords()
}

export function addKeyword(value: string): Keyword {
  const keyword: Keyword = {
    id: crypto.randomUUID(),
    value,
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  }

  keywordStore.push(keyword)
  return keyword
}

export function updateKeyword(id: string, updates: Partial<Pick<Keyword, 'value' | 'enabled'>>): Keyword | null {
  const target = keywordStore.find((item) => item.id === id)
  if (!target) return null

  if (typeof updates.value === 'string') {
    target.value = updates.value
  }
  if (typeof updates.enabled === 'boolean') {
    target.enabled = updates.enabled
  }
  target.updatedAt = now()
  return target
}

export function removeKeyword(id: string): boolean {
  const index = keywordStore.findIndex((item) => item.id === id)
  if (index === -1) return false
  keywordStore.splice(index, 1)
  return true
}
