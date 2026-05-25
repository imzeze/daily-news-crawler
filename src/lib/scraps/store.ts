import { prisma } from "@/lib/db";
import type { ScrappedArticle } from "@/lib/news/types";

const getScrapIdentity = (article: ScrappedArticle) =>
  `${article.keyword}::${article.url}`;

export async function listScraps() {
  const articles = await prisma.scrap.findMany({
    orderBy: [{ createdAt: "desc" }, { publishedAt: "desc" }],
  });

  return {
    articles: articles.map((article) => ({
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt.toISOString(),
      keyword: article.keyword,
      source: article.source ?? undefined,
    })),
    updatedAt: articles.length > 0 ? articles[0].createdAt.toISOString() : null,
  };
}

export async function addScrap(article: ScrappedArticle) {
  const existing = await prisma.scrap.findFirst({
    where: {
      keyword: article.keyword,
      url: article.url,
    },
  });

  if (!existing) {
    await prisma.scrap.create({
      data: {
        title: article.title,
        url: article.url,
        publishedAt: new Date(article.publishedAt),
        keyword: article.keyword,
        source: article.source ?? null,
      },
    });
  }

  return (await listScraps()).articles;
}

export async function removeScrap(article: ScrappedArticle) {
  const nextIdentity = getScrapIdentity(article);
  const current = await prisma.scrap.findMany();
  const matched = current.filter(
    (item) =>
      getScrapIdentity({
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt.toISOString(),
        keyword: item.keyword,
      }) === nextIdentity,
  );

  if (matched.length > 0) {
    await prisma.scrap.deleteMany({
      where: {
        OR: matched.map((item) => ({ id: item.id })),
      },
    });
  }

  return (await listScraps()).articles;
}
