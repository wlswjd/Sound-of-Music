/**
 * InputProfile
 * ─────────────────────────────────────────
 * 스테이지별 키 ↔ 레인 매핑 설정.
 *
 * 클래식 스테이지는 4레인이므로 D/F/J/K 4개 키를 쓴다.
 * 록 스테이지는 2레인이 될 것이므로 F/J만 쓸 예정.
 *
 * 이 매핑을 스테이지 설정에서 주입 가능하게 분리했기 때문에,
 * Judgment/Score 등 코어 시스템은 "어떤 키가 몇 번 레인인지" 몰라도 된다.
 * 코어는 레인 번호만 다룬다.
 */
export interface InputProfile {
    /** key = 키보드 키 (소문자), value = 레인 인덱스 */
    keyToLane: Record<string, number>;
  }
  
  /** 클래식 스테이지용 4레인 매핑. */
  export const classicInputProfile: InputProfile = {
    keyToLane: {
      d: 0,
      f: 1,
      j: 2,
      k: 3,
    },
  };