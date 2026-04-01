import { prisma } from "@/lib/db";

export type SentimentKeywordType = "positive" | "negative";

export type SentimentKeyword = {
  id: string;
  value: string;
  type: SentimentKeywordType;
  createdAt: string;
  updatedAt: string;
};

function toSentimentKeyword(record: {
  id: string;
  value: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}): SentimentKeyword {
  return {
    id: record.id,
    value: record.value,
    type: record.type as SentimentKeywordType,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function readKeywords(): Promise<SentimentKeyword[]> {
  const keywords = await prisma.sentimentKeyword.findMany({
    orderBy: [{ type: "asc" }, { value: "asc" }],
  });

  return keywords.map(toSentimentKeyword);
}

function ensureUniqueValue(
  keywords: SentimentKeyword[],
  value: string,
  type: SentimentKeywordType,
  excludeId?: string,
) {
  return !keywords.some(
    (keyword) =>
      keyword.type === type &&
      keyword.value.toLowerCase() === value.toLowerCase() &&
      keyword.id !== excludeId,
  );
}

export async function listSentimentKeywords(): Promise<SentimentKeyword[]> {
  return readKeywords();
}

export async function getSentimentKeywordMap() {
  const keywords = await readKeywords();

  return {
    positive: keywords
      .filter((keyword) => keyword.type === "positive")
      .map((keyword) => keyword.value.toLowerCase()),
    negative: keywords
      .filter((keyword) => keyword.type === "negative")
      .map((keyword) => keyword.value.toLowerCase()),
  };
}

export async function addSentimentKeyword(
  value: string,
  type: SentimentKeywordType,
): Promise<SentimentKeyword> {
  const keywords = await readKeywords();
  const trimmedValue = value.trim();

  if (!ensureUniqueValue(keywords, trimmedValue, type)) {
    throw new Error("이미 등록된 키워드입니다.");
  }

  const keyword = await prisma.sentimentKeyword.create({
    data: {
      id: crypto.randomUUID(),
      value: trimmedValue,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return toSentimentKeyword(keyword);
}

export async function updateSentimentKeyword(
  id: string,
  updates: Partial<Pick<SentimentKeyword, "value" | "type">>,
): Promise<SentimentKeyword | null> {
  const keywords = await readKeywords();
  const target = keywords.find((keyword) => keyword.id === id);
  if (!target) return null;

  const nextValue =
    typeof updates.value === "string" ? updates.value.trim() : target.value;
  const nextType = updates.type ?? target.type;

  if (!ensureUniqueValue(keywords, nextValue, nextType, id)) {
    throw new Error("이미 등록된 키워드입니다.");
  }

  const updated = await prisma.sentimentKeyword.update({
    where: { id },
    data: {
      value: nextValue,
      type: nextType,
      updatedAt: new Date(),
    },
  });

  return toSentimentKeyword(updated);
}

export async function removeSentimentKeyword(id: string): Promise<boolean> {
  const deleted = await prisma.sentimentKeyword.deleteMany({
    where: { id },
  });

  return deleted.count > 0;
}
