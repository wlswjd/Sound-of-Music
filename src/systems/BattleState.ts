import type { Judgment } from "../types/rhythm";

/**
 * BattleState
 * ─────────────────────────────────────────
 * 보스전의 HP 상태 관리.
 * 플레이어 HP와 보스 HP를 함께 다룬다.
 *
 * 판정 결과를 받아 양쪽 HP를 갱신한다.
 *   - Perfect/Great: 보스 HP 감소 (공격이 들어감)
 *   - Bad/Miss: 플레이어 HP 감소 (보스 공격에 맞음)
 */

/** 판정별 HP 변동 규칙. 음수 = 감소. */
const PLAYER_DAMAGE: Record<Judgment, number> = {
  perfect: 0,
  great: 0,
  good: 0,
  bad: 3,
  miss: 8,
};

const BOSS_DAMAGE: Record<Judgment, number> = {
  perfect: 2,
  great: 1,
  good: 0,
  bad: 0,
  miss: 0,
};

export class BattleState {
  private playerHp: number;
  private playerMaxHp: number;
  private bossHp: number;
  private bossMaxHp: number;

  constructor(playerMaxHp: number = 100, bossMaxHp: number = 100) {
    this.playerMaxHp = playerMaxHp;
    this.playerHp = playerMaxHp;
    this.bossMaxHp = bossMaxHp;
    this.bossHp = bossMaxHp;
  }

  /**
   * 판정 결과를 받아 HP 변동 처리.
   * @returns { playerDamage, bossDamage } 이번 판정으로 발생한 데미지
   */
  applyJudgment(judgment: Judgment): {
    playerDamage: number;
    bossDamage: number;
  } {
    const playerDamage = PLAYER_DAMAGE[judgment];
    const bossDamage = BOSS_DAMAGE[judgment];

    this.playerHp = Math.max(0, this.playerHp - playerDamage);
    this.bossHp = Math.max(0, this.bossHp - bossDamage);

    return { playerDamage, bossDamage };
  }

  // ── 조회용 메서드들

  getPlayerHp(): number {
    return this.playerHp;
  }

  getBossHp(): number {
    return this.bossHp;
  }

  getPlayerHpRatio(): number {
    return this.playerHp / this.playerMaxHp;
  }

  getBossHpRatio(): number {
    return this.bossHp / this.bossMaxHp;
  }

  isPlayerDead(): boolean {
    return this.playerHp <= 0;
  }

  isBossDead(): boolean {
    return this.bossHp <= 0;
  }
}