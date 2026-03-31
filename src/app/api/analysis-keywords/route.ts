import { NextResponse } from "next/server";
import {
  addSentimentKeyword,
  listSentimentKeywords,
  type SentimentKeywordType,
} from "@/lib/news/sentiment-keywords";

export async function GET() {
  const keywords = await listSentimentKeywords();
  return NextResponse.json({ keywords });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    value?: string;
    type?: SentimentKeywordType;
  };

  if (!body.value?.trim()) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  if (body.type !== "positive" && body.type !== "negative") {
    return NextResponse.json(
      { error: "키워드 유형이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const keyword = await addSentimentKeyword(body.value, body.type);
    return NextResponse.json({ keyword }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "키워드 추가에 실패했습니다." },
      { status: 400 },
    );
  }
}
