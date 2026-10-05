// Future Phase 2 foundation.
// Generic execution/state engine for specialist-assigned training targets.
// It does not diagnose the player or choose a clinical protocol.

import { getTrainingTargetLevel } from "./TrainingTargets.js";
import {
  createTrainingSession,
  recordTrainingAttempt,
  abortTrainingAssignment
} from "./TrainingAssignment.js";

export class TrainingEngine {
  constructor(plan, { roomId = 9, onEvent = null } = {}) {
    this.plan = plan;
    this.roomId = roomId;
    this.onEvent = onEvent;
    this.session = createTrainingSession(plan, roomId);
    this.completedTargets = new Set();
  }

  getSession() {
    return structuredClone(this.session);
  }

  getAssignments() {
    return this.session.assignments.map((item) => ({
      ...item,
      target: getTrainingTargetLevel(item)
    }));
  }

  getAssignment(targetId) {
    return this.session.assignments.find(
      (item) => item.targetId === targetId
    ) || null;
  }

  canAttempt(targetId) {
    const assignment = this.getAssignment(targetId);
    if (!assignment) return false;
    if (assignment.aborted || assignment.completed) return false;

    const maxAttempts = assignment.safeguards?.maxAttemptsPerSession ?? 30;
    return assignment.attempts < maxAttempts;
  }

  recordAttempt(targetId, successful, metrics = {}) {
    const assignment = this.getAssignment(targetId);
    if (!assignment) return this.getSession();
    if (!this.canAttempt(targetId)) return this.getSession();

    const before = this.getAssignment(targetId);
    this.session = recordTrainingAttempt(
      this.session,
      targetId,
      Boolean(successful)
    );

    this.emit("TRAINING_ATTEMPT", {
      roomId: this.roomId,
      targetId,
      successful: Boolean(successful),
      attempt: before.attempts + 1,
      metrics
    });

    return this.getSession();
  }

  isCompleted(targetId) {\n    return this.completedTargets.has(targetId) || Boolean(this.getAssignment(targetId)?.completed);\n  }\n\n  isExhausted(targetId) {\n    return Boolean(this.getAssignment(targetId)?.exhausted);\n  }\n\n  abort(targetId, reason = "manual_abort") {
    const assignment = this.getAssignment(targetId);
    if (!assignment || assignment.aborted || assignment.completed) {
      return this.getSession();
    }

    this.session = abortTrainingAssignment(
      this.session,
      targetId,
      reason
    );

    this.emit("TRAINING_ABORT", {
      roomId: this.roomId,
      targetId,
      reason
    });

    return this.getSession();
  }

  emit(type, data) {
    if (typeof this.onEvent === "function") {
      try {
        this.onEvent({
          type,
          timestamp: new Date().toISOString(),
          ...data
        });
      } catch (_) {}
    }
  }
}
