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
import { Bookmark, Mail, MessageSquareShare } from "lucide-react";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getScrapKey, type ScrapArticle } from "./types";

type ScrapSidebarProps = {
  groupedScrappedArticles: [string, ScrapArticle[]][];
  scrappedArticles: ScrapArticle[];
  isScrapLoading: boolean;
  pendingScrapKey: string | null;
  larkErrorMessage: string | null;
  larkSuccessMessage: string | null;
  isSendingLark: boolean;
  onOpenMailModal: () => void;
  onSendLark: () => void;
  onToggleScrap: (article: ScrapArticle) => void;
};

export function ScrapSidebar({
  groupedScrappedArticles,
  scrappedArticles,
  isScrapLoading,
  pendingScrapKey,
  larkErrorMessage,
  larkSuccessMessage,
  isSendingLark,
  onOpenMailModal,
  onSendLark,
  onToggleScrap,
}: ScrapSidebarProps) {
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
            isDisabled={scrappedArticles.length === 0}
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
            isDisabled={scrappedArticles.length === 0}
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
        ) : groupedScrappedArticles.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            기사 카드의 스크랩 버튼으로 관심 기사를 저장할 수 있습니다.
          </Text>
        ) : (
          <Accordion allowMultiple defaultIndex={[0]}>
            {groupedScrappedArticles.map(([keyword, keywordArticles]) => (
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
                            icon={
                              <Bookmark
                                size={14}
                                aria-hidden="true"
                                fill="currentColor"
                              />
                            }
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            isLoading={pendingScrapKey === getScrapKey(article)}
                            onClick={() => onToggleScrap(article)}
                          />
                        </HStack>
                        <Text mt={1} color="gray.500" fontSize="xs">
                          {format(new Date(article.publishedAt), "yyyy-MM-dd", {
                            locale: ko,
                          })}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Stack>
    </Box>
  );
}
