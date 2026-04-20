// BootScene이라는 Phaser Scene을 하나 정의. 나중에 TitleScene, ClassicBattleScene 등을 추가할 때도 같은 패턴.
// create()에서 화면 정중앙에 "Sound of Music" 텍스트 하나 찍음.
// 게임 캔버스 크기는 960×540으로 고정 (16:9 비율).
// parent: "game"은 index.html의 <div id="game">에 캔버스를 꽂으라는 뜻.

// import Phaser from "phaser";
import * as Phaser from "phaser";

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "Sound of Music",
      {
        fontFamily: "sans-serif",
        fontSize: "48px",
        color: "#ffffff",
      }
    ).setOrigin(0.5);
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