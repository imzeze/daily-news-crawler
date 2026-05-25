"use client";

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Skeleton,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Bookmark,
  GripVertical,
  Mail,
  MessageSquareShare,
} from "lucide-react";
import { useMemo } from "react";

import { getScrapKey, type ScrapArticle } from "./types";

type SortableArticleItemProps = {
  article: ScrapArticle;
  pendingScrapKey: string | null;
  onToggleScrap: (article: ScrapArticle) => void;
};

function SortableArticleItem({
  article,
  pendingScrapKey,
  onToggleScrap,
}: SortableArticleItemProps) {
  const scrapKey = getScrapKey(article);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scrapKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-white px-3 py-3"
    >
      <HStack align="flex-start" spacing={2}>
        <Box
          {...attributes}
          {...listeners}
          cursor="grab"
          color="gray.400"
          mt="2px"
          flexShrink={0}
          _active={{ cursor: "grabbing" }}
        >
          <GripVertical size={14} aria-hidden="true" />
        </Box>
        <Stack spacing={1} flex={1} minW={0}>
          <Text
            as="a"
            href={article.url}
            target="_blank"
            rel="noreferrer"
            fontSize="sm"
            fontWeight="medium"
            color="gray.900"
            className="line-clamp-2 hover:text-blue-600 hover:underline"
          >
            {article.title}
          </Text>
          <Text color="gray.400" fontSize="xs">
            {format(new Date(article.publishedAt), "yyyy-MM-dd", {
              locale: ko,
            })}
          </Text>
        </Stack>
        <IconButton
          aria-label="스크랩 해제"
          icon={<Bookmark size={14} aria-hidden="true" fill="currentColor" />}
          size="xs"
          variant="ghost"
          colorScheme="purple"
          isLoading={pendingScrapKey === article.url}
          onClick={() => onToggleScrap(article)}
        />
      </HStack>
    </Box>
  );
}

type ScrapSidebarProps = {
  orderedScrappedArticles: ScrapArticle[];
  isScrapLoading: boolean;
  pendingScrapKey: string | null;
  larkErrorMessage: string | null;
  larkSuccessMessage: string | null;
  isSendingLark: boolean;
  onOpenMailModal: () => void;
  onSendLark: () => void;
  onToggleScrap: (article: ScrapArticle) => void;
  onReorderAllArticles: (reordered: ScrapArticle[]) => void;
  onMoveToGroup: (
    originalArticle: ScrapArticle,
    newKeyword: string,
    newOrder: ScrapArticle[],
  ) => void;
};

export function ScrapSidebar({
  orderedScrappedArticles,
  isScrapLoading,
  pendingScrapKey,
  larkErrorMessage,
  larkSuccessMessage,
  isSendingLark,
  onOpenMailModal,
  onSendLark,
  onToggleScrap,
  onReorderAllArticles,
  onMoveToGroup,
}: ScrapSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 플랫 배열에서 키워드별 그룹 도출 (첫 등장 순서 기준)
  const groups = useMemo(() => {
    const keywordFirstIndex: Record<string, number> = {};
    orderedScrappedArticles.forEach((article, idx) => {
      if (keywordFirstIndex[article.keyword] === undefined) {
        keywordFirstIndex[article.keyword] = idx;
      }
    });

    const sortedKeywords = Object.keys(keywordFirstIndex).sort(
      (a, b) => keywordFirstIndex[a] - keywordFirstIndex[b],
    );

    const grouped: Record<string, ScrapArticle[]> = {};
    for (const article of orderedScrappedArticles) {
      if (!grouped[article.keyword]) grouped[article.keyword] = [];
      grouped[article.keyword].push(article);
    }

    return sortedKeywords.map((keyword) => ({
      keyword,
      articles: grouped[keyword],
    }));
  }, [orderedScrappedArticles]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedScrappedArticles.findIndex(
      (a) => getScrapKey(a) === active.id,
    );
    const newIndex = orderedScrappedArticles.findIndex(
      (a) => getScrapKey(a) === over.id,
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const activeArticle = orderedScrappedArticles[oldIndex];
    const targetKeyword = orderedScrappedArticles[newIndex].keyword;
    const reordered = arrayMove(orderedScrappedArticles, oldIndex, newIndex);

    if (activeArticle.keyword !== targetKeyword) {
      // 다른 키워드 그룹으로 이동: 기사의 키워드를 대상 그룹으로 변경
      const newOrder = reordered.map((a) =>
        getScrapKey(a) === active.id ? { ...a, keyword: targetKeyword } : a,
      );
      onMoveToGroup(activeArticle, targetKeyword, newOrder);
    } else {
      onReorderAllArticles(reordered);
    }
  };

  return (
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
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<Mail size={14} aria-hidden="true" />}
            onClick={onOpenMailModal}
            isDisabled={orderedScrappedArticles.length === 0}
          >
            mail
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            leftIcon={<MessageSquareShare size={14} aria-hidden="true" />}
            onClick={onSendLark}
            isLoading={isSendingLark}
            isDisabled={orderedScrappedArticles.length === 0}
          >
            lark
          </Button>
        </HStack>
        {larkErrorMessage ? (
          <Text color="red.500" fontSize="sm">
            {larkErrorMessage}
          </Text>
        ) : null}
        {larkSuccessMessage ? (
          <Text color="green.600" fontSize="sm">
            {larkSuccessMessage}
          </Text>
        ) : null}
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
        ) : groups.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            기사 카드의 스크랩 버튼으로 관심 기사를 저장할 수 있습니다.
          </Text>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedScrappedArticles.map((a) => getScrapKey(a))}
              strategy={verticalListSortingStrategy}
            >
              <Box
                maxH={{ base: "auto", lg: "calc(100vh - 180px)" }}
                overflowY={{ base: "visible", lg: "auto" }}
                pr={{ base: 0, lg: 2 }}
              >
              <Accordion
                allowMultiple
                defaultIndex={groups.map((_, i) => i)}
              >
                {groups.map(({ keyword, articles }) => (
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
                          {articles.length}건
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
                        {articles.map((article) => (
                          <SortableArticleItem
                            key={getScrapKey(article)}
                            article={article}
                            pendingScrapKey={pendingScrapKey}
                            onToggleScrap={onToggleScrap}
                          />
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
              </Box>
            </SortableContext>
          </DndContext>
        )}
      </Stack>
    </Box>
  );
}
