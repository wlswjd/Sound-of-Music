import * as Phaser from "phaser";
import { RhythmClock } from "../systems/RhythmClock";
import { NoteScheduler } from "../systems/NoteScheduler";
import { classicSample } from "../data/stages/classicSample";
import type { Note } from "../types/rhythm";
import { classicInputProfile } from "../systems/InputProfile";

/**
 * ClassicBattleScene
 * ─────────────────────────────────────────
 * 클래식 문파 스테이지. 피아노 타일 스타일의 세로 낙하형 리듬 UI.
 *
 * 현재 구현 범위:
 *   - 4레인 배치
 *   - 판정선 표시
 *   - 채보 데이터 기반 노트 낙하 애니메이션
 *
 * 아직 없는 것:
 *   - 입력 처리
 *   - 판정
 *   - 점수/HP
 *   - 대화/선택지
 */
export class ClassicBattleScene extends Phaser.Scene {
  // ── 게임 시스템
  private clock!: RhythmClock;
  private scheduler!: NoteScheduler;

  // ── UI 텍스트
  private statusText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  // ── 레이아웃 상수
  private readonly LANE_COUNT = 4;
  private readonly LANE_WIDTH = 100;
  private readonly PLAYFIELD_TOP = 80;
  private readonly JUDGMENT_LINE_Y = 460;
  private readonly NOTE_HEIGHT = 24;

  /** 현재 프레임에 그려진 노트 스프라이트들. 매 프레임 재생성된다. */
  private noteSprites: Phaser.GameObjects.Rectangle[] = [];
  /** 레인별 판정선 하이라이트 사각형. 키 입력 시 잠시 빛난다. */
  private laneHighlights: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: "ClassicBattleScene" });
  }

  async create() {
    this.drawPlayfield();
    this.drawStatusTexts();

    // 시스템 초기화
    this.clock = new RhythmClock();
    this.scheduler = new NoteScheduler(classicSample, 1500);

    try {
      await this.clock.load("/test.mp3");
      this.statusText.setText("Ready. Click to start.");
    } catch (err) {
      this.statusText.setText("Audio load failed");
      console.error(err);
      return;
    }

    // 키 입력 등록 (캔버스 포커스 문제를 피하기 위해 window에 직접 리스너 부착)
    const handleKeyDown = (event: KeyboardEvent) => {
        const lane = classicInputProfile.keyToLane[event.key.toLowerCase()];
        if (lane === undefined) return;
        console.log(`Key pressed: ${event.key}, Lane: ${lane}`); // ← 이 줄 추가
        this.flashLane(lane);
      };
    window.addEventListener("keydown", handleKeyDown);

    // Scene 종료 시 리스너 해제 (메모리 누수 방지)
    this.events.once("shutdown", () => {
    window.removeEventListener("keydown", handleKeyDown);
    });
    // 마우스 클릭 등록
    this.input.once("pointerdown", () => {
      this.clock.start(classicSample.audioOffset);
      this.statusText.setText("Playing...");
    });
  }

  update() {
    // 이전 프레임의 노트 스프라이트 정리
    this.noteSprites.forEach((s) => s.destroy());
    this.noteSprites = [];

    if (!this.clock || !this.clock.isRunning()) return;

    const currentMs = this.clock.getCurrentMs();
    this.timeText.setText(`${currentMs.toFixed(0)} ms`);

    const activeNotes = this.scheduler.getActiveNotes(currentMs);
    activeNotes.forEach((note) => this.renderNote(note, currentMs));
  }

  /** 레인 구분선과 판정선 그리기. 정적인 요소라 한 번만 그린다. */
  private drawPlayfield(): void {
    const totalWidth = this.LANE_COUNT * this.LANE_WIDTH;
    const startX = (this.scale.width - totalWidth) / 2;

    // 레인 배경 (4개 열)
    for (let i = 0; i < this.LANE_COUNT; i++) {
      const x = startX + i * this.LANE_WIDTH;
      const color = i % 2 === 0 ? 0x1a1a1a : 0x252525;
      this.add.rectangle(
        x + this.LANE_WIDTH / 2,
        (this.PLAYFIELD_TOP + this.JUDGMENT_LINE_Y) / 2,
        this.LANE_WIDTH - 2,
        this.JUDGMENT_LINE_Y - this.PLAYFIELD_TOP,
        color
      );
    }

    // 판정선 (수평 골드 라인)
    this.add.rectangle(
      this.scale.width / 2,
      this.JUDGMENT_LINE_Y,
      totalWidth,
      4,
      0xd4a24a
    );

    // 레인별 판정선 하이라이트 (평소엔 투명, 키 입력 시 잠깐 밝아짐)
    for (let i = 0; i < this.LANE_COUNT; i++) {
        const x = startX + i * this.LANE_WIDTH + this.LANE_WIDTH / 2;
        const highlight = this.add.rectangle(
          x,
          this.JUDGMENT_LINE_Y,
          this.LANE_WIDTH - 10,
          40,
          0xffffff,
          0 // alpha 0 = 완전 투명
        );
        this.laneHighlights.push(highlight);
      }

    // 각 레인 하단에 키 배지 (D/F/J/K) 상시 표시
    const keyLabels = ["D", "F", "J", "K"];
    for (let i = 0; i < this.LANE_COUNT; i++) {
      const x = startX + i * this.LANE_WIDTH + this.LANE_WIDTH / 2;
      this.add
        .text(x, this.JUDGMENT_LINE_Y + 30, keyLabels[i], {
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#d4a24a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }
  }

  /** 상태 텍스트와 시각 표시 텍스트를 화면에 배치. */
  private drawStatusTexts(): void {
    this.statusText = this.add
      .text(this.scale.width / 2, 30, "Loading audio...", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    this.timeText = this.add.text(20, 20, "0 ms", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#00ff88",
    });
  }

  /**
   * 노트 하나를 그린다.
   * 레인 인덱스 → x 좌표, scheduler.getNoteProgress() → y 좌표.
   */
  private renderNote(note: Note, currentMs: number): void {
    const totalWidth = this.LANE_COUNT * this.LANE_WIDTH;
    const startX = (this.scale.width - totalWidth) / 2;
    const x = startX + note.lane * this.LANE_WIDTH + this.LANE_WIDTH / 2;

    const progress = this.scheduler.getNoteProgress(note, currentMs);
    const y =
      this.PLAYFIELD_TOP +
      (this.JUDGMENT_LINE_Y - this.PLAYFIELD_TOP) * progress;

    const sprite = this.add.rectangle(
      x,
      y,
      this.LANE_WIDTH - 10,
      this.NOTE_HEIGHT,
      0xffffff
    );
    this.noteSprites.push(sprite);
  }

  /**
   * 특정 레인의 판정선을 잠깐 밝게 빛나게 한다.
   * 플레이어 입력 시각 피드백용.
   */
  private flashLane(lane: number): void {
    const highlight = this.laneHighlights[lane];
    if (!highlight) return;

    this.tweens.killTweensOf(highlight);

    // 진단용: 극단적으로 눈에 띄게
    highlight.setAlpha(1);
    highlight.setFillStyle(0xffff00); // 밝은 노랑
    highlight.setScale(1.3, 2);
    this.tweens.add({
      targets: highlight,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 500, // 0.5초로 길게
      ease: "Cubic.Out",
    });
  }
}