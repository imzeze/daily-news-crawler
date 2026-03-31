import { promises as fs } from "fs";
import path from "path";

export type SentimentKeywordType = "positive" | "negative";

export type SentimentKeyword = {
  id: string;
  value: string;
  type: SentimentKeywordType;
  createdAt: string;
  updatedAt: string;
};

const now = () => new Date().toISOString();

export const DEFAULT_NEGATIVE_KEYWORDS = [
  "하락",
  "급락",
  "폭락",
  "악화",
  "적자",
  "손실",
  "감소",
  "부진",
  "우려",
  "논란",
  "비판",
  "비난",
  "법적",
  "소송",
  "혐의",
  "조사",
  "리콜",
  "철수",
  "중단",
  "취소",
  "연기",
  "지연",
  "파업",
  "불매",
  "위반",
  "사과",
  "해명",
  "적신호",
  "경고",
  "위기",
  "침체",
  "추락",
  "파문",
  "불안",
  "불황",
  "여파",
  "타격",
  "실망",
  "최저",
];

export const DEFAULT_POSITIVE_KEYWORDS = [
  "상승",
  "반등",
  "회복",
  "개선",
  "호재",
  "호응",
  "환호",
  "열광",
  "호평",
  "성장",
  "증가",
  "확대",
  "돌파",
  "신기록",
  "최고",
  "흥행",
  "성공",
  "인기",
  "수상",
  "출시",
  "계약",
  "협업",
  "글로벌",
  "진출",
  "흑자",
  "흑자전환",
  "적자 탈출",
  "실적 개선",
];

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "sentiment-keywords.json");

const buildDefaults = (): SentimentKeyword[] => [
  ...DEFAULT_NEGATIVE_KEYWORDS.map((value, index) => ({
    id: `negative-${index + 1}`,
    value,
    type: "negative" as const,
    createdAt: now(),
    updatedAt: now(),
  })),
  ...DEFAULT_POSITIVE_KEYWORDS.map((value, index) => ({
    id: `positive-${index + 1}`,
    value,
    type: "positive" as const,
    createdAt: now(),
    updatedAt: now(),
  })),
];

const DEFAULT_KEYWORDS = buildDefaults();

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(DEFAULT_KEYWORDS, null, 2),
      "utf-8",
    );
  }
}

async function writeKeywordsFile(keywords: SentimentKeyword[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(keywords, null, 2), "utf-8");
}

async function readKeywordsFile(): Promise<SentimentKeyword[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");

  try {
    const parsed = JSON.parse(raw) as Array<Partial<SentimentKeyword>>;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .filter(
          (
            item,
          ): item is Partial<SentimentKeyword> &
            Pick<SentimentKeyword, "id" | "value" | "type"> =>
            Boolean(item) &&
            typeof item.id === "string" &&
            typeof item.value === "string" &&
            (item.type === "positive" || item.type === "negative"),
        )
        .map((item) => ({
          id: item.id,
          value: item.value.trim(),
          type: item.type,
          createdAt: item.createdAt ?? now(),
          updatedAt: item.updatedAt ?? item.createdAt ?? now(),
        }))
        .filter((item) => item.value.length > 0);

      if (normalized.length > 0) {
        return normalized.toSorted((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return a.value.localeCompare(b.value, "ko");
        });
      }
    }
  } catch {
    // reset below
  }

  await writeKeywordsFile(DEFAULT_KEYWORDS);
  return [...DEFAULT_KEYWORDS];
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
  return readKeywordsFile();
}

export async function getSentimentKeywordMap() {
  const keywords = await readKeywordsFile();

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
  const keywords = await readKeywordsFile();
  const trimmedValue = value.trim();

  if (!ensureUniqueValue(keywords, trimmedValue, type)) {
    throw new Error("이미 등록된 키워드입니다.");
  }

  const keyword: SentimentKeyword = {
    id: crypto.randomUUID(),
    value: trimmedValue,
    type,
    createdAt: now(),
    updatedAt: now(),
  };

  keywords.push(keyword);
  await writeKeywordsFile(keywords);
  return keyword;
}

export async function updateSentimentKeyword(
  id: string,
  updates: Partial<Pick<SentimentKeyword, "value" | "type">>,
): Promise<SentimentKeyword | null> {
  const keywords = await readKeywordsFile();
  const target = keywords.find((keyword) => keyword.id === id);
  if (!target) return null;

  const nextValue =
    typeof updates.value === "string" ? updates.value.trim() : target.value;
  const nextType = updates.type ?? target.type;

  if (!ensureUniqueValue(keywords, nextValue, nextType, id)) {
    throw new Error("이미 등록된 키워드입니다.");
  }

  target.value = nextValue;
  target.type = nextType;
  target.updatedAt = now();

  await writeKeywordsFile(keywords);
  return target;
}

export async function removeSentimentKeyword(id: string): Promise<boolean> {
  const keywords = await readKeywordsFile();
  const index = keywords.findIndex((keyword) => keyword.id === id);
  if (index === -1) return false;

  keywords.splice(index, 1);
  await writeKeywordsFile(keywords);
  return true;
}
