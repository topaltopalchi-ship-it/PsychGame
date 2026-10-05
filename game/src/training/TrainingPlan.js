// Future Phase 2 only. This module is intentionally not imported by the current game.
// Rooms 01-08 remain observation-only. Rooms 09-20 can use this plan later.

export const TRAINING_PHASE = {
  OBSERVATION_ROOMS: [1, 2, 3, 4, 5, 6, 7, 8],
  TRAINING_ROOMS: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
};

export const TRAINING_MODULES = {
  PATIENCE: {
    id: "PATIENCE",
    label: "تمرین صبر",
    levels: [
      { level: 1, targetMs: 5000 },
      { level: 2, targetMs: 10000 },
      { level: 3, targetMs: 20000 },
      { level: 4, targetMs: 30000 },
      { level: 5, targetMs: 60000 },
      { level: 6, targetMs: 120000 }
    ]
  },
  IMPULSE_CONTROL: {
    id: "IMPULSE_CONTROL",
    label: "تمرین مکث قبل از تصمیم",
    levels: [
      { level: 1, requiredPauseMs: 2000 },
      { level: 2, requiredPauseMs: 5000 },
      { level: 3, requiredPauseMs: 10000 }
    ]
  },
  DECISION_STABILITY: {
    id: "DECISION_STABILITY",
    label: "تمرین ثبات تصمیم",
    levels: [
      { level: 1, maxSwitches: 3 },
      { level: 2, maxSwitches: 2 },
      { level: 3, maxSwitches: 1 },
      { level: 4, maxSwitches: 0 }
    ]
  }
};

export function createTrainingState(moduleId, level = 1) {
  return {
    moduleId,
    level,
    attempts: 0,
    successes: 0,
    failures: 0,
    currentTarget: null,
    completed: false
  };
}

// Adaptive progression for a future training room.
// It only changes difficulty; it does not diagnose the player.
export function updateTrainingState(state, successful) {
  const module = TRAINING_MODULES[state.moduleId];
  if (!module) return { ...state };

  const next = { ...state };
  next.attempts += 1;

  if (successful) {
    next.successes += 1;
    next.failures = 0;

    if (next.successes >= 2 && next.level < module.levels.length) {
      next.level += 1;
      next.successes = 0;
    }
  } else {
    next.failures += 1;
    next.successes = 0;

    if (next.failures >= 2 && next.level > 1) {
      next.level -= 1;
      next.failures = 0;
    }
  }

  next.currentTarget = module.levels[next.level - 1] || null;
  next.completed = next.level === module.levels.length && next.successes >= 2;

  return next;
}
