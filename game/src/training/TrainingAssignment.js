// Future Phase 2 foundation.
// Specialist-controlled assignment state for rooms 09-20.
// This module does not diagnose the player and is not imported by Phase 1.

import {
  TRAINING_TARGETS,
  createTrainingAssignment,
  getTrainingTargetLevel,
  getTrainingRoomForTarget
} from "./TrainingTargets.js";

function resolveTrainingRoom(targetId) {
  const room = Number(getTrainingRoomForTarget(targetId));
  return room >= 9 && room <= 20 ? room : null;
}

export function createTrainingPlan({ playerCode = null, sourceSessionId = null, assignments = [] } = {}) {
  const safeAssignments = [];
  const targetIds = new Set();
  for (const assignment of assignments) {
    const created = createTrainingAssignment(assignment);
    if (!created || targetIds.has(created.targetId)) continue;
    const trainingRoom = resolveTrainingRoom(created.targetId);
    if (!trainingRoom) continue;
    targetIds.add(created.targetId);
    safeAssignments.push({ ...created, trainingRoom });
  }

  return {
    version: 4,
    planId: crypto.randomUUID(),
    playerCode,
    sourceSessionId,
    createdAt: new Date().toISOString(),
    assignedBy: "specialist",
    auditLog: [],
    assignments: safeAssignments
  };
}

export function addTrainingAssignment(plan, assignment) {
  const next = {
    ...plan,
    assignments: Array.isArray(plan?.assignments) ? [...plan.assignments] : [],
    auditLog: Array.isArray(plan?.auditLog) ? [...plan.auditLog] : []
  };

  const created = createTrainingAssignment(assignment);
  const trainingRoom = resolveTrainingRoom(created.targetId);
  if (!trainingRoom || next.assignments.some((item) => item.targetId === created.targetId)) return next;

  const enriched = { ...created, trainingRoom };
  next.assignments.push(enriched);
  next.auditLog.push({
    action: "ASSIGN_TARGET",
    targetId: enriched.targetId,
    trainingRoom,
    level: enriched.level,
    by: "specialist",
    at: new Date().toISOString()
  });
  return next;
}

export function setTrainingAssignmentLevel(plan, targetId, level) {
  const next = {
    ...plan,
    assignments: Array.isArray(plan?.assignments) ? plan.assignments.map(item => ({ ...item })) : [],
    auditLog: Array.isArray(plan?.auditLog) ? [...plan.auditLog] : []
  };
  const index = next.assignments.findIndex(item => item.targetId === targetId);
  if (index < 0) return next;
  const current = next.assignments[index];
  const target = TRAINING_TARGETS[targetId];
  const trainingRoom = resolveTrainingRoom(targetId);
  if (!target || !trainingRoom) return next;

  const requestedLevel = Number(level);
  const safeLevel = Number.isFinite(requestedLevel)
    ? Math.max(1, Math.min(Math.trunc(requestedLevel), target.progression.length))
    : current.level;
  const finalLevel = Math.min(safeLevel, Number(current.maxLevel) || target.progression.length);
  const changedAt = new Date().toISOString();

  next.assignments[index] = {
    ...current,
    trainingRoom,
    level: finalLevel,
    levelChangedAt: changedAt,
    levelChangedBy: "specialist"
  };
  next.auditLog.push({
    action: "CHANGE_LEVEL",
    targetId,
    trainingRoom,
    fromLevel: current.level,
    toLevel: finalLevel,
    by: "specialist",
    at: changedAt
  });
  return next;
}

export function getActiveAssignments(plan) {
  return (plan?.assignments || []).filter((assignment) => {
    const target = TRAINING_TARGETS[assignment.targetId];
    const room = Number(assignment.trainingRoom ?? getTrainingRoomForTarget(assignment.targetId));
    return Boolean(target) && room >= 9 && room <= 20 && assignment.level >= 1;
  });
}

export function createTrainingSession(plan, roomId) {
  const assignments = getActiveAssignments(plan);
  return {
    version: 2,
    sessionId: crypto.randomUUID(),
    planId: plan?.planId || null,
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
  return {
    ...session,
    assignments: (session.assignments || []).map((item) => {
      if (item.targetId !== targetId || item.completed || item.aborted || item.exhausted) return item;
      const attempts = item.attempts + 1;
      const successes = item.successes + (successful ? 1 : 0);
      const failures = item.failures + (successful ? 0 : 1);
      const maxAttempts = item.safeguards?.maxAttemptsPerSession ?? 30;
      const completed = successes >= 2;
      return { ...item, attempts, successes, failures, completed, exhausted: !completed && attempts >= maxAttempts };
    })
  };
}

export function abortTrainingAssignment(session, targetId, reason = "manual_abort") {
  return {
    ...session,
    assignments: (session.assignments || []).map((item) =>
      item.targetId === targetId && !item.completed && !item.aborted && !item.exhausted
        ? { ...item, aborted: true, abortReason: reason, abortedAt: new Date().toISOString() }
        : item
    )
  };
}
