// Future Phase 2 foundation.
// Targets describe behavioral training domains, not diagnoses.
// Rooms 09-20 can consume these assignments after specialist review.

export const TRAINING_TARGETS = {
  WAIT_TOLERANCE: {
    id: "WAIT_TOLERANCE",
    label: "تحمل تأخیر",
    domain: "delayed_gratification",
    progression: [
      { level: 1, targetMs: 5000 }, { level: 2, targetMs: 10000 }, { level: 3, targetMs: 20000 },
      { level: 4, targetMs: 30000 }, { level: 5, targetMs: 60000 }, { level: 6, targetMs: 120000 }
    ]
  },
  RESPONSE_INHIBITION: {
    id: "RESPONSE_INHIBITION", label: "مهار پاسخ فوری", domain: "impulse_control",
    progression: [{ level: 1, requiredPauseMs: 2000 }, { level: 2, requiredPauseMs: 5000 }, { level: 3, requiredPauseMs: 10000 }]
  },
  ATTENTION_SUSTAIN: {
    id: "ATTENTION_SUSTAIN", label: "تداوم توجه", domain: "sustained_attention",
    progression: [{ level: 1, durationMs: 15000 }, { level: 2, durationMs: 30000 }, { level: 3, durationMs: 60000 }, { level: 4, durationMs: 120000 }]
  },
  DECISION_COMMITMENT: {
    id: "DECISION_COMMITMENT", label: "ثبات تصمیم", domain: "decision_stability",
    progression: [{ level: 1, maxSwitches: 3 }, { level: 2, maxSwitches: 2 }, { level: 3, maxSwitches: 1 }, { level: 4, maxSwitches: 0 }]
  },
  UNCERTAINTY_TOLERANCE: {
    id: "UNCERTAINTY_TOLERANCE", label: "تحمل ابهام", domain: "uncertainty_tolerance",
    progression: [{ level: 1, ambiguity: 0.25 }, { level: 2, ambiguity: 0.5 }, { level: 3, ambiguity: 0.75 }, { level: 4, ambiguity: 1 }]
  },
  REPETITION_REDUCTION: {
    id: "REPETITION_REDUCTION", label: "کاهش رفتار تکراری", domain: "repetition_control",
    progression: [{ level: 1, maxRepetitions: 4 }, { level: 2, maxRepetitions: 3 }, { level: 3, maxRepetitions: 2 }, { level: 4, maxRepetitions: 1 }]
  },
  GRADUAL_APPROACH: {
    id: "GRADUAL_APPROACH", label: "رویارویی تدریجی", domain: "approach_behavior",
    progression: [{ level: 1, exposureSteps: 1 }, { level: 2, exposureSteps: 2 }, { level: 3, exposureSteps: 3 }, { level: 4, exposureSteps: 4 }]
  },
  EMOTIONAL_PAUSE: {
    id: "EMOTIONAL_PAUSE", label: "مکث پیش از واکنش", domain: "response_regulation",
    progression: [{ level: 1, requiredPauseMs: 3000 }, { level: 2, requiredPauseMs: 7000 }, { level: 3, requiredPauseMs: 15000 }]
  }
};

export const TRAINING_TARGET_ROOMS = {
  RESPONSE_INHIBITION: 15,
  GRADUAL_APPROACH: 16,
  WAIT_TOLERANCE: 17,
  ATTENTION_SUSTAIN: 18,
  EMOTIONAL_PAUSE: 18,
  DECISION_COMMITMENT: 19,
  REPETITION_REDUCTION: 19,
  UNCERTAINTY_TOLERANCE: 19
};

export function getTrainingRoomForTarget(targetId) {
  return TRAINING_TARGET_ROOMS[targetId] || null;
}

export function createTrainingAssignment({ targetId, level = 1, assignedBy = "specialist", maxLevel = null, safeguards = {} } = {}) {
  const target = TRAINING_TARGETS[targetId];
  if (!target) throw new Error("Unknown training target: " + targetId);
  const requestedLevel = Number(level);
  const safeLevel = Number.isFinite(requestedLevel) ? Math.max(1, Math.min(Math.trunc(requestedLevel), target.progression.length)) : 1;
  const requestedMaxLevel = maxLevel == null ? target.progression.length : Number(maxLevel);
  const safeMaxLevel = Number.isFinite(requestedMaxLevel) ? Math.max(safeLevel, Math.min(Math.trunc(requestedMaxLevel), target.progression.length)) : target.progression.length;
  return { targetId, level: safeLevel, assignedBy, assignedAt: new Date().toISOString(), maxLevel: safeMaxLevel,
    safeguards: { maxAttemptsPerSession: 30, allowAbort: true, ...safeguards } };
}

export function getTrainingTargetLevel(assignment) {
  const target = TRAINING_TARGETS[assignment?.targetId];
  if (!target) return null;
  const level = Math.max(1, Math.min(Number(assignment.level) || 1, target.progression.length, Number(assignment.maxLevel) || target.progression.length));
  return { ...target, level, config: target.progression[level - 1] };
}
