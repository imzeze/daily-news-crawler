import { NextResponse } from "next/server";
import {
  removeSentimentKeyword,
  updateSentimentKeyword,
  type SentimentKeywordType,
} from "@/lib/news/sentiment-keywords";

type Params = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: Params) {
  const body = (await request.json()) as {
    value?: string;
    type?: SentimentKeywordType;
  };

  try {
    const keyword = await updateSentimentKeyword(params.id, {
      value: body.value,
      type: body.type,
    });

    if (!keyword) {
      return NextResponse.json({ error: "키워드를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ keyword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "키워드 수정에 실패했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const removed = await removeSentimentKeyword(params.id);

  if (!removed) {
    return NextResponse.json({ error: "키워드를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
