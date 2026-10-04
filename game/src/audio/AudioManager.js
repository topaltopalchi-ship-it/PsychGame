export class AudioManager {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.fallback = false;
    this.nodes = [];
  }

  unlock() {
    if (this.started) return;
    this.started = true;

    try {
      this.audio = new Audio("/PsychGame/audio/yol.mp3");
      this.audio.loop = true;
      this.audio.volume = 0.28;
      this.audio.preload = "auto";
      this.audio.play().catch(() => this.startFallback());
    } catch {
      this.startFallback();
    }
  }

  startFallback() {
    if (this.fallback || !window.AudioContext && !window.webkitAudioContext) return;
    this.fallback = true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.045;
    this.master.connect(this.ctx.destination);

    const drone = this.ctx.createOscillator();
    const low = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    drone.type = "sine";
    low.type = "triangle";
    drone.frequency.value = 73.42;
    low.frequency.value = 36.71;
    filter.type = "lowpass";
    filter.frequency.value = 620;
    drone.connect(filter);
    low.connect(filter);
    filter.connect(this.master);
    drone.start();
    low.start();
    this.nodes.push(drone, low, filter);
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.ctx) {
      this.nodes.forEach((node) => {
        try { node.stop?.(); } catch {}
      });
      this.nodes = [];
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.started = false;
    this.fallback = false;
  }
}
