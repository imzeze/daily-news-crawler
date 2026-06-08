import { prisma } from "@/lib/db";

export type KeywordCategory = string;

export type Keyword = {
  id: string;
  value: string;
  category: KeywordCategory;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KeywordCategoryRecord = {
  id: string;
  name: string;
  order: number;
};

export async function listCategories(): Promise<KeywordCategoryRecord[]> {
  const categories = await prisma.keywordCategory.findMany({
    orderBy: { order: "asc" },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, order: c.order }));
}

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
    category: record.category,
    enabled: record.enabled,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listKeywords(): Promise<Keyword[]> {
  const [keywords, categories] = await Promise.all([
    prisma.keyword.findMany(),
    prisma.keywordCategory.findMany({ orderBy: { order: "asc" } }),
  ]);

  const orderMap = new Map(categories.map((c) => [c.name, c.order]));

  return keywords.map(toKeyword).toSorted((a, b) => {
    const orderA = orderMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
    const orderB = orderMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.value.localeCompare(b.value, "ko");
  });
}

export async function addKeyword(
  value: string,
  category: string,
): Promise<Keyword> {
  const trimmedValue = value.trim();

  const createdKeyword = await prisma.keyword.create({
    data: {
      id: crypto.randomUUID(),
      value: trimmedValue,
      category,
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
      category: updates.category ?? target.category,
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

export async function addCategory(name: string): Promise<KeywordCategoryRecord> {
  const last = await prisma.keywordCategory.findFirst({ orderBy: { order: "desc" } });
  const nextOrder = last ? last.order + 1 : 0;

  const created = await prisma.keywordCategory.create({
    data: { name: name.trim(), order: nextOrder },
  });

  return { id: created.id, name: created.name, order: created.order };
}

export async function removeCategory(id: string): Promise<boolean> {
  const category = await prisma.keywordCategory.findUnique({ where: { id } });
  if (!category) return false;

  await prisma.$transaction([
    prisma.keyword.deleteMany({ where: { category: category.name } }),
    prisma.keywordCategory.delete({ where: { id } }),
  ]);

  return true;
}

export async function reorderCategories(orderedIds: string[]): Promise<KeywordCategoryRecord[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.keywordCategory.update({ where: { id }, data: { order: index } }),
    ),
  );

  return listCategories();
}
