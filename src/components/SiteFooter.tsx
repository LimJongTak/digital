"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FooterPolicy from "@/components/FooterPolicy";
import { DEFAULT_SETTINGS, getSiteSettings, type FooterInfo } from "@/lib/settings";

export default function SiteFooter() {
  const [footer, setFooter] = useState<FooterInfo>(DEFAULT_SETTINGS.footer);

  useEffect(() => {
    getSiteSettings().then((s) => setFooter(s.footer));
  }, []);

  return (
    <footer id="footer">
      <div className="ft_top">
        <div className="in_Layer2">
          <FooterPolicy />
        </div>
      </div>
      <div className="ft_bot">
        <div className="in_Layer2 flex-box">
          <div className="ft_info">
            <dl>
              <dd>{footer.orgAddress}</dd>
            </dl>
            <dl>
              <dd>대표전화 : {footer.phone}</dd>
            </dl>
          </div>
          <div className="ft_logo logo_mark">
            <img src="/images/common/mark_white.png" alt="국립순천대학교" />
            <span>AX OPEN LAB</span>
          </div>
          <div className="copy">
            {/* 카피라이트 텍스트를 누르면 관리자 페이지로 이동 */}
            <p>
              <Link href="/admin" className="copy_admin" title="관리자 페이지">
                {footer.copyright}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
