import { load } from "cheerio";
import { fetchRssArticles } from "./rss";
import type { Article } from "./types";

export type NewsProvider = "naver" | "google";

export type ProviderResult = {
  provider: NewsProvider;
  articles: Article[];
};

const normalizeTitle = (value: string) => value.replace(/\s+/g, " ").trim();

const thumbnailKeywords = [
  "samg",
  "위시캣",
  "미니특공대",
  "메탈카드봇",
  "티니핑",
  "마이핑",
  "myping",
  "teenieping",
];

const matchesThumbnailKeyword = (value: string) => {
  const lower = value.toLowerCase();
  return thumbnailKeywords.some((keyword) => lower.includes(keyword));
};

const extractImageUrl = (value?: string) => {
  if (!value) return "";
  if (value.includes(",")) {
    const first = value.split(",")[0]?.trim();
    return first?.split(" ")[0] ?? "";
  }
  return value;
};

const resolveRedirectUrl = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
    });
    if (response.ok) return response.url;
  } catch {
    // ignore
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
    });
    if (response.ok) return response.url;
  } catch {
    // ignore
  }

  return url;
};

const fetchGoogleSearchThumbnails = async (keyword: string) => {
  const baseUrl = process.env.GOOGLE_NEWS_SEARCH_BASE;
  const url = `${baseUrl}/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) return new Map<string, string>();
    const html = await response.text();
    const $ = load(html);
    const thumbnailMap = new Map<string, string>();

    $("figure img").each((idx, element) => {
      const node = $(element);

      const rawSrc =
        extractImageUrl(node.attr("src")) ||
        extractImageUrl(node.attr("data-src")) ||
        extractImageUrl(node.attr("srcset")) ||
        extractImageUrl(node.attr("data-srcset"));
      if (!rawSrc) return;
      thumbnailMap.set(
        `${idx}`,
        `${process.env.GOOGLE_NEWS_SEARCH_BASE}${rawSrc}`,
      );
    });

    return thumbnailMap;
  } catch {
    return new Map<string, string>();
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
  const baseUrl =
    process.env.GOOGLE_NEWS_RSS_BASE ?? "https://news.google.com/rss/search?q=";
  const url = `${baseUrl}${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
  const [articles, thumbnails] = await Promise.all([
    fetchRssArticles({
      url,
      keyword,
      provider: "google",
    }),
    fetchGoogleSearchThumbnails(keyword),
  ]);

  const resolvedThumbnails = new Map<string, string>();
  await Promise.all(
    Array.from(thumbnails.entries()).map(async ([key, value]) => {
      resolvedThumbnails.set(key, await resolveRedirectUrl(value));
    }),
  );

  const enrichedArticles = articles.map((article, idx) => {
    if (article.imageUrl) return article;
    const match = resolvedThumbnails.get(`${idx}`) ?? thumbnails.get(`${idx}`);
    return match
      ? {
          ...article,
          imageUrl: match,
        }
      : article;
  });

  return {
    provider: "google",
    articles: enrichedArticles,
  };
}
