import * as Phaser from "phaser";
import { ClassicBattleScene } from "./scenes/ClassicBattleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#000000",
  scene: [ClassicBattleScene],
};

new Phaser.Game(config);