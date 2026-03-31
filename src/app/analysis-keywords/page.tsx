"use client";

import {
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

type SentimentKeywordType = "positive" | "negative";

type SentimentKeyword = {
  id: string;
  value: string;
  type: SentimentKeywordType;
};

type ResponseShape = {
  keywords: SentimentKeyword[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TYPE_META = {
  positive: {
    label: "긍정 키워드",
    colorScheme: "blue",
    accentClass: "border-sky-200 bg-sky-50",
  },
  negative: {
    label: "부정 키워드",
    colorScheme: "red",
    accentClass: "border-rose-200 bg-rose-50",
  },
} as const;

export default function AnalysisKeywordsPage() {
  const { data, mutate, isLoading } = useSWR<ResponseShape>(
    "/api/analysis-keywords",
    fetcher,
    { revalidateOnFocus: false },
  );
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<SentimentKeywordType>("negative");
  const [errorMessage, setErrorMessage] = useState("");

  const keywords = data?.keywords ?? [];
  const groupedKeywords = useMemo(
    () => ({
      positive: keywords.filter((keyword) => keyword.type === "positive"),
      negative: keywords.filter((keyword) => keyword.type === "negative"),
    }),
    [keywords],
  );

  const handleCreate = async () => {
    if (!newValue.trim()) {
      setErrorMessage("키워드를 입력해 주세요.");
      return;
    }

    setErrorMessage("");
    const response = await fetch("/api/analysis-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue.trim(), type: newType }),
    });

    const result = await response.json();
    if (!response.ok) {
      setErrorMessage(result.error ?? "키워드 추가에 실패했습니다.");
      return;
    }

    setNewValue("");
    await mutate();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/analysis-keywords/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await mutate();
    }
  };

  return (
    <Container maxW="6xl" className="pb-16 pt-14">
      <Stack spacing={8}>
        <Stack spacing={3}>
          <Button
            as={Link}
            href="/"
            alignSelf="flex-start"
            variant="ghost"
            leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
          >
            메인으로 돌아가기
          </Button>
          <Heading size="2xl">기사 분석 키워드 관리</Heading>
          <Text color="gray.600" fontSize="lg">
            자동 분류에 사용하는 긍정/부정 키워드를 추가, 삭제할 수 있습니다.
          </Text>
        </Stack>

        <Box className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Stack spacing={4}>
            <Heading size="md">키워드 추가</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <FormControl>
                <FormLabel>유형</FormLabel>
                <Select
                  value={newType}
                  onChange={(event) =>
                    setNewType(event.target.value as SentimentKeywordType)
                  }
                >
                  <option value="negative">부정</option>
                  <option value="positive">긍정</option>
                </Select>
              </FormControl>
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel>키워드</FormLabel>
                <HStack>
                  <Input
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                    placeholder="예: 실적 개선, 악재, 논란"
                  />
                  <Button
                    colorScheme="purple"
                    leftIcon={<Plus size={16} aria-hidden="true" />}
                    onClick={handleCreate}
                  >
                    추가
                  </Button>
                </HStack>
              </FormControl>
            </SimpleGrid>
            {errorMessage ? <Text color="red.500">{errorMessage}</Text> : null}
          </Stack>
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {(["negative", "positive"] as const).map((type) => (
            <Box
              key={type}
              className={`rounded-2xl border p-6 shadow-sm ${TYPE_META[type].accentClass}`}
            >
              <Stack spacing={4}>
                <HStack justify="space-between">
                  <Heading size="md">{TYPE_META[type].label}</Heading>
                  <Badge colorScheme={TYPE_META[type].colorScheme}>
                    {groupedKeywords[type].length}개
                  </Badge>
                </HStack>

                {isLoading ? (
                  <Text color="gray.500">불러오는 중...</Text>
                ) : groupedKeywords[type].length === 0 ? (
                  <Text color="gray.500">등록된 키워드가 없습니다.</Text>
                ) : (
                  <HStack
                    display="grid"
                    gridTemplateColumns="repeat(3, 1fr)"
                    spacing={4}
                    flexWrap="wrap"
                    align="stretch"
                  >
                    {groupedKeywords[type].map((keyword) => (
                      <Box
                        key={keyword.id}
                        position="relative"
                        className="group"
                      >
                        <Box className="flex h-full items-center justify-center rounded-full border border-white/70 bg-white/90 py-4 px-8 text-center shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                          <Text
                            fontWeight="bold"
                            fontSize="1xl"
                            color="gray.800"
                          >
                            {keyword.value}
                          </Text>
                        </Box>
                        <IconButton
                          aria-label={`${keyword.value} 삭제`}
                          icon={<X size={18} aria-hidden="true" />}
                          size="sm"
                          colorScheme="gray"
                          borderRadius="full"
                          position="absolute"
                          top="2"
                          right="2"
                          bg="white"
                          boxShadow="md"
                          opacity={0}
                          className="transition-opacity duration-200 group-hover:opacity-100"
                          _hover={{ bg: "white", color: "red.500" }}
                          onClick={() => handleDelete(keyword.id)}
                        />
                      </Box>
                    ))}
                  </HStack>
                )}
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
