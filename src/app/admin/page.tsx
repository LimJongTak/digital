"use client";

import { useCallback, useEffect, useState } from "react";
import type { Facility, Reservation, ReservationStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import {
  getFacilities,
  addFacility,
  updateFacility,
  deleteFacility,
  getAllReservations,
  updateReservationStatus,
  deleteReservation,
  seedFacilitiesIfEmpty,
  createReservation,
} from "@/lib/db";
import {
  getSiteSettings,
  updateSiteSettings,
  verifyAdmin,
  changeAdminPassword,
  DEFAULT_SETTINGS,
  type SiteSettings,
} from "@/lib/settings";
import { isFirebaseConfigured } from "@/lib/firebase";
import { weekdayLabel } from "@/lib/date";
import ConfigNotice from "@/components/ConfigNotice";

const SESSION_KEY = "admin_authed";

type Tab = "reservations" | "addReservation" | "facilities" | "site" | "password";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  // 새로고침 후에도 로그인 유지 (세션 스토리지)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
    }
    setReady(true);
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ConfigNotice />
      </div>
    );
  }

  if (!ready) return null;

  if (!authed) {
    return (
      <LoginForm
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={() => {
        sessionStorage.removeItem(SESSION_KEY);
        setAuthed(false);
      }}
    />
  );
}

