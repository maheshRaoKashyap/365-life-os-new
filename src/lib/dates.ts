import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const DEFAULT_START = "2026-10-06";
export const DEFAULT_END = "2027-10-05";

export function programDay(startDate: string, today = new Date()) {
  return Math.max(1, differenceInCalendarDays(today, parseISO(startDate)) + 1);
}

export function totalProgramDays(startDate: string, endDate: string) {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDisplay(d: string | Date) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "dd MMM yyyy");
}
