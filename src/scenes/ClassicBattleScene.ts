import * as Phaser from "phaser";
import { RhythmClock } from "../systems/RhythmClock";
import { NoteScheduler } from "../systems/NoteScheduler";
import { classicSample, classicPhase2Notes } from "../data/stages/classicSample";
import type { Note } from "../types/rhythm";
import { classicInputProfile } from "../systems/InputProfile";
import { JudgmentSystem } from "../systems/JudgmentSystem";
import type { Judgment, BattleResult } from "../types/rhythm";
import { ScoreState } from "../systems/ScoreState";
import { BattleState } from "../systems/BattleState";

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
  private judgment!: JudgmentSystem;
  private scoreState!: ScoreState;
  private battleState!: BattleState;
  /** 페이즈 2가 이미 발동되었는지. 중복 발동 방지. */
  private phase2Triggered: boolean = false;
  /** 현재 보스전 결과 상태. */
  private battleResult: BattleResult = "playing";

  // HP 게이지 UI
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBar!: Phaser.GameObjects.Rectangle;
  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private playerHpLabel!: Phaser.GameObjects.Text;
  private bossHpLabel!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  /** 이미 판정된 노트의 인덱스 집합. 같은 노트 중복 판정 방지. */
  private judgedNotes: Set<number> = new Set();
  /** 판정 결과를 표시할 텍스트 오브젝트 (재사용). */
  private judgmentText!: Phaser.GameObjects.Text;

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
    this.judgment = new JudgmentSystem(classicSample.judgmentWindow);
    this.scoreState = new ScoreState();
    this.battleState = new BattleState(100, 30);

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
      this.flashLane(lane);

      // 음악이 재생 중이 아니면 판정하지 않음
      if (!this.clock.isRunning()) return;

      const currentMs = this.clock.getCurrentMs();
      const result = this.tryJudgeLane(lane, currentMs);
      if (result) {
        console.log(`Judgment: ${result.judgment} (diff: ${result.diff.toFixed(1)}ms)`);
        this.showJudgment(result.judgment);
        this.scoreState.applyJudgment(result.judgment);
        const damage = this.battleState.applyJudgment(result.judgment);
        this.updateHpDisplay();
        // 보스 HP 50% 도달 시 페이즈 2 발동
        if (
          !this.phase2Triggered &&
          this.battleState.getBossHpRatio() <= 0.5
        ) {
          this.triggerPhase2(currentMs);
        }
        if (damage.playerDamage > 0) {
          this.flashPlayerDamage();
        }
        if (damage.bossDamage > 0) {
          this.flashBossDamage();
        }
        this.updateScoreDisplay();
      }
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
    // 이미 결과가 결정된 경우 모든 갱신 중단
    if (this.battleResult !== "playing") {
      this.noteSprites.forEach((s) => s.destroy());
      this.noteSprites = [];
      return;
    }

    // 종료 조건 검사
    if (this.battleState.isPlayerDead()) {
      this.endBattle("game_over");
      return;
    }
    if (this.battleState.isBossDead()) {
      this.endBattle("perfect_clear");
      return;
    }
    if (this.clock && this.clock.hasFinished()) {
      this.endBattle("clear");
      return;
    }
    
    // 이전 프레임의 노트 스프라이트 정리
    this.noteSprites.forEach((s) => s.destroy());
    this.noteSprites = [];

    // 결과 화면이 떴으면 입력 무시
    if (this.battleResult !== "playing") return;
    if (!this.clock || !this.clock.isRunning()) return;

    const currentMs = this.clock.getCurrentMs();
    this.timeText.setText(`${currentMs.toFixed(0)} ms`);

    // 자동 Miss 검사: 판정 윈도우를 벗어난 미판정 노트들을 Miss로 처리
    classicSample.notes.forEach((note, index) => {
      if (this.judgedNotes.has(index)) return;
      if (!this.judgment.hasExpired(note, currentMs)) return;

      this.judgedNotes.add(index);
      this.showJudgment("miss");
      this.scoreState.applyJudgment("miss");
      this.battleState.applyJudgment("miss");
      this.updateScoreDisplay();
      this.updateHpDisplay();
      this.flashPlayerDamage();
    });

    // 활성 노트 렌더링 (판정된 노트는 건너뜀)
    const activeNotes = this.scheduler.getActiveNotes(currentMs);
    activeNotes.forEach((note) => {
      const noteIndex = classicSample.notes.indexOf(note);
      if (this.judgedNotes.has(noteIndex)) return;

      this.renderNote(note, currentMs);
    });
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

    // 판정 결과를 띄울 텍스트 (평소엔 투명)
    this.judgmentText = this.add
      .text(this.scale.width / 2, this.JUDGMENT_LINE_Y - 80, "", {
        fontFamily: "sans-serif",
        fontSize: "48px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 점수 (우측 상단)
    this.scoreText = this.add.text(this.scale.width - 20, 20, "Score: 0", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
    }).setOrigin(1, 0);

    // 콤보 (점수 아래)
    this.comboText = this.add.text(this.scale.width - 20, 50, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#d4a24a",
    }).setOrigin(1, 0);

    // ── 보스 HP (상단)
    this.bossHpLabel = this.add
      .text(this.scale.width / 2, 60, "BOSS", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    this.bossHpBarBg = this.add.rectangle(
      this.scale.width / 2,
      80,
      400,
      14,
      0x333333
    );
    this.bossHpBar = this.add.rectangle(
      this.scale.width / 2 - 200,
      80,
      400,
      14,
      0xe24b4a
    ).setOrigin(0, 0.5);

    // ── 플레이어 HP (하단)
    this.playerHpLabel = this.add
      .text(this.scale.width / 2, this.scale.height - 50, "PLAYER", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    this.playerHpBarBg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height - 30,
      400,
      14,
      0x333333
    );
    this.playerHpBar = this.add.rectangle(
      this.scale.width / 2 - 200,
      this.scale.height - 30,
      400,
      14,
      0x4ade80
    ).setOrigin(0, 0.5);
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

  /**
   * 특정 레인에 입력이 들어왔을 때, 해당 레인의 가장 가까운 미판정 노트를 찾아 판정.
   *
   * @returns 판정이 일어난 경우 { judgment, diff }, 판정 가능한 노트가 없으면 null
   */
  private tryJudgeLane(
    lane: number,
    inputTimeMs: number
  ): { judgment: Judgment; diff: number } | null {
    let closestNote: Note | null = null;
    let closestIndex: number = -1;
    let closestDiff: number = Infinity;

    // 채보를 스캔하며 같은 레인 + 미판정 + 판정 범위 내의 가장 가까운 노트 찾기
    classicSample.notes.forEach((note, index) => {
      if (note.lane !== lane) return;
      if (this.judgedNotes.has(index)) return;
      if (!this.judgment.isInRange(note.time, inputTimeMs)) return;

      const diff = Math.abs(inputTimeMs - note.time);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestNote = note;
        closestIndex = index;
      }
    });

    if (!closestNote) return null;

    const judgment = this.judgment.judge(
      (closestNote as Note).time,
      inputTimeMs
    );
    this.judgedNotes.add(closestIndex);

    return { judgment, diff: inputTimeMs - (closestNote as Note).time };
  }

  /**
   * 판정 결과를 판정선 위에 잠깐 큰 텍스트로 띄운다.
   * 판정별로 색을 다르게 해서 시각적으로 즉시 구분되게 한다.
   */
  private showJudgment(judgment: Judgment): void {
    const colorMap: Record<Judgment, string> = {
      perfect: "#ffe14a", // 골드 (최고)
      great: "#4ade80",   // 그린
      good: "#60a5fa",    // 블루
      bad: "#f87171",     // 레드
      miss: "#9ca3af",    // 그레이
    };

    const labelMap: Record<Judgment, string> = {
      perfect: "PERFECT",
      great: "GREAT",
      good: "GOOD",
      bad: "BAD",
      miss: "MISS",
    };

    this.tweens.killTweensOf(this.judgmentText);

    this.judgmentText.setText(labelMap[judgment]);
    this.judgmentText.setColor(colorMap[judgment]);
    this.judgmentText.setAlpha(1);
    this.judgmentText.setScale(1.3);

    this.tweens.add({
      targets: this.judgmentText,
      scale: 1,
      duration: 150,
      ease: "Back.Out",
    });

    this.tweens.add({
      targets: this.judgmentText,
      alpha: 0,
      duration: 400,
      delay: 350,
      ease: "Cubic.Out",
    });
  }

  /**
   * 점수와 콤보 텍스트를 현재 ScoreState 기준으로 갱신.
   */
