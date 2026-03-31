import { load } from "cheerio";
import { isValid, parse } from "date-fns";
import { chromium } from "playwright";
import type { Article } from "./types";
import { subDays, subHours, subWeeks } from "date-fns";
import {
  getNextDateParam,
  resolveNewsDateRange,
  type NewsDateRangeOptions,
} from "./date-range";

export type NewsProvider = "naver" | "google";

export type ProviderResult = {
  provider: NewsProvider;
  articles: Article[];
};

function getDateFromRelative(text: string, baseDate = new Date()) {
  const num = parseInt(text, 10);

  if (text.includes("주")) {
    return subWeeks(baseDate, num);
  }
  if (text.includes("일")) {
    return subDays(baseDate, num);
  }
  if (text.includes("시간")) {
    return subHours(baseDate, num);
  }

  return baseDate;
}

function parseNaverPublishedAt(text: string, baseDate = new Date()) {
  const normalized = text.trim();
  if (!normalized) return undefined;

  if (
    normalized.includes("주 전") ||
    normalized.includes("일 전") ||
    normalized.includes("시간 전")
  ) {
    return getDateFromRelative(normalized, baseDate).toISOString();
  }

  const absoluteDateTime = normalized.match(
    /(\d{4})\.(\d{2})\.(\d{2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2})/,
  );
  if (absoluteDateTime) {
    const [, year, month, day, meridiem, hourText, minute] = absoluteDateTime;
    let hour = Number(hourText);
    if (meridiem === "오후" && hour < 12) hour += 12;
    if (meridiem === "오전" && hour === 12) hour = 0;

    return new Date(
      `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}:00+09:00`,
    ).toISOString();
  }

  const absoluteDate = normalized.match(/(\d{4})\.(\d{2})\.(\d{2})\./);
  if (absoluteDate) {
    const [, year, month, day] = absoluteDate;
    return new Date(`${year}-${month}-${day}T00:00:00+09:00`).toISOString();
  }

  const parsed = parse(normalized, "yyyy.MM.dd. HH:mm", baseDate);
  if (isValid(parsed)) return parsed.toISOString();

  return undefined;
}

function getNaverSearchParams(options?: NewsDateRangeOptions) {
  const { startDate, endDate } = resolveNewsDateRange(options);

  if (startDate && endDate) {
    const compactStart = startDate.replaceAll("-", "");
    const compactEnd = endDate.replaceAll("-", "");

    return {
      de: endDate.replaceAll("-", "."),
      ds: startDate.replaceAll("-", "."),
      nso: `so:dd,p:from${compactStart}to${compactEnd},a:all`,
      pd: "3",
    };
  }

  const onlyToday = options?.onlyToday ?? false;
  return {
    de: "",
    ds: "",
    nso: onlyToday ? "so:dd,p:1d,a:all" : "so:dd,p:1w,a:all",
    pd: onlyToday ? "4" : "1",
  };
}

function getGoogleQuery(keyword: string, options?: NewsDateRangeOptions) {
  const { startDate, endDate } = resolveNewsDateRange(options);

  if (startDate && endDate) {
    return `${keyword} after:${startDate} before:${getNextDateParam(endDate)}`;
  }

  const onlyToday = options?.onlyToday ?? false;
  return `${keyword} when:${onlyToday ? "24h" : "7d"}`;
}

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

const parseNaverArticles = (
  html: string,
  keyword: string,
  seen: Set<string>,
) => {
  const $ = load(html);
  const listNodes = $('div[class*="fds-news-item-list"]').children("div");
  const itemNodes =
    listNodes.length > 0 ? listNodes : $('div[class*="fds-news-item"]');
  const results: Article[] = [];

  itemNodes.each((_, element) => {
    const source = $(element)
      .find('a[data-heatmap-target=".prof"]')
      .children("span")
      .text();
    const atag = $(element).find('a[data-heatmap-target=".tit"]');
    const info = $(element)
      .find('div[class*="sds-comps-profile-info-subtext"]')
      .find('span[class*="sds-comps-profile-info-subtext"]');
    const relativeText = info
      .eq(0)
      .find('span[class*="sds-comps-text"]')
      .text();
    const absoluteText = info
      .eq(1)
      .find('span[class*="sds-comps-text"]')
      .text();
    const test = info.last().text();
    void test;
    const publishedAt =
      relativeText.includes("주 전") ||
      relativeText.includes("일 전") ||
      relativeText.includes("시간 전")
        ? relativeText
        : absoluteText;

    const title = atag.children("span").text();
    const href = atag.attr("href");
    const imageNode = $(element)
      .find('a[data-heatmap-target=".img"]')
      .find("img");
    const rawSrc =
      extractImageUrl(imageNode.attr("data-src")) ||
      extractImageUrl(imageNode.attr("src")) ||
      extractImageUrl(imageNode.attr("data-srcset")) ||
      extractImageUrl(imageNode.attr("srcset"));

    if (!href || seen.has(href) || !title) return;

    results.push({
      title,
      url: href,
      keyword,
      publishedAt: parseNaverPublishedAt(publishedAt),
      source,
      imageUrl: rawSrc || undefined,
    });
    seen.add(href);
  });

  return results;
};

