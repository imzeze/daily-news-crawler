import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { addHours, format } from "date-fns";

const RUN_HOURS = [9, 13, 17];

function resolveApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function readKeywordValues() {
  const filePath = path.join(process.cwd(), "data", "keywords.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  const values = parsed
    .filter((item) => item && item.enabled !== false)
    .map((item) => (typeof item.value === "string" ? item.value.trim() : ""))
    .filter(Boolean);

  return [...new Set(values)];
}

async function callNewsApiForKeyword(baseUrl, keyword) {
  const url = `${baseUrl}/api/news?keyword=${encodeURIComponent(keyword)}`;
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Request failed (${response.status}): ${body}`);
  }
  return response;
}

async function callBotApi(keyword, count) {
  const message = `금일 ${keyword} 키워드의 뉴스가 ${count}건 수집되었습니다.`;
  const response = await fetch(
    "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LARK_BOT_BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        msg_type: "text",
        content: `{"text":"${message}"}`,
        receive_id: "jihyk@samg.net",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Bot request failed (${response.status}): ${body}`);
  }
}

export async function runNewsSchedulerOnce() {
  const baseUrl = resolveApiBaseUrl();
  const keywords = await readKeywordValues();

  if (keywords.length === 0) {
    console.log("[news-scheduler] No keywords found.");
    return;
  }

  console.log(
    `[news-scheduler] ${baseUrl} Running for ${keywords.length} keyword(s) at ${new Date().toISOString()}`,
  );

  for (const keyword of keywords) {
    try {
      const response = await callNewsApiForKeyword(baseUrl, keyword);

      const data = await response.json();
      const today = format(
        addHours(new Date(), Number(process.env.TIMEZONE_OFFSET) || 0),
        "yyyy-MM-dd",
      );

      const todayNews = data.articles.filter((article) => {
        if (!article || typeof article !== "object") return false;
        const publishedAt = article.publishedAt;
        if (!publishedAt) return false;

        return (
          typeof publishedAt === "string" &&
          format(publishedAt, "yyyy-MM-dd").startsWith(today)
        );
      });

      if (todayNews.length > 1) {
        await callBotApi(baseUrl, keyword, todayNews.length);
        console.log(
          `[news-scheduler] Bot notified keyword="${keyword}" count=${todayNews.length}`,
        );
      }
    } catch (error) {
      console.error(
        `[news-scheduler] FAIL keyword="${keyword}":`,
        JSON.stringify(error.message),
      );
    }
  }
}

export async function startNewsScheduler() {
  const scheduleNextRun = () => {
    const now = new Date();
    let nextRun = null;

    for (const hour of RUN_HOURS) {
      const candidate = new Date(now);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now) {
        nextRun = candidate;
        break;
      }
    }

    if (!nextRun) {
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(RUN_HOURS[0], 0, 0, 0);
    }

    const delay = Math.max(0, nextRun.getTime() - now.getTime());
    console.log(
      `[news-scheduler] Next run at ${nextRun.toISOString()} (in ${Math.round(delay / 1000)}s)`,
    );

    setTimeout(() => {
      runNewsSchedulerOnce()
        .catch((error) => {
          console.error(
            "[news-scheduler] Unexpected error:",
            error instanceof Error ? error.message : error,
          );
        })
        .finally(() => {
          scheduleNextRun();
        });
    }, delay);
  };

  scheduleNextRun();
}

const executedFilePath = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;

if (
  executedFilePath &&
  pathToFileURL(executedFilePath).href === import.meta.url
) {
  startNewsScheduler().catch((error) => {
    console.error(
      "[news-scheduler] Failed to start:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
