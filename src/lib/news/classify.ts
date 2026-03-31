import { load } from "cheerio";
import type { Article, ArticleSentiment } from "./types";
import type { SentimentKeywordType } from "./sentiment-keywords";
export type SentimentKeywordMap = Record<SentimentKeywordType, string[]>;

const CONTENT_SELECTORS = [
  "article",
  "main",
  "#dic_area",
  "#newsct_article",
  "#articletxt",
  ".article_body",
  ".news_end",
  '[itemprop="articleBody"]',
  '[class*="article"]',
  '[class*="content"]',
];

const META_SELECTORS = [
  'meta[property="og:description"]',
  'meta[name="description"]',
  'meta[name="twitter:description"]',
];

const normalizeWhitespace = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

const cleanText = (value?: string) => {
  if (!value) return "";
  return normalizeWhitespace(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, " ")
      .replace(/[\r\n\t]+/g, " "),
  );
};

const unique = (values: string[]) => [...new Set(values)];

function findMatchedKeywords(text: string, keywords: string[]) {
  return unique(keywords.filter((keyword) => text.includes(keyword)));
}

function buildReason(
  sentiment: ArticleSentiment,
  summary: string,
  matchedKeywords: string[],
) {
  if (matchedKeywords.length > 0) {
    const prefix =
      sentiment === "negative"
        ? "부정 키워드"
        : sentiment === "positive"
          ? "긍정 키워드"
          : "본문 근거";
    return `${prefix}: ${matchedKeywords.slice(0, 4).join(", ")}`;
  }

  if (summary) {
    return `본문 기준: ${summary.slice(0, 90)}`;
  }

  return "";
}

function scoreSentiment(text: string, keywordMap: SentimentKeywordMap) {
  const negativeMatches = findMatchedKeywords(text, keywordMap.negative);
  const positiveMatches = findMatchedKeywords(text, keywordMap.positive);

  let negativeScore = negativeMatches.length;
  let positiveScore = positiveMatches.length;

  if (text.includes("적자 탈출") || text.includes("흑자전환")) {
    positiveScore += 2;
  }
  if (text.includes("논란 지속") || text.includes("실적 악화")) {
    negativeScore += 2;
  }

  let sentiment: ArticleSentiment = "neutral";
  if (negativeScore > positiveScore && negativeScore > 0) {
    sentiment = "negative";
  } else if (positiveScore > negativeScore && positiveScore > 0) {
    sentiment = "positive";
  }

  return {
    sentiment,
    negativeMatches,
    positiveMatches,
  };
}

async function extractArticleSummary(url?: string) {
  if (!url || !/^https?:\/\//.test(url)) return "";

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "daily-news-crawler/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return "";

    const html = await response.text();
    const $ = load(html);

    const metaDescription = META_SELECTORS.map((selector) =>
      cleanText($(selector).attr("content")),
    ).find(Boolean);

    const candidateTexts = CONTENT_SELECTORS.map((selector) =>
      cleanText($(selector).text()),
    )
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const paragraphText = unique(
      $("p")
        .toArray()
        .map((node) => cleanText($(node).text()))
        .filter((value) => value.length >= 40),
    )
      .slice(0, 6)
      .join(" ");

    const content = candidateTexts[0] || paragraphText || metaDescription || "";
    return cleanText(content).slice(0, 1200);
  } catch {
    return "";
  }
}

export async function classifyArticle(
  article: Article,
  keywordMap: SentimentKeywordMap,
): Promise<Article> {
  const titleText = cleanText(article.title);
  const existingSummary = cleanText(article.summary);
  const articleSummary =
    existingSummary || (await extractArticleSummary(article.url));
  const combinedText = cleanText(
    `${titleText} ${articleSummary}`,
  ).toLowerCase();

  const { sentiment, negativeMatches, positiveMatches } =
    scoreSentiment(combinedText, keywordMap);
  const matchedKeywords =
    sentiment === "negative" ? negativeMatches : positiveMatches;

  return {
    ...article,
    summary: articleSummary || article.summary,
    sentiment,
    matchedKeywords,
    sentimentReason: buildReason(sentiment, articleSummary, matchedKeywords),
  };
}
