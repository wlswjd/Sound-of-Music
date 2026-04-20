import * as Phaser from "phaser";
import { RhythmClock } from "./systems/RhythmClock";

class BootScene extends Phaser.Scene {
  private clock!: RhythmClock;
  private timeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BootScene" });
  }

  async create() {
    // 안내 텍스트
    this.add
      .text(
        this.scale.width / 2,
        80,
        "RhythmClock Test",
        { fontFamily: "sans-serif", fontSize: "32px", color: "#ffffff" }
      )
      .setOrigin(0.5);

    this.statusText = this.add
      .text(
        this.scale.width / 2,
        140,
        "Loading audio...",
        { fontFamily: "sans-serif", fontSize: "18px", color: "#888888" }
      )
      .setOrigin(0.5);

    // 현재 시각(ms)을 표시할 텍스트
    this.timeText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        "0 ms",
        { fontFamily: "monospace", fontSize: "64px", color: "#00ff88" }
      )
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 80,
        "Click anywhere to start",
        { fontFamily: "sans-serif", fontSize: "18px", color: "#ffff00" }
      )
      .setOrigin(0.5);

    // RhythmClock 초기화 + 오디오 로드
    this.clock = new RhythmClock();
    try {
      await this.clock.load("/test.mp3");
      this.statusText.setText("Ready. Click to play.");
    } catch (err) {
      this.statusText.setText("Failed to load audio");
      console.error(err);
      return;
    }

    // 화면 클릭 시 재생 시작
    this.input.once("pointerdown", () => {
      this.clock.start(0);
      this.statusText.setText("Playing...");
    });
  }

  update() {
    // 매 프레임마다 현재 시각을 화면에 표시
    if (this.clock && this.clock.isRunning()) {
      const ms = this.clock.getCurrentMs();
      this.timeText.setText(`${ms.toFixed(1)} ms`);
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#000000",
  scene: [BootScene],
};

new Phaser.Game(config);