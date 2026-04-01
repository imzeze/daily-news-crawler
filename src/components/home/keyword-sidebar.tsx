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
  Heading,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

import type { GroupedKeywords } from "./types";

type KeywordSidebarProps = {
  groupedKeywords: GroupedKeywords[];
  isKeywordListOpen: boolean;
  isDesktop?: boolean;
  activeKeyword: string;
  selectedKeyword: string;
  onToggleKeywordList: () => void;
  onSelectKeyword: (value: string) => void;
};

export function KeywordSidebar({
  groupedKeywords,
  isKeywordListOpen,
  isDesktop,
  activeKeyword,
  selectedKeyword,
  onToggleKeywordList,
  onSelectKeyword,
}: KeywordSidebarProps) {
  return (
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
              onClick={onToggleKeywordList}
            >
              {isKeywordListOpen ? "접기" : "펼치기"}
            </Button>
          </HStack>
        </HStack>
        <Collapse in={Boolean(isDesktop) || isKeywordListOpen} animateOpacity>
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
                    <Stack spacing={2} maxH="192px" overflowY="auto">
                      {group.keywords.map(({ value }) => (
                        <Button
                          key={value}
                          size="md"
                          padding={2}
                          justifyContent="flex-start"
                          variant={selectedKeyword === value ? "solid" : "ghost"}
                          colorScheme="purple"
                          onClick={() => onSelectKeyword(value)}
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
  );
}
