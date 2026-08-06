"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Facility, Reservation } from "@/lib/types";
import { MAX_HOURS_PER_DAY } from "@/lib/types";
import {
  getFacilities,
  getReservationsByMonth,
  createReservation,
} from "@/lib/db";
import {
  WEEKDAYS,
  buildCalendar,
  weekdayLabel,
  isWithinBookingWindow,
  isPast,
  isWeekend,
  toDateStr,
  startOfToday,
} from "@/lib/date";

type BookedMap = Record<string, Set<number>>;

function buildBookedMap(reservations: Reservation[]): BookedMap {
  const map: BookedMap = {};
  for (const r of reservations) {
    (map[r.date] ??= new Set());
    for (let h = r.startHour; h < r.endHour; h++) map[r.date].add(h);
  }
  return map;
}

function cardImage(f: Facility): string | null {
  if (f.image) return f.image;
  if (f.order >= 1 && f.order <= 3) return `/file/room/${f.order}.jpg`;
  return null;
}

export default function ReservationBoard() {
  const today = startOfToday();
  const todayStr = toDateStr(today);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string>("");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ date: string; startHour: number } | null>(null);

  const facility = useMemo(
    () => facilities.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId],
  );

  useEffect(() => {
    (async () => {
      try {
        const fs = await getFacilities();
        setFacilities(fs);
        if (fs.length) setFacilityId(fs[0].id);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadReservations = useCallback(async () => {
    if (!facilityId) return;
    try {
      setReservations(await getReservationsByMonth(facilityId, year, month));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [facilityId, year, month]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const bookedMap = useMemo(() => buildBookedMap(reservations), [reservations]);

  const hours = useMemo(() => {
    if (!facility) return [];
    const out: number[] = [];
    for (let h = facility.openHour; h < facility.closeHour; h++) out.push(h);
    return out;
  }, [facility]);

  const weeks = useMemo(() => buildCalendar(year, month), [year, month]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  if (loading) return <p className="py-10 text-center text-gray-500">불러오는 중…</p>;

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        오류: {error}
        <p className="mt-2 text-red-600">
          Firebase 콘솔에서 Firestore 데이터베이스 생성 여부와 보안 규칙을 확인하세요.
        </p>
      </div>
    );
  }

  if (!facilities.length) {
    return (
      <div className="rounded-lg border border-gray-300 bg-white p-6 text-sm text-gray-600">
        등록된 시설이 없습니다.{" "}
        <a href="/admin" className="text-blue-700 underline">
          관리자 페이지
        </a>
        에서 시설을 추가하세요.
      </div>
    );
  }

  return (
    <div>
      {/* 회의실 카드 */}
      <div className="resv_list">
        {facilities.map((f) => {
          const img = cardImage(f);
          return (
            <div
              key={f.id}
              className={`box${f.id === facilityId ? " on" : ""}`}
              onClick={() => setFacilityId(f.id)}
            >
              <div className="card">
                <div className="img">
                  {img && <img src={img} alt={f.name} />}
                </div>
                <div className="tit">
                  <p>{f.name}</p>
                  <span>
                    <img src="/images/ico/calendar.png" alt="달력" />
                  </span>
                </div>
              </div>
              <div className="info">
                <ul>
                  {f.description
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  <li>수용인원 {f.capacity}명</li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* 달력 */}
      {facility && (
        <div className="resv_calendar">
          <div className="zone">
            <h4>{facility.name} 예약 신청</h4>
          </div>

          <div className="month_box">
            <button
              className="cal_prev"
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={isCurrentMonth}
            >
              <img src="/images/ico/cal_prev.png" alt="이전" />
            </button>
            <div className="num">
              <b>
                {year}.{month}
              </b>
            </div>
            <button className="cal_next" type="button" onClick={() => changeMonth(1)}>
              <img src="/images/ico/cal_next.png" alt="다음" />
            </button>
          </div>

          <div className="calendar_style">
            <table>
              <colgroup>
                <col span={7} style={{ width: "14.2%" }} />
              </colgroup>
              <thead>
                <tr>
                  {WEEKDAYS.map((w) => (
                    <th key={w}>{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((date, di) =>
                      date ? (
                        <td key={di} className={date === todayStr ? "today" : undefined}>
                          <div>
                            <p className="day">{Number(date.split("-")[2])}</p>
                            <DaySlots
                              date={date}
                              hours={hours}
                              booked={bookedMap[date]}
                              onPick={(h) => setModal({ date, startHour: h })}
                            />
                          </div>
                        </td>
                      ) : (
                        <td key={di}>&nbsp;</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && facility && (
        <ReservationModal
          facility={facility}
          date={modal.date}
          startHour={modal.startHour}
          bookedHours={bookedMap[modal.date] ?? new Set()}
          onClose={() => setModal(null)}
          onDone={async () => {
            setModal(null);
            await loadReservations();
          }}
        />
      )}
    </div>
  );
}

/* 한 날짜의 시간 슬롯들 (예약 가능 기간 안에서만 표시) */
function DaySlots({
  date,
  hours,
  booked,
  onPick,
}: {
  date: string;
  hours: number[];
  booked?: Set<number>;
  onPick: (hour: number) => void;
}) {
  if (isPast(date) || !isWithinBookingWindow(date)) return null;
  if (isWeekend(date)) {
    return <p className="doc impos">주말은 관리자 예약만 가능합니다</p>;
  }
  return (
    <>
      {hours.map((h) => {
        const label = `${String(h).padStart(2, "0")}:00`;
        if (booked?.has(h)) {
          return (
            <p key={h} className="doc impos">
              <a>{label} 예약완료</a>
            </p>
          );
        }
        return (
          <p key={h} className="doc pos">
            <a onClick={() => onPick(h)}>{label} 예약가능</a>
          </p>
        );
      })}
    </>
  );
}

/* ----------------------------- 예약 모달 ----------------------------- */

function ReservationModal({
  facility,
  date,
  startHour,
  bookedHours,
  onClose,
  onDone,
}: {
  facility: Facility;
  date: string;
  startHour: number;
  bookedHours: Set<number>;
  onClose: () => void;
  onDone: () => void;
}) {
  const maxEnd = useMemo(() => {
    let end = startHour + 1;
    const limit = Math.min(facility.closeHour, startHour + MAX_HOURS_PER_DAY);
    while (end < limit && !bookedHours.has(end)) end++;
    return end;
  }, [startHour, facility.closeHour, bookedHours]);

  const endOptions = useMemo(() => {
    const out: number[] = [];
    for (let e = startHour + 1; e <= maxEnd; e++) out.push(e);
    return out;
  }, [startHour, maxEnd]);

  const [endHour, setEndHour] = useState(startHour + 1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setErr("이름, 연락처, 이메일을 입력하세요.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErr("이메일 형식을 확인해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createReservation({
        facilityId: facility.id,
        facilityName: facility.name,
        date,
        startHour,
        endHour,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        org: org.trim(),
        purpose: purpose.trim(),
      });
      alert("예약 신청이 접수되었습니다.");
      onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-bold text-gray-900">예약 신청</h2>
        <p className="mb-4 text-sm text-gray-500">
          {facility.name} · {date} ({weekdayLabel(date)})
        </p>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시작 시각</label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {String(startHour).padStart(2, "0")}:00
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">종료 시각</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {endOptions.map((e) => (
                <option key={e} value={e}>
                  {String(e).padStart(2, "0")}:00 ({e - startHour}시간)
                </option>
              ))}
            </select>
          </div>
        </div>

        <Field label="이름" required value={name} onChange={setName} placeholder="홍길동" />
        <Field label="연락처" required value={phone} onChange={setPhone} placeholder="010-1234-5678" />
        <Field
          label="이메일"
          required
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />
        <p className="mb-3 -mt-2 text-xs text-gray-400">
          승인/반려 결과를 이 이메일로 안내해 드립니다.
        </p>
        <Field label="소속 (선택)" value={org} onChange={setOrg} placeholder="○○대학교 / ○○팀" />
        <Field label="사용 목적 (선택)" value={purpose} onChange={setPurpose} placeholder="팀 회의, 스터디 등" />

        {err && <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[#006cb2] px-4 py-2 text-sm font-medium text-white hover:bg-[#005a96] disabled:opacity-50"
          >
            {submitting ? "신청 중…" : "예약 신청"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#006cb2] focus:outline-none"
      />
    </div>
  );
}
