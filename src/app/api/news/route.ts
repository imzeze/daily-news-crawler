import { NextResponse } from "next/server";
import { collectDailyNews } from "@/lib/news/collect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.trim();
  const onlyToday = url.searchParams.get("onlyToday") === "true";
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const result = await collectDailyNews(keyword ? [keyword] : undefined, {
    onlyToday,
    startDate,
    endDate,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.trim();
  const onlyToday = url.searchParams.get("onlyToday") === "true";
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const result = await collectDailyNews(keyword ? [keyword] : undefined, {
    onlyToday,
    startDate,
    endDate,
  });
  return NextResponse.json(result);
}
