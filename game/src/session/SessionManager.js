import { BehaviorTracker } from "../psychology/BehaviorTracker.js";
import { BehaviorAnalyzer } from "../psychology/BehaviorAnalyzer.js";
import { SpecialistReport } from "../psychology/SpecialistReport.js";
import { SessionUploader } from "./SessionUploader.js";

export class SessionManager {
  constructor() {
    this.tracker = new BehaviorTracker();
    this.tracker.setEnabled(true);
    this.analyzer = new BehaviorAnalyzer();
    this.playerCode = this.generatePlayerCode();
    this.sessionStart = new Date().toISOString();
    this.playerConsent = true;
    this.storageKey = `psychgame_${this.playerCode}`;
    this.uploader = new SessionUploader({ endpoint: import.meta.env.VITE_API_URL || "", token: import.meta.env.VITE_AUTHOR_TOKEN || "" });
    this.lastRemoteUpload = 0;
    this.tracker.onEvent = () => this.saveSession();
  }

  generatePlayerCode() {
    return `PLAYER-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  setConsent(value = true) {
    this.playerConsent = Boolean(value);
    this.tracker.setEnabled(true);
    this.tracker.log("TRACKING_ENABLED", { forced: true });
    this.saveSession();
  }

  hasConsent() { return true; }
  getConsentPromise() { return Promise.resolve(true); }
  getPlayerCode() { return this.playerCode; }
  getSessionId() { return this.tracker.getSessionId(); }
  getTracker() { return this.tracker; }

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

  getReport() { return SpecialistReport.build(this.getSessionData()); }

  saveSession({ completed = false } = {}) {
    try {
      const data = this.getSessionData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      const now = Date.now();
      if (completed || now - this.lastRemoteUpload > 15000) {
        this.lastRemoteUpload = now;
        this.uploader.upload(this.getReport(), { completed });
      }
    } catch (error) {
      console.warn("PsychGame session save failed", error);
    }
  }

  uploadCompletedSession() { return this.uploader.upload(this.getReport(), { completed: true }); }
  exportSession() { return JSON.stringify(this.getReport(), null, 2); }
}
