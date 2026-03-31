import { NextResponse } from "next/server";
import { addScrap, listScraps, removeScrap } from "@/lib/scraps/store";
import type { ScrappedArticle } from "@/lib/news/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidScrapPayload(payload: unknown): payload is ScrappedArticle {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<ScrappedArticle>;

  return (
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.url === "string" &&
    candidate.url.trim().length > 0 &&
    typeof candidate.publishedAt === "string" &&
    candidate.publishedAt.trim().length > 0 &&
    typeof candidate.keyword === "string" &&
    candidate.keyword.trim().length > 0
  );
}

export async function GET() {
  const result = await listScraps();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const payload = await request.json();

  if (!isValidScrapPayload(payload)) {
    return NextResponse.json(
      { message: "유효하지 않은 스크랩 요청입니다." },
      { status: 400 },
    );
  }

  const articles = await addScrap(payload);
  return NextResponse.json({ articles });
}

export async function DELETE(request: Request) {
  const payload = await request.json();

  if (!isValidScrapPayload(payload)) {
    return NextResponse.json(
      { message: "유효하지 않은 스크랩 삭제 요청입니다." },
      { status: 400 },
    );
  }

  const articles = await removeScrap(payload);
  return NextResponse.json({ articles });
}
