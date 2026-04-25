import type { StageChart } from "../../types/stage";
import type { Note } from "../../types/rhythm";

/**
 * 클래식 스테이지 테스트용 샘플 채보.
 *
 * 페이즈 1: 일반 패턴 (4분음표 간격)
 * 페이즈 2: 보스 HP 50% 도달 시 발동. 밀도 증가 + 속도 증가.
 *
 * 정식 채보는 작곡/기획 확정 후 별도 파일로 작성한다.
 */

const phase1Notes: Note[] = [
  // 첫 2초는 "준비 시간".
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
];

/**
 * 페이즈 2 채보. 페이즈 진입 시각으로부터 상대 시간으로 정의되며,
 * 실제 사용 시에는 진입 시각을 더해 절대 시각으로 변환한다.
 *
 * 페이즈 1보다 노트 간격이 짧음 (250ms 간격, 페이즈 1의 절반).
 */
const phase2Notes: Note[] = [
  { time: 0,    lane: 0, type: "normal" },
  { time: 250,  lane: 1, type: "normal" },
  { time: 500,  lane: 2, type: "normal" },
  { time: 750,  lane: 3, type: "normal" },
  { time: 1000, lane: 2, type: "normal" },
  { time: 1250, lane: 1, type: "normal" },
  { time: 1500, lane: 0, type: "normal" },
  { time: 1750, lane: 3, type: "normal" },

  { time: 2000, lane: 0, type: "normal" },
  { time: 2250, lane: 3, type: "normal" },
  { time: 2500, lane: 1, type: "normal" },
  { time: 2750, lane: 2, type: "normal" },
  { time: 3000, lane: 0, type: "normal" },
  { time: 3250, lane: 3, type: "normal" },
  { time: 3500, lane: 1, type: "normal" },
  { time: 3750, lane: 2, type: "normal" },
];

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
    bad: 150,
  },
  notes: phase1Notes,
};

/** 페이즈 2 진입 시 적용할 추가 채보 (상대 시각 기준). */
export const classicPhase2Notes = phase2Notes;