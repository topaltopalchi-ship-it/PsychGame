export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.nodes = [];
    this.voiceAudio = null;
    this.voiceGeneration = 0;
    this.voiceBase = "./audio/companion/";
  }

  playCompanionVoice(fileName, volume = 0.95) {
    if (!fileName || typeof Audio === "undefined") return false;
    const generation = ++this.voiceGeneration;
    try {
      if (this.voiceAudio) {
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
      }
      const audio = new Audio(this.voiceBase + fileName);
      audio.preload = "auto";
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.onended = () => {
        if (generation === this.voiceGeneration) this.voiceAudio = null;
      };
      audio.onerror = () => {
        if (generation === this.voiceGeneration) this.voiceAudio = null;
      };
      this.voiceAudio = audio;
      const result = audio.play();
      if (result?.catch) result.catch(() => {
        if (generation === this.voiceGeneration) {
          this.voiceAudio = null;
          // The caller can fall back to browser TTS when playback is blocked.
        }
      });
      return audio;
    } catch {
      return false;
    }
  }

  stopCompanionVoice() {
    this.voiceGeneration++;
    if (!this.voiceAudio) return;
    try {
      this.voiceAudio.pause();
      this.voiceAudio.currentTime = 0;
    } catch {}
    this.voiceAudio = null;
  }

  unlock() {
    if (this.started) return;
    this.started = true;
    this.startEffectsContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    this.startAmbient();
  }

  startEffectsContext() {
    if (this.ctx || (!window.AudioContext && !window.webkitAudioContext)) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new Ctx(); } catch { this.ctx = null; }
  }

  startAmbient() {
    if (!this.ctx || this.nodes.length) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.10;
    this.master.connect(this.ctx.destination);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.connect(this.master);

    const drone = this.ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.42;
    drone.connect(droneGain);
    droneGain.connect(filter);

    const air = this.ctx.createOscillator();
    air.type = "triangle";
    air.frequency.value = 92;
    const airGain = this.ctx.createGain();
    airGain.gain.value = 0.08;
    air.connect(airGain);
    airGain.connect(filter);

    drone.start();
    air.start();
    this.nodes.push(drone, air, filter, droneGain, airGain);
  }

  playPulse(type="dark") {
    if (!this.started) return;
    this.startEffectsContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const presets={dark:[48,0.08,0.16],warning:[110,0.05,0.11],whisper:[420,0.025,0.07],impact:[72,0.035,0.18]};
    const [freq,dur,vol]=presets[type]||presets.dark;
    osc.type=type==="whisper"?"sine":"triangle";
    osc.frequency.setValueAtTime(freq,now);
    if(type==="impact")osc.frequency.exponentialRampToValueAtTime(35,now+dur);
    filter.type="lowpass";
    filter.frequency.value=type==="whisper"?900:520;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(vol,now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);
    osc.start(now);osc.stop(now+dur+.02);
  }

  setRoom(roomNumber) {
    if (!this.started || !this.master) return;
    const levels={1:.10,2:.12,3:.09,4:.13,5:.11,6:.14,7:.12,8:.08};
    this.master.gain.value=levels[roomNumber]??.10;
  }

  stop() {
    if (this.ctx) {
      this.nodes.forEach((node)=>{try{node.stop?.();}catch{} try{node.disconnect?.();}catch{}});
      this.nodes=[];
      this.ctx.close().catch(()=>{});
      this.ctx=null;
    }
    this.master=null;
    this.started=false;
  }
}