/* ------------------------------ 로그인 ------------------------------ */

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const ok = await verifyAdmin(username, password);
      if (ok) onSuccess();
      else setErr("아이디 또는 비밀번호가 올바르지 않습니다.");
    } catch {
      setErr("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 mb-24 max-w-sm rounded-lg border border-gray-200 bg-white p-6">
      <h1 className="mb-1 text-xl font-bold text-gray-900">관리자 로그인</h1>
      <p className="mb-4 text-xs text-gray-400">사이트 관리 페이지입니다.</p>
      <form onSubmit={submit}>
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setErr("");
          }}
          placeholder="아이디"
          autoComplete="username"
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErr("");
          }}
          placeholder="비밀번호"
          autoComplete="current-password"
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------ 대시보드 ------------------------------ */

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("reservations");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">사이트 관리</h1>
        <button
          onClick={onLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-200">
        <TabBtn active={tab === "reservations"} onClick={() => setTab("reservations")}>
          예약 관리
        </TabBtn>
        <TabBtn active={tab === "addReservation"} onClick={() => setTab("addReservation")}>
          예약 등록 (주말 포함)
        </TabBtn>
        <TabBtn active={tab === "facilities"} onClick={() => setTab("facilities")}>
          시설 관리
        </TabBtn>
        <TabBtn active={tab === "site"} onClick={() => setTab("site")}>
          사이트 설정
        </TabBtn>
        <TabBtn active={tab === "password"} onClick={() => setTab("password")}>
          비밀번호 변경
        </TabBtn>
      </div>
      {tab === "reservations" && <ReservationsAdmin />}
      {tab === "addReservation" && <AdminAddReservation />}
      {tab === "facilities" && <FacilitiesAdmin />}
      {tab === "site" && <SiteSettingsAdmin />}
      {tab === "password" && <PasswordAdmin />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

/* --------------------------- 사이트 설정 --------------------------- */

function SiteSettingsAdmin() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  function setFooter<K extends keyof SiteSettings["footer"]>(
    key: K,
    val: SiteSettings["footer"][K],
  ) {
    setSettings((s) => ({ ...s, footer: { ...s.footer, [key]: val } }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await updateSiteSettings(settings);
      // 즉시 화면에 반영
      document.documentElement.style.setProperty("--primary", settings.primaryColor);
      setMsg("저장되었습니다. (푸터/색상은 새로고침 시 전체 반영)");
    } catch {
      setMsg("저장에 실패했습니다. Firestore 보안 규칙(settings)을 배포했는지 확인하세요.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS);
  }

  if (loading) return <p className="text-gray-500">불러오는 중…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* 디자인 */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-gray-900">디자인 · 기본</h2>
        <div className="space-y-3">
          <Field label="사이트 제목">
            <input
              value={settings.siteTitle}
              onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="대표 색상 (포인트 컬러)">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) =>
                  setSettings({ ...settings, primaryColor: e.target.value })
                }
                className="h-9 w-14 cursor-pointer rounded border border-gray-300"
              />
              <input
                value={settings.primaryColor}
                onChange={(e) =>
                  setSettings({ ...settings, primaryColor: e.target.value })
                }
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <span
                className="inline-block h-6 w-24 rounded"
                style={{ backgroundColor: settings.primaryColor }}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* 푸터 정보 */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-gray-900">푸터 정보</h2>
        <div className="space-y-3">
          <Field label="주소">
            <input
              value={settings.footer.orgAddress}
              onChange={(e) => setFooter("orgAddress", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="대표전화">
            <input
              value={settings.footer.phone}
              onChange={(e) => setFooter("phone", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="카피라이트">
            <input
              value={settings.footer.copyright}
              onChange={(e) => setFooter("copyright", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          기본값으로
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

/* --------------------------- 비밀번호 변경 --------------------------- */

function PasswordAdmin() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 4) {
      setMsg({ type: "err", text: "새 비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "err", text: "새 비밀번호가 서로 일치하지 않습니다." });
      return;
    }
    setSaving(true);
    try {
      await changeAdminPassword(current, next);
      setMsg({ type: "ok", text: "비밀번호가 변경되었습니다." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "변경에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm">
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <Field label="현재 비밀번호">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="새 비밀번호">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="새 비밀번호 확인">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

/* --------------------------- 예약 관리 --------------------------- */

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-gray-100 text-gray-500",
};

function ReservationsAdmin() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAllReservations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: ReservationStatus) {
    await updateReservationStatus(id, status);
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

    if (status !== "approved" && status !== "rejected") return;
    const r = items.find((x) => x.id === id);
    if (!r?.email) return;
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: r.email,
          facilityName: r.facilityName,
          date: r.date,
          startHour: r.startHour,
          endHour: r.endHour,
          status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn("예약 알림 메일 발송 실패:", body.error ?? res.statusText);
      }
    } catch (e) {
      console.warn("예약 알림 메일 발송 실패:", e);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 예약을 완전히 삭제하시겠습니까?")) return;
    await deleteReservation(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = items.filter((r) => filter === "all" || r.status === filter);

  if (loading) return <p className="text-gray-500">불러오는 중…</p>;

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f === "all" ? "전체" : STATUS_LABEL[f]}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">총 {filtered.length}건</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">예약이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">시설</th>
                <th className="px-3 py-2">일시</th>
                <th className="px-3 py-2">예약자</th>
                <th className="px-3 py-2">목적</th>
                <th className="px-3 py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.facilityName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.date} ({weekdayLabel(r.date)})
                    <br />
                    {String(r.startHour).padStart(2, "0")}:00~
                    {String(r.endHour).padStart(2, "0")}:00
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.name}
                    <br />
                    <span className="text-xs text-gray-400">{r.phone}</span>
                    {r.email && (
                      <>
                        <br />
                        <span className="text-xs text-gray-400">{r.email}</span>
                      </>
                    )}
                    {r.org && (
                      <>
                        <br />
                        <span className="text-xs text-gray-400">{r.org}</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.purpose || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {r.status !== "approved" && (
                        <button
                          onClick={() => setStatus(r.id, "approved")}
                          className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                        >
                          승인
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button
                          onClick={() => setStatus(r.id, "rejected")}
                          className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          거절
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --------------------------- 예약 등록 (관리자, 주말 포함) --------------------------- */

function AdminAddReservation() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    getFacilities().then((fs) => {
      setFacilities(fs);
      if (fs.length) setFacilityId(fs[0].id);
    });
  }, []);

  const facility = facilities.find((f) => f.id === facilityId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!facility) {
      setMsg({ type: "err", text: "시설을 선택하세요." });
      return;
    }
    if (!date) {
      setMsg({ type: "err", text: "날짜를 선택하세요." });
      return;
    }
    if (endHour <= startHour) {
      setMsg({ type: "err", text: "종료 시각은 시작 시각보다 커야 합니다." });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setMsg({ type: "err", text: "예약자명과 연락처를 입력하세요." });
      return;
    }
    setSubmitting(true);
    try {
      await createReservation(
        {
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
        },
        { allowWeekend: true },
      );
      setMsg({ type: "ok", text: "예약이 등록되었습니다." });
      setName("");
      setPhone("");
      setEmail("");
      setOrg("");
      setPurpose("");
    } catch (e2) {
      setMsg({ type: "err", text: e2 instanceof Error ? e2.message : "등록에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <p className="mb-4 text-sm text-gray-500">
        주말을 포함해 관리자가 직접 예약을 등록합니다. (일반 사용자는 주말 예약이 불가합니다)
      </p>
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <Field label="시설">
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="날짜">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {date && (
            <p className="mt-1 text-xs text-gray-400">
              {weekdayLabel(date)}요일{["토", "일"].includes(weekdayLabel(date)) ? " · 주말" : ""}
            </p>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시작</label>
            <HourSelect value={startHour} onChange={setStartHour} full />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">종료</label>
            <HourSelect value={endHour} onChange={setEndHour} full />
          </div>
        </div>
        <Field label="예약자명">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="연락처">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="이메일 (선택, 입력 시 승인/반려 알림 발송)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="소속 (선택)">
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="사용 목적 (선택)">
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "등록 중…" : "예약 등록"}
        </button>
      </form>
    </div>
  );
}

/* --------------------------- 시설 관리 --------------------------- */

function FacilitiesAdmin() {
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    capacity: 4,
    description: "",
    openHour: 9,
    closeHour: 17,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getFacilities());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.closeHour <= form.openHour) {
      alert("종료 시각은 시작 시각보다 커야 합니다.");
      return;
    }
    await addFacility({
      name: form.name.trim(),
      capacity: Number(form.capacity),
      description: form.description.trim(),
      openHour: Number(form.openHour),
      closeHour: Number(form.closeHour),
      order: items.length + 1,
    });
    setForm({ name: "", capacity: 4, description: "", openHour: 9, closeHour: 17 });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("이 시설을 삭제하시겠습니까? (기존 예약은 유지됩니다)")) return;
    await deleteFacility(id);
    await load();
  }

  async function changeHours(f: Facility, field: "openHour" | "closeHour", val: number) {
    await updateFacility(f.id, { [field]: val });
    await load();
  }

  async function seed() {
    const n = await seedFacilitiesIfEmpty();
    if (n === 0) alert("이미 시설이 존재합니다.");
    await load();
  }

  if (loading) return <p className="text-gray-500">불러오는 중…</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 목록 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">시설 목록</h2>
          {items.length === 0 && (
            <button
              onClick={seed}
              className="rounded-md border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              기본 시설 추가
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 시설이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{f.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{f.capacity}인</span>
                  </div>
                  <button
                    onClick={() => remove(f.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
                {f.description && (
                  <p className="mt-1 text-xs text-gray-500">{f.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  운영시간
                  <HourSelect
                    value={f.openHour}
                    onChange={(v) => changeHours(f, "openHour", v)}
                  />
                  ~
                  <HourSelect
                    value={f.closeHour}
                    onChange={(v) => changeHours(f, "closeHour", v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 추가 폼 */}
      <div>
        <h2 className="mb-3 font-semibold text-gray-900">시설 추가</h2>
        <form
          onSubmit={add}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Field label="시설명">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Co-Work Zone 3"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">정원</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">시작</label>
              <HourSelect
                value={form.openHour}
                onChange={(v) => setForm({ ...form, openHour: v })}
                full
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">종료</label>
              <HourSelect
                value={form.closeHour}
                onChange={(v) => setForm({ ...form, closeHour: v })}
                full
              />
            </div>
          </div>
          <Field label="설명">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="4인 그룹 작업/회의 공간"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  );
}

function HourSelect({
  value,
  onChange,
  full,
}: {
  value: number;
  onChange: (v: number) => void;
  full?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`rounded-md border border-gray-300 px-2 py-1 text-sm ${full ? "w-full py-2" : ""}`}
    >
      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}
