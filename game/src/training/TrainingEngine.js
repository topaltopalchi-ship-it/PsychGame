// Future Phase 2 foundation.
// Generic execution/state engine for specialist-assigned training targets.
// It does not diagnose the player or choose a clinical protocol.

import { getTrainingTargetLevel } from "./TrainingTargets.js";
import { createTrainingSession, recordTrainingAttempt, abortTrainingAssignment } from "./TrainingAssignment.js";

export class TrainingEngine {
  constructor(plan, { roomId = 9, onEvent = null } = {}) {
    this.plan = plan;
    this.roomId = roomId;
    this.onEvent = onEvent;
    this.storageKey = plan?.playerCode ? `psychgame_training_runtime_${plan.playerCode}` : null;
    this.session = this.loadPersistedSession() || createTrainingSession(plan, roomId);
    this.session.roomId = roomId;
    this.completedTargets = new Set(this.session.assignments.filter(x => x.completed).map(x => x.targetId));
    this.persist();
  }

  getSession() { return structuredClone(this.session); }

  getAssignments() {
    return this.session.assignments.map((item) => ({ ...item, target: getTrainingTargetLevel(item) }));
  }

  getAssignment(targetId) {
    return this.session.assignments.find(item => item.targetId === targetId) || null;
  }

  canAttempt(targetId) {
    const assignment = this.getAssignment(targetId);
    if (!assignment || assignment.aborted || assignment.completed || assignment.exhausted) return false;
    const maxAttempts = assignment.safeguards?.maxAttemptsPerSession ?? 30;
    return assignment.attempts < maxAttempts;
  }

  recordAttempt(targetId, successful, metrics = {}) {
    const assignment = this.getAssignment(targetId);
    if (!assignment || !this.canAttempt(targetId)) return this.getSession();
    const before = assignment;
    this.session = recordTrainingAttempt(this.session, targetId, Boolean(successful));
    this.persist();
    const updated = this.getAssignment(targetId);
    if (updated?.completed) this.completedTargets.add(targetId);
    this.emit("TRAINING_ATTEMPT", {
      roomId: this.roomId,
      targetId,
      successful: Boolean(successful),
      attempt: before.attempts + 1,
      metrics
    });
    return this.getSession();
  }

  isCompleted(targetId) {
    return this.completedTargets.has(targetId) || Boolean(this.getAssignment(targetId)?.completed);
  }

  isExhausted(targetId) {
    return Boolean(this.getAssignment(targetId)?.exhausted);
  }

  isTargetCompleted(targetId) { return this.isCompleted(targetId); }

  abort(targetId, reason = "manual_abort") {
    const assignment = this.getAssignment(targetId);
    if (!assignment || assignment.aborted || assignment.completed) return this.getSession();
    this.session = abortTrainingAssignment(this.session, targetId, reason);
    this.persist();
    this.emit("TRAINING_ABORT", { roomId: this.roomId, targetId, reason });
    return this.getSession();
  }

  loadPersistedSession() {
    if (!this.storageKey) return null;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  persist() {
    if (!this.storageKey) return;
    try { sessionStorage.setItem(this.storageKey, JSON.stringify(this.session)); } catch (_) {}
  }

  getSummary() {
    return {
      version: this.session.version,
      sessionId: this.session.sessionId,
      startedAt: this.session.startedAt,
      assignments: this.session.assignments.map(item => ({
        targetId: item.targetId,
        level: item.level,
        attempts: item.attempts,
        successes: item.successes,
        failures: item.failures,
        completed: Boolean(item.completed),
        exhausted: Boolean(item.exhausted),
        aborted: Boolean(item.aborted),
        abortReason: item.abortReason || null
      }))
    };
  }

  emit(type, data) {
    if (typeof this.onEvent !== "function") return;
    try { this.onEvent({ type, timestamp: new Date().toISOString(), ...data }); } catch (_) {}
  }
}
