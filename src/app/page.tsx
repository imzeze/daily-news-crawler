import { addHours, format } from "date-fns";
import HomeClient from "./page-client";
import { listKeywords } from "@/lib/keywords/store";

export const dynamic = "force-static";

const getBaseUrl = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (siteUrl) return siteUrl;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
};

export default async function Page() {
  const keywords = await listKeywords();
  const enabledKeywords = keywords.filter((keyword) => keyword.enabled);

  const baseUrl = getBaseUrl();
  const counts: Record<string, number> = {};

  await Promise.all(
    enabledKeywords.map(async (keyword) => {
      const url = new URL("/api/news", baseUrl);
      url.searchParams.append("keyword", keyword.value);

      const response = await fetch(url.toString(), { cache: "force-cache" });
      if (!response.ok) {
        counts[keyword.value] = 0;
        return;
      }

      const data = (await response.json()) as { articles?: unknown[] };
      if (!Array.isArray(data.articles)) {
        counts[keyword.value] = 0;
        return;
      }

      const today = format(
        addHours(new Date(), Number(process.env.TIMEZONE_OFFSET) || 0),
        "yyyy-MM-dd",
      );
      counts[keyword.value] = data.articles.filter((article) => {
        if (!article || typeof article !== "object") return false;
        const publishedAt = (article as { publishedAt?: string }).publishedAt;
        if (!publishedAt) return false;

        return (
          typeof publishedAt === "string" &&
          format(publishedAt, "yyyy-MM-dd").startsWith(today)
        );
      }).length;
    }),
  );

  return <HomeClient initialKeywordCounts={counts} />;
}
