import { NextResponse } from "next/server";
import { collectDailyNews } from "@/lib/news/collect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.trim();
  const onlyToday = url.searchParams.get("onlyToday") === "true";
  const result = await collectDailyNews(keyword ? [keyword] : undefined, {
    onlyToday,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.trim();
  const onlyToday = url.searchParams.get("onlyToday") === "true";
  const result = await collectDailyNews(keyword ? [keyword] : undefined, {
    onlyToday,
  });
  return NextResponse.json(result);
}
