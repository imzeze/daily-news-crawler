import { listKeywords } from "@/lib/keywords/store";
import { classifyArticle } from "./classify";
import {
  isPublishedAtWithinRange,
  type NewsDateRangeOptions,
} from "./date-range";
import { fetchFromGoogle, fetchFromNaver } from "./providers";
import { getSentimentKeywordMap } from "./sentiment-keywords";
import type { Article } from "./types";

export type CollectResult = {
  articles: Article[];
  collectedAt: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

export async function collectDailyNews(
  requestedKeywords?: string[],
  options?: NewsDateRangeOptions,
): Promise<CollectResult> {
  const enabledKeywords = (await listKeywords()).filter(
    (keyword) => keyword.enabled,
  );
  const keywordValues =
    requestedKeywords && requestedKeywords.length > 0
      ? enabledKeywords
          .filter((keyword) => requestedKeywords.includes(keyword.value))
          .map((keyword) => keyword.value)
      : enabledKeywords.map((keyword) => keyword.value);
  const tasks = keywordValues.flatMap((value) => [
    fetchFromNaver(value, options),
    fetchFromGoogle(value, options),
  ]);
  const results = await Promise.all(tasks);
  const rawArticles = results
    .flatMap((result) => result.articles)
    .filter((article) =>
      isPublishedAtWithinRange(article.publishedAt, options),
    );
  const sentimentKeywordMap = await getSentimentKeywordMap();
  const articles = await mapWithConcurrency(rawArticles, 4, (article) =>
    classifyArticle(article, sentimentKeywordMap),
  );

  return {
    articles: articles.sort((a, b) =>
      a.publishedAt && b.publishedAt
        ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        : -1,
    ),
    collectedAt: new Date().toISOString(),
  };
}
