import NoticeBoard from "@/components/NoticeBoard";
import ConfigNotice from "@/components/ConfigNotice";
import { isFirebaseConfigured } from "@/lib/firebase";

export const metadata = { title: "공지사항" };

export default function NoticePage() {
  return (
    <div className="sub_cont">
      <div className="in_Layer1">
        <div className="sub_tit">
          <h3>공지사항</h3>
        </div>

        {isFirebaseConfigured ? <NoticeBoard /> : <ConfigNotice />}
      </div>
    </div>
  );
}
