"use client";

import { useEffect } from "react";
import { getSiteSettings } from "@/lib/settings";

// 관리자에서 저장한 사이트 설정(대표 색상/제목)을 실제 화면에 반영한다.
export default function ThemeVars() {
  useEffect(() => {
    getSiteSettings().then((s) => {
      document.documentElement.style.setProperty("--primary", s.primaryColor);
      if (s.siteTitle) document.title = s.siteTitle;
    });
  }, []);

  return null;
}
