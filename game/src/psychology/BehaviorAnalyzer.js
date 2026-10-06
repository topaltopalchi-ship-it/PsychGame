export class BehaviorAnalyzer {
  constructor(events = []) {
    this.events = events;
  }

  analyze() {
    return {
      exploration: this.calculateExploration(),
      riskTaking: this.calculateRiskTaking(),
      persistence: this.calculatePersistence(),
      strategyChange: this.calculateStrategyChange(),
      decisionLatency: this.calculateDecisionLatency(),
      helpSeeking: this.calculateHelpSeeking(),
      roomBehavior: this.calculateRoomBehavior(),
      behavioralIndicators: this.calculateBehavioralIndicators()
    };
  }

  calculateBehavioralIndicators() {
    const events = this.events;
    const count = (type) => events.filter(e => e.type === type).length;
    const sum = (field, filter = () => true) => events.reduce((n,e) => n + (filter(e) ? Number(e[field]) || 0 : 0), 0);
    const avg = (field, filter = () => true) => {
      const values = events.filter(filter).map(e => Number(e[field])).filter(Number.isFinite);
      return values.length ? Math.round(values.reduce((a,b) => a+b,0) / values.length) : null;
    };
    const repeatedChecks = events.filter(e => Number(e.attempt) > 1 || /RECHECK|REPEAT|REPEATED/i.test(e.type || "")).length;
    const choiceSwitches = sum("choiceSwitches") + sum("switchCount");
    const backtracks = sum("retreatCount") + count("PATH_RETURN");
    const riskEvents = count("RED_BUTTON_PRESS") + events.filter(e => ["PATH_LEFT","PATH_RIGHT"].includes(e.path)).length;
    const failures = count("FAILURE");
    const retries = count("RETRY_AFTER_FAILURE");
    const blocked = events.filter(e => String(e.type || "").endsWith("_EXIT_BLOCKED")).length;
    const companionFollow = events.filter(e => e.choice === "FOLLOW_COMPANION" || e.firstChoice === "FOLLOW_COMPANION").length;
    const alone = events.filter(e => e.choice === "GO_ALONE" || e.firstChoice === "GO_ALONE").length;
    return {
      stress: { failures, blockedExits: blocked, recoveryRetries: retries, postFailureReactionMs: avg("reactionTimeMs", e => e.type === "FAILURE") },
      anxiety: { rechecks: repeatedChecks, backtracks, uncertaintyDelaysMs: avg("reactionTimeMs", e => e.type.includes("CHECK") || e.type.includes("INSPECT")) },
      excitement: { riskEvents, rapidDecisions: events.filter(e => Number(e.reactionTimeMs) >= 0 && Number(e.reactionTimeMs) < 2000).length },
      hesitation: { choiceSwitches, longDecisionCount: events.filter(e => Number(e.reactionTimeMs) >= 5000).length, averageDecisionMs: avg("reactionTimeMs", e => Number.isFinite(e.reactionTimeMs)) },
      compulsiveChecking: { repeatedChecks, repeatedObjectTypes: new Set(events.filter(e => Number(e.attempt) > 1).map(e => e.objectId).filter(Boolean)).size },
      impulsivity: { veryFastActions: events.filter(e => Number(e.reactionTimeMs) >= 0 && Number(e.reactionTimeMs) < 1200).length, actionWithoutInspection: count("ACTION_WITHOUT_INSPECTION") },
      attention: { missedClues: count("CLUE_MISSED"), detailInspections: count("CLUE_INSPECTED") + count("DECISION_POINT_INSPECTED") },
      suspiciousness: { sourceChecks: count("SOURCE_CHECKED") + count("CLUE_INSPECTED"), companionOverrides: alone },
      pessimism: { negativeChoices: count("NEGATIVE_OUTCOME_CHOICE"), threatChecks: count("THREAT_CHECKED") },
      trust: { companionFollow, independentOverrides: alone, choiceSwitches },
      independence: { aloneChoices: alone, selfDirectedInteractions: count("SELF_DIRECTED_SEARCH"), helpRequests: count("HELP_REQUEST") },
      persistence: { failures, retries, totalRetryBehavior: retries + count("ROOM_RETRY") },
      threatSensitivity: { threatChecks: count("THREAT_CHECKED") + count("PATH_SCARE"), blockedExits: blocked },
      frustrationTolerance: { failures, retries, recoveryAfterFailure: retries > 0 },
      intoleranceOfUncertainty: { repeatedChecks, blockedExits: blocked, longDecisionCount: events.filter(e => Number(e.reactionTimeMs) >= 5000).length },
      cognitiveFlexibility: { choiceSwitches, strategyChanges: this.calculateStrategyChange() === "OBSERVED" ? 1 : 0 },
      noveltyResponse: { exploration: this.calculateExploration(), unknownInteractions: count("UNKNOWN_OBJECT_INSPECTED") },
      rewardSensitivity: { riskEvents, rewardChoices: count("REWARD_CHOICE") },
      ruleFollowing: { failures, shortcuts: count("RULE_BYPASS") },
      socialDependency: { companionFollow, helpRequests: count("HELP_REQUEST") }
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
