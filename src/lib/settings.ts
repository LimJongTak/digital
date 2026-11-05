import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/* ============================================================
   사이트 설정 / 관리자 계정 — Firestore `settings` 컬렉션에 저장
   - settings/site  : 사이트 콘텐츠(UI) 설정 (누구나 읽음)
   - settings/admin : 관리자 계정 (아이디/비밀번호)
   ============================================================ */

const SETTINGS = "settings";

/* ------------------------------ 사이트 설정 ------------------------------ */

export interface FooterInfo {
  orgAddress: string;
  phone: string;
  copyright: string;
}

export interface SiteSettings {
  siteTitle: string;
  primaryColor: string; // 예: "#006cb2"
  footer: FooterInfo;
}

// 현재 하드코딩된 값과 동일한 기본값 (설정 문서가 없을 때 사용)
export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "AX OPEN LAB 시설예약",
  primaryColor: "#006cb2",
  footer: {
    orgAddress: "전남광주통합특별시 순천시 중앙로 255(석현동) 산학협력단 708호(AI인재양성부트캠프사업단)",
    phone: "061-750-5391",
    copyright: "CopyrightⓒSunchon National University. All rights reserved",
  },
};

function mergeSettings(data: Partial<SiteSettings> | undefined): SiteSettings {
  return {
    siteTitle: data?.siteTitle ?? DEFAULT_SETTINGS.siteTitle,
    primaryColor: data?.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    footer: { ...DEFAULT_SETTINGS.footer, ...(data?.footer ?? {}) },
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getDoc(doc(db, SETTINGS, "site"));
    return mergeSettings(snap.exists() ? (snap.data() as Partial<SiteSettings>) : undefined);
  } catch {
    // 규칙 미배포 등으로 읽기 실패 시 기본값
    return DEFAULT_SETTINGS;
  }
}

export async function updateSiteSettings(next: SiteSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS, "site"), next, { merge: true });
}

/* ------------------------------ 관리자 계정 ------------------------------ */

export interface AdminCredential {
  username: string;
  password: string;
}

export const DEFAULT_ADMIN: AdminCredential = {
  username: "admin",
  password: "admin708",
};

async function getAdminCredential(): Promise<AdminCredential> {
  try {
    const snap = await getDoc(doc(db, SETTINGS, "admin"));
    if (snap.exists()) {
      const d = snap.data() as Partial<AdminCredential>;
      return {
        username: d.username ?? DEFAULT_ADMIN.username,
        password: d.password ?? DEFAULT_ADMIN.password,
      };
    }
  } catch {
    /* 읽기 실패 시 기본 계정으로 폴백 */
  }
  return DEFAULT_ADMIN;
}

// 로그인 검증. 성공하면 true.
export async function verifyAdmin(
  username: string,
  password: string,
): Promise<boolean> {
  const cred = await getAdminCredential();
  return username.trim() === cred.username && password === cred.password;
}

// 비밀번호 변경. 현재 비밀번호가 맞아야 함.
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const cred = await getAdminCredential();
  if (currentPassword !== cred.password) {
    throw new Error("현재 비밀번호가 올바르지 않습니다.");
  }
  await setDoc(
    doc(db, SETTINGS, "admin"),
    { username: cred.username, password: newPassword },
    { merge: true },
  );
}

/* ------------------------------ 도어락 비밀번호 ------------------------------ */
// settings/doorCodes : { [facilityId]: 비밀번호 }
// 공개 페이지가 읽는 facilities 문서와 분리해 저장하고, 예약 승인 메일에만 담아 보낸다.

export type DoorCodes = Record<string, string>;

// 도어락이 설치된 시설 (Co-Work Zone 1, 2 등)
export function hasDoorLock(facilityName: string): boolean {
  return /co-?work/i.test(facilityName);
}

export async function getDoorCodes(): Promise<DoorCodes> {
  try {
    const snap = await getDoc(doc(db, SETTINGS, "doorCodes"));
    return snap.exists() ? (snap.data() as DoorCodes) : {};
  } catch {
    return {};
  }
}

export async function updateDoorCode(facilityId: string, code: string): Promise<void> {
  await setDoc(doc(db, SETTINGS, "doorCodes"), { [facilityId]: code }, { merge: true });
}

