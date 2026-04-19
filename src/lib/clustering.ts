export type ClusterArticle = {
  title: string;
  url: string;
  publishedAt: Date;
  keyword: string;
};

export type IssueCluster = {
  id: string;
  title: string;
  brief: string;
  riskLevel: "low" | "medium" | "high";
  articleCount: number;
  sourceKeywordCount: number;
  firstPublishedAt: Date;
  lastPublishedAt: Date;
  topKeywords: string[];
  articles: ClusterArticle[];
};

const STOPWORDS = new Set([
  "속보",
  "단독",
  "기자",
  "관련",
  "오늘",
  "이번",
  "대한",
  "통해",
  "위해",
  "대한민국",
  "news",
  "naver",
  "google",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^0-9a-zA-Z가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return [] as string[];
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function riskLevelByCount(articleCount: number, keywordCount: number): IssueCluster["riskLevel"] {
  const score = (articleCount >= 5 ? 2 : articleCount >= 3 ? 1 : 0) + (keywordCount >= 3 ? 1 : 0);
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function clampTitle(title: string) {
  return title.length > 70 ? `${title.slice(0, 70)}...` : title;
}

export function clusterArticles(articles: ClusterArticle[], maxClusters = 10): IssueCluster[] {
  const working = articles
    .map((article) => {
      const tokens = new Set(tokenize(`${article.title} ${article.keyword}`));
      if (tokens.size === 0) return null;
      return { ...article, tokens };
    })
    .filter(Boolean) as Array<ClusterArticle & { tokens: Set<string> }>;

  const groups: Array<{
    articles: Array<ClusterArticle & { tokens: Set<string> }>;
    tokenSet: Set<string>;
  }> = [];

  for (const article of working) {
    let assigned = false;
    for (const group of groups) {
      const similarity = jaccard(article.tokens, group.tokenSet);
      const sharedCount = [...article.tokens].filter((t) => group.tokenSet.has(t)).length;
      if (similarity >= 0.34 || sharedCount >= 2) {
        group.articles.push(article);
        for (const token of article.tokens) group.tokenSet.add(token);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      groups.push({ articles: [article], tokenSet: new Set(article.tokens) });
    }
  }

  const clusters: IssueCluster[] = groups
    .filter((g) => g.articles.length >= 1)
    .map((group, index) => {
      const sortedByDate = [...group.articles].sort(
        (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
      );

      const keywordSet = new Set(sortedByDate.map((a) => a.keyword));
      const tokenFreq = new Map<string, number>();
      const titleFreq = new Map<string, number>();

      for (const article of sortedByDate) {
        for (const token of article.tokens) {
          tokenFreq.set(token, (tokenFreq.get(token) ?? 0) + 1);
        }
        titleFreq.set(article.title, (titleFreq.get(article.title) ?? 0) + 1);
      }

      const topKeywords = [...tokenFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([term]) => term);

      const representativeTitle =
        [...titleFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        sortedByDate[0]?.title ??
        `이슈 ${index + 1}`;

      const firstPublishedAt = sortedByDate.at(-1)!.publishedAt;
      const lastPublishedAt = sortedByDate[0]!.publishedAt;
      const keywordCount = keywordSet.size;

      return {
        id: `cluster-${index + 1}-${sortedByDate.length}`,
        title: clampTitle(representativeTitle),
        brief: `${sortedByDate.length}건 기사, ${keywordCount}개 키워드에서 수집`,
        riskLevel: riskLevelByCount(sortedByDate.length, keywordCount),
        articleCount: sortedByDate.length,
        sourceKeywordCount: keywordCount,
        firstPublishedAt,
        lastPublishedAt,
        topKeywords,
        articles: sortedByDate.map(({ title, url, publishedAt, keyword }) => ({
          title,
          url,
          publishedAt,
          keyword,
        })),
      } satisfies IssueCluster;
    })
    .sort((a, b) => {
      if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
      return b.lastPublishedAt.getTime() - a.lastPublishedAt.getTime();
    });

  return clusters.slice(0, Math.max(1, maxClusters));
}
