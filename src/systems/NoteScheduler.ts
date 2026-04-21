import type { Note } from "../types/rhythm";
import type { StageChart } from "../types/stage";

/**
 * NoteScheduler
 * ─────────────────────────────────────────
 * 현재 곡 시각을 기준으로, 지금 화면에 보여야 하는 노트들을 필터링해 반환한다.
 *
 * 역할:
 *   - 채보 전체를 스캔하는 게 아니라, "현재 시각 기준 노트 스폰 윈도우"에 속한 노트만 반환.
 *   - 이미 판정이 끝났거나(놓쳤거나 처리됐거나) 아직 화면에 뜰 시간이 아닌 노트는 제외.
 *
 * 이 클래스는 렌더링을 하지 않는다. 노트의 시각만 계산한다.
 * 스테이지별로 다른 Renderer가 이 결과를 받아 자기 방식대로 그린다.
 */
export class NoteScheduler {
  private chart: StageChart;

  /** 노트가 판정선에 닿기 몇 ms 전에 화면에 스폰할지. */
  private leadTimeMs: number;

  /** 판정선을 지난 뒤 몇 ms까지 노트를 유지할지 (Miss 판정 윈도우). */
  private tailTimeMs: number;

  /**
   * @param chart 이 스테이지의 채보
   * @param leadTimeMs 노트가 판정선 도달 전 얼마나 일찍 화면에 나타나야 하는가 (기본 1500ms)
   */
  constructor(chart: StageChart, leadTimeMs: number = 1500) {
    this.chart = chart;
    this.leadTimeMs = leadTimeMs;
    // Miss 판정을 고려해 판정 시각 이후 약간 더 유지 (good 윈도우만큼).
    this.tailTimeMs = chart.judgmentWindow.good;
  }

  /**
   * 현재 시각 기준으로 "지금 화면에 떠 있어야 하는 노트"들을 반환.
   *
   * 반환 조건:
   *   note.time - leadTimeMs ≤ currentMs ≤ note.time + tailTimeMs
   *
   * @param currentMs RhythmClock.getCurrentMs() 값
   */
  getActiveNotes(currentMs: number): Note[] {
    return this.chart.notes.filter((note) => {
      const spawnAt = note.time - this.leadTimeMs;
      const despawnAt = note.time + this.tailTimeMs;
      return currentMs >= spawnAt && currentMs <= despawnAt;
    });
  }

  /**
   * 특정 노트의 "진행도"를 0.0 ~ 1.0으로 반환.
   *
   * 0.0 = 막 화면에 스폰됨 (판정선에서 가장 멀리 있음)
   * 1.0 = 판정선에 도달함
   * 1.0 초과 = 판정선을 지남 (Miss 판정 윈도우 안에 있음)
   *
   * Renderer가 노트의 화면상 위치를 계산할 때 사용.
   */
  getNoteProgress(note: Note, currentMs: number): number {
    const spawnAt = note.time - this.leadTimeMs;
    const progress = (currentMs - spawnAt) / this.leadTimeMs;
    return progress;
  }

  /**
   * 채보의 총 길이 (마지막 노트 시각 + 여유).
   * 곡 종료 시점 판정에 활용 가능.
   */
  getChartDurationMs(): number {
    if (this.chart.notes.length === 0) return 0;
    const lastNote = this.chart.notes[this.chart.notes.length - 1];
    return lastNote.time + this.tailTimeMs;
  }
}