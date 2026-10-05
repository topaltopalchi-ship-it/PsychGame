export class BehaviorTracker {
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.sessionStart = performance.now();
    this.events = [];
    this.enabled = false;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  isEnabled() {
    return this.enabled;
  }

  log(type, data = {}) {
    if (!this.enabled) return null;

    const event = {
      sessionId: this.sessionId,
      type,
      timestamp: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - this.sessionStart),
      ...data
    };

    this.events.push(event);
    return event;
  }

  getEvents() {
    return [...this.events];
  }

  getSessionId() {
    return this.sessionId;
  }

  exportJSON() {
    return JSON.stringify(this.events, null, 2);
  }
}
