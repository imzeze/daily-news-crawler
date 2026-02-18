import { load } from "cheerio";
import { fetchRssArticles } from "./rss";
import type { Article } from "./types";
import { isBefore } from "date-fns";

export type NewsProvider = "naver" | "google";

export type ProviderResult = {
  provider: NewsProvider;
  articles: Article[];
};

const extractImageUrl = (value?: string) => {
  if (!value) return "";
  if (value.includes(",")) {
    const first = value.split(",")[0]?.trim();
    return first?.split(" ")[0] ?? "";
  }
  return value;
};

const resolveGoogleUrl = (baseUrl: string, value?: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return new URL(value, baseUrl).toString();
};

const resolveRedirectUrl = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (response.ok) return response.url;

    if (response.status === 405 || response.status === 403) {
      const fallback = await fetch(url, {
        method: "GET",
        headers: {
          "user-agent": "daily-news-crawler/1.0",
        },
        redirect: "follow",
        cache: "no-store",
      });
      return fallback.url || url;
    }

    return response.url || url;
  } catch {
    return url;
  }
};

const fetchGoogleSearchArticles = async (keyword: string) => {
  const baseUrl = process.env.GOOGLE_NEWS_SEARCH_BASE;
  const url = `${baseUrl}/search?q=${encodeURIComponent(keyword + " when:7d")}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    if (!baseUrl) return [] as Article[];

    const response = await fetch(url, {
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) return [] as Article[];
    const html = await response.text();
    const $ = load(html);
    const $articles = $("c-wiz");

    const results: Article[] = [];
    const seen = new Set<string>();

    $articles.each((_, element) => {
      const $aTag = $(element).find("a[aria-label]");
      const $time = $(element).find("time").attr("datetime");

      const title = $aTag.text();
      const [_title, source] =
        $aTag.attr("aria-label")?.replace(title, "").split(" - ") || [];
      const href = $aTag.attr("href");
      if (!href) return;
      const link = new URL(href, baseUrl).toString();

      if (!title || !source || !link || seen.has(link)) return;

      const imageNode = $(element).find("figure img").first();
      const rawSrc =
        extractImageUrl(imageNode.attr("src")) ||
        extractImageUrl(imageNode.attr("data-src")) ||
        extractImageUrl(imageNode.attr("srcset")) ||
        extractImageUrl(imageNode.attr("data-srcset"));
      const imageUrl = resolveGoogleUrl(baseUrl, rawSrc) || undefined;

      results.push({
        title,
        url: link,
        keyword,
        publishedAt: $time,
        source,
        imageUrl,
      });
      seen.add(link);
    });

    const resolvedResults = await Promise.all(
      results.map(async (article) => {
        if (!article.imageUrl) return article;
        const redirected = await resolveRedirectUrl(article.imageUrl);
        return {
          ...article,
          imageUrl: redirected || article.imageUrl,
        };
      }),
    );

    return resolvedResults.sort((a, b) =>
      a.publishedAt && b.publishedAt
        ? isBefore(a.publishedAt, b.publishedAt)
          ? 1
          : -1
        : -1,
    );
  } catch {
    return [] as Article[];
  }
};

export async function fetchFromNaver(keyword: string): Promise<ProviderResult> {
  const baseUrl =
    process.env.NAVER_NEWS_RSS_BASE ??
    "https://news.naver.com/main/rss/search.naver?query=";
  const url = `${baseUrl}${encodeURIComponent(keyword)}`;
  const articles = await fetchRssArticles({
    url,
    keyword,
    provider: "naver",
  });
  return {
    provider: "naver",
    articles,
  };
}

export async function fetchFromGoogle(
  keyword: string,
): Promise<ProviderResult> {
  const enrichedArticles = await fetchGoogleSearchArticles(keyword);
  return {
    provider: "google",
    articles: enrichedArticles,
  };
}
