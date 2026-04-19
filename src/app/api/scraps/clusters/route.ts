import { clusterArticles } from "@/lib/clustering";
import { listScraps } from "@/lib/scraps/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { articles } = await listScraps();

  if (articles.length === 0) {
    return NextResponse.json({ clusters: [] });
  }

  const clusters = clusterArticles(
    articles.map((a) => ({
      title: a.title,
      url: a.url,
      publishedAt: new Date(a.publishedAt),
      keyword: a.keyword,
    })),
    50,
  );

  return NextResponse.json({
    clusters: clusters.map((cluster) => ({
      ...cluster,
      firstPublishedAt: cluster.firstPublishedAt.toISOString(),
      lastPublishedAt: cluster.lastPublishedAt.toISOString(),
      articles: cluster.articles.map((a) => ({
        ...a,
        publishedAt: a.publishedAt.toISOString(),
      })),
    })),
  });
}
