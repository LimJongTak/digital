"use client";

// 원본(jndx.kr) footer와 동일하게 개인정보취급방침·이용약관을 팝업 창으로 연다.
function openPopup(url: string, name: string) {
  window.open(
    url,
    name,
    "width=640,height=720,scrollbars=yes,resizable=yes"
  );
}

export default function FooterPolicy() {
  return (
    <ul className="flex-box">
      <li>
        <a
          href="/popup/privacy.html"
          onClick={(e) => {
            e.preventDefault();
            openPopup("/popup/privacy.html", "privacy");
          }}
        >
          개인정보취급방침
        </a>
      </li>
      <li>
        <a
          href="/popup/terms.html"
          onClick={(e) => {
            e.preventDefault();
            openPopup("/popup/terms.html", "terms");
          }}
        >
          이용약관
        </a>
      </li>
    </ul>
  );
}
