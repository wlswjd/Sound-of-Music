import type { Note, JudgmentWindow } from "./rhythm";

/**
 * 스테이지 하나의 전체 채보 + 설정.
 * 이 객체 하나가 "한 스테이지의 모든 것"을 담는다.
 */
export interface StageChart {
  id: string;
  title: string;
  bpm: number;
  audioOffset: number;       // 곡 시작과 첫 비트 사이 간격 (ms)
  totalLanes: number;        // 이 스테이지가 몇 레인을 쓰는지
  judgmentWindow: JudgmentWindow;
  notes: Note[];
}