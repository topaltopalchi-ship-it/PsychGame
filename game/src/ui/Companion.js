export class Companion {
  constructor(tracker) {
    this.tracker = tracker;
    this.lastEventCount = 0;
    this.memory = {
      sawButton: false,
      pressedButton: false,
      failed: false,
      retriedButton: false,
      searchedDrawer: false,
      checkedDoorAfterFailure: false,
      exploredBeforeFailure: false
    };
    this.voiceEnabled = true;
    this.voiceUnlocked = false;
    this.pendingVoice = null;
    this.voiceReady = false;
    this.voiceTested = false;
    this.createUI();
    this.installVoiceUnlock();
    this.say("خب... فکر کنم باید راه خروج رو پیدا کنیم.", 1000);
    this.timer = setInterval(() => this.observe(), 350);
  }

  createUI() {
    this.panel = document.createElement("div");
    this.panel.id = "pg-companion";
    this.panel.innerHTML = '<div id="pg-companion-name">همراه</div><div id="pg-companion-text"></div>';
    Object.assign(this.panel.style, {
      position:"fixed", left:"20px", bottom:"62px",
      width:"min(380px,calc(100vw - 40px))", padding:"14px 16px",
      borderRadius:"14px", background:"rgba(10,12,17,.82)",
      border:"1px solid rgba(255,255,255,.13)", backdropFilter:"blur(12px)",
      boxShadow:"0 12px 35px rgba(0,0,0,.35)", direction:"rtl",
      fontFamily:"Tahoma,Arial,sans-serif", color:"#eee", zIndex:"6000",
      opacity:"0", transform:"translateY(10px)",
      transition:"opacity .25s,transform .25s", pointerEvents:"none"
    });
    document.body.appendChild(this.panel);
    this.text = this.panel.querySelector("#pg-companion-text");
    const style = document.createElement("style");
    style.textContent = "#pg-companion-name{font-size:11px;color:#c58d7c;margin-bottom:5px}#pg-companion-text{font-size:14px;line-height:1.8}";
    document.head.appendChild(style);
  }

  say(message, delay = 0) {
    setTimeout(() => {
      this.text.textContent = message;
      this.pendingVoice = message;
      this.speak(message);
      this.panel.style.opacity = "1";
      this.panel.style.transform = "translateY(0)";
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.panel.style.opacity = "0";
        this.panel.style.transform = "translateY(10px)";
      }, 4800);
    }, delay);
  }

  installVoiceUnlock() {
    const unlock = () => {
      if (!("speechSynthesis" in window)) return;
      this.voiceUnlocked = true;
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        this.voiceReady = voices.length > 0;
        // Speak the latest companion message immediately after the user's gesture.
        if (this.pendingVoice) this.speak(this.pendingVoice);
      } catch (error) {}
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("click", unlock, { passive: true });

    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        this.voiceReady = window.speechSynthesis.getVoices().length > 0;
        if (this.voiceUnlocked && this.pendingVoice) this.speak(this.pendingVoice);
      });
    }
  }

  speak(message) {
    if (!this.voiceEnabled || !this.voiceUnlocked || !("speechSynthesis" in window)) return;

    this.pendingVoice = message;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume();

      const voices = synth.getVoices();
      // Prefer Persian, then any voice supplied by the device.
      const voice =
        voices.find(v => /^fa(-|_)/i.test(v.lang)) ||
        voices.find(v => /^ar(-|_)/i.test(v.lang)) ||
        voices.find(v => v.default) ||
        voices[0];

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = voice?.lang || "fa-IR";
      utterance.rate = 0.88;
      utterance.pitch = 0.95;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => { this.voiceTested = true; };
      utterance.onend = () => {
        if (this.pendingVoice === message) this.pendingVoice = null;
      };
      utterance.onerror = (event) => {
        console.warn("Companion TTS error:", event.error);
        this.pendingVoice = null;
      };

      // Mobile Chrome may ignore a queued utterance immediately after resume;
      // give the speech engine a short moment to become active.
      setTimeout(() => {
        if (!this.voiceUnlocked) return;
        synth.resume();
        synth.speak(utterance);
      }, 120);
    } catch (error) {
      console.warn("Companion voice unavailable", error);
    }
  }

  remember(event) {
    switch (event.type) {
      case "RED_BUTTON_FIRST_SEEN":
        this.memory.sawButton = true;
        break;
      case "RED_BUTTON_PRESS":
        this.memory.pressedButton = true;
        break;
      case "FAILURE":
        this.memory.failed = true;
        break;
      case "RETRY_AFTER_FAILURE":
        this.memory.retriedButton = true;
        break;
      case "DRAWER_INSPECTED":
        this.memory.searchedDrawer = true;
        break;
      case "DOOR_BLOCKED":
        this.memory.checkedDoorAfterFailure = true;
        break;
      case "OBJECT_INTERACTION":
        if (!this.memory.failed) this.memory.exploredBeforeFailure = true;
        break;
    }
  }

  react(event) {
    if (event.type === "RED_BUTTON_FIRST_SEEN" && !this.memory.pressedButton) {
      this.say("اون رو دیدی؟ من جای تو بودم، دست بهش نمی‌زدم. 😏");
      return;
    }

    if (event.type === "FAILURE") {
      if (this.memory.sawButton) {
        this.say("خب... همون چیزی شد که ازش می‌ترسیدم. حالا عجله نکن؛ یه راه دیگه پیدا کنیم.");
      } else {
        this.say("اوه... این یکی خوب پیش نرفت. باید یه راه دیگه پیدا کنیم.");
      }
      return;
    }

    if (event.type === "RETRY_AFTER_FAILURE") {
      if (this.memory.searchedDrawer) {
        this.say("هنوز سرنخ کشو رو داریم. قبل از اینکه دوباره امتحانش کنیم، شاید بهتره اون رو دنبال کنیم.");
      } else {
        this.say("دوباره می‌خوای امتحانش کنی؟ من ترجیح می‌دم اول اطراف رو بگردیم.");
      }
      return;
    }

    if (event.type === "DRAWER_INSPECTED") {
      if (this.memory.failed) {
        this.say("خوبه. بعد از اون اتفاق، رفتن سراغ سرنخ منطقی‌تره.");
      } else {
        this.say("بالاخره یه سرنخ پیدا کردیم. شاید کلید به کارمون بیاد.");
      }
      return;
    }

    if (event.type === "DOOR_BLOCKED") {
      if (this.memory.retriedButton) {
        this.say("در هنوز قفله. فکر کنم وقتشه روش قبلی رو کنار بذاریم.");
      } else {
        this.say("در قفل شده. بهتره اطراف رو دقیق‌تر بگردیم.");
      }
    }
  }

  observe() {
    const events = this.tracker.getEvents();
    if (events.length <= this.lastEventCount) return;

    const fresh = events.slice(this.lastEventCount);
    this.lastEventCount = events.length;

    for (const event of fresh) {
      const previousMemory = { ...this.memory };
      this.remember(event);
      this.react(event, previousMemory);
    }
  }

  destroy() {
    clearInterval(this.timer);
    clearTimeout(this.hideTimer);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    this.panel.remove();
  }
}
