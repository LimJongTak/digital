import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { isWeekend } from "./date";
import type { Facility, Reservation, ReservationStatus } from "./types";

const FACILITIES = "facilities";
const RESERVATIONS = "reservations";

/* ------------------------------- 시설 ------------------------------- */

export async function getFacilities(): Promise<Facility[]> {
  const snap = await getDocs(query(collection(db, FACILITIES), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Facility, "id">) }));
}

export async function addFacility(data: Omit<Facility, "id">): Promise<string> {
  const ref = await addDoc(collection(db, FACILITIES), data);
  return ref.id;
}

export async function updateFacility(
  id: string,
  data: Partial<Omit<Facility, "id">>,
): Promise<void> {
  await updateDoc(doc(db, FACILITIES, id), data);
}

export async function deleteFacility(id: string): Promise<void> {
  await deleteDoc(doc(db, FACILITIES, id));
}

/* ------------------------------ 예약 ------------------------------ */

function mapReservation(id: string, data: Record<string, unknown>): Reservation {
  return { id, ...(data as Omit<Reservation, "id">) };
}

// 특정 시설의 특정 날짜 예약 (거절 제외)
export async function getReservationsByDate(
  facilityId: string,
  date: string,
): Promise<Reservation[]> {
  const snap = await getDocs(
    query(
      collection(db, RESERVATIONS),
      where("facilityId", "==", facilityId),
      where("date", "==", date),
    ),
  );
  return snap.docs
    .map((d) => mapReservation(d.id, d.data()))
    .filter((r) => r.status !== "rejected");
}

// 특정 시설의 한 달 예약 전체 (거절 제외) — 달력 표시용
export async function getReservationsByMonth(
  facilityId: string,
  year: number,
  month: number, // 1-12
): Promise<Reservation[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const snap = await getDocs(
    query(collection(db, RESERVATIONS), where("facilityId", "==", facilityId)),
  );
  return snap.docs
    .map((d) => mapReservation(d.id, d.data()))
    .filter((r) => r.status !== "rejected" && r.date.startsWith(prefix));
}

// 두 구간 [aStart, aEnd), [bStart, bEnd) 가 겹치는지
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface NewReservation {
  facilityId: string;
  facilityName: string;
  date: string;
  startHour: number;
  endHour: number;
  name: string;
  phone: string;
  email?: string;
  org?: string;
  purpose?: string;
}

// 예약 생성 (중복 시간 검사 포함). 성공 시 새 id 반환, 충돌 시 throw.
// allowWeekend: 관리자 등록 경로에서만 true로 넘겨 주말 예약을 허용한다.
export async function createReservation(
  input: NewReservation,
  opts: { allowWeekend?: boolean } = {},
): Promise<string> {
  if (!opts.allowWeekend && isWeekend(input.date)) {
    throw new Error("주말 예약은 관리자를 통해서만 가능합니다.");
  }

  const existing = await getReservationsByDate(input.facilityId, input.date);
  const conflict = existing.find((r) =>
    overlaps(input.startHour, input.endHour, r.startHour, r.endHour),
  );
  if (conflict) {
    throw new Error("이미 예약된 시간대가 포함되어 있습니다. 다시 선택해 주세요.");
  }

  const payload: Omit<Reservation, "id"> = {
    ...input,
    email: input.email ?? "",
    org: input.org ?? "",
    purpose: input.purpose ?? "",
    status: "pending",
    createdAt: Date.now(),
  };
  const ref = await addDoc(collection(db, RESERVATIONS), payload);
  return ref.id;
}

// 이름 + 연락처로 내 예약 조회
export async function lookupReservations(
  name: string,
  phone: string,
): Promise<Reservation[]> {
  const snap = await getDocs(
    query(
      collection(db, RESERVATIONS),
      where("name", "==", name.trim()),
      where("phone", "==", phone.trim()),
    ),
  );
  return snap.docs
    .map((d) => mapReservation(d.id, d.data()))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function cancelReservation(id: string): Promise<void> {
  await deleteDoc(doc(db, RESERVATIONS, id));
}

export async function getReservation(id: string): Promise<Reservation | null> {
  const d = await getDoc(doc(db, RESERVATIONS, id));
  return d.exists() ? mapReservation(d.id, d.data()) : null;
}

/* ----------------------------- 관리자 ----------------------------- */

export async function getAllReservations(): Promise<Reservation[]> {
  const snap = await getDocs(collection(db, RESERVATIONS));
  return snap.docs
    .map((d) => mapReservation(d.id, d.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<void> {
  await updateDoc(doc(db, RESERVATIONS, id), { status });
}

export async function deleteReservation(id: string): Promise<void> {
  await deleteDoc(doc(db, RESERVATIONS, id));
}

/* ------------------------------ 시드 ------------------------------ */

const DEFAULT_FACILITIES: Omit<Facility, "id">[] = [
  {
    name: "Co-Work Zone 1",
    capacity: 4,
    description: "그룹별 작업 또는 미팅 공간\n필요 시 공간 통합 가능",
    openHour: 9,
    closeHour: 18,
    order: 1,
  },
  {
    name: "Co-Work Zone 2",
    capacity: 4,
    description: "그룹별 작업 또는 미팅 공간\n필요 시 공간 통합 가능",
    openHour: 9,
    closeHour: 18,
    order: 2,
  },
  {
    name: "Data & Idea Zone",
    capacity: 16,
    description: "그룹별 협업 및 교류 공간",
    openHour: 9,
    closeHour: 18,
    order: 3,
  },
];

// 시설이 하나도 없으면 기본 시설을 생성. 생성된 개수 반환.
export async function seedFacilitiesIfEmpty(): Promise<number> {
  const existing = await getFacilities();
  if (existing.length > 0) return 0;
  for (const f of DEFAULT_FACILITIES) {
    await addFacility(f);
  }
  return DEFAULT_FACILITIES.length;
}
