export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.nodes = [];
    this.musicNodes = [];
    this.musicTimer = null;
    this.voiceAudio = null;
    this.voiceGeneration = 0;
    this.voiceBase = "./audio/companion/";
    this.currentRoom = 1;
  }

  playCompanionVoice(fileName, volume = 0.95, callbacks = {}) {
    if (!fileName || typeof Audio === "undefined") {
      callbacks.onError?.();
      return null;
    }
    const generation = ++this.voiceGeneration;
    try {
      if (this.voiceAudio) {
        try { this.voiceAudio.pause(); this.voiceAudio.currentTime = 0; } catch {}
      }
      const audio = new Audio(this.voiceBase + encodeURIComponent(fileName));
      audio.preload = "auto";
      audio.volume = Math.max(0, Math.min(1, volume));
      let settled = false;
      const cleanup = () => {
        if (generation === this.voiceGeneration) this.voiceAudio = null;
      };
      const fail = (reason = "audio_error") => {
        if (settled) return;
        settled = true;
        cleanup();
        callbacks.onError?.(reason);
      };
      audio.onended = () => {
        if (settled) return;
        settled = true;
        cleanup();
        callbacks.onEnded?.();
      };
      audio.onerror = () => fail("audio_load_error");
      this.voiceAudio = audio;
      const playResult = audio.play();
      if (playResult?.then) {
        playResult.then(() => {
          if (generation === this.voiceGeneration) callbacks.onStarted?.();
        }).catch(() => fail("audio_play_rejected"));
      } else callbacks.onStarted?.();
      return audio;
    } catch {
      callbacks.onError?.("audio_exception");
      return null;
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
    this.master.gain.value = 0.11;
    this.master.connect(this.ctx.destination);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 850;
    filter.Q.value = 0.45;
    filter.connect(this.master);

    const drone = this.ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.30;
    drone.connect(droneGain);
    droneGain.connect(filter);

    const fifth = this.ctx.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = 82.41;
    const fifthGain = this.ctx.createGain();
    fifthGain.gain.value = 0.035;
    fifth.connect(fifthGain);
    fifthGain.connect(filter);

    drone.start();
    fifth.start();
    this.nodes.push(drone, fifth, filter, droneGain, fifthGain);

    this.startMusic();
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicTimer = window.setInterval(() => this.playMusicNote(), 2600);
    this.playMusicNote();
  }

  playMusicNote() {
    if (!this.ctx || !this.started || !this.master) return;

    const now = this.ctx.currentTime;
    const profiles = {
      1:[55,65.41,73.42,82.41],
      2:[55,61.74,73.42,87.31],
      3:[49,58.27,65.41,77.78],
      4:[43.65,51.91,65.41,77.78],
      5:[51.91,58.27,69.30,77.78],
      6:[46.25,55,69.30,82.41],
      7:[55,65.41,77.78,92.50],
      8:[41.20,49,61.74,73.42],
      15:[49,58.27,65.41,77.78],
      16:[46.25,55,65.41,73.42],
      17:[51.91,61.74,73.42,82.41],
      18:[43.65,55,65.41,77.78],
      19:[49,58.27,69.30,87.31],
      20:[36.71,43.65,55,65.41]
    };
    const notes = profiles[this.currentRoom] || profiles[1];
    const note = notes[Math.floor(Math.random() * notes.length)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = this.currentRoom >= 15 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(note, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(this.currentRoom === 4 ? 420 : 680, now);

    const volume = this.currentRoom >= 15 ? 0.018 : 0.022;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 2.45);
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
    this.currentRoom = Number(roomNumber) || 1;
    if (!this.started || !this.master) return;
    const levels={1:.10,2:.115,3:.09,4:.12,5:.105,6:.13,7:.115,8:.085,15:.10,16:.10,17:.105,18:.09,19:.10,20:.08};
    const level = levels[this.currentRoom] ?? .10;
    const now = this.ctx?.currentTime ?? 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(level, now, .35);
  }

  stop() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx) {
      this.nodes.forEach((node)=>{try{node.stop?.();}catch{} try{node.disconnect?.();}catch{}});
      this.musicNodes.forEach((node)=>{try{node.stop?.();}catch{} try{node.disconnect?.();}catch{}});
      this.nodes=[];
      this.musicNodes=[];
      this.ctx.close().catch(()=>{});
      this.ctx=null;
    }
    this.master=null;
    this.started=false;
  }
}