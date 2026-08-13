"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Notice } from "@/lib/types";
import { getNotices } from "@/lib/db";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function NoticeBoard() {
  const [items, setItems] = useState<Notice[] | null>(null);

  useEffect(() => {
    getNotices().then(setItems);
  }, []);

  if (items === null) {
    return <p className="board_empty">불러오는 중…</p>;
  }

  if (items.length === 0) {
    return <p className="board_empty">등록된 공지사항이 없습니다.</p>;
  }

  return (
    <table className="board_table">
      <thead>
        <tr>
          <th style={{ width: "10%" }}>번호</th>
          <th>제목</th>
          <th style={{ width: "18%" }}>등록일</th>
        </tr>
      </thead>
      <tbody>
        {items.map((n, i) => (
          <tr key={n.id}>
            <td>{n.pinned ? "공지" : items.length - i}</td>
            <td className="subject">
              <Link href={`/notice/${n.id}`}>{n.title}</Link>
            </td>
            <td>{formatDate(n.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
