"use client";

import { formatDateParam } from "@/lib/news/date-range";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Heading,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Stack,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { isSameDay, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  Minus,
  Settings2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import useSWR from "swr";

type NewsResponse = {
  articles: {
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    keyword: string;
    summary?: string;
    imageUrl?: string;
    sentiment?: "positive" | "negative" | "neutral";
    sentimentReason?: string;
    matchedKeywords?: string[];
  }[];
  collectedAt: string;
};

type ScrapArticle = {
  title: string;
  url: string;
  publishedAt: string;
  keyword: string;
};

type ScrapResponse = {
  articles: ScrapArticle[];
  updatedAt?: string | null;
};

type KeywordResponse = {
  keywords: {
    id: string;
    value: string;
    category: string;
    enabled: boolean;
  }[];
};

type DatePreset = "today" | "3days" | "1week" | null;

const MotionCard = motion.div;
const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
};

const getScrapKey = (article: { keyword: string; url: string }) =>
  `${article.keyword}::${article.url}`;

const SENTIMENT_META = {
  positive: {
    label: "긍정",
    colorScheme: "green",
    icon: TrendingUp,
    accentClass: "border-emerald-200 bg-emerald-50",
    pillClass: "bg-emerald-500 text-white",
    keywordClass:
      "border border-emerald-300 bg-white text-emerald-900 shadow-sm",
  },
  negative: {
    label: "부정",
    colorScheme: "red",
    icon: AlertTriangle,
    accentClass: "border-rose-200 bg-rose-50",
    pillClass: "bg-rose-500 text-white",
    keywordClass: "border border-rose-300 bg-white text-rose-900 shadow-sm",
  },
  neutral: {
    label: "중립",
    colorScheme: "gray",
    icon: Minus,
    accentClass: "border-slate-200 bg-slate-50",
    pillClass: "bg-slate-500 text-white",
    keywordClass: "border border-slate-300 bg-white text-slate-700 shadow-sm",
  },
} as const;

