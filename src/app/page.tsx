"use client";

import {
  Badge,
  Box,
  Button,
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
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  useDisclosure,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Search } from "lucide-react";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";

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

const MotionCard = motion.div;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data: keywordData, mutate: mutateKeywords } = useSWR<KeywordResponse>(
    "/api/keywords",
    fetcher,
  );
  const keywords = keywordData?.keywords ?? [];
  const activeKeyword = selectedKeywords[0] ?? keywords[0]?.value ?? "";
  const newsApiUrl = activeKeyword
    ? `/api/news?keyword=${encodeURIComponent(activeKeyword)}`
    : "/api/news";
  const {
    data,
    error,
    isLoading,
    mutate: mutateNews,
  } = useSWR<NewsResponse>(newsApiUrl, fetcher);
  const articles = data?.articles ?? [];
  const filteredArticles =
    selectedKeywords.length === 0
      ? articles
      : articles.filter((article) =>
          selectedKeywords.includes(article.keyword),
        );

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
      await Promise.all([mutateKeywords(), mutateNews()]);
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id: string, value: string) => {
    const response = await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSelectedKeywords((prev) => {
        const next = prev.filter((item) => item !== value);
        if (next.length > 0) return next;
        const remaining = keywords.filter((keyword) => keyword.value !== value);
        return remaining.length > 0 ? [remaining[0].value] : [];
      });
      await Promise.all([mutateKeywords(), mutateNews()]);
    }
  };

  const handleToggleKeyword = (value: string) => {
    setSelectedKeywords([value]);
  };

  const clearKeywordFilter = () => {
    setSelectedKeywords([]);
    onClose();
  };

  const handleRemoveKeywordChip = (value: string) => {
    setSelectedKeywords([value]);
  };

  const displayedKeywords = keywords.map((keyword) => keyword.value);

  useEffect(() => {
    if (keywords.length === 0) return;
    setSelectedKeywords((prev) =>
      prev.length === 0 ? [keywords[0].value] : prev,
    );
  }, [keywords]);
  return (
    <Container maxW="5xl" className="py-16">
      <Stack spacing={8}>
        <Stack spacing={3}>
          <Heading size="2xl">Daily News Crawler</Heading>
          <Text color="gray.600" fontSize="lg">
            SAMG 및 주요 IP 관련 이슈를 매일 자동 수집하고 리스크를 조기
            탐지합니다.
          </Text>
        </Stack>
        <MotionCard
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <HStack spacing={3} justifyContent="flex-end">
            <Button
              leftIcon={<Search size={16} aria-hidden="true" />}
              colorScheme="purple"
              onClick={onOpen}
            >
              키워드 관리
            </Button>
            <Button variant="outline" colorScheme="gray">
              리포트 보기
            </Button>
          </HStack>
        </MotionCard>

        <Stack spacing={4}>
          <HStack justify="space-between" align="center">
            <Heading size="md">수집 결과</Heading>
            {data?.collectedAt ? (
              <Text color="gray.500" fontSize="sm">
                {formatInTimeZone(
                  subDays(new Date(), 7),
                  "Asia/Seoul",
                  "yyyy-MM-dd",
                )}
                ~{formatInTimeZone(new Date(), "Asia/Seoul", "yyyy-MM-dd")} 기준
              </Text>
            ) : null}
          </HStack>
          {displayedKeywords.length > 0 ? (
            <Wrap spacing={2}>
              {displayedKeywords.map((keyword) => (
                <WrapItem key={keyword}>
                  <Tag
                    px="4"
                    py="2"
                    colorScheme="purple"
                    variant={
                      selectedKeywords.includes(keyword) ? "solid" : "outline"
                    }
                    borderRadius="full"
                    cursor="pointer"
                    onClick={() => handleToggleKeyword(keyword)}
                  >
                    <TagLabel>{keyword}</TagLabel>
                    {selectedKeywords.includes(keyword) ? (
                      <TagCloseButton
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveKeywordChip(keyword);
                        }}
                      />
                    ) : null}
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          ) : null}
          {isLoading ? (
            <Text color="gray.500">뉴스 데이터를 불러오는 중입니다.</Text>
          ) : error ? (
            <Text color="red.500">뉴스 데이터를 불러오지 못했습니다.</Text>
          ) : filteredArticles.length === 0 ? (
            <Text color="gray.500">현재 표시할 뉴스가 없습니다.</Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
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
                    <Badge
                      colorScheme="purple"
                      variant={
                        selectedKeywords.length === 0 ? "subtle" : "solid"
                      }
                      alignSelf="flex-start"
                    >
                      {article.keyword}
                    </Badge>
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
                          article.publishedAt,
                          "Asia/seoul",
                          "yyyy-MM-dd",
                        )}
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
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>키워드 관리</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
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
                <HStack justify="space-between">
                  <Text>모든 키워드</Text>
                  <Button
                    size="sm"
                    variant={
                      selectedKeywords.length === 0 ? "solid" : "outline"
                    }
                    colorScheme="purple"
                    onClick={clearKeywordFilter}
                  >
                    선택
                  </Button>
                </HStack>
                {keywords.map((keyword) => (
                  <Box
                    key={keyword.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <HStack justify="space-between" align="center">
                      <Stack spacing={1}>
                        <Text fontWeight="semibold">{keyword.value}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {keyword.enabled ? "수집 중" : "비활성"}
                        </Text>
                      </Stack>
                      <HStack>
                        <Button
                          size="sm"
                          variant={
                            selectedKeywords.includes(keyword.value)
                              ? "solid"
                              : "outline"
                          }
                          colorScheme="purple"
                          onClick={() => handleToggleKeyword(keyword.value)}
                        >
                          {selectedKeywords.includes(keyword.value)
                            ? "해제"
                            : "선택"}
                        </Button>
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
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} variant="ghost">
              닫기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
