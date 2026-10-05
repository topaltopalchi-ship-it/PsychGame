export class BehaviorTracker {

  constructor() {

    this.sessionId =
      crypto.randomUUID();

    this.sessionStart =
      performance.now();

    this.events = [];

  }


  log(type, data = {}) {

    const event = {

      sessionId:
        this.sessionId,

      type,

      timestamp:
        new Date().toISOString(),

      elapsedMs:
        Math.round(
          performance.now() -
          this.sessionStart
        ),

      ...data

    };


    this.events.push(event);


    return event;
  }


  getEvents() {

    return [
      ...this.events
    ];

  }


  getSessionId() {

    return this.sessionId;

  }


  exportJSON() {

    return JSON.stringify(
      this.events,
      null,
      2
    );

  }

}
