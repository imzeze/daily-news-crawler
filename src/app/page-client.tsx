"use client";

import {
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
  Icon,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  SimpleGrid,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Search } from "lucide-react";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import { getGroupLabel, getGroupOrder } from "@/util/handleKeyword";

type NewsResponse = {
  articles: {
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    keyword: string;
    summary?: string;
    imageUrl?: string;
  }[];
  collectedAt: string;
};

type KeywordResponse = {
  keywords: { id: string; value: string; enabled: boolean }[];
};

type HomeClientProps = {
  initialKeywordCounts: Record<string, number>;
};

const MotionCard = motion.div;
const fetcher = (url: string) => fetch(url).then((res) => res.json());
const getProviderLabel = (url?: string) => {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes("news.google.com")) return "google";

  return "naver";
};

export default function HomeClient({ initialKeywordCounts }: HomeClientProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [newKeyword, setNewKeyword] = useState("");
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
    const labelA = getGroupLabel(a.value);
    const labelB = getGroupLabel(b.value);
    const orderA = getGroupOrder(labelA);
    const orderB = getGroupOrder(labelB);
    if (orderA.tier !== orderB.tier) return orderA.tier - orderB.tier;
    if (orderA.order !== orderB.order) return orderA.order - orderB.order;
    return a.value.localeCompare(b.value, "ko");
  });

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
        body: JSON.stringify({ value: newKeyword.trim() }),
      });

      if (!response.ok) {
        const result = await response.json();
        setKeywordError(result.error ?? "키워드 추가에 실패했습니다.");
        return;
      }
      setNewKeyword("");
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
        const remaining = keywords.filter((keyword) => keyword.value !== value);
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
          <div className="flex justify-between items-end">
            <div>
              <Heading mb="2" size="2xl">
                Daily News Crawler
              </Heading>
              <Text color="gray.600" fontSize="lg">
                SAMG 및 주요 IP 관련 이슈를 매일 자동 수집하고 리스크를 조기
                탐지합니다.
              </Text>
            </div>
            <div>
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
                    {sortedKeywords.map(({ value }, index) => {
                      const label = getGroupLabel(value);
                      const prevLabel =
                        index === 0
                          ? null
                          : getGroupLabel(sortedKeywords[index - 1].value);
                      const showConsonant = label !== prevLabel;
                      const keywordCount = initialKeywordCounts[value] ?? 0;
                      return (
                        <HStack key={value} align="center" spacing={2}>
                          <Text
                            w="20px"
                            fontSize="xs"
                            color="gray.500"
                            textAlign="center"
                            flexShrink={0}
                          >
                            {showConsonant ? label : ""}
                          </Text>
                          <Button
                            size="sm"
                            justifyContent="flex-start"
                            variant={
                              selectedKeyword === value ? "solid" : "ghost"
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
                        </HStack>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Stack>
            </Box>

            <Stack spacing={4} flex="1">
              {isLoading ? (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Box
                      key={`skeleton_${idx}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <Skeleton height="180px" />
                      <Stack spacing={3} p={5}>
                        <HStack spacing={2} alignSelf="flex-start">
                          <Skeleton height="20px" width="72px" />
                          <Skeleton height="20px" width="60px" />
                        </HStack>
                        <SkeletonText noOfLines={2} spacing="2" />
                        <Skeleton height="16px" width="120px" />
                        <Skeleton height="16px" width="140px" />
                        <Skeleton height="32px" width="96px" />
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : error ? (
                <Text color="red.500">뉴스 데이터를 불러오지 못했습니다.</Text>
              ) : filteredArticles.length === 0 ? (
                <Text color="gray.500">현재 표시할 뉴스가 없습니다.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
                  {filteredArticles.map((article, idx) => (
                    <Box
                      key={`${article.publishedAt}_${idx}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      {article.imageUrl ? (
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          height="180px"
                          width="100%"
                          objectFit="cover"
                        />
                      ) : (
                        <Box className="flex h-[180px] items-center justify-center bg-slate-100">
                          <Text color="gray.400" fontSize="sm">
                            이미지 없음
                          </Text>
                        </Box>
                      )}
                      <Stack spacing={3} p={5}>
                        <HStack spacing={2} alignSelf="flex-start">
                          <Badge
                            colorScheme="purple"
                            variant={selectedKeyword ? "solid" : "subtle"}
                          >
                            {article.keyword}
                          </Badge>
                          {getProviderLabel(article.url) ? (
                            <Badge
                              backgroundColor={
                                getProviderLabel(article.url) === "naver"
                                  ? "#65db6b"
                                  : "#D85140"
                              }
                              color="white"
                              variant="solid"
                            >
                              {getProviderLabel(article.url)}
                            </Badge>
                          ) : null}
                        </HStack>
                        <Text fontWeight="semibold" noOfLines={2}>
                          {article.title}
                        </Text>
                        <HStack spacing={2} color="gray.500" fontSize="sm">
                          <Text>{article.source}</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Icon as={Calendar} boxSize={4} />
                          <Text>
                            {formatInTimeZone(
                              new Date(article.publishedAt),
                              "Asia/seoul",
                              "yyyy-MM-dd HH",
                            )}
                            시
                          </Text>
                        </HStack>
                        <Button
                          as="a"
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          size="sm"
                          variant="outline"
                          colorScheme="purple"
                          rightIcon={<Icon as={ExternalLink} boxSize={4} />}
                          alignSelf="flex-start"
                        >
                          기사 열기
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>
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
                  <Stack spacing={3}>
                    {keywords.map((keyword) => (
                      <Box
                        key={keyword.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <HStack justify="space-between" align="center">
                          <Stack spacing={1}>
                            <Text fontWeight="semibold">{keyword.value}</Text>
                          </Stack>
                          <HStack>
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="red"
                              onClick={() =>
                                handleDeleteKeyword(keyword.id, keyword.value)
                              }
                            >
                              삭제
                            </Button>
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
