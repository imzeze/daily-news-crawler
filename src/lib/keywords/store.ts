import { prisma } from "@/lib/db";

export const KEYWORD_CATEGORIES = ["SAMG", "콘텐츠 산업", "구글 영문 검색"] as const;

export type KeywordCategory = (typeof KEYWORD_CATEGORIES)[number];

export type Keyword = {
  id: string;
  value: string;
  category: KeywordCategory;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_ORDER: Record<KeywordCategory, number> = {
  SAMG: 0,
  "콘텐츠 산업": 1,
  "구글 영문 검색": 2,
};

const inferCategory = (value: string): KeywordCategory => {
  const trimmedValue = value.trim();
  return /^[A-Za-z0-9\s-]+$/.test(trimmedValue) ? "구글 영문 검색" : "SAMG";
};

const normalizeCategory = (
  category: string | undefined,
  value: string,
): KeywordCategory => {
  if (category && KEYWORD_CATEGORIES.includes(category as KeywordCategory)) {
    return category as KeywordCategory;
  }

  return inferCategory(value);
};
function toKeyword(record: {
  id: string;
  value: string;
  category: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Keyword {
  return {
    id: record.id,
    value: record.value,
    category: normalizeCategory(record.category, record.value),
    enabled: record.enabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function readKeywords(): Promise<Keyword[]> {
  const keywords = await prisma.keyword.findMany();
  return keywords.map(toKeyword);
}

export async function listKeywords(): Promise<Keyword[]> {
  const keywords = await readKeywords();
  return keywords.toSorted((a, b) => {
    const categoryOrder = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryOrder !== 0) return categoryOrder;
    return a.value.localeCompare(b.value, "ko");
  });
}

export async function addKeyword(
  value: string,
  category?: KeywordCategory,
): Promise<Keyword> {
  const trimmedValue = value.trim();

  const createdKeyword = await prisma.keyword.create({
    data: {
      id: crypto.randomUUID(),
      value: trimmedValue,
      category: normalizeCategory(category, trimmedValue),
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return toKeyword(createdKeyword);
}

export async function updateKeyword(
  id: string,
  updates: Partial<Pick<Keyword, "value" | "category" | "enabled">>,
): Promise<Keyword | null> {
  const target = await prisma.keyword.findUnique({ where: { id } });
  if (!target) return null;

  const nextValue =
    typeof updates.value === "string" ? updates.value.trim() : target.value;

  const updated = await prisma.keyword.update({
    where: { id },
    data: {
      value: nextValue,
      category: normalizeCategory(updates.category, nextValue),
      enabled: typeof updates.enabled === "boolean" ? updates.enabled : target.enabled,
      updatedAt: new Date(),
    },
  });

  return toKeyword(updated);
}

export async function removeKeyword(id: string): Promise<boolean> {
  const deleted = await prisma.keyword.deleteMany({
    where: { id },
  });

  return deleted.count > 0;
}
