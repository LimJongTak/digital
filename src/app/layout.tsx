import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ThemeVars from "@/components/ThemeVars";

export const metadata: Metadata = {
  title: "국립순천대학교 디지털+X 산업기술센터 시설예약",
  description: "국립순천대학교 디지털+X 산업기술센터 시설예약 시스템",
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
