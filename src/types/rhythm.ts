/**
 * 노트 하나의 정의.
 * time: 곡 시작 기준 밀리초 (ms). 이 시점에 판정선에 도달해야 함.
 * lane: 몇 번 레인에 속하는지 (0부터 시작).
 * type: 일반 탭 / 길게 누르기(hold) / 특수 노트.
 */
export type NoteType = "normal" | "hold" | "silence";

export interface Note {
  time: number;
  lane: number;
  type: NoteType;
  duration?: number; // hold 노트일 때만 사용 (ms)
}

/**
 * 판정 결과.
 */
export type Judgment = "perfect" | "great" | "good" | "bad" | "miss";

/**
 * 판정 윈도우 (ms 단위).
 * 실제 플레이어 입력 시각과 노트의 time 차이를 이 값들과 비교해 Judgment 결정.
 */
export interface JudgmentWindow {
  perfect: number; // 예: 30 → ±30ms
  great: number;   // 예: 60
  good: number;    // 예: 100
  bad: number;     // 예: 150
  // bad를 넘어가면 miss
}

/**
 * 보스전 종료 상태.
 * - playing: 진행 중
 * - perfect_clear: 보스 HP 0 도달 (보스 처치)
 * - clear: 곡 끝 + 양쪽 다 살아있음 (살아남음)
 * - game_over: 플레이어 HP 0 도달 (실패)
 */
export type BattleResult = "playing" | "perfect_clear" | "clear" | "game_over";