/** 직전 프레임의 콤보 값. 콤보가 늘었는지 끊겼는지 비교용. */
private previousCombo: number = 0;

private updateScoreDisplay(): void {
  this.scoreText.setText(`Score: ${this.scoreState.getScore()}`);

  const combo = this.scoreState.getCombo();

  if (combo >= 2) {
    this.comboText.setText(`${combo} COMBO`);

    // 콤보가 새로 늘어났을 때만 연출 (같은 콤보 유지 시는 무시)
    if (combo > this.previousCombo) {
      this.flashCombo(combo);
    }
  } else {
    this.comboText.setText("");
  }

  this.previousCombo = combo;
}

/**
   * 두 HP 게이지를 현재 BattleState 기준으로 갱신.
   * 게이지의 가로 길이를 HP 비율에 비례시킨다.
   */
private updateHpDisplay(): void {
  const fullWidth = 400;

  this.bossHpBar.width = fullWidth * this.battleState.getBossHpRatio();
  this.playerHpBar.width = fullWidth * this.battleState.getPlayerHpRatio();
}

/** 플레이어 피격 연출 — HP 바를 잠깐 흰색으로 번쩍이게. */
private flashPlayerDamage(): void {
  this.tweens.killTweensOf(this.playerHpBar);
  this.playerHpBar.setFillStyle(0xffffff);
  this.tweens.add({
    targets: {},
    duration: 120,
    onComplete: () => {
      this.playerHpBar.setFillStyle(0x4ade80);
    },
  });
}

