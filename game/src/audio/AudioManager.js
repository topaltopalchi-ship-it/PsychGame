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
      this.startEffectsContext();
    } catch {
      this.startFallback();
    }
  }

  startEffectsContext() {
    if (this.ctx || (!window.AudioContext && !window.webkitAudioContext)) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new Ctx(); } catch { return; }
  }

  playPulse(type="dark") {
    if (!this.started) return;
    this.startEffectsContext();
    if (!this.ctx) return;
    if(this.ctx.state==="suspended") this.ctx.resume().catch(()=>{});
    const now=this.ctx.currentTime;
    const osc=this.ctx.createOscillator();
    const gain=this.ctx.createGain();
    const filter=this.ctx.createBiquadFilter();
    const presets={dark:[48,0.08,0.16],warning:[110,0.05,0.11],whisper:[420,0.025,0.07],impact:[72,0.035,0.18]};
    const [freq,dur,vol]=presets[type]||presets.dark;
    osc.type=type==="whisper"?"sine":"triangle";osc.frequency.setValueAtTime(freq,now);
    if(type==="impact")osc.frequency.exponentialRampToValueAtTime(35,now+dur);
    filter.type="lowpass";filter.frequency.value=type==="whisper"?900:520;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(now);osc.stop(now+dur+.02);
  }

  setRoom(roomNumber) {
    if (!this.started) return;
    const levels={1:.24,2:.30,3:.22,4:.28,5:.20,6:.34,7:.26,8:.16};
    if(this.audio)this.audio.volume=levels[roomNumber]??.24;
  }

  startFallback() {
    if (this.fallback || !window.AudioContext && !window.webkitAudioContext) return;
    this.fallback = true;
    this.startEffectsContext();
    if(!this.ctx)return;
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
