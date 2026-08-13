"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Notice } from "@/lib/types";
import { getNotice } from "@/lib/db";
import ConfigNotice from "@/components/ConfigNotice";
import { isFirebaseConfigured } from "@/lib/firebase";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getNotice(params.id).then(setNotice);
  }, [params.id]);

  if (!isFirebaseConfigured) {
    return (
      <div className="sub_cont">
        <div className="in_Layer1">
          <ConfigNotice />
        </div>
      </div>
    );
  }

  return (
    <div className="sub_cont">
      <div className="in_Layer1">
        <div className="sub_tit">
          <h3>공지사항</h3>
        </div>

        {notice === undefined && <p className="board_empty">불러오는 중…</p>}
        {notice === null && <p className="board_empty">존재하지 않는 게시글입니다.</p>}
        {notice && (
          <div>
            <div style={{ borderTop: "2px solid #333", padding: "20px 10px", borderBottom: "1px solid #e3e3e3" }}>
              <h4 style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2c" }}>{notice.title}</h4>
              <p style={{ marginTop: 8, fontSize: 14, color: "#888" }}>
                {formatDate(notice.createdAt)}
              </p>
            </div>
            <div
              style={{
                minHeight: 200,
                padding: "24px 10px",
                borderBottom: "1px solid #e3e3e3",
                fontSize: 16,
                color: "#2c2c2c",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {notice.content}
            </div>
          </div>
        )}

        <div className="btn_C_Area">
          <Link href="/notice">
            <button type="button">목록으로</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