export default function HomeClient() {
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [isKeywordListOpen, setIsKeywordListOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() =>
    subDays(new Date(), 7),
  );
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>("1week");
  const [pendingScrapKey, setPendingScrapKey] = useState<string | null>(null);
  const [scrapErrorMessage, setScrapErrorMessage] = useState<string | null>(
    null,
  );
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const { data: keywordData } = useSWR<KeywordResponse>(
    "/api/keywords",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const keywords = keywordData?.keywords ?? [];
  const sortedKeywords = [...keywords].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category, "ko");
    }
    return a.value.localeCompare(b.value, "ko");
  });
  const groupedKeywords = Object.values(
    sortedKeywords.reduce<
      Record<string, { category: string; keywords: typeof sortedKeywords }>
    >((acc, keyword) => {
      const group = acc[keyword.category];
      if (group) {
        group.keywords.push(keyword);
      } else {
        acc[keyword.category] = {
          category: keyword.category,
          keywords: [keyword],
        };
      }
      return acc;
    }, {}),
  );

  const activeKeyword = selectedKeyword || sortedKeywords[0]?.value || "";
  const newsApiUrl = useMemo(() => {
    if (!activeKeyword) return null;

    const params = new URLSearchParams({
      keyword: activeKeyword,
      startDate: formatDateParam(startDate),
      endDate: formatDateParam(endDate),
    });

    return `/api/news?${params.toString()}`;
  }, [activeKeyword, endDate, startDate]);
  const { data, error, isLoading } = useSWR<NewsResponse>(newsApiUrl, fetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: scrapData,
    mutate: mutateScraps,
    isLoading: isScrapLoading,
  } = useSWR<ScrapResponse>("/api/scraps", fetcher, {
    revalidateOnFocus: false,
  });
  const articles = data?.articles ?? [];
  const scrappedArticles = scrapData?.articles ?? [];
  const filteredArticles = selectedKeyword
    ? articles.filter((article) => article.keyword === selectedKeyword)
    : articles;
  const scrappedArticleKeys = useMemo(
    () => new Set(scrappedArticles.map((article) => getScrapKey(article))),
    [scrappedArticles],
  );
  const groupedScrappedArticles = useMemo(
    () =>
      Object.entries(
        scrappedArticles.reduce<Record<string, ScrapArticle[]>>(
          (acc, article) => {
            if (!acc[article.keyword]) {
              acc[article.keyword] = [];
            }

            acc[article.keyword].push(article);
            return acc;
          },
          {},
        ),
      ).sort(([leftKeyword], [rightKeyword]) =>
        leftKeyword.localeCompare(rightKeyword, "ko"),
      ),
    [scrappedArticles],
  );

  const handleToggleKeyword = (value: string) => {
    setSelectedKeyword(value);
  };

  const handleToggleScrap = async (article: ScrapArticle) => {
    const payload: ScrapArticle = {
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
      keyword: article.keyword,
    };
    const scrapKey = getScrapKey(payload);
    const isScrapped = scrappedArticleKeys.has(scrapKey);

    setPendingScrapKey(scrapKey);
    setScrapErrorMessage(null);

    try {
      const response = await fetch("/api/scraps", {
        method: isScrapped ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update scrap");
      }

      await mutateScraps();
    } catch {
      setScrapErrorMessage("스크랩 저장 상태를 변경하지 못했습니다.");
    } finally {
      setPendingScrapKey(null);
    }
  };

  const applyDatePreset = (preset: Exclude<DatePreset, null>) => {
    const today = new Date();
    const presetStartDate =
      preset === "today"
        ? today
        : preset === "3days"
          ? subDays(today, 3)
          : subDays(today, 7);

    setStartDate(presetStartDate);
    setEndDate(today);
    setActiveDatePreset(preset);
  };

  const handleStartDateChange = (date: Date | null) => {
    if (!date) return;
    setStartDate(date);
    setActiveDatePreset(null);
    if (date > endDate) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (!date) return;
    setEndDate(date);
    setActiveDatePreset(null);
    if (date < startDate) {
      setStartDate(date);
    }
  };

  useEffect(() => {
    const today = new Date();

    if (isSameDay(startDate, today) && isSameDay(endDate, today)) {
      setActiveDatePreset("today");
      return;
    }

    if (isSameDay(startDate, subDays(today, 3)) && isSameDay(endDate, today)) {
      setActiveDatePreset("3days");
      return;
    }

    if (isSameDay(startDate, subDays(today, 7)) && isSameDay(endDate, today)) {
      setActiveDatePreset("1week");
      return;
    }

    setActiveDatePreset(null);
  }, [endDate, startDate]);

  useEffect(() => {
    if (sortedKeywords.length === 0) return;
    setSelectedKeyword((prev) => (prev ? prev : sortedKeywords[0].value));
  }, [sortedKeywords]);

  return (
    <Container maxW="8xl" className="pb-16 pt-10">
      <Stack spacing={4}>
        <Stack spacing={3}>
          <div id="title" className="flex justify-between items-start">
            <div>
              <Heading mb="2" size="2xl">
                Daily News Crawler
              </Heading>
              <Text color="gray.600" fontSize="lg">
                SAMG 및 주요 IP 관련 이슈를 매일 자동 수집하고 리스크를 조기
                탐지합니다.
              </Text>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Menu placement="bottom-end">
                <MenuButton
                  as={IconButton}
                  aria-label="설정"
                  icon={<Settings2 size={18} aria-hidden="true" />}
                  variant="outline"
                  borderRadius="xl"
                  backgroundColor="white"
                />
                <MenuList borderRadius="2xl" py={3} minW="240px" shadow="lg">
                  <MenuItem
                    as={Link}
                    href="/keywords"
                    icon={<ChevronRight size={16} aria-hidden="true" />}
                  >
                    검색 키워드 관리
                  </MenuItem>
                  <MenuItem
                    as={Link}
                    href="/analysis-keywords"
                    icon={<ChevronRight size={16} aria-hidden="true" />}
                  >
                    기사 분석 키워드 관리
                  </MenuItem>
                </MenuList>
              </Menu>
            </div>
          </div>
        </Stack>
        <Box className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <Stack
            direction={{ base: "column", "1xl": "row" }}
            spacing={8}
            align="center"
          >
            <Heading size="sm" color="gray.600">
              조회기간
            </Heading>
            <HStack spacing={3} flexWrap="wrap">
              {[
                { key: "today", label: "오늘" },
                { key: "3days", label: "3일" },
                { key: "1week", label: "1주일" },
              ].map((preset) => {
                const isActive = activeDatePreset === preset.key;

                return (
                  <Button
                    key={preset.key}
                    onClick={() =>
                      applyDatePreset(preset.key as Exclude<DatePreset, null>)
                    }
                    py={2}
                    px={8}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor={
                      isActive ? "var(--chakra-colors-purple-500)" : "gray.200"
                    }
                    bg={isActive ? "var(--chakra-colors-purple-500)" : "white"}
                    color={isActive ? "white" : "gray.900"}
                    fontSize="sm"
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </HStack>
            <HStack spacing={3} flexWrap="wrap" align="center">
              <Box position="relative">
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={endDate}
                  dateFormat="yyyy.MM.dd"
                  locale={ko}
                  className="date-picker-input"
                />
              </Box>
              <Text color="gray.600">~</Text>
              <Box position="relative">
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date()}
                  dateFormat="yyyy.MM.dd"
                  locale={ko}
                  className="date-picker-input"
                />
              </Box>
            </HStack>
          </Stack>
        </Box>
        <MotionCard
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Stack
            direction={{ base: "column", xl: "row" }}
            spacing={4}
            align="flex-start"
          >
            <Box
              w={{ base: "full", xl: "300px" }}
              position={{ base: "static", xl: "sticky" }}
              top="24px"
              alignSelf="flex-start"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Stack spacing={4}>
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Heading size="sm">키워드</Heading>
                    {!isKeywordListOpen && !isDesktop && activeKeyword ? (
                      <Badge colorScheme="purple" variant="subtle">
                        {activeKeyword}
                      </Badge>
                    ) : null}
                  </HStack>
                  <HStack spacing={2}>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="purple"
                      display={{ base: "inline-flex", lg: "none" }}
                      onClick={() => setIsKeywordListOpen((prev) => !prev)}
                    >
                      {isKeywordListOpen ? "접기" : "펼치기"}
                    </Button>
                  </HStack>
                </HStack>
                <Collapse in={isDesktop || isKeywordListOpen} animateOpacity>
                  <Stack
                    spacing={2}
                    maxH={{ base: "auto", lg: "calc(100vh - 180px)" }}
                    overflowY={{ base: "visible", lg: "auto" }}
                    pr={{ base: 0, lg: 2 }}
                    pt={{ base: 2, lg: 0 }}
                  >
                    <Accordion
                      allowMultiple
                      defaultIndex={groupedKeywords.map((_, index) => index)}
                    >
                      {groupedKeywords.map((group) => (
                        <AccordionItem key={group.category} mb={2}>
                          <AccordionButton px={3} py={2}>
                            <Box
                              flex="1"
                              textAlign="left"
                              fontSize="xs"
                              fontWeight="bold"
                              color="gray.500"
                              textTransform="uppercase"
                            >
                              {group.category}
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pt={1} pb={3}>
                            <Stack spacing={2} maxH="160px" overflowY="auto">
                              {group.keywords.map(({ value }) => (
                                <Button
                                  key={value}
                                  size="md"
                                  padding={2}
                                  justifyContent="flex-start"
                                  variant={
                                    selectedKeyword === value
                                      ? "solid"
                                      : "ghost"
                                  }
                                  colorScheme="purple"
                                  onClick={() => handleToggleKeyword(value)}
                                  w="full"
                                >
                                  <Text>{value}</Text>
                                </Button>
                              ))}
                            </Stack>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </Stack>
                </Collapse>
              </Stack>
            </Box>

            <Stack spacing={4} flex="1">
              {scrapErrorMessage ? (
                <Text color="red.500">{scrapErrorMessage}</Text>
              ) : null}
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
              ) : error ? (
                <Text color="red.500">뉴스 데이터를 불러오지 못했습니다.</Text>
              ) : filteredArticles.length === 0 ? (
                <>
                  <Text color="gray.500" mt={4}>
                    조회 기간 내 "{selectedKeyword}"(으)로 수집된 뉴스가
                    없습니다.
                  </Text>
                </>
              ) : (
                <Stack
                  spacing={0}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {filteredArticles.map((article, idx) =>
                    (() => {
                      const sentimentMeta =
                        SENTIMENT_META[article.sentiment ?? "neutral"];
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
                            className={`rounded-xl border p-4 ${
                              sentimentMeta.accentClass
                            }`}
                          >
                            <HStack spacing={2} align="center" flexWrap="wrap">
                              {article.sentiment ? (
                                <HStack
                                  spacing={1}
                                  className={`rounded-full px-2.5 py-1 ${sentimentMeta.pillClass}`}
                                >
                                  <SentimentIcon size={12} aria-hidden="true" />
                                  <Text
                                    as="span"
                                    fontSize="xs"
                                    fontWeight="bold"
                                  >
                                    {sentimentMeta.label}
                                  </Text>
                                </HStack>
                              ) : null}
                              <Button
                                ml="auto"
                                size="sm"
                                variant={
                                  scrappedArticleKeys.has(getScrapKey(article))
                                    ? "solid"
                                    : "outline"
                                }
                                colorScheme="purple"
                                isLoading={
                                  pendingScrapKey === getScrapKey(article)
                                }
                                onClick={() => handleToggleScrap(article)}
                              >
                                {scrappedArticleKeys.has(getScrapKey(article))
                                  ? "스크랩 해제"
                                  : "스크랩"}
                              </Button>
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
                              <Text
                                color="gray.700"
                                fontSize="sm"
                                fontWeight="medium"
                              >
                                {article.sentimentReason}
                              </Text>
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    })(),
                  )}
                </Stack>
              )}
            </Stack>

            <Box
              w={{ base: "full", xl: "360px" }}
              position={{ base: "static", xl: "sticky" }}
              top="24px"
              alignSelf="flex-start"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Stack spacing={4}>
                <HStack justify="space-between">
                  <Heading size="sm">스크랩 기사</Heading>
                </HStack>
                {isScrapLoading ? (
                  <Stack spacing={3}>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Skeleton
                        key={`scrap_skeleton_${idx}`}
                        height="44px"
                        borderRadius="xl"
                      />
                    ))}
                  </Stack>
                ) : groupedScrappedArticles.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">
                    기사 카드의 스크랩 버튼으로 관심 기사를 저장할 수 있습니다.
                  </Text>
                ) : (
                  <Accordion allowMultiple defaultIndex={[0]}>
                    {groupedScrappedArticles.map(
                      ([keyword, keywordArticles]) => (
                        <AccordionItem key={keyword} border="none" mb={2}>
                          <AccordionButton
                            px={3}
                            py={3}
                            borderRadius="xl"
                            className="bg-slate-50"
                          >
                            <Box flex="1" textAlign="left">
                              <Text fontWeight="semibold" color="gray.800">
                                {keyword}
                              </Text>
                              <Text color="gray.500" fontSize="xs">
                                {keywordArticles.length}건
                              </Text>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel px={2} pt={3} pb={1}>
                            <VStack
                              spacing={3}
                              align="stretch"
                              borderLeft="2px solid"
                              borderColor="purple.100"
                              pl={4}
                            >
                              {keywordArticles.map((article) => (
                                <Box
                                  key={getScrapKey(article)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                                >
                                  <HStack align="flex-start" spacing={2}>
                                    <Text
                                      as="a"
                                      href={article.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      fontSize="sm"
                                      fontWeight="medium"
                                      color="gray.900"
                                      className="line-clamp-2 flex-1 hover:text-blue-600 hover:underline"
                                    >
                                      {article.title}
                                    </Text>
                                    <IconButton
                                      aria-label="스크랩 해제"
                                      icon={<Text fontSize="sm">x</Text>}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="gray"
                                      isLoading={
                                        pendingScrapKey === getScrapKey(article)
                                      }
                                      onClick={() => handleToggleScrap(article)}
                                    />
                                  </HStack>
                                  <Text mt={1} color="gray.500" fontSize="xs">
                                    {formatInTimeZone(
                                      new Date(article.publishedAt),
                                      "Asia/Seoul",
                                      "yyyy-MM-dd HH:mm",
                                    )}
                                  </Text>
                                </Box>
                              ))}
                            </VStack>
                          </AccordionPanel>
                        </AccordionItem>
                      ),
                    )}
                  </Accordion>
                )}
              </Stack>
            </Box>
          </Stack>
        </MotionCard>
      </Stack>
    </Container>
  );
}
