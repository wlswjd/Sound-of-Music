import type { StageChart } from "../../types/stage";

/**
 * 클래식 스테이지 테스트용 샘플 채보.
 *
 * 목적: 리듬 엔진 동작 검증용. 정식 채보는 아니다.
 * 120 BPM 기준, 4분음표 간격(500ms)으로 단순한 패턴을 배치했다.
 *
 * 실제 게임 채보는 작곡/기획 확정 후 별도 파일로 작성한다.
 */
export const classicSample: StageChart = {
  id: "classic-sample",
  title: "Classical Test (Canon in D)",
  bpm: 120,
  audioOffset: 0,
  totalLanes: 4,
  judgmentWindow: {
    perfect: 30,
    great: 60,
    good: 100,
  },
  notes: [
    // 첫 2초는 "준비 시간". 플레이어가 화면을 인지할 시간.
    { time: 2000, lane: 0, type: "normal" },
    { time: 2500, lane: 1, type: "normal" },
    { time: 3000, lane: 2, type: "normal" },
    { time: 3500, lane: 3, type: "normal" },

    { time: 4000, lane: 0, type: "normal" },
    { time: 4500, lane: 2, type: "normal" },
    { time: 5000, lane: 1, type: "normal" },
    { time: 5500, lane: 3, type: "normal" },

    { time: 6000, lane: 3, type: "normal" },
    { time: 6500, lane: 2, type: "normal" },
    { time: 7000, lane: 1, type: "normal" },
    { time: 7500, lane: 0, type: "normal" },

    { time: 8000, lane: 0, type: "normal" },
    { time: 8500, lane: 3, type: "normal" },
    { time: 9000, lane: 1, type: "normal" },
    { time: 9500, lane: 2, type: "normal" },
  ],
};