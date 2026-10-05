// Future Phase 2 foundation.
// Specialist-controlled assignment state for rooms 09-20.
// This module does not diagnose the player and is not imported by Phase 1.

import {
  TRAINING_TARGETS,
  createTrainingAssignment,
  getTrainingTargetLevel
} from "./TrainingTargets.js";

export function createTrainingPlan({
  playerCode = null,
  sourceSessionId = null,
  assignments = []
} = {}) {
  const safeAssignments = assignments
    .map((assignment) => createTrainingAssignment(assignment))
    .filter(Boolean);

  return {
    version: 1,
    playerCode,
    sourceSessionId,
    createdAt: new Date().toISOString(),
    assignedBy: "specialist",
    assignments: safeAssignments
  };
}

export function addTrainingAssignment(plan, assignment) {
  const next = {
    ...plan,
    assignments: Array.isArray(plan?.assignments) ? [...plan.assignments] : []
  };

  const created = createTrainingAssignment(assignment);
  next.assignments.push(created);
  return next;
}

export function getActiveAssignments(plan) {
  return (plan?.assignments || []).filter((assignment) => {
    const target = TRAINING_TARGETS[assignment.targetId];
    return Boolean(target) && assignment.level >= 1;
  });
}

export function createTrainingSession(plan, roomId) {
  const assignments = getActiveAssignments(plan);

  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    roomId,
    startedAt: new Date().toISOString(),
    assignments: assignments.map((assignment) => ({
      ...assignment,
      target: getTrainingTargetLevel(assignment),
      attempts: 0,
      successes: 0,
      failures: 0,
      aborted: false,
      completed: false
    }))
  };
}

export function recordTrainingAttempt(session, targetId, successful) {
  const next = {
    ...session,
    assignments: (session.assignments || []).map((item) => {
      if (item.targetId !== targetId || item.completed || item.aborted) {
        return item;
      }

      const attempts = item.attempts + 1;
      const successes = item.successes + (successful ? 1 : 0);
      const failures = item.failures + (successful ? 0 : 1);
      const maxAttempts = item.safeguards?.maxAttemptsPerSession ?? 30;
      const completed = successes >= 2;

      return {
        ...item,
        attempts,
        successes,
        failures,
        completed,
        exhausted: !completed && attempts >= maxAttempts
      };
    })
  };

  return next;
}

export function abortTrainingAssignment(session, targetId, reason = "manual_abort") {
  return {
    ...session,
    assignments: (session.assignments || []).map((item) =>
      item.targetId === targetId
        ? {
            ...item,
            aborted: true,
            abortReason: reason,
            abortedAt: new Date().toISOString()
          }
        : item
    )
  };
}
