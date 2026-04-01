"use client";

import {
  Box,
  HStack,
  IconButton,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { formatInTimeZone } from "date-fns-tz";
import { AlertTriangle, Bookmark, Minus, TrendingUp } from "lucide-react";

import { getScrapKey, type NewsArticle } from "./types";

const SENTIMENT_META = {
  positive: {
    label: "긍정",
    icon: TrendingUp,
    accentClass: "border-sky-200 bg-sky-50",
    pillClass: "bg-sky-500 text-white",
  },
  negative: {
    label: "부정",
    icon: AlertTriangle,
    accentClass: "border-rose-200 bg-rose-50",
    pillClass: "bg-rose-500 text-white",
  },
  neutral: {
    label: "중립",
    icon: Minus,
    accentClass: "border-slate-200 bg-slate-50",
    pillClass: "bg-slate-500 text-white",
  },
} as const;

type NewsArticleListProps = {
  filteredArticles: NewsArticle[];
  selectedKeyword: string;
  isLoading: boolean;
  hasError: boolean;
  scrapErrorMessage: string | null;
  scrappedArticleKeys: Set<string>;
  pendingScrapKey: string | null;
  onToggleScrap: (article: NewsArticle) => void;
};

export function NewsArticleList({
  filteredArticles,
  selectedKeyword,
  isLoading,
  hasError,
  scrapErrorMessage,
  scrappedArticleKeys,
  pendingScrapKey,
  onToggleScrap,
}: NewsArticleListProps) {
  return (
    <Stack spacing={4} flex="1" width="100%">
      {scrapErrorMessage ? <Text color="red.500">{scrapErrorMessage}</Text> : null}
      {isLoading ? (
        <Stack
          spacing={0}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <Box
              key={`skeleton_${idx}`}
              className="border-b border-slate-100 last:border-b-0"
              px={5}
              py={4}
            >
              <Stack spacing={2}>
                <Skeleton height="18px" width="72%" />
                <Skeleton height="14px" width="36%" />
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : hasError ? (
        <Text color="red.500">뉴스 데이터를 불러오지 못했습니다.</Text>
      ) : filteredArticles.length === 0 ? (
        <Text color="gray.500" mt={4}>
          조회 기간 내 "{selectedKeyword}"(으)로 수집된 뉴스가 없습니다.
        </Text>
      ) : (
        <Stack
          spacing={0}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {filteredArticles.map((article, idx) => {
            const sentimentMeta = SENTIMENT_META[article.sentiment ?? "neutral"];
            const SentimentIcon = sentimentMeta.icon;

            return (
              <Box
                key={`${article.publishedAt}_${idx}`}
                className="border-b border-slate-200 transition-colors last:border-b-0 hover:bg-slate-50"
                px={5}
                py={5}
              >
                <Stack
                  spacing={3}
                  className={`rounded-xl border p-4 ${sentimentMeta.accentClass}`}
                >
                  <HStack spacing={2} align="center" flexWrap="wrap">
                    {article.sentiment ? (
                      <HStack
                        spacing={1}
                        className={`rounded-full px-2.5 py-1 ${sentimentMeta.pillClass}`}
                      >
                        <SentimentIcon size={12} aria-hidden="true" />
                        <Text as="span" fontSize="xs" fontWeight="bold">
                          {sentimentMeta.label}
                        </Text>
                      </HStack>
                    ) : null}
                    <IconButton
                      ml="auto"
                      size="sm"
                      variant={
                        scrappedArticleKeys.has(getScrapKey(article))
                          ? "solid"
                          : "outline"
                      }
                      colorScheme="purple"
                      aria-label={
                        scrappedArticleKeys.has(getScrapKey(article))
                          ? "스크랩 해제"
                          : "스크랩"
                      }
                      icon={
                        <Bookmark
                          size={16}
                          aria-hidden="true"
                          fill={
                            scrappedArticleKeys.has(getScrapKey(article))
                              ? "currentColor"
                              : "none"
                          }
                        />
                      }
                      isLoading={pendingScrapKey === getScrapKey(article)}
                      onClick={() => onToggleScrap(article)}
                    />
                  </HStack>
                  <Text
                    as="a"
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    fontWeight="semibold"
                    color="gray.900"
                    className="line-clamp-2 hover:text-blue-600 hover:underline"
                  >
                    {article.title}
                  </Text>
                  <Text color="gray.500" fontSize="sm">
                    {article.source} -{" "}
                    {formatInTimeZone(
                      new Date(article.publishedAt),
                      "Asia/Seoul",
                      "yyyy-MM-dd HH:mm",
                    )}
                  </Text>
                  {article.sentimentReason &&
                  !article.sentimentReason.startsWith("본문 기준") ? (
                    <Text color="gray.700" fontSize="sm" fontWeight="medium">
                      {article.sentimentReason}
                    </Text>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
