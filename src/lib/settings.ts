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
    phone: "061-750-5390~8",
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
