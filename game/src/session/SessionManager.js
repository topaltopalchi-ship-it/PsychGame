import { BehaviorTracker } from "../psychology/BehaviorTracker.js";
import { BehaviorAnalyzer } from "../psychology/BehaviorAnalyzer.js";

export class SessionManager {
  constructor() {
    this.tracker = new BehaviorTracker();
    this.analyzer = new BehaviorAnalyzer();
    this.playerCode = this.generatePlayerCode();
    this.sessionStart = new Date().toISOString();
    this.playerConsent = false;
    this.storageKey = `psychgame_${this.playerCode}`;
    this.consentReady = false;
    this.consentPromise = this.createConsentGate();
  }

  generatePlayerCode() {
    const number = Math.floor(10000 + Math.random() * 90000);
    return `PLAYER-${number}`;
  }

  createConsentGate() {
    if (typeof document === "undefined") return Promise.resolve(false);

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.id = "psychgame-consent";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "20000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
        background: "rgba(4,6,9,.96)",
        color: "#eee",
        direction: "rtl",
        fontFamily: "Tahoma,Arial,sans-serif"
      });

      const card = document.createElement("div");
      Object.assign(card.style, {
        width: "min(560px, 94vw)",
        padding: "28px",
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: "18px",
        background: "rgba(15,18,23,.98)",
        boxShadow: "0 20px 70px rgba(0,0,0,.45)",
        textAlign: "right"
      });

      const title = document.createElement("h1");
      title.textContent = "شروع بازی YOL";
      title.style.margin = "0 0 16px";
      title.style.fontSize = "24px";

      const text = document.createElement("p");
      text.textContent = "این بازی برای تحلیل حرفه‌ای، برخی رفتارهای مربوط به روند بازی مانند انتخاب‌ها، تعامل‌ها و واکنش به رویدادها را ثبت می‌کند. این داده‌ها برای تشخیص مستقل اختلالات روان‌شناختی استفاده نمی‌شوند. برای شروع و ثبت رفتارهای بازی، رضایت شما لازم است.";
      Object.assign(text.style, { lineHeight: "2", color: "rgba(255,255,255,.78)", fontSize: "14px" });

      const buttons = document.createElement("div");
      Object.assign(buttons.style, { display: "flex", gap: "10px", marginTop: "22px", flexWrap: "wrap" });

      const accept = document.createElement("button");
      accept.textContent = "می‌پذیرم و شروع می‌کنم";
      Object.assign(accept.style, { flex: "1", minWidth: "210px", padding: "13px 18px", border: "0", borderRadius: "10px", background: "#a74b3c", color: "#fff", fontSize: "14px", cursor: "pointer" });

      const decline = document.createElement("button");
      decline.textContent = "بدون ثبت رفتار ادامه می‌دهم";
      Object.assign(decline.style, { flex: "1", minWidth: "210px", padding: "13px 18px", border: "1px solid rgba(255,255,255,.18)", borderRadius: "10px", background: "transparent", color: "rgba(255,255,255,.75)", fontSize: "14px", cursor: "pointer" });

      buttons.append(accept, decline);
      card.append(title, text, buttons);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const finish = (consent) => {
        this.setConsent(consent);
        overlay.remove();
        this.consentReady = true;
        resolve(consent);
      };

      accept.addEventListener("click", () => finish(true), { once: true });
      decline.addEventListener("click", () => finish(false), { once: true });
    });
  }

  setConsent(value) {
    this.playerConsent = Boolean(value);
    this.tracker.setEnabled(this.playerConsent);
    this.tracker.log("CONSENT", { granted: this.playerConsent });
    this.saveSession();
  }

  hasConsent() {
    return this.playerConsent;
  }

  getConsentPromise() {
    return this.consentPromise;
  }

  getPlayerCode() {
    return this.playerCode;
  }

  getSessionId() {
    return this.tracker.getSessionId();
  }

  getTracker() {
    return this.tracker;
  }

  getAnalysis() {
    this.analyzer = new BehaviorAnalyzer(this.tracker.getEvents());
    return this.analyzer.getReport();
  }

  getSessionData() {
    return {
      playerCode: this.playerCode,
      sessionId: this.getSessionId(),
      sessionStart: this.sessionStart,
      consent: this.playerConsent,
      events: this.tracker.getEvents(),
      analysis: this.playerConsent ? this.getAnalysis() : null
    };
  }

  saveSession() {
    const data = this.getSessionData();
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  exportSession() {
    return JSON.stringify(this.getSessionData(), null, 2);
  }
}
