export interface NavItem {
  label: string;
  href: string;
}

export interface NavSection {
  title: string; // 배너에 표시될 섹션명
  href: string; // 대표 링크 (첫 하위 메뉴)
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "시설예약",
    href: "/reserve",
    items: [
      { label: "시설예약", href: "/reserve" },
      { label: "예약확인 및 취소", href: "/lookup" },
    ],
  },
];

// 현재 경로가 속한 섹션 찾기
export function findSection(pathname: string): NavSection | null {
  for (const sec of NAV) {
    if (sec.items.some((it) => it.href === pathname)) return sec;
  }
  return null;
}
