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
        this.calculateHelpSeeking(),

      roomBehavior:
        this.calculateRoomBehavior()
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

  calculateRoomBehavior() {
    const rooms = {};

    for (const roomId of ["ROOM_04", "ROOM_05", "ROOM_06", "ROOM_07", "ROOM_08"]) {
      const roomEvents = this.events.filter(event => event.roomId === roomId);
      if (!roomEvents.length) continue;

      const interactions = roomEvents.filter(event => event.type === "OBJECT_INTERACTION").length;
      const inspections = roomEvents.filter(event =>
        String(event.type || "").includes("INSPECTED") ||
        String(event.type || "").includes("CHECKED")
      ).length;
      const switches = roomEvents.reduce(
        (sum, event) => sum + Number(event.choiceSwitches || 0) + Number(event.switchCount || 0),
        0
      );
      const retries = roomEvents.filter(event => event.type === "RETRY_AFTER_FAILURE").length;
      const blockedExits = roomEvents.filter(event => String(event.type || "").endsWith("_EXIT_BLOCKED")).length;

      rooms[roomId] = {
        interactions,
        inspections,
        switches,
        retries,
        blockedExits,
        observedEvents: roomEvents.length
      };
    }

    return rooms;
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

  buildPhase1Profile() {
    const events = this.events.filter((event) =>
      ["ROOM_01", "ROOM_02", "ROOM_03"].includes(event.roomId)
    );

    const room01 = events.filter((event) => event.roomId === "ROOM_01");
    const room02 = events.filter((event) => event.roomId === "ROOM_02");
    const room03 = events.filter((event) => event.roomId === "ROOM_03");

    const redButton = room01.find((event) => event.type === "RED_BUTTON_PRESS");
    const pathChoices = room02.filter((event) => event.type === "PATH_CHOICE");
    const uniquePaths = new Set(pathChoices.map((event) => event.path).filter(Boolean));
    const waitingChecks = room03.filter((event) =>
      ["WAITING_OBJECT_INSPECTED", "WAITING_SEAT_INSPECTED", "WAITING_EXIT_CHECKED"].includes(event.type)
    );

    return {
      source: "ROOMS_01_03",
      sessionId: this.events[0]?.sessionId || null,
      observed: {
        room01: {
          redButtonPresses: room01.filter((event) => event.type === "RED_BUTTON_PRESS").length,
          firstDecisionReactionTimeMs: redButton?.reactionTimeMs ?? null,
          retriesAfterFailure: room01.filter((event) => event.type === "RETRY_AFTER_FAILURE").length,
          objectInteractions: room01.filter((event) => event.type === "OBJECT_INTERACTION").length
        },
        room02: {
          pathChoices: pathChoices.length,
          uniquePaths: uniquePaths.size,
          pathSwitches: Math.max(0, uniquePaths.size - 1),
          firstPathReactionTimeMs: pathChoices[0]?.reactionTimeMs ?? null,
          idleEvents: room02.filter((event) => event.type === "BEHAVIOR_IDLE_EVENT").length
        },
        room03: {
          waitingChecks: waitingChecks.length,
          firstWaitingReactionTimeMs: waitingChecks[0]?.reactionTimeMs ?? null,
          memoryResponses: room03.filter((event) => event.type === "ROOM_03_MEMORY_RESPONSE").length
        }
      }
    };
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
        analysis,

      phase1Profile:
        this.buildPhase1Profile()
    };
  }
}
