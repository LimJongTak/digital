import { BOOKING_WINDOW_DAYS } from "./types";

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 해당 연/월의 모든 날짜 문자열 배열
export function daysInMonth(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate(); // month: 1-12
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  return out;
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 월간 달력 그리드: 주(week) 배열, 각 주는 7칸(날짜 문자열 또는 null)
export function buildCalendar(year: number, month: number): (string | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=일
  const last = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= last; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function weekdayLabel(dateStr: string): string {
  return WEEKDAYS[parseDateStr(dateStr).getDay()];
}

export function isWeekend(dateStr: string): boolean {
  const day = parseDateStr(dateStr).getDay();
  return day === 0 || day === 6;
}

// 오늘 0시
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 예약 가능 마지막 날짜(오늘 + N일)
export function lastBookableDate(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + BOOKING_WINDOW_DAYS);
  return d;
}

// 해당 날짜가 예약 가능 기간(오늘 ~ 오늘+N일) 안에 있는지
export function isWithinBookingWindow(dateStr: string): boolean {
  const d = parseDateStr(dateStr);
  return d >= startOfToday() && d <= lastBookableDate();
}

// 과거 날짜 여부
export function isPast(dateStr: string): boolean {
  return parseDateStr(dateStr) < startOfToday();
}
