import { sendLarkMessage } from "@/lib/lark";
import { listScraps } from "@/lib/scraps/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildLarkReportText(
  articles: Array<{
    title: string;
    url: string;
    keyword: string;
    publishedAt: string;
  }>,
) {
  const grouped = articles.reduce<Record<string, typeof articles>>(
    (acc, article) => {
      if (!acc[article.keyword]) {
        acc[article.keyword] = [];
      }
      acc[article.keyword].push(article);
      return acc;
    },
    {},
  );

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right, "ko"))
    .map(([keyword, items]) =>
      [
        `📍 ${keyword} (${items.length}건)`,
        ...items.map((article, index) => {
          const publishedAt = new Intl.DateTimeFormat("ko-KR", {
            dateStyle: "medium",
          }).format(new Date(article.publishedAt));

          return `${index + 1}. ${article.title}\n${publishedAt}\n${article.url}`;
        }),
      ].join("\n\n"),
    )
    .join("\n\n\n");
}

export async function POST(request: Request) {
  let articles: Array<{
    title: string;
    url: string;
    keyword: string;
    publishedAt: string;
  }>;

  try {
    const body = (await request.json()) as {
      articles?: Array<{
        title: string;
        url: string;
        keyword: string;
        publishedAt: string;
      }>;
    };
    articles = Array.isArray(body?.articles) && body.articles.length > 0
      ? body.articles
      : (await listScraps()).articles;
  } catch {
    articles = (await listScraps()).articles;
  }

  if (articles.length === 0) {
    return NextResponse.json(
      { message: "전송할 스크랩 기사가 없습니다." },
      { status: 400 },
    );
  }

  try {
    const title = `${new Date().toLocaleDateString("ko-KR")} 스크랩 리포트`;
    const result = await sendLarkMessage({
      title,
      text: buildLarkReportText(articles),
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: `Lark 전송에 실패했습니다. (${result.reason})` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Lark으로 스크랩 기사 ${articles.length}건을 전송했습니다.`,
      articleCount: articles.length,
    });
  } catch (error) {
    console.error("Lark 전송 실패:", error);
    return NextResponse.json(
      { message: "Lark 전송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
