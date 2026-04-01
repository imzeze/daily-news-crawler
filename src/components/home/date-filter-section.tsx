"use client";

import { Box, Button, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ko } from "date-fns/locale";
import DatePicker from "react-datepicker";

import type { DatePreset } from "./types";

type DateFilterSectionProps = {
  activeDatePreset: DatePreset;
  startDate: Date;
  endDate: Date;
  onApplyDatePreset: (preset: Exclude<DatePreset, null>) => void;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
};

export function DateFilterSection({
  activeDatePreset,
  startDate,
  endDate,
  onApplyDatePreset,
  onStartDateChange,
  onEndDateChange,
}: DateFilterSectionProps) {
  return (
    <Box className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
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
                  onApplyDatePreset(preset.key as Exclude<DatePreset, null>)
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
              onChange={onStartDateChange}
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
              onChange={onEndDateChange}
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
  );
}