/* ------------------------------ 요일 고정 차단 ------------------------------ */
// settings/recurringBlocks : { items: RecurringBlock[] }
// 매주 또는 매월 N번째 요일의 특정 시간대를, 전체 또는 지정한 시설에서 "예약완료"로 막는다
// (예: 사업단 정기회의).
// 문서가 아직 없으면 DEFAULT_RECURRING_BLOCKS 를 사용하고, 관리자가 저장하면 그 값이 우선한다.

// 반복 주기: 매주 / 매월 N번째 요일 (nth: 1~4, -1 = 마지막 주)
export type RecurringRepeat = "weekly" | "monthly";

export interface RecurringBlock {
  id: string;
  repeat?: RecurringRepeat; // 없으면 weekly (기존 데이터 호환)
  nth?: number; // repeat === "monthly" 일 때만 사용
  weekday: number; // 0=일 … 6=토
  startHour: number;
  endHour: number; // 미포함 (11~13 = 11:00, 12:00 슬롯)
  facilityIds?: string[]; // 비어 있거나 없으면 전체 시설
  reason?: string;
}

export const DEFAULT_RECURRING_BLOCKS: RecurringBlock[] = [
  {
    id: "default-tue-meeting",
    repeat: "weekly",
    weekday: 2,
    startHour: 11,
    endHour: 13,
    facilityIds: [],
    reason: "사업단 정기회의",
  },
];

export async function getRecurringBlocks(): Promise<RecurringBlock[]> {
  try {
    const snap = await getDoc(doc(db, SETTINGS, "recurringBlocks"));
    if (!snap.exists()) return DEFAULT_RECURRING_BLOCKS;
    const items = (snap.data() as { items?: RecurringBlock[] }).items;
    return Array.isArray(items) ? items : [];
  } catch {
    return DEFAULT_RECURRING_BLOCKS;
  }
}

export async function saveRecurringBlocks(items: RecurringBlock[]): Promise<void> {
  await setDoc(doc(db, SETTINGS, "recurringBlocks"), { items });
}

const NTH_LABEL: Record<number, string> = { 1: "첫째", 2: "둘째", 3: "셋째", 4: "넷째", 5: "다섯째", [-1]: "마지막" };
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// 관리자 목록 표시용 반복 규칙 문구 (예: "매월 첫째 화요일 11:00~13:00")
export function describeRecurringBlock(b: RecurringBlock): string {
  const p = (h: number) => String(h).padStart(2, "0");
  const when =
    b.repeat === "monthly"
      ? `매월 ${NTH_LABEL[b.nth ?? 1] ?? `${b.nth}번째`} ${WEEKDAY_KO[b.weekday]}요일`
      : `매주 ${WEEKDAY_KO[b.weekday]}요일`;
  return `${when} ${p(b.startHour)}:00~${p(b.endHour)}:00`;
}

// 해당 날짜가 반복 규칙(요일 + 주기)에 해당하는지
function matchesDate(b: RecurringBlock, y: number, m: number, d: number): boolean {
  if (new Date(y, m - 1, d).getDay() !== b.weekday) return false;
  if (b.repeat !== "monthly") return true;
  const nth = b.nth ?? 1;
  if (nth === -1) return d + 7 > new Date(y, m, 0).getDate(); // 이 달의 마지막 해당 요일
  return Math.ceil(d / 7) === nth;
}

function appliesToFacility(b: RecurringBlock, facilityId?: string): boolean {
  if (!b.facilityIds || b.facilityIds.length === 0) return true; // 전체 시설
  return facilityId !== undefined && b.facilityIds.includes(facilityId);
}

// 해당 날짜·시설에 고정 차단되는 시간(슬롯 시작 시각) 집합
export function recurringBlockedHours(
  dateStr: string,
  blocks: RecurringBlock[],
  facilityId?: string,
): Set<number> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const out = new Set<number>();
  for (const b of blocks) {
    if (!appliesToFacility(b, facilityId) || !matchesDate(b, y, m, d)) continue;
    for (let h = b.startHour; h < b.endHour; h++) out.add(h);
  }
  return out;
}