/** 보스 피격 연출 — HP 바를 잠깐 흰색으로 번쩍이게. */
private flashBossDamage(): void {
  this.tweens.killTweensOf(this.bossHpBar);
  this.bossHpBar.setFillStyle(0xffffff);
  this.tweens.add({
    targets: {},
    duration: 120,
    onComplete: () => {
      this.bossHpBar.setFillStyle(0xe24b4a);
    },
  });
}

/**
   * 페이즈 2 발동.
   *   - 페이즈 2 채보를 현재 시각 기준으로 변환해 classicSample.notes에 추가
   *   - NoteScheduler의 leadTime을 줄여 노트 속도 증가
   *   - 화면에 페이즈 전환 연출
   */
private triggerPhase2(currentMs: number): void {
  if (this.phase2Triggered) return;
  this.phase2Triggered = true;

  // 페이즈 2 노트들을 현재 시각 + 1초(연출 시간) 뒤부터 시작하도록 변환
  const phase2StartMs = currentMs + 1000;
  classicPhase2Notes.forEach((note) => {
    classicSample.notes.push({
      time: note.time + phase2StartMs,
      lane: note.lane,
      type: note.type,
    });
  });

  // 노트 속도 증가 — leadTime 1500ms → 1000ms (반응 시간 단축)
  this.scheduler = new NoteScheduler(classicSample, 1000);

  // 화면 연출
  this.showPhaseTransition();
}

/**
 * 페이즈 전환 시각 연출.
 * 화면 중앙에 "PHASE 2" 텍스트를 강하게 띄우고 사라지게.
 */
