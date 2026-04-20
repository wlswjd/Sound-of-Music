/**
 * RhythmClock
 * ─────────────────────────────────────────
 * 곡 재생 중 "지금 곡의 몇 ms 지점인가"를 알려주는 단일 진실 공급원.
 *
 * Web Audio API의 AudioContext.currentTime을 기준으로 시간을 계산한다.
 * Date.now(), performance.now(), Phaser의 scene.time은 사용하지 않는다.
 * 이유: 오디오 하드웨어 클럭에 동기화된 유일한 시간이 AudioContext이기 때문.
 */
export class RhythmClock {
    private audioContext: AudioContext;
    private audioBuffer: AudioBuffer | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
  
    /** 곡 재생이 시작된 시점의 AudioContext 시각 (초 단위). */
    private startedAt: number = 0;
  
    /** 재생 중인지 여부. */
    private running: boolean = false;
  
    /** 스테이지 설정에서 오는 오프셋 (ms). 곡 시작과 첫 비트 사이 간격 보정용. */
    private offsetMs: number = 0;
  
    constructor() {
      // 브라우저마다 AudioContext 생성자 이름이 다를 수 있어 둘 다 대응.
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new Ctx();
    }
  
    /**
     * 오디오 파일을 로드해 AudioBuffer로 디코딩.
     * 이 과정은 비동기이며, 파일 크기에 따라 수십~수백 ms 소요됨.
     */
    async load(url: string): Promise<void> {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }
  
    /**
     * 곡 재생 시작.
     * offsetMs: 스테이지 채보의 audioOffset 값 (곡 첫 비트 위치 보정).
     */
    start(offsetMs: number = 0): void {
      if (!this.audioBuffer) {
        throw new Error("RhythmClock: audio not loaded. Call load() first.");
      }
      if (this.running) {
        return; // 이미 재생 중이면 무시
      }
  
      // 브라우저 자동재생 정책 대응: 사용자 상호작용 후 resume 필요할 수 있음.
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
  
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.audioContext.destination);
  
      this.startedAt = this.audioContext.currentTime;
      this.offsetMs = offsetMs;
      this.sourceNode.onended = () => {
        this.running = false;
      };
      this.sourceNode.start(0);
      this.running = true;
    }
  
    /**
     * 곡 정지.
     */
    stop(): void {
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this.running = false;
    }
  
    /**
     * 현재 곡 시각을 ms 단위로 반환.
     * 이 값이 리듬 엔진 전체의 기준 시각이 된다.
     *
     * 반환값:
     *   - 재생 전: 0
     *   - 재생 중: (AudioContext 경과 시간 × 1000) - offsetMs
     */
    getCurrentMs(): number {
      if (!this.running) return 0;
      const elapsedSeconds = this.audioContext.currentTime - this.startedAt;
      return elapsedSeconds * 1000 - this.offsetMs;
    }
  
    /**
     * 재생 중 여부.
     */
    isRunning(): boolean {
      return this.running;
    }
  }