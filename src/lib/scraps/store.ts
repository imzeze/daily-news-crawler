import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ScrappedArticle } from "@/lib/news/types";

const SCRAPS_FILE_PATH = path.join(process.cwd(), "data", "scraps.json");

type ScrapFile = {
  articles: ScrappedArticle[];
  updatedAt: string | null;
};

const INITIAL_SCRAP_FILE: ScrapFile = {
  articles: [],
  updatedAt: null,
};

const getScrapIdentity = (article: ScrappedArticle) =>
  `${article.keyword}::${article.url}`;

async function ensureScrapFile() {
  await mkdir(path.dirname(SCRAPS_FILE_PATH), { recursive: true });

  try {
    await readFile(SCRAPS_FILE_PATH, "utf-8");
  } catch {
    await writeFile(
      SCRAPS_FILE_PATH,
      JSON.stringify(INITIAL_SCRAP_FILE, null, 2),
      "utf-8",
    );
  }
}

async function readScrapFile(): Promise<ScrapFile> {
  await ensureScrapFile();

  try {
    const content = await readFile(SCRAPS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content) as Partial<ScrapFile>;

    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return INITIAL_SCRAP_FILE;
  }
}

async function writeScrapFile(articles: ScrappedArticle[]) {
  const payload: ScrapFile = {
    articles,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(SCRAPS_FILE_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

export async function listScraps() {
  return readScrapFile();
}

export async function addScrap(article: ScrappedArticle) {
  const current = await readScrapFile();
  const nextArticles = [...current.articles];
  const nextIdentity = getScrapIdentity(article);
  const existingIndex = nextArticles.findIndex(
    (item) => getScrapIdentity(item) === nextIdentity,
  );

  if (existingIndex === -1) {
    nextArticles.unshift(article);
    await writeScrapFile(nextArticles);
    return nextArticles;
  }

  return current.articles;
}

export async function removeScrap(article: ScrappedArticle) {
  const current = await readScrapFile();
  const nextIdentity = getScrapIdentity(article);
  const nextArticles = current.articles.filter(
    (item) => getScrapIdentity(item) !== nextIdentity,
  );

  if (nextArticles.length !== current.articles.length) {
    await writeScrapFile(nextArticles);
  }

  return nextArticles;
}
