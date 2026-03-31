"use client";

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
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Skeleton,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import { subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  Minus,
  Search,
  Settings2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

const CATEGORY_OPTIONS = ["SAMG", "콘텐츠 산업", "구글 영문 검색"] as const;
type KeywordCategory = (typeof CATEGORY_OPTIONS)[number];

type KeywordResponse = {
  keywords: {
    id: string;
    value: string;
    category: KeywordCategory;
    enabled: boolean;
  }[];
};

type HomeClientProps = {
  initialKeywordCounts: Record<string, number>;
};

const MotionCard = motion.div;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export default function HomeClient({ initialKeywordCounts }: HomeClientProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState<KeywordCategory>("SAMG");
  const [keywordError, setKeywordError] = useState("");
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [isKeywordListOpen, setIsKeywordListOpen] = useState(true);
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data: keywordData, mutate: mutateKeywords } = useSWR<KeywordResponse>(
    "/api/keywords",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const keywords = keywordData?.keywords ?? [];
  const sortedKeywords = [...keywords].sort((a, b) => {
    const categoryOrder =
      CATEGORY_OPTIONS.indexOf(a.category) -
      CATEGORY_OPTIONS.indexOf(b.category);
    if (categoryOrder !== 0) return categoryOrder;
    return a.value.localeCompare(b.value, "ko");
  });
  const groupedKeywords = CATEGORY_OPTIONS.map((category) => ({
    category,
    keywords: sortedKeywords.filter((keyword) => keyword.category === category),
  })).filter((group) => group.keywords.length > 0);

  const activeKeyword = selectedKeyword || sortedKeywords[0]?.value || "";
  const newsApiUrl = activeKeyword
    ? `/api/news?keyword=${encodeURIComponent(activeKeyword)}`
    : null;
  const { data, error, isLoading } = useSWR<NewsResponse>(newsApiUrl, fetcher, {
    revalidateOnFocus: false,
  });
  const articles = data?.articles ?? [];
  const filteredArticles = selectedKeyword
    ? articles.filter((article) => article.keyword === selectedKeyword)
    : articles;

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      setKeywordError("키워드를 입력해 주세요.");
      return;
    }

    setIsSavingKeyword(true);
    setKeywordError("");
    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: newKeyword.trim(),
          category: newCategory,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setKeywordError(result.error ?? "키워드 추가에 실패했습니다.");
        return;
      }
      setNewKeyword("");
      setNewCategory("SAMG");
      await mutateKeywords();
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id: string, value: string) => {
    const response = await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSelectedKeyword((prev) => {
        if (prev !== value) return prev;
        const remaining = sortedKeywords.filter(
          (keyword) => keyword.value !== value,
        );
        return remaining[0]?.value ?? "";
      });
      await mutateKeywords();
    }
  };

  const handleToggleKeyword = (value: string) => {
    setSelectedKeyword(value);
  };

  useEffect(() => {
    if (sortedKeywords.length === 0) return;
    setSelectedKeyword((prev) => (prev ? prev : sortedKeywords[0].value));
  }, [sortedKeywords]);

  return (
    <Container maxW="7xl" className="pb-16 pt-14">
      <Stack spacing={8}>
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
                  aria-label="기사 분석 설정"
                  icon={<Settings2 size={18} aria-hidden="true" />}
                  variant="outline"
                  borderRadius="xl"
                />
                <MenuList borderRadius="2xl" py={3} minW="240px" shadow="lg">
                  <MenuItem
                    as={Link}
                    href="/analysis-keywords"
                    icon={<ChevronRight size={16} aria-hidden="true" />}
                  >
                    기사 분석 키워드 관리
                  </MenuItem>
                </MenuList>
              </Menu>
              <HStack justify="space-between" align="center">
                {data?.collectedAt ? (
                  <Text color="gray.500" fontSize="sm">
                    {formatInTimeZone(
                      subDays(new Date(), 7),
                      "Asia/Seoul",
                      "yyyy-MM-dd",
                    )}
                    ~{formatInTimeZone(new Date(), "Asia/Seoul", "yyyy-MM-dd")}{" "}
                    기준
                  </Text>
                ) : null}
              </HStack>
            </div>
          </div>
        </Stack>
        <MotionCard
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Stack
            direction={{ base: "column", lg: "row" }}
            spacing={{ base: 6, lg: 8 }}
            align="flex-start"
          >
            <Box
              w={{ base: "full", lg: "260px" }}
              position={{ base: "static", lg: "sticky" }}
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
                      leftIcon={<Search size={14} aria-hidden="true" />}
                      onClick={onOpen}
                    >
                      관리
                    </Button>
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
                              {group.keywords.map(({ value }) => {
                                const keywordCount =
                                  initialKeywordCounts[value] ?? 0;
                                return (
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
                                    <HStack w="full" justify="space-between">
                                      <Text>{value}</Text>
                                      {keywordCount > 0 ? (
                                        <Badge
                                          rounded={12}
                                          px={1.5}
                                          py={0.5}
                                          colorScheme="red"
                                          variant="solid"
                                        >
                                          {keywordCount}
                                        </Badge>
                                      ) : null}
                                    </HStack>
                                  </Button>
                                );
                              })}
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
                <Text color="gray.500">현재 표시할 뉴스가 없습니다.</Text>
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
          </Stack>
        </MotionCard>
      </Stack>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>키워드 관리</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="10">
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>키워드 추가</FormLabel>
                <Stack spacing={3}>
                  <Select
                    value={newCategory}
                    onChange={(event) =>
                      setNewCategory(event.target.value as KeywordCategory)
                    }
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                  <HStack align="flex-start">
                    <Input
                      value={newKeyword}
                      onChange={(event) => setNewKeyword(event.target.value)}
                      placeholder="새 키워드를 입력하세요"
                    />
                    <Button
                      colorScheme="purple"
                      onClick={handleAddKeyword}
                      isLoading={isSavingKeyword}
                    >
                      추가
                    </Button>
                  </HStack>
                </Stack>
                {keywordError ? (
                  <Text color="red.500" fontSize="sm" mt={2}>
                    {keywordError}
                  </Text>
                ) : null}
              </FormControl>

              <Divider />

              <Stack spacing={3}>
                <Heading size="sm">필터 선택</Heading>
                <Box maxH="320px" overflowY="auto">
                  <Accordion
                    allowMultiple
                    defaultIndex={groupedKeywords.map((_, index) => index)}
                  >
                    {groupedKeywords.map((group) => (
                      <AccordionItem key={group.category} mb={3}>
                        <AccordionButton px={3} py={2}>
                          <Box flex="1" textAlign="left">
                            <Heading size="xs" color="gray.500">
                              {group.category}
                            </Heading>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pt={1} pb={3}>
                          <Stack spacing={2} maxH="200px" overflowY="auto">
                            {group.keywords.map((keyword) => (
                              <Box
                                key={keyword.id}
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                              >
                                <HStack justify="space-between" align="center">
                                  <Stack spacing={1}>
                                    <Text fontWeight="semibold">
                                      {keyword.value}
                                    </Text>
                                  </Stack>
                                  <HStack>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      colorScheme="red"
                                      onClick={() =>
                                        handleDeleteKeyword(
                                          keyword.id,
                                          keyword.value,
                                        )
                                      }
                                    >
                                      삭제
                                    </Button>
                                  </HStack>
                                </HStack>
                              </Box>
                            ))}
                          </Stack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Box>
              </Stack>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
