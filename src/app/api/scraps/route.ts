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
    candidate.keyword.trim().length > 0 &&
    (candidate.source === undefined || typeof candidate.source === "string")
  );
}

export async function GET() {
  try {
    const result = await listScraps();
    return NextResponse.json(result);
  } catch (error) {
    console.error("스크랩 목록 조회 실패:", error);
    return NextResponse.json(
      { message: "스크랩 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json();

  if (!isValidScrapPayload(payload)) {
    return NextResponse.json(
      { message: "유효하지 않은 스크랩 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const articles = await addScrap(payload);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("스크랩 저장 실패:", error);
    return NextResponse.json(
      { message: "스크랩을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const payload = await request.json();

  if (!isValidScrapPayload(payload)) {
    return NextResponse.json(
      { message: "유효하지 않은 스크랩 삭제 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const articles = await removeScrap(payload);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("스크랩 삭제 실패:", error);
    return NextResponse.json(
      { message: "스크랩을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
