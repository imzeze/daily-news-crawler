export type NewsArticle = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  keyword: string;
  summary?: string;
  imageUrl?: string;
  sentiment?: "positive" | "negative" | "neutral";
  sentimentReason?: string;
  matchedKeywords?: string[];
};

export type NewsResponse = {
  articles: NewsArticle[];
  collectedAt: string;
};

export type ScrapArticle = {
  title: string;
  url: string;
  publishedAt: string;
  keyword: string;
  source?: string;
};

export type ScrapResponse = {
  articles: ScrapArticle[];
  updatedAt?: string | null;
};

export type MailRecipient = {
  id: string;
  email: string;
  createdAt: string;
};

export type MailRecipientResponse = {
  recipients: MailRecipient[];
};

export type Keyword = {
  id: string;
  value: string;
  category: string;
  enabled: boolean;
};

export type KeywordResponse = {
  keywords: Keyword[];
};

export type GroupedKeywords = {
  category: string;
  keywords: Keyword[];
};

export type IssueCluster = {
  id: string;
  title: string;
  brief: string;
  riskLevel: "low" | "medium" | "high";
  articleCount: number;
  sourceKeywordCount: number;
  firstPublishedAt: string;
  lastPublishedAt: string;
  topKeywords: string[];
  articles: Array<{
    title: string;
    url: string;
    publishedAt: string;
    keyword: string;
  }>;
};

export type ClusterResponse = {
  clusters: IssueCluster[];
};

export type DatePreset = "today" | "3days" | "1week" | null;

export const getScrapKey = (article: { keyword: string; url: string }) =>
  `${article.keyword}::${article.url}`;
