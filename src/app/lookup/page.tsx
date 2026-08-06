"use client";

import { useState } from "react";
import type { Reservation } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { lookupReservations, cancelReservation } from "@/lib/db";
import { isFirebaseConfigured } from "@/lib/firebase";
import { weekdayLabel } from "@/lib/date";
import ConfigNotice from "@/components/ConfigNotice";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-gray-100 text-gray-500",
};

export default function LookupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Reservation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isFirebaseConfigured) {
    return (
      <div className="sub_cont">
        <div className="in_Layer1">
          <ConfigNotice />
        </div>
      </div>
    );
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !phone.trim()) {
      setErr("이름과 연락처를 모두 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const rs = await lookupReservations(name, phone);
      setResults(rs);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onCancel(id: string) {
    if (!confirm("이 예약을 취소하시겠습니까?")) return;
    try {
      await cancelReservation(id);
      setResults((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (e2) {
      alert((e2 as Error).message);
    }
  }

  return (
    <div className="sub_cont">
      <div className="in_Layer1">
        <div className="sub_tit">
          <h3>예약확인 및 취소</h3>
        </div>
        <p className="mb-8 text-center text-base text-gray-500">
          예약 시 입력한 예약자명과 연락처로 예약을 확인하고 취소할 수 있습니다.
        </p>

      <div className="reserve_check">
        <form onSubmit={search}>
          <table className="form_table">
            <tbody>
              <tr>
                <th>예약자명</th>
                <td>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예약자명을 입력하세요"
                  />
                </td>
              </tr>
              <tr>
                <th>연락처</th>
                <td>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="btn_C_Area">
            <button type="submit" disabled={loading}>
              {loading ? "조회 중…" : "예약 확인"}
            </button>
          </div>
        </form>
      </div>

      {err && <p className="mb-4 mt-6 text-center text-sm text-red-600">{err}</p>}

      {results && results.length === 0 && (
        <p className="reserve_check mt-8 text-center text-base text-gray-500">
          조회된 예약 내역이 없습니다.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="reserve_check mt-10 space-y-3">
          {results.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{r.facilityName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {r.date} ({weekdayLabel(r.date)}) {String(r.startHour).padStart(2, "0")}:00 ~{" "}
                  {String(r.endHour).padStart(2, "0")}:00
                </p>
                {r.purpose && (
                  <p className="mt-0.5 text-xs text-gray-400">목적: {r.purpose}</p>
                )}
              </div>
              <button
                onClick={() => onCancel(r.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                취소
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
