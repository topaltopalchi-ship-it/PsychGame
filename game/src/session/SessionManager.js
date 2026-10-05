import { BehaviorTracker } from "../psychology/BehaviorTracker.js";
import { BehaviorAnalyzer } from "../psychology/BehaviorAnalyzer.js";
import { SpecialistReport } from "../psychology/SpecialistReport.js";\nimport { SessionUploader } from "./SessionUploader.js";

export class SessionManager {
  constructor() {
    this.tracker = new BehaviorTracker();
    this.tracker.setEnabled(true);
    this.analyzer = new BehaviorAnalyzer();
    this.playerCode = this.generatePlayerCode();
    this.sessionStart = new Date().toISOString();
    this.playerConsent = true;
    this.storageKey = `psychgame_${this.playerCode}`;\n    this.uploader = new SessionUploader({\n      endpoint: import.meta.env.VITE_API_URL || "",\n      token: import.meta.env.VITE_AUTHOR_TOKEN || ""\n    });\n    this.lastRemoteUpload = 0;

    this.tracker.onEvent = () => this.saveSession();
  }

  generatePlayerCode() {
    const number = Math.floor(10000 + Math.random() * 90000);
    return `PLAYER-${number}`;
  }

  setConsent(value = true) {
    this.playerConsent = Boolean(value);
    this.tracker.setEnabled(true);
    this.tracker.log("TRACKING_ENABLED", { forced: true });
    this.saveSession();
  }

  hasConsent() {
    return true;
  }

  getConsentPromise() {
    return Promise.resolve(true);
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
      consent: true,
      events: this.tracker.getEvents(),
      analysis: this.getAnalysis()
    };
  }

  getReport() {
    const data = this.getSessionData();
    return SpecialistReport.build(data);
  }

  saveSession() {
    try {
      const data = this.getSessionData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));\n      const now = Date.now();\n      if (completed || now - this.lastRemoteUpload > 15000) {\n        this.lastRemoteUpload = now;\n        this.uploader.upload(this.getReport(), { completed });\n      }
    } catch (error) {
      console.warn("PsychGame session save failed", error);
    }
  }

  uploadCompletedSession() {\n    return this.uploader.upload(this.getReport(), { completed: true });\n  }\n\n  exportSession() {
    return JSON.stringify(this.getReport(), null, 2);
  }
}
