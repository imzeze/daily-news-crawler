import { listKeywords } from "@/lib/keywords/store";
import type { Article } from "./types";
import { fetchFromGoogle, fetchFromNaver } from "./providers";

export type CollectResult = {
  articles: Article[];
  collectedAt: string;
};

export async function collectDailyNews(
  requestedKeywords?: string[],
): Promise<CollectResult> {
  const enabledKeywords = listKeywords().filter((keyword) => keyword.enabled);
  const keywordValues =
    requestedKeywords && requestedKeywords.length > 0
      ? enabledKeywords
          .filter((keyword) => requestedKeywords.includes(keyword.value))
          .map((keyword) => keyword.value)
      : enabledKeywords.map((keyword) => keyword.value);
  const tasks = keywordValues.flatMap((value) => [
    fetchFromNaver(value),
    fetchFromGoogle(value),
  ]);
  const results = await Promise.all(tasks);
  const articles = results.flatMap((result) => result.articles);
  return {
    articles,
    collectedAt: new Date().toISOString(),
  };
}
