import {
  addDays,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export type NewsDateRangeOptions = {
  onlyToday?: boolean;
  startDate?: string;
  endDate?: string;
};

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateParam = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || !DATE_PARAM_PATTERN.test(trimmed)) return undefined;

  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return undefined;

  return format(parsed, "yyyy-MM-dd");
};

const getTodayInSeoul = () =>
  formatInTimeZone(new Date(), "Asia/Seoul", "yyyy-MM-dd");

export function resolveNewsDateRange(options?: NewsDateRangeOptions) {
  let startDate = normalizeDateParam(options?.startDate);
  let endDate = normalizeDateParam(options?.endDate);

  if (options?.onlyToday && !startDate && !endDate) {
    const today = getTodayInSeoul();
    startDate = today;
    endDate = today;
  }

  if (startDate && !endDate) endDate = startDate;
  if (endDate && !startDate) startDate = endDate;

  if (startDate && endDate && startDate > endDate) {
    return {
      startDate: endDate,
      endDate: startDate,
    };
  }

  return { startDate, endDate };
}

export function isPublishedAtWithinRange(
  publishedAt?: string,
  options?: NewsDateRangeOptions,
) {
  const { startDate, endDate } = resolveNewsDateRange(options);
  if (!startDate || !endDate) return true;
  if (!publishedAt) return false;

  const publishedDate = new Date(publishedAt);
  if (!isValid(publishedDate)) return false;

  const start = startOfDay(parseISO(startDate));
  const end = endOfDay(parseISO(endDate));
  return publishedDate >= start && publishedDate <= end;
}

export function getNextDateParam(dateParam: string) {
  return format(addDays(parseISO(dateParam), 1), "yyyy-MM-dd");
}

export function formatDateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}
