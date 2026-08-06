"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Facility, Reservation } from "@/lib/types";
import { MAX_HOURS_PER_DAY } from "@/lib/types";
import {
  getFacilities,
  getReservationsByMonth,
  createReservation,
  createComboReservation,
  getBlockedDates,
} from "@/lib/db";
import {
  WEEKDAYS,
  buildCalendar,
  weekdayLabel,
  isWithinBookingWindow,
  isPast,
  isBlockedForPublic,
  toDateStr,
  startOfToday,
} from "@/lib/date";

const COMBO_ID = "__combo_zone1_2__";

interface Target {
  id: string;
  name: string;
  capacity: number;
  description: string;
  openHour: number;
  closeHour: number;
  facilities: Facility[]; // 단일 예약 1개, 통합 예약 2개
}

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

function buildTargets(facilities: Facility[]): Target[] {
  const targets: Target[] = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    capacity: f.capacity,
    description: f.description,
    openHour: f.openHour,
    closeHour: f.closeHour,
    facilities: [f],
  }));

  const zone1 = facilities.find((f) => f.name === "Co-Work Zone 1");
  const zone2 = facilities.find((f) => f.name === "Co-Work Zone 2");
  if (zone1 && zone2) {
    targets.push({
      id: COMBO_ID,
      name: "Co-Work Zone 1+2 (통합)",
      capacity: zone1.capacity + zone2.capacity,
      description: "Co-Work Zone 1, 2를 하나의 공간으로 통합해 예약합니다\n대규모 회의/행사에 적합",
      openHour: Math.max(zone1.openHour, zone2.openHour),
      closeHour: Math.min(zone1.closeHour, zone2.closeHour),
      facilities: [zone1, zone2],
    });
  }
  return targets;
}

export default function ReservationBoard() {
  const today = startOfToday();
  const todayStr = toDateStr(today);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ date: string; startHour: number } | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  const targets = useMemo(() => buildTargets(facilities), [facilities]);

  const target = useMemo(
    () => targets.find((t) => t.id === targetId) ?? null,
    [targets, targetId],
  );

  useEffect(() => {
    (async () => {
      try {
        const [fs, blocked] = await Promise.all([getFacilities(), getBlockedDates()]);
        setFacilities(fs);
        setBlockedDates(new Set(blocked.map((b) => b.date)));
        if (fs.length) setTargetId(fs[0].id);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadReservations = useCallback(async () => {
    if (!target) return;
    try {
      const lists = await Promise.all(
        target.facilities.map((f) => getReservationsByMonth(f.id, year, month)),
      );
      setReservations(lists.flat());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [target, year, month]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const bookedMap = useMemo(() => buildBookedMap(reservations), [reservations]);

  const hours = useMemo(() => {
    if (!target) return [];
    const out: number[] = [];
    for (let h = target.openHour; h < target.closeHour; h++) out.push(h);
    return out;
  }, [target]);

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
        {targets.map((t) => {
          const img = cardImage(t.facilities[0]);
          return (
            <div
              key={t.id}
              className={`box${t.id === targetId ? " on" : ""}`}
              onClick={() => setTargetId(t.id)}
            >
              <div className="card">
                <div className="img">{img && <img src={img} alt={t.name} />}</div>
                <div className="tit">
                  <p>{t.name}</p>
                  <span>
                    <img src="/images/ico/calendar.png" alt="달력" />
                  </span>
                </div>
              </div>
              <div className="info">
                <ul>
                  {t.description
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  <li>수용인원 {t.capacity}명</li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* 달력 */}
      {target && (
        <div className="resv_calendar">
          <div className="zone">
            <h4>{target.name} 예약 신청</h4>
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
                              blockedDates={blockedDates}
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

      {modal && target && (
        <ReservationModal
          target={target}
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
  blockedDates,
  onPick,
}: {
  date: string;
  hours: number[];
  booked?: Set<number>;
  blockedDates: Set<string>;
  onPick: (hour: number) => void;
}) {
  if (isPast(date) || !isWithinBookingWindow(date)) return null;
  if (isBlockedForPublic(date) || blockedDates.has(date)) {
    return <p className="doc impos">주말/공휴일은 관리자 예약만 가능합니다</p>;
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
  target,
  date,
  startHour,
  bookedHours,
  onClose,
  onDone,
}: {
  target: Target;
  date: string;
  startHour: number;
  bookedHours: Set<number>;
  onClose: () => void;
  onDone: () => void;
}) {
  const maxEnd = useMemo(() => {
    let end = startHour + 1;
    const limit = Math.min(target.closeHour, startHour + MAX_HOURS_PER_DAY);
    while (end < limit && !bookedHours.has(end)) end++;
    return end;
  }, [startHour, target.closeHour, bookedHours]);

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
      if (target.facilities.length > 1) {
        await createComboReservation({
          facilities: target.facilities.map((f) => ({ id: f.id, name: f.name })),
          date,
          startHour,
          endHour,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          org: org.trim(),
          purpose: purpose.trim(),
        });
      } else {
        const facility = target.facilities[0];
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
      }
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
          {target.name} · {date} ({weekdayLabel(date)})
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
