import ReservationBoard from "@/components/ReservationBoard";
import ConfigNotice from "@/components/ConfigNotice";
import { isFirebaseConfigured } from "@/lib/firebase";

export const metadata = { title: "시설예약" };

export default function ReservePage() {
  return (
    <div className="sub_cont">
      <div className="in_Layer1">
        <div className="sub_tit">
          <h3>시설예약</h3>
        </div>

        {/* 이용안내 / 문의 */}
        <div className="resv_info flex-box">
          <div className="box">
            <div className="ico">
              <img src="/images/ico/info_ico.png" alt="시설 예약 이용안내" />
            </div>
            <b>시설 예약 이용안내</b>
            <p>회의실 사용 전 홈페이지를 통해 예약 후 이용해 주세요.</p>
            <p>하루 최대 9시간 예약 가능하며, 한 달 이후 일정까지 예약이 가능합니다.</p>
          </div>
          <div className="box">
            <div className="ico">
              <img src="/images/ico/inq_ico.png" alt="시설 사용 문의" />
            </div>
            <b>시설 사용 문의</b>
            <p>담당자 : 국립순천대학교 AX OPEN LAB 정효리</p>
            <p>전화번호 : 061-750-5391</p>
          </div>
        </div>

        {isFirebaseConfigured ? <ReservationBoard /> : <ConfigNotice />}
      </div>
    </div>
  );
}
