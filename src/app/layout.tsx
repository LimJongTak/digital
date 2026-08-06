import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ThemeVars from "@/components/ThemeVars";

export const metadata: Metadata = {
  title: {
    default: "AX OPEN LAB 시설예약",
    template: "%s | AX OPEN LAB 시설예약",
  },
  description:
    "국립순천대학교 AX OPEN LAB 시설예약 시스템 — Co-Work Zone, Data & Idea Zone 등 공간을 온라인으로 예약하세요.",
  openGraph: {
    title: "AX OPEN LAB 시설예약",
    description:
      "국립순천대학교 AX OPEN LAB 시설예약 시스템 — Co-Work Zone, Data & Idea Zone 등 공간을 온라인으로 예약하세요.",
    siteName: "AX OPEN LAB 시설예약",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AX OPEN LAB 시설예약",
    description:
      "국립순천대학교 AX OPEN LAB 시설예약 시스템 — Co-Work Zone, Data & Idea Zone 등 공간을 온라인으로 예약하세요.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <ThemeVars />
        <div id="wrap">
          <SiteHeader />
          <div id="contents">{children}</div>

          <a className="top_btn" href="#wrap" aria-label="맨 위로">
            <img src="/images/ico/top_button.png" alt="탑 버튼" />
          </a>

          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
