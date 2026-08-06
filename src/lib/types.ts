export interface Facility {
  id: string;
  name: string;
  capacity: number;
  description: string;
  openHour: number; // 예: 9
  closeHour: number; // 예: 18 (마지막 슬롯 17:00)
  order: number;
  image?: string; // 카드 이미지 경로 (선택)
}

export type ReservationStatus = "pending" | "approved" | "rejected";

export interface Reservation {
  id: string;
  facilityId: string;
  facilityName: string;
  date: string; // "YYYY-MM-DD"
  startHour: number; // 예: 9
  endHour: number; // 예: 12 (9~12 = 3시간)
  name: string;
  phone: string;
  email?: string;
  org?: string;
  purpose?: string;
  status: ReservationStatus;
  createdAt: number; // epoch ms
}

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "승인대기",
  approved: "예약완료",
  rejected: "거절됨",
};

// 예약 규칙
export const MAX_HOURS_PER_DAY = 9;
export const BOOKING_WINDOW_DAYS = 14; // 오늘부터 2주 후까지
