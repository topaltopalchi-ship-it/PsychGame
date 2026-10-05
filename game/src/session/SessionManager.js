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
  }

  generatePlayerCode() {
    const number = Math.floor(10000 + Math.random() * 90000);
    return `PLAYER-${number}`;
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
