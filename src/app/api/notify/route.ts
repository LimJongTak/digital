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
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildEmail(p: NotifyPayload) {
  const time = `${String(p.startHour).padStart(2, "0")}:00 ~ ${String(p.endHour).padStart(2, "0")}:00`;
  const when = `${p.date} (${weekdayLabel(p.date)}) ${time}`;
  const decision = p.status === "approved" ? "승인" : "반려";
  const subject = `[AX OPEN LAB] 시설예약이 ${decision}되었습니다`;

  const text = [
    `AX OPEN LAB 시설예약 안내`,
    ``,
    `예약일시: ${when}`,
    `대관장소: ${p.facilityName}`,
    `대관여부: ${decision}`,
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
      </table>
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
