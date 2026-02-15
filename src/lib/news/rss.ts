import { XMLParser } from "fast-xml-parser";
import type { Article } from "./types";
import type { NewsProvider } from "./providers";

type FetchRssInput = {
  url: string;
  keyword: string;
  provider: NewsProvider;
  limit?: number;
};

type RssItem = {
  title?: string;
  link?: string | { "@_href"?: string; "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  source?: string | { "#text"?: string };
  description?: string;
  summary?: string;
  ["content:encoded"]?: string;
  ["media:thumbnail"]?: { "@_url"?: string };
  ["media:content"]?: { "@_url"?: string };
  enclosure?: { "@_url"?: string; "@_href"?: string };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const resolveLink = (link: RssItem["link"]) => {
  if (!link) return "";
  if (typeof link === "string") return link;
  return link["@_href"] ?? link["#text"] ?? "";
};

const resolveSource = (source: RssItem["source"], provider: NewsProvider) => {
  if (!source) return provider;
  if (typeof source === "string") return source;
  return source["#text"] ?? provider;
};

const resolvePublishedAt = (item: RssItem) => {
  return item.pubDate ?? item.published ?? item.updated ?? "";
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ").trim();

const resolveSummary = (item: RssItem) => {
  const raw = item.summary ?? item.description ?? item["content:encoded"] ?? "";
  if (!raw) return "";
  const text = stripHtml(raw).replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
};

const resolveImageUrl = (item: RssItem) => {
  return (
    item["media:thumbnail"]?.["@_url"] ??
    item["media:content"]?.["@_url"] ??
    item.enclosure?.["@_url"] ??
    item.enclosure?.["@_href"] ??
    ""
  );
};

export async function fetchRssArticles({
  url,
  keyword,
  provider,
  limit = 20,
}: FetchRssInput): Promise<Article[]> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "daily-news-crawler/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
    feed?: { entry?: RssItem | RssItem[] };
  };

  const items = toArray(parsed.rss?.channel?.item).concat(
    toArray(parsed.feed?.entry),
  );

  const articles = items
    .map((item) => {
      const title = item.title?.trim();
      const url = resolveLink(item.link);

      if (!url) return null;

      return {
        title,
        url,
        keyword,
        publishedAt: resolvePublishedAt(item),
        source: resolveSource(item.source, provider),
        summary: resolveSummary(item) || undefined,
        imageUrl: resolveImageUrl(item) || undefined,
      };
    })
    .filter((item) => Boolean(item))
    .slice(0, limit);

  return articles;
}
