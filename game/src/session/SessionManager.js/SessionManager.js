import { BehaviorTracker } from "../psychology/BehaviorTracker.js";

export class SessionManager {
  constructor() {
    this.tracker = new BehaviorTracker();

    this.playerCode =
      this.generatePlayerCode();

    this.sessionStart =
      new Date().toISOString();

    this.playerConsent = false;
  }

  generatePlayerCode() {
    const number =
      Math.floor(
        10000 + Math.random() * 90000
      );

    return `PLAYER-${number}`;
  }

  setConsent(value) {
    this.playerConsent = Boolean(value);

    this.tracker.log(
      "CONSENT",
      {
        granted: this.playerConsent
      }
    );
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

  getSessionData() {
    return {
      playerCode: this.playerCode,
      sessionId: this.getSessionId(),
      sessionStart: this.sessionStart,
      consent: this.playerConsent,
      events: this.tracker.getEvents()
    };
  }

  exportSession() {
    return JSON.stringify(
      this.getSessionData(),
      null,
      2
    );
  }
}
