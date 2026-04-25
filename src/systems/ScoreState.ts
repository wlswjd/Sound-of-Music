import type { Judgment } from "../types/rhythm";

/**
 * ScoreState
 * ─────────────────────────────────────────
 * 점수, 콤보, 판정별 카운트를 관리.
 *
 * 판정 결과를 받아 누적 점수와 콤보를 갱신한다.
 * 화면 표시는 Scene이 담당하고, 이 클래스는 상태만 관리한다.
 */

/** 판정별 점수 가중치. 합 = Perfect 한 번의 점수. */
const SCORE_WEIGHTS: Record<Judgment, number> = {
  perfect: 1000,
  great: 700,
  good: 400,
  bad: 100,
  miss: 0,
};

export class ScoreState {
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private judgmentCounts: Record<Judgment, number> = {
    perfect: 0,
    great: 0,
    good: 0,
    bad: 0,
    miss: 0,
  };

  /**
   * 판정 결과를 받아 점수와 콤보를 갱신.
   *
   * @param judgment 판정 결과
   * @returns 이번 입력으로 추가된 점수
   */
  applyJudgment(judgment: Judgment): number {
    const baseScore = SCORE_WEIGHTS[judgment];

    // 콤보 보정: 콤보가 쌓일수록 점수 증가 (최대 1.5배)
    const comboMultiplier = 1 + Math.min(this.combo, 50) * 0.01;
    const earnedScore = Math.floor(baseScore * comboMultiplier);

    this.score += earnedScore;
    this.judgmentCounts[judgment]++;

    // Miss나 Bad는 콤보 끊김
    if (judgment === "miss" || judgment === "bad") {
      this.combo = 0;
    } else {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    }

    return earnedScore;
  }

  // ── 조회용 메서드들

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getJudgmentCount(judgment: Judgment): number {
    return this.judgmentCounts[judgment];
  }

  /** 전체 정확도 (정상 판정 비율). 결과 화면에서 사용. */
  getAccuracy(): number {
    const total = Object.values(this.judgmentCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const weighted =
      this.judgmentCounts.perfect * 1.0 +
      this.judgmentCounts.great * 0.7 +
      this.judgmentCounts.good * 0.4 +
      this.judgmentCounts.bad * 0.1;

    return weighted / total;
  }
}