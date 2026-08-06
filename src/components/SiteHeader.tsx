"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, findSection, isExternalHref } from "@/lib/nav";

function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const section = findSection(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // 경로가 바뀌면 전체메뉴 닫기
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header id="header">
        <div className="in_Layer2 flex-box">
          <h1 className="logo">
            <Link href="/" className="logo_mark">
              <img src="/images/common/mark.png" alt="국립순천대학교" />
              <span>AX OPEN LAB</span>
            </Link>
          </h1>

          <nav className="gnb_area">
            {NAV.map((sec) => (
              <div
                key={sec.title}
                className={`gnb${section?.title === sec.title ? " on" : ""}`}
              >
                <NavLink href={sec.href}>{sec.title}</NavLink>
                <div className="wrap">
                  <ul className="depth">
                    {sec.items.map((it) => (
                      <li key={it.href}>
                        <NavLink href={it.href}>
                          <span>{it.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>

          <div className="all_menu_btn">
            <button type="button" aria-label="전체메뉴" onClick={() => setMenuOpen(true)}>
              <img src="/images/ico/all_menu_open.png" alt="열기" />
            </button>
          </div>
        </div>
        <div className="depth_bg" />
      </header>

      {/* 전체메뉴 오버레이 */}
      <div className={`all_menu${menuOpen ? " open" : ""}`}>
        <div className="in_Layer2">
          <div className="am_head">
            <h1 className="logo">
              <Link href="/" className="logo_mark">
                <img src="/images/common/mark.png" alt="국립순천대학교" />
                <span>AX OPEN LAB</span>
              </Link>
            </h1>
            <button
              type="button"
              className="am_close"
              aria-label="닫기"
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="am_body">
            {NAV.map((sec) => (
              <div className="am_col" key={sec.title}>
                <span>{sec.title}</span>
                <ul>
                  {sec.items.map((it) => (
                    <li key={it.href}>
                      <NavLink href={it.href}>{it.label}</NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {section && (
        <>
          <div
            className="sub_visual"
            style={{ backgroundImage: "url('/images/contents/sub_visual.jpg')" }}
          >
            <div className="vis_tit">
              <h2>{section.title}</h2>
            </div>
          </div>

          <div className="sub_depth">
            <ul className="depth_3">
              {section.items.map((it) => (
                <li key={it.href} className={pathname === it.href ? "on" : ""}>
                  <NavLink href={it.href}>{it.label}</NavLink>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
