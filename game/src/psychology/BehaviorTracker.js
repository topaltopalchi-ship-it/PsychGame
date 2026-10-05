export class BehaviorTracker {
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.sessionStart = performance.now();
    this.events = [];
    this.enabled = false;
    this.sequence = 0;
    this.onEvent = null;
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
      eventIndex: this.sequence++,
      sessionId: this.sessionId,
      type,
      timestamp: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - this.sessionStart),
      ...data
    };

    this.events.push(event);

    // Keep the browser session bounded while preserving the most recent behavior.
    if (this.events.length > 10000) this.events.shift();

    if (typeof this.onEvent === "function") {
      try { this.onEvent(event); } catch (_) { /* tracking must never break gameplay */ }
    }

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
