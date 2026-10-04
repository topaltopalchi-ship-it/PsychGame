export class BehaviorAnalyzer {
  constructor(events = []) {
    this.events = events;
  }

  analyze() {
    return {
      exploration:
        this.calculateExploration(),

      riskTaking:
        this.calculateRiskTaking(),

      persistence:
        this.calculatePersistence(),

      strategyChange:
        this.calculateStrategyChange(),

      decisionLatency:
        this.calculateDecisionLatency(),

      helpSeeking:
        this.calculateHelpSeeking()
    };
  }

  calculateExploration() {
    const inspectedObjects =
      new Set();

    this.events.forEach(
      (event) => {
        if (
          event.type ===
          "OBJECT_INTERACTION"
        ) {
          inspectedObjects.add(
            event.objectId
          );
        }
      }
    );

    const count =
      inspectedObjects.size;

    if (count >= 5) {
      return "HIGH";
    }

    if (count >= 3) {
      return "MODERATE";
    }

    return "LOW";
  }

  calculateRiskTaking() {
    const buttonPresses =
      this.events.filter(
        (event) =>
          event.type ===
          "RED_BUTTON_PRESS"
      );

    if (
      buttonPresses.length >= 2
    ) {
      return "HIGH";
    }

    if (
      buttonPresses.length === 1
    ) {
      return "MODERATE";
    }

    return "LOW";
  }

  calculatePersistence() {
    const retries =
      this.events.filter(
        (event) =>
          event.type ===
          "RETRY_AFTER_FAILURE"
      );

    if (retries.length >= 3) {
      return "HIGH";
    }

    if (retries.length >= 1) {
      return "MODERATE";
    }

    return "LOW";
  }

  calculateStrategyChange() {
    const failures =
      this.events.filter(
        (event) =>
          event.type ===
          "FAILURE"
      );

    const laterExploration =
      this.events.some(
        (event) =>
          event.type ===
            "OBJECT_INTERACTION" &&
          event.elapsedMs >
            (
              failures[0]?.elapsedMs ||
              Infinity
            )
      );

    if (
      failures.length > 0 &&
      laterExploration
    ) {
      return "OBSERVED";
    }

    return "NOT_OBSERVED";
  }

  calculateDecisionLatency() {
    const event =
      this.events.find(
        (item) =>
          item.type ===
          "RED_BUTTON_PRESS"
      );

    if (!event) {
      return "NOT_OBSERVED";
    }

    const time =
      event.reactionTimeMs;

    if (
      time === null ||
      time === undefined
    ) {
      return "NOT_OBSERVED";
    }

    if (time < 2000) {
      return "SHORT";
    }

    if (time < 5000) {
      return "MODERATE";
    }

    return "LONG";
  }

  calculateHelpSeeking() {
    const helpEvents =
      this.events.filter(
        (event) =>
          event.type ===
          "HELP_REQUEST"
      );

    if (helpEvents.length > 0) {
      return "OBSERVED";
    }

    return "NOT_OBSERVED";
  }

  getReport() {
    const analysis =
      this.analyze();

    return {
      generatedAt:
        new Date().toISOString(),

      methodology:
        "Gameplay behavior indicators; not a clinical diagnosis.",

      indicators:
        analysis
    };
  }
}
