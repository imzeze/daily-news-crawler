"use client";

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowLeft, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import CategoryManagerModal from "@/components/keywords/CategoryManagerModal";

type KeywordCategory = string;

type Keyword = {
  id: string;
  value: string;
  category: KeywordCategory;
  enabled: boolean;
};

type KeywordResponse = {
  keywords: Keyword[];
};

type CategoryRecord = {
  id: string;
  name: string;
  order: number;
};

type CategoryResponse = {
  categories: CategoryRecord[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function KeywordsPage() {
  const { data, mutate, isLoading } = useSWR<KeywordResponse>(
    "/api/keywords",
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: categoryData, mutate: mutateCategories } = useSWR<CategoryResponse>(
    "/api/keyword-categories",
    fetcher,
    { revalidateOnFocus: false },
  );
  const { isOpen: isCategoryModalOpen, onOpen: openCategoryModal, onClose: closeCategoryModal } = useDisclosure();
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState<KeywordCategory>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);

  const categories = categoryData?.categories ?? [];
  const keywords = data?.keywords ?? [];
  const groupedKeywords = useMemo(
    () =>
      categories.map((cat) => ({
        category: cat.name,
        keywords: keywords.filter((keyword) => keyword.category === cat.name),
      })).filter((group) => group.keywords.length > 0),
    [keywords, categories],
  );

  const defaultCategory = categories[0]?.name ?? "";

  useEffect(() => {
    if (defaultCategory && !newCategory) {
      setNewCategory(defaultCategory);
    }
  }, [defaultCategory, newCategory]);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      setErrorMessage("키워드를 입력해 주세요.");
      return;
    }

    setIsSavingKeyword(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: newKeyword.trim(),
          category: newCategory,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error ?? "키워드 추가에 실패했습니다.");
        return;
      }

      setNewKeyword("");
      setNewCategory(defaultCategory);
      await mutate();
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    const response = await fetch(`/api/keywords/${id}`, { method: "DELETE" });
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
          <HStack justify="space-between" align="flex-start">
            <Stack spacing={1}>
              <Heading size="2xl">키워드 관리</Heading>
              <Text color="gray.600" fontSize="lg">
                메인 뉴스 수집에 사용하는 키워드를 직접 추가하고 삭제할 수
                있습니다.
              </Text>
            </Stack>
            <Button
              variant="outline"
              leftIcon={<Settings2 size={16} aria-hidden="true" />}
              onClick={openCategoryModal}
              flexShrink={0}
            >
              카테고리 관리
            </Button>
          </HStack>
        </Stack>

        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={closeCategoryModal}
          categories={categories}
          onRefresh={mutateCategories}
        />

        <Box className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Stack spacing={4}>
            <Heading size="md">키워드 추가</Heading>
            <HStack align="flex-end" spacing={3} flexWrap="wrap">
              <FormControl maxW={{ base: "full", md: "220px" }}>
                <FormLabel>카테고리</FormLabel>
                <Select
                  value={newCategory}
                  onChange={(event) =>
                    setNewCategory(event.target.value as KeywordCategory)
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl flex="1" minW={{ base: "full", md: "280px" }}>
                <FormLabel>키워드</FormLabel>
                <Input
                  value={newKeyword}
                  onChange={(event) => setNewKeyword(event.target.value)}
                  placeholder="새 키워드를 입력하세요"
                />
              </FormControl>
              <Button
                colorScheme="purple"
                leftIcon={<Plus size={16} aria-hidden="true" />}
                onClick={handleAddKeyword}
                isLoading={isSavingKeyword}
              >
                추가
              </Button>
            </HStack>
            {errorMessage ? <Text color="red.500">{errorMessage}</Text> : null}
          </Stack>
        </Box>

        <Box className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Stack spacing={4}>
            <Heading size="md">등록된 키워드</Heading>
            {isLoading ? (
              <Text color="gray.500">불러오는 중...</Text>
            ) : groupedKeywords.length === 0 ? (
              <Text color="gray.500">등록된 키워드가 없습니다.</Text>
            ) : (
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
                      <Stack spacing={2}>
                        {group.keywords.map((keyword) => (
                          <Box
                            key={keyword.id}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <HStack justify="space-between" align="center">
                              <Text fontWeight="semibold">{keyword.value}</Text>
                              <Button
                                size="sm"
                                variant="outline"
                                colorScheme="red"
                                onClick={() => handleDeleteKeyword(keyword.id)}
                              >
                                삭제
                              </Button>
                            </HStack>
                          </Box>
                        ))}
                      </Stack>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
