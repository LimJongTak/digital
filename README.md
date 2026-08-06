# 시설예약 시스템 (Facility Reservation)

순천대 디지털+X 산업기술센터의 시설예약 사이트를 본떠 만든 예약 시스템입니다.
**Next.js (App Router) + Firebase Firestore + Tailwind CSS** 로 구현되어 있습니다.

## 주요 기능

- **예약하기** (`/`) — 시설 탭 선택 → 월간 캘린더에서 시간대별 슬롯 클릭 → 예약 신청
  - 시간대 상태: `예약가능` / `승인대기` / `예약완료` / `불가`
  - 예약 규칙: 하루 최대 9시간, 오늘부터 2주 후 일정까지 예약 가능
  - 중복 시간대 자동 차단
- **예약 조회/취소** (`/lookup`) — 이름 + 연락처로 내 예약을 조회하고 취소
- **관리자** (`/admin`) — 비밀번호 로그인 후
  - 예약 관리: 상태별 필터, 승인 / 거절 / 삭제
  - 시설 관리: 시설 추가 / 삭제, 운영시간 변경

사용자는 별도 로그인 없이 이름·연락처만 입력합니다. 관리자만 비밀번호로 접근합니다.

## 설정 방법

### 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. **Firestore Database** 생성 (테스트 모드로 시작 가능)
3. 프로젝트 설정 → 내 앱 → **웹앱(</>) 추가** → SDK 설정값 복사

### 2. 환경변수 설정

`.env.local.example` 를 복사해 `.env.local` 을 만들고 값을 채웁니다.

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_ADMIN_PASSWORD=원하는_관리자_비밀번호
```

### 3. 실행

```
npm install
npm run dev
```

→ http://localhost:3000

### 4. 초기 시설 등록

`/admin` 접속 → 비밀번호 입력 → **시설 관리** 탭 → **기본 시설 추가** 버튼
(Co-Work Zone 1·2, Data & Idea Zone 3개가 생성됩니다)

## Firestore 보안 규칙

`firestore.rules` 에 데모용 규칙이 있습니다. 운영 환경에서는 Firebase Auth 기반으로
관리자 쓰기 권한을 제한하는 것을 권장합니다.

## 데이터 구조 (Firestore)

- `facilities` — `{ name, capacity, description, openHour, closeHour, order }`
- `reservations` — `{ facilityId, facilityName, date, startHour, endHour, name, phone, org, purpose, status, createdAt }`
  - `status`: `pending`(승인대기) | `approved`(예약완료) | `rejected`(거절)
