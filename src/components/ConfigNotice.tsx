export default function ConfigNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
      <h2 className="mb-2 text-base font-bold">⚠️ Firebase 설정이 필요합니다</h2>
      <p className="mb-3">
        예약 데이터를 저장하려면 Firebase(Firestore) 연결이 필요합니다. 아래 순서로 설정하세요.
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline"
          >
            Firebase 콘솔
          </a>
          에서 프로젝트를 만들고 <b>Firestore Database</b>를 생성합니다.
        </li>
        <li>
          프로젝트 설정 → 내 앱(웹앱 추가) → SDK 설정값을 복사합니다.
        </li>
        <li>
          프로젝트 루트의 <code className="rounded bg-white px-1">.env.local</code> 파일에 값을 채워 넣습니다.
        </li>
        <li>
          개발 서버를 재시작합니다. (<code className="rounded bg-white px-1">npm run dev</code>)
        </li>
      </ol>
    </div>
  );
}