const fetchNaverMoreArticles = async (
  keyword: string,
  start: number,
  options?: NewsDateRangeOptions,
) => {
  const searchParams = getNaverSearchParams(options);
  const url = new URL("https://s.search.naver.com/p/newssearch/3/api/tab/more");
  url.searchParams.append("abt", "null");
  url.searchParams.append("de", searchParams.de);
  url.searchParams.append("ds", searchParams.ds);
  url.searchParams.append("eid", "");
  url.searchParams.append("field", "0");
  url.searchParams.append("force_original", "");
  url.searchParams.append("is_dts", "0");
  url.searchParams.append("is_sug_officeid", "0");
  url.searchParams.append("mynews", "0");
  url.searchParams.append("news_office_checked", "");
  url.searchParams.append("nlu_query", "");
  url.searchParams.append(
    "nqx_theme",
    '{"theme":{"main":{"name":"shopping","source":"TOS"}}}',
  );
  url.searchParams.append(
    "nso",
    searchParams.nso,
  );
  url.searchParams.append("nx_and_query", "");
  url.searchParams.append("nx_search_hlquery", "");
  url.searchParams.append("nx_search_query", "");
  url.searchParams.append("nx_sub_query", "");
  url.searchParams.append("office_category", "0");
  url.searchParams.append("office_section_code", "0");
  url.searchParams.append("office_type", "0");
  url.searchParams.append("pd", searchParams.pd);
  url.searchParams.append("photo", "0");
  url.searchParams.append("query", keyword);
  url.searchParams.append("query_original", "");
  url.searchParams.append("rev", "0");
  url.searchParams.append("service_area", "0");
  url.searchParams.append("sm", "tab_smr");
  url.searchParams.append("sort", "1");
  url.searchParams.append("spq", "0");
  url.searchParams.append("ssc", "tab.news.all");
  url.searchParams.append("start", `${start}`);

  const response = await fetch(url.toString(), {
    headers: {
      "user-agent": "daily-news-crawler/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as { collection: [{ html: string }] };
};

const fetchNaverSearchArticles = async (
  keyword: string,
  options?: NewsDateRangeOptions,
) => {
  const searchParams = getNaverSearchParams(options);
  const url = new URL("https://search.naver.com/search.naver");
  url.searchParams.append("ssc", "tab.news.all");
  url.searchParams.append("query", keyword);
  url.searchParams.append("sm", "tab_opt");
  url.searchParams.append("sort", "1");
  url.searchParams.append("photo", "0");
  url.searchParams.append("field", "0");
  url.searchParams.append("pd", searchParams.pd);
  url.searchParams.append("related", "0");
  url.searchParams.append("mynews", "0");
  url.searchParams.append("office_type", "0");
  url.searchParams.append("office_section_code", "0");
  url.searchParams.append("nso", searchParams.nso);
  url.searchParams.append("is_sug_officeid", "0");
  url.searchParams.append("office_category", "0");
  url.searchParams.append("service_area", "0");
  url.searchParams.append("ds", searchParams.ds);
  url.searchParams.append("de", searchParams.de);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "user-agent": "daily-news-crawler/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) return [] as Article[];
    const html = await response.text();
    const seen = new Set<string>();
    const results: Article[] = [];
    results.push(...parseNaverArticles(html, keyword, seen));

    const MAX_MORE_PAGES = 10;
    let start = results.length + 1;

    for (let page = 0; page < MAX_MORE_PAGES; page += 1) {
      const payload = await fetchNaverMoreArticles(keyword, start, options);
      const contents = payload?.collection?.[0].html;
      if (!contents) break;

      const more = parseNaverArticles(contents, keyword, seen);
      if (more.length === 0) break;
      results.push(...more);
      start += more.length;
    }

    return results;
  } catch {
    return [] as Article[];
  }
};

async function fetchGoogleSearchHtmlViaPlaywright(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "daily-news-crawler/1.0",
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const start = Date.now();
    let previousHeight = 0;
    let stableCount = 0;

    while (Date.now() - start < 30000) {
      const height = await page.evaluate(() => document.body.scrollHeight);
      if (height === previousHeight) {
        stableCount += 1;
      } else {
        stableCount = 0;
        previousHeight = height;
      }

      if (stableCount >= 2) break;

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1200);
    }

    return await page.content();
  } catch (e) {
    console.error(e);
    return "";
  } finally {
    await page.close();
    await browser.close();
  }
}

const fetchGoogleSearchArticles = async (
  keyword: string,
  options?: NewsDateRangeOptions,
) => {
  const baseUrl = process.env.GOOGLE_NEWS_SEARCH_BASE;

  try {
    if (!baseUrl) return [] as Article[];

    const url = new URL("/search", baseUrl);
    url.searchParams.append("q", getGoogleQuery(keyword, options));
    url.searchParams.append("hl", "ko");
    url.searchParams.append("gl", "KR");
    url.searchParams.append("ceid", "KR:ko");

    const html = await fetchGoogleSearchHtmlViaPlaywright(url.toString());
    const $ = load(html);
    const $articles = $("c-wiz").filter(
      (_, el) => $(el).find("c-wiz").length === 0,
    );

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
      const rawSrc = extractImageUrl(imageNode.attr("src"));
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

    return resolvedResults;
  } catch {
    return [] as Article[];
  }
};

export async function fetchFromNaver(
  keyword: string,
  options?: NewsDateRangeOptions,
): Promise<ProviderResult> {
  const articles = await fetchNaverSearchArticles(keyword, options);
  return {
    provider: "naver",
    articles,
  };
}

export async function fetchFromGoogle(
  keyword: string,
  options?: NewsDateRangeOptions,
): Promise<ProviderResult> {
  const enrichedArticles = await fetchGoogleSearchArticles(keyword, options);
  return {
    provider: "google",
    articles: enrichedArticles,
  };
}
