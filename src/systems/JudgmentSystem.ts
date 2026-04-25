import type { Judgment, JudgmentWindow, Note } from "../types/rhythm";

/**
 * JudgmentSystem
 * ─────────────────────────────────────────
 * 플레이어의 입력 시각과 노트의 목표 시각을 비교해 5단계 판정을 결정.
 *
 * Perfect / Great / Good / Bad / Miss
 *
 * 이 클래스는 "어느 노트가 어느 키에 매핑되는가"를 모른다.
 * 호출자가 "이 노트와 이 입력 시각"을 짝지어 넘겨주면 판정만 반환한다.
 * Scene이 가장 가까운 노트를 찾아 이쪽으로 넘기는 구조.
 */
export class JudgmentSystem {
  private window: JudgmentWindow;

  constructor(window: JudgmentWindow) {
    this.window = window;
  }

  /**
   * 입력 시각과 노트 시각의 차이로 판정을 계산.
   *
   * @param noteTimeMs 노트의 목표 시각 (판정선 도달 시각)
   * @param inputTimeMs 플레이어가 키를 누른 시각
   * @returns 5단계 판정 결과
   */
  judge(noteTimeMs: number, inputTimeMs: number): Judgment {
    const diff = Math.abs(inputTimeMs - noteTimeMs);

    if (diff <= this.window.perfect) return "perfect";
    if (diff <= this.window.great) return "great";
    if (diff <= this.window.good) return "good";
    if (diff <= this.window.bad) return "bad";
    return "miss";
  }

  /**
   * 노트가 "판정 가능한 시간 범위" 안에 있는지 검사.
   * Bad 윈도우(±150ms)를 벗어나면 입력해도 어차피 miss이므로 무시한다.
   */
  isInRange(noteTimeMs: number, inputTimeMs: number): boolean {
    const diff = Math.abs(inputTimeMs - noteTimeMs);
    return diff <= this.window.bad;
  }

  /**
   * 노트가 판정선을 완전히 지나가서 자동 Miss 처리해야 하는지 검사.
   * (currentMs > note.time + bad)이면 더 이상 입력으로 살릴 수 없다.
   */
  hasExpired(note: Note, currentMs: number): boolean {
    return currentMs > note.time + this.window.bad;
  }
}