private showPhaseTransition(): void {
  const text = this.add
    .text(this.scale.width / 2, this.scale.height / 2, "PHASE 2", {
      fontFamily: "sans-serif",
      fontSize: "72px",
      fontStyle: "bold",
      color: "#e24b4a",
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setScale(0.5);

  // 강하게 등장
  this.tweens.add({
    targets: text,
    alpha: 1,
    scale: 1.2,
    duration: 250,
    ease: "Back.Out",
  });

  // 잠시 유지 후 페이드 아웃
  this.tweens.add({
    targets: text,
    alpha: 0,
    duration: 500,
    delay: 800,
    ease: "Cubic.Out",
    onComplete: () => text.destroy(),
  });
}

/**
   * 보스전을 종료하고 결과 화면을 띄운다.
   * 한 번 호출되면 다시 호출되지 않도록 battleResult로 가드한다.
   */
private endBattle(result: BattleResult): void {
  if (this.battleResult !== "playing") return;
  this.battleResult = result;

  // 음악이 아직 재생 중이면 정지
  if (this.clock.isRunning()) {
    this.clock.stop();
  }

  this.showResultScreen(result);
}

/**
 * 결과 화면을 화면 전체에 띄운다.
 * 검은 페이드 + 결과 타이틀 + 통계.
 */
private showResultScreen(result: BattleResult): void {
  // 어두운 오버레이
  const overlay = this.add.rectangle(
    this.scale.width / 2,
    this.scale.height / 2,
    this.scale.width,
    this.scale.height,
    0x000000,
    0
  );
  this.tweens.add({
    targets: overlay,
    alpha: 0.85,
    duration: 600,
    ease: "Cubic.Out",
  });

  // 결과별 타이틀 텍스트와 색상
  const titleMap: Record<Exclude<BattleResult, "playing">, string> = {
    perfect_clear: "PERFECT CLEAR",
    clear: "CLEAR",
    game_over: "GAME OVER",
  };
  const colorMap: Record<Exclude<BattleResult, "playing">, string> = {
    perfect_clear: "#ffe14a",
    clear: "#4ade80",
    game_over: "#e24b4a",
  };

  const titleKey = result as Exclude<BattleResult, "playing">;

  const title = this.add
    .text(
      this.scale.width / 2,
      this.scale.height / 2 - 60,
      titleMap[titleKey],
      {
        fontFamily: "sans-serif",
        fontSize: "64px",
        fontStyle: "bold",
        color: colorMap[titleKey],
      }
    )
    .setOrigin(0.5)
    .setAlpha(0)
    .setScale(0.7);

  // 통계 텍스트
  const statsLines = [
    `Score: ${this.scoreState.getScore()}`,
    `Max Combo: ${this.scoreState.getMaxCombo()}`,
    `Perfect ${this.scoreState.getJudgmentCount("perfect")}  ` +
      `Great ${this.scoreState.getJudgmentCount("great")}  ` +
      `Good ${this.scoreState.getJudgmentCount("good")}`,
    `Bad ${this.scoreState.getJudgmentCount("bad")}  ` +
      `Miss ${this.scoreState.getJudgmentCount("miss")}`,
  ];

  const stats = this.add
    .text(
      this.scale.width / 2,
      this.scale.height / 2 + 40,
      statsLines.join("\n"),
      {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
      }
    )
    .setOrigin(0.5)
    .setAlpha(0);

  // 타이틀 등장
  this.tweens.add({
    targets: title,
    alpha: 1,
    scale: 1,
    duration: 500,
    delay: 500,
    ease: "Back.Out",
  });

  // 통계는 타이틀 직후 등장
  this.tweens.add({
    targets: stats,
    alpha: 1,
    duration: 400,
    delay: 1000,
    ease: "Cubic.Out",
  });
}

/**
 * 콤보 갱신 시 텍스트가 살짝 튀어오르는 연출.
 * 마일스톤(10, 25, 50, 100)에서는 더 강한 연출.
 */
private flashCombo(combo: number): void {
  this.tweens.killTweensOf(this.comboText);

  const isMilestone =
    combo === 10 || combo === 25 || combo === 50 || combo === 100;

  const peakScale = isMilestone ? 1.6 : 1.2;
  const peakColor = isMilestone ? "#ffe14a" : "#d4a24a";

  this.comboText.setScale(peakScale);
  this.comboText.setColor(peakColor);

  this.tweens.add({
    targets: this.comboText,
    scale: 1,
    duration: isMilestone ? 350 : 180,
    ease: "Back.Out",
    onComplete: () => {
      this.comboText.setColor("#d4a24a"); // 기본 골드로 복귀
    },
  });
}
}