export type ArticleSentiment = "positive" | "negative" | "neutral";

export type Article = {
  title?: string;
  source?: string;
  publishedAt?: string;
  url?: string;
  keyword?: string;
  summary?: string;
  imageUrl?: string;
  sentiment?: ArticleSentiment;
  sentimentReason?: string;
  matchedKeywords?: string[];
};

export type ScrappedArticle = {
  title: string;
  url: string;
  publishedAt: string;
  keyword: string;
  source?: string;
};
