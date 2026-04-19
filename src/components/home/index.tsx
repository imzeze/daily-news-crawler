"use client";

import { formatDateParam } from "@/lib/news/date-range";
import {
  Button,
  Checkbox,
  Container,
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
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { isSameDay, subDays } from "date-fns";
import { motion } from "framer-motion";
import { ChevronRight, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { clusterArticles } from "@/lib/clustering";
import { DateFilterSection } from "./date-filter-section";
import { KeywordSidebar } from "./keyword-sidebar";
import { NewsArticleList } from "./news-article-list";
import { ScrapSidebar } from "./scrap-sidebar";
import {
  getScrapKey,
  type DatePreset,
  type GroupedKeywords,
  type KeywordResponse,
  type MailRecipient,
  type MailRecipientResponse,
  type NewsArticle,
  type NewsResponse,
  type ScrapArticle,
  type ScrapResponse,
} from "./types";

const MotionCard = motion.div;

const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
};

export default function HomeClient() {
  const [selectedKeyword, setSelectedKeyword] = useState("");
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
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isLarkJoinModalOpen, setIsLarkJoinModalOpen] = useState(false);
  const [selectedMailRecipients, setSelectedMailRecipients] = useState<
    string[]
  >([]);
  const [newMailRecipient, setNewMailRecipient] = useState("");
  const [mailErrorMessage, setMailErrorMessage] = useState<string | null>(null);
  const [mailSuccessMessage, setMailSuccessMessage] = useState<string | null>(
    null,
  );
  const [isAddingMailRecipient, setIsAddingMailRecipient] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [isSendingLark, setIsSendingLark] = useState(false);
  const [larkErrorMessage, setLarkErrorMessage] = useState<string | null>(null);
  const [larkSuccessMessage, setLarkSuccessMessage] = useState<string | null>(
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
  const { data, error, isLoading } = useSWR<NewsResponse>(
    useMemo(() => {
      const sortedKeywordValues = [...(keywordData?.keywords ?? [])].sort(
        (a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category, "ko");
          }

          return a.value.localeCompare(b.value, "ko");
        },
      );
      const groupedKeywordValues = Object.values(
        sortedKeywordValues.reduce<Record<string, GroupedKeywords>>(
          (acc, keyword) => {
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
          },
          {},
        ),
      );
      const currentKeyword =
        selectedKeyword || groupedKeywordValues[0]?.keywords[0]?.value;
      if (!currentKeyword) return null;

      const params = new URLSearchParams({
        keyword: currentKeyword,
        startDate: formatDateParam(startDate),
        endDate: formatDateParam(endDate),
      });

      return `/api/news?${params.toString()}`;
    }, [endDate, keywordData?.keywords, selectedKeyword, startDate]),
    fetcher,
    { revalidateOnFocus: false },
  );

  const {
    data: scrapData,
    mutate: mutateScraps,
    isLoading: isScrapLoading,
  } = useSWR<ScrapResponse>("/api/scraps", fetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: recipientData,
    mutate: mutateRecipients,
    isLoading: isRecipientLoading,
  } = useSWR<MailRecipientResponse>("/api/scrap-emails", fetcher, {
    revalidateOnFocus: false,
  });

  const [orderedScrappedArticles, setOrderedScrappedArticles] = useState<
    ScrapArticle[]
  >([]);

  useEffect(() => {
    const incoming = scrapData?.articles ?? [];
    setOrderedScrappedArticles((prev) => {
      const incomingKeySet = new Set(incoming.map((a) => getScrapKey(a)));
      const kept = prev.filter((a) => incomingKeySet.has(getScrapKey(a)));
      const prevKeySet = new Set(kept.map((a) => getScrapKey(a)));
      const added = incoming.filter((a) => !prevKeySet.has(getScrapKey(a)));
      return [...kept, ...added];
    });
  }, [scrapData]);

  const handleReorderArticles = (
    keyword: string,
    reordered: ScrapArticle[],
  ) => {
    setOrderedScrappedArticles((prev) => {
      const others = prev.filter((a) => a.keyword !== keyword);
      return [...others, ...reordered];
    });
  };

  const keywords = keywordData?.keywords ?? [];
  const sortedKeywords = [...keywords].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category, "ko");
    }

    return a.value.localeCompare(b.value, "ko");
  });
  const groupedKeywords = Object.values(
    sortedKeywords.reduce<Record<string, GroupedKeywords>>((acc, keyword) => {
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
  const defaultKeyword = groupedKeywords[0]?.keywords[0]?.value || "";
  const activeKeyword = selectedKeyword || defaultKeyword;
  const articles = data?.articles ?? [];
  const scrappedArticles = scrapData?.articles ?? [];
  const mailRecipients = recipientData?.recipients ?? [];
  const filteredArticles = selectedKeyword
    ? articles.filter((article) => article.keyword === selectedKeyword)
    : articles;

  const relatedMap = useMemo(() => {
    if (filteredArticles.length < 2) return {} as Record<string, NewsArticle[]>;
    const clusters = clusterArticles(
      filteredArticles.map((a) => ({
        title: a.title,
        url: a.url,
        publishedAt: new Date(a.publishedAt),
        keyword: a.keyword,
      })),
      filteredArticles.length,
    );
    const map: Record<string, NewsArticle[]> = {};
    for (const cluster of clusters) {
      if (cluster.articles.length < 2) continue;
      const urlSet = new Set(cluster.articles.map((a) => a.url));
      for (const ca of cluster.articles) {
        map[ca.url] = filteredArticles.filter(
          (a) => urlSet.has(a.url) && a.url !== ca.url,
        );
      }
    }
    return map;
  }, [filteredArticles]);
  const scrappedArticleKeys = useMemo(
    () => new Set(scrappedArticles.map((article) => getScrapKey(article))),
    [scrappedArticles],
  );
  const groupedScrappedArticles = useMemo(
    () =>
      Object.entries(
        orderedScrappedArticles.reduce<Record<string, ScrapArticle[]>>(
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
    [orderedScrappedArticles],
  );

  const handleToggleScrap = async (article: ScrapArticle | NewsArticle) => {
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
    if (!defaultKeyword) return;
    setSelectedKeyword((prev) => (prev ? prev : defaultKeyword));
  }, [defaultKeyword]);

  useEffect(() => {
    if (!isMailModalOpen) return;
    setSelectedMailRecipients(
      mailRecipients.map((recipient) => recipient.email),
    );
  }, [isMailModalOpen, mailRecipients]);

  const openMailModal = () => {
    setMailErrorMessage(null);
    setMailSuccessMessage(null);
    setNewMailRecipient("");
    setSelectedMailRecipients(
      mailRecipients.map((recipient) => recipient.email),
    );
    setIsMailModalOpen(true);
  };

  const closeMailModal = () => {
    setIsMailModalOpen(false);
    setMailErrorMessage(null);
    setMailSuccessMessage(null);
    setNewMailRecipient("");
  };

  const handleToggleMailRecipient = (email: string) => {
    setSelectedMailRecipients((prev) =>
      prev.includes(email)
        ? prev.filter((item) => item !== email)
        : [...prev, email],
    );
  };

  const handleAddMailRecipient = async () => {
    if (!newMailRecipient.trim()) {
      setMailErrorMessage("이메일 주소를 입력해 주세요.");
      return;
    }

    setIsAddingMailRecipient(true);
    setMailErrorMessage(null);
    setMailSuccessMessage(null);

    try {
      const response = await fetch("/api/scrap-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newMailRecipient.trim() }),
      });

      const result = (await response.json()) as {
        message?: string;
        recipient?: MailRecipient;
      };

      if (!response.ok || !result.recipient) {
        throw new Error(result.message || "이메일 주소를 추가하지 못했습니다.");
      }

      const recipient = result.recipient;
      await mutateRecipients();
      setSelectedMailRecipients((prev) =>
        prev.includes(recipient.email) ? prev : [...prev, recipient.email],
      );
      setNewMailRecipient("");
      setMailSuccessMessage("이메일 주소가 추가되었습니다.");
    } catch (error) {
      setMailErrorMessage(
        error instanceof Error
          ? error.message
          : "이메일 주소를 추가하지 못했습니다.",
      );
    } finally {
      setIsAddingMailRecipient(false);
    }
  };

  const handleSendScrapMail = async () => {
    if (selectedMailRecipients.length === 0) {
      setMailErrorMessage("전송할 이메일 주소를 하나 이상 선택해 주세요.");
      return;
    }

    setIsSendingMail(true);
    setMailErrorMessage(null);
    setMailSuccessMessage(null);

    try {
      const response = await fetch("/api/scraps/send-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: selectedMailRecipients,
          articles: orderedScrappedArticles,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "메일을 전송하지 못했습니다.");
      }

      setMailSuccessMessage(result.message || "메일을 전송했습니다.");
    } catch (error) {
      setMailErrorMessage(
        error instanceof Error ? error.message : "메일을 전송하지 못했습니다.",
      );
    } finally {
      setIsSendingMail(false);
    }
  };

  const handleSendScrapLark = async () => {
    setIsSendingLark(true);
    setLarkErrorMessage(null);
    setLarkSuccessMessage(null);

    try {
      const response = await fetch("/api/scraps/send-lark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articles: orderedScrappedArticles }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Lark 메시지를 전송하지 못했습니다.");
      }

      setLarkSuccessMessage(result.message || "Lark 메시지를 전송했습니다.");
    } catch (error) {
      setLarkErrorMessage(
        error instanceof Error
          ? error.message
          : "Lark 메시지를 전송하지 못했습니다.",
      );
    } finally {
      setIsSendingLark(false);
    }
  };

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
                  <MenuItem
                    icon={<Users size={16} aria-hidden="true" />}
                    onClick={() => setIsLarkJoinModalOpen(true)}
                  >
                    Lark 공지방 참여하기
                  </MenuItem>
                </MenuList>
              </Menu>
            </div>
          </div>
        </Stack>

        <DateFilterSection
          activeDatePreset={activeDatePreset}
          startDate={startDate}
          endDate={endDate}
          onApplyDatePreset={applyDatePreset}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />

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
            <KeywordSidebar
              groupedKeywords={groupedKeywords}
              isKeywordListOpen={isKeywordListOpen}
              isDesktop={isDesktop}
              activeKeyword={activeKeyword}
              selectedKeyword={selectedKeyword}
              onToggleKeywordList={() => setIsKeywordListOpen((prev) => !prev)}
              onSelectKeyword={setSelectedKeyword}
            />

            <NewsArticleList
              filteredArticles={filteredArticles}
              selectedKeyword={selectedKeyword}
              isLoading={isLoading}
              hasError={Boolean(error)}
              scrapErrorMessage={scrapErrorMessage}
              scrappedArticleKeys={scrappedArticleKeys}
              pendingScrapKey={pendingScrapKey}
              relatedMap={relatedMap}
              onToggleScrap={handleToggleScrap}
            />

            <ScrapSidebar
              groupedScrappedArticles={groupedScrappedArticles}
              scrappedArticles={scrappedArticles}
              isScrapLoading={isScrapLoading}
              pendingScrapKey={pendingScrapKey}
              larkErrorMessage={larkErrorMessage}
              larkSuccessMessage={larkSuccessMessage}
              isSendingLark={isSendingLark}
              onOpenMailModal={openMailModal}
              onSendLark={handleSendScrapLark}
              onToggleScrap={handleToggleScrap}
              onReorderArticles={handleReorderArticles}
            />
          </Stack>
        </MotionCard>
      </Stack>

      <Modal isOpen={isMailModalOpen} onClose={closeMailModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>스크랩 기사 메일 전송</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <HStack align="flex-start">
                <Input
                  value={newMailRecipient}
                  onChange={(event) => setNewMailRecipient(event.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                />
                <Button
                  onClick={handleAddMailRecipient}
                  isLoading={isAddingMailRecipient}
                >
                  추가
                </Button>
              </HStack>
              {mailErrorMessage ? (
                <Text color="red.500" fontSize="sm">
                  {mailErrorMessage}
                </Text>
              ) : null}
              {mailSuccessMessage ? (
                <Text color="green.600" fontSize="sm">
                  {mailSuccessMessage}
                </Text>
              ) : null}
              <Stack
                spacing={3}
                maxH="280px"
                overflowY="auto"
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                {isRecipientLoading ? (
                  <Text color="gray.500" fontSize="sm">
                    이메일 주소를 불러오는 중입니다.
                  </Text>
                ) : mailRecipients.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">
                    등록된 이메일 주소가 없습니다.
                  </Text>
                ) : (
                  mailRecipients.map((recipient) => (
                    <Checkbox
                      key={recipient.id}
                      isChecked={selectedMailRecipients.includes(
                        recipient.email,
                      )}
                      onChange={() =>
                        handleToggleMailRecipient(recipient.email)
                      }
                      colorScheme="purple"
                    >
                      {recipient.email}
                    </Checkbox>
                  ))
                )}
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={closeMailModal}>
                취소
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleSendScrapMail}
                isLoading={isSendingMail}
                isDisabled={mailRecipients.length === 0}
              >
                확인
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isLarkJoinModalOpen}
        onClose={() => setIsLarkJoinModalOpen(false)}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Lark 공지방 참여하기</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4} align="center">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <img
                  src={process.env.NEXT_PUBLIC_LARK_GROUP_JOIN_QR_URL}
                  alt="라크 그룹 참여 QR 코드"
                  width={320}
                  height={320}
                />
              </div>
              <Text color="gray.600" fontSize="sm" textAlign="center">
                QR 코드를 스캔하거나 아래 버튼으로 그룹 참여 링크를 열 수
                있습니다.
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button
                variant="ghost"
                onClick={() => setIsLarkJoinModalOpen(false)}
              >
                닫기
              </Button>
              <Button
                as="a"
                href={process.env.NEXT_PUBLIC_LARK_GROUP_JOIN_URL}
                target="_blank"
                rel="noreferrer"
                colorScheme="purple"
              >
                링크 열기
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
