import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { weekdayLabel } from "@/lib/date";

export interface NotifyPayload {
  to: string;
  facilityName: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
  status: "approved" | "rejected";
  doorCodes?: { facilityName: string; code: string }[]; // 승인 시 안내할 도어락 비밀번호
  hasDoorLock?: boolean; // 도어락 시설 포함 여부 (잠금 안내 문구 표시)
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const CLEANUP_NOTICE = "사용 후에는 책상·의자·비품 등을 처음 상태로 정리해 주세요.";
const LOCK_NOTICE = "Co-Work Zone 사용 후 퇴실 시 도어락을 꼭 잠가 주세요.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildEmail(p: NotifyPayload) {
  const time = `${String(p.startHour).padStart(2, "0")}:00 ~ ${String(p.endHour).padStart(2, "0")}:00`;
  const when = `${p.date} (${weekdayLabel(p.date)}) ${time}`;
  const decision = p.status === "approved" ? "승인" : "반려";
  const subject = `[AX OPEN LAB] 시설예약이 ${decision}되었습니다`;
  const approved = p.status === "approved";
  const doorCodes = approved ? (p.doorCodes ?? []).filter((d) => d.code) : [];
  const notices = approved ? [CLEANUP_NOTICE, ...(p.hasDoorLock ? [LOCK_NOTICE] : [])] : [];

  const text = [
    `AX OPEN LAB 시설예약 안내`,
    ``,
    `예약일시: ${when}`,
    `대관장소: ${p.facilityName}`,
    `대관여부: ${decision}`,
    ...doorCodes.map((d) => `도어락 비밀번호 (${d.facilityName}): ${d.code}`),
    ...(notices.length ? [``, `[이용 안내]`, ...notices.map((n) => `- ${n}`)] : []),
    ``,
    `본 메일은 발신 전용입니다. 문의사항은 대표전화로 연락해 주세요.`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#222; max-width:480px; margin:0 auto;">
      <h2 style="color:#006cb2; margin-bottom:4px;">AX OPEN LAB 시설예약 안내</h2>
      <table style="margin-top:16px; border-collapse:collapse; width:100%;">
        <tr>
          <td style="padding:8px 0; color:#666; width:100px;">예약일시</td>
          <td style="padding:8px 0; font-weight:600;">${when}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">대관장소</td>
          <td style="padding:8px 0; font-weight:600;">${p.facilityName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#666;">대관여부</td>
          <td style="padding:8px 0; font-weight:600; color:${p.status === "approved" ? "#1a7f37" : "#c0392b"};">${decision}</td>
        </tr>
        ${doorCodes
          .map(
            (d) => `
        <tr>
          <td style="padding:8px 0; color:#666;">도어락 비밀번호</td>
          <td style="padding:8px 0; font-weight:600;">${escapeHtml(d.facilityName)}: <span style="font-size:18px; letter-spacing:2px; color:#006cb2;">${escapeHtml(d.code)}</span></td>
        </tr>`,
          )
          .join("")}
      </table>
      ${
        notices.length
          ? `
      <div style="margin-top:20px; padding:12px 16px; background:#f5f8fb; border-radius:8px; font-size:14px; line-height:1.6;">
        <p style="margin:0 0 6px; font-weight:600;">이용 안내</p>
        <ul style="margin:0; padding-left:18px;">
          ${notices
            .map((n) => `<li${n === LOCK_NOTICE ? ' style="color:#c0392b; font-weight:600;"' : ""}>${n}</li>`)
            .join("")}
        </ul>
      </div>`
          : ""
      }
      <p style="margin-top:24px; font-size:12px; color:#999;">
        본 메일은 발신 전용입니다. 문의사항은 대표전화로 연락해 주세요.
      </p>
    </div>
  `;

  return { subject, text, html };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "이메일 발송이 설정되지 않았습니다 (RESEND_API_KEY/RESEND_FROM_EMAIL 누락)." },
      { status: 501 },
    );
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!payload.to || !EMAIL_RE.test(payload.to)) {
    return NextResponse.json({ error: "유효한 수신 이메일이 없습니다." }, { status: 400 });
  }
  if (payload.status !== "approved" && payload.status !== "rejected") {
    return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
  }

  const { subject, text, html } = buildEmail(payload);

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject,
      text,
      html